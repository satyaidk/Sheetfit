/**
 * Pre-export checks ("preflight").
 *
 * Gang-sheet builders check for overlap, out-of-bounds art and low resolution
 * before checkout (research section 2). Sheetfit runs the same checks before
 * export and adds two of its own: empty product slots and distorted images.
 * Each issue names the designs involved so the UI can select them.
 */

import type { Design, EditorDocument } from "@/types/editor";
import type { ImageAsset } from "@/types/image";
import { computeImageRect, croppedSourceSize, describeFit } from "@/lib/image/image-fit";
import { resolutionReport } from "@/lib/image/image-resolution";
import { designBounds, placementStatus, rectsOverlap } from "@/lib/layout/sheet-layout";

export type IssueKind = "outside-page" | "outside-printable" | "overlap" | "low-dpi" | "empty-slot" | "distorted";

export interface PreflightIssue {
  kind: IssueKind;
  severity: "error" | "warning";
  designIds: string[];
  message: string;
}

const label = (d: Design) => d.name || "Untitled design";

export function runPreflight(doc: EditorDocument, assets: Record<string, ImageAsset>): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const { designs, page } = doc;

  for (const d of designs) {
    const status = placementStatus(d, page);
    if (status.exceedsPage) {
      issues.push({ kind: "outside-page", severity: "error", designIds: [d.id], message: `${label(d)} runs off the sheet and will be cut off.` });
    } else if (status.exceedsPrintable) {
      issues.push({ kind: "outside-printable", severity: "warning", designIds: [d.id], message: `${label(d)} is in the margin, where many printers cannot print.` });
    }

    if (!d.assetId) {
      issues.push({ kind: "empty-slot", severity: "warning", designIds: [d.id], message: `${label(d)} has no image yet and will print empty.` });
      continue;
    }
    const a = assets[d.assetId];
    if (!a) continue;
    const natural = { width: a.naturalWidth, height: a.naturalHeight };
    const source = croppedSourceSize(natural, d.crop);
    const rect = computeImageRect(d, source);
    const q = resolutionReport(natural, d.crop, rect);
    if (q.level === "low") {
      issues.push({ kind: "low-dpi", severity: "warning", designIds: [d.id], message: `${label(d)} is ${Math.round(q.effectiveDpi)} DPI at this size and may look pixelated.` });
    }
    if (describeFit(d, source).distorted) {
      issues.push({ kind: "distorted", severity: "warning", designIds: [d.id], message: `${label(d)} is stretched out of proportion.` });
    }
  }

  // Pairwise overlap on rotated bounds; designs in the same group may overlap on purpose.
  for (let i = 0; i < designs.length; i++) {
    for (let j = i + 1; j < designs.length; j++) {
      const a = designs[i];
      const b = designs[j];
      if (a.groupId && a.groupId === b.groupId) continue;
      if (rectsOverlap(designBounds(a), designBounds(b))) {
        issues.push({ kind: "overlap", severity: "warning", designIds: [a.id, b.id], message: `${label(a)} overlaps ${label(b)}.` });
      }
    }
  }

  const order = { error: 0, warning: 1 };
  return issues.sort((x, y) => order[x.severity] - order[y.severity]);
}
