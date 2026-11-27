/**
 * Upgrade documents saved by older versions, and sanitise untrusted ones.
 *
 * v0.1 stored `page.paper: "A4"` and designs without slots, flips or bleed.
 * v0.2–v0.8 stored the output mirror as a boolean `mirrorOutput`; v0.9 stores
 * a `mirrorMode` (auto / on / off) and adds spacing, guides, cover crops, card
 * pairs and cut paths. Loading always goes through `migrateDocument`, so the
 * rest of the app can rely on the current shape.
 *
 * The rule for every new field is "open exactly as before": an old page gets
 * the mirror mode that reproduces its stored mirror, and new options default
 * to off. Numbers from a file or a database are untrusted, so non-finite or
 * negative sizes are replaced with safe values instead of reaching the
 * renderers.
 */

import type { CutSpec, Design, EditorDocument, OutputGuides, PageSettings, PrintProcess, StrapInfo } from "@/types/editor";
import { DEFAULT_SHEET_ID } from "@/lib/catalogue/sheets";
import { mirrorModeFor } from "@/lib/render/mirror";
import { normalizeView } from "@/lib/image/image-fit";
import { cutGuideOf, cutMethodOf } from "@/lib/cut/cut-method";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Older pages: `paper` instead of `sheet` (v0.1), boolean `mirrorOutput` (v0.2–v0.8). */
type LegacyPage = Partial<PageSettings> & { paper?: string; mirrorOutput?: boolean };

export const DEFAULT_GUIDES: OutputGuides = { cutlines: false, centreMarks: false, registration: false, registrationSize: 5 };

const PROCESSES: PrintProcess[] = ["sublimation", "dtf", "sticker"];

const finite = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export function migratePage(page: LegacyPage): PageSettings {
  const process: PrintProcess = PROCESSES.includes(page.process as PrintProcess) ? (page.process as PrintProcess) : "sublimation";
  const mirrorMode =
    page.mirrorMode === "auto" || page.mirrorMode === "on" || page.mirrorMode === "off"
      ? page.mirrorMode
      : // Before v0.9 a missing value meant "not mirrored".
        mirrorModeFor(process, page.mirrorOutput ?? false);
  const m = page.margins;
  return {
    sheet: page.sheet ?? (page.paper === "A4" ? "a4" : DEFAULT_SHEET_ID),
    customSize:
      page.customSize && finite(page.customSize.width, 0) > 0 && finite(page.customSize.height, 0) > 0
        ? { width: page.customSize.width, height: page.customSize.height }
        : null,
    orientation: page.orientation === "landscape" ? "landscape" : "portrait",
    process,
    mirrorMode,
    margins: m
      ? { top: finite(m.top, 5, 0), right: finite(m.right, 5, 0), bottom: finite(m.bottom, 5, 0), left: finite(m.left, 5, 0) }
      : { top: 5, right: 5, bottom: 5, left: 5 },
    background: page.background === undefined ? "#ffffff" : page.background,
    dpi: page.dpi === 150 || page.dpi === 600 ? page.dpi : 300,
    showGrid: page.showGrid ?? false,
    snapToGrid: page.snapToGrid ?? false,
    gridSize: finite(page.gridSize, 5, 0.5),
    snapToGuides: page.snapToGuides ?? true,
    constrainToPrintable: page.constrainToPrintable ?? true,
    cropMarks: page.cropMarks ?? false,
    spacing: finite(page.spacing, 5, 0, 100),
    pairGap: finite(page.pairGap, 5, 0, 100),
    guides: { ...DEFAULT_GUIDES, ...(page.guides ?? {}) },
    sheetCut: page.sheetCut ?? false,
    // v0.10: pages saved before printed cut guides existed keep printing
    // exactly as before (no line, no painted border); new pages start with
    // hand cutting in the store's DEFAULT_PAGE.
    cutMethod: cutMethodOf(page.cutMethod),
    cutGuide: cutGuideOf(page.cutGuide),
    borderFill: typeof page.borderFill === "string" && HEX_COLOR.test(page.borderFill) ? page.borderFill : null,
  };
}

function migrateCut(cut: Partial<CutSpec> | null | undefined): CutSpec | null {
  if (!cut) return null;
  const shape = cut.shape === "ellipse" || cut.shape === "contour" ? cut.shape : "rect";
  const contour =
    cut.contour && Array.isArray(cut.contour.paths)
      ? {
          ...cut.contour,
          paths: cut.contour.paths.filter((p) => Array.isArray(p) && p.length >= 6 && p.every((v) => Number.isFinite(v))),
        }
      : null;
  return {
    shape,
    radius: finite(cut.radius, 0, 0),
    offset: finite(cut.offset, 0, -50, 50),
    through: cut.through === "kiss" ? "kiss" : "die",
    safeInset: finite(cut.safeInset, 0, 0),
    contour,
  };
}

function migrateStrap(s: Partial<StrapInfo> | null | undefined): StrapInfo | null {
  if (!s || typeof s !== "object") return null;
  return {
    fold: s.fold === true,
    endZone: finite(s.endZone, 0, 0, 200),
    mode: s.mode === "repeat" || s.mode === "fill" ? s.mode : "once",
    along: s.along !== false,
    sourceAssetId: typeof s.sourceAssetId === "string" ? s.sourceAssetId : null,
  };
}

export function migrateDesign(d: Partial<Design>): Design {
  return {
    ...(d as Design),
    assetId: d.assetId ?? null,
    productId: d.productId ?? null,
    productColor: d.productColor ?? null,
    bleed: finite(d.bleed, 0, 0),
    flipX: d.flipX ?? false,
    flipY: d.flipY ?? false,
    x: finite(d.x, 0),
    y: finite(d.y, 0),
    width: finite(d.width, 10, 0.1),
    height: finite(d.height, 10, 0.1),
    rotation: finite(d.rotation, 0),
    padding: finite(d.padding, 0, 0),
    crop: d.crop ?? null,
    groupId: d.groupId ?? null,
    locked: d.locked ?? false,
    view: d.view ? normalizeView(d.view) : null,
    lockRotation: d.lockRotation ?? false,
    side: d.side === "front" || d.side === "back" ? d.side : null,
    pairId: d.pairId ?? null,
    cut: migrateCut(d.cut),
    strap: migrateStrap(d.strap),
  };
}

export function migrateDocument(doc: { page: LegacyPage; designs: Partial<Design>[] }): EditorDocument {
  return { page: migratePage(doc.page), designs: (doc.designs ?? []).map(migrateDesign) };
}

/** Pages of a stored project: v0.3 records list them, older ones only have `document`. */
export function migratePages(record: {
  document: { page: LegacyPage; designs: Partial<Design>[] };
  pages?: { page: LegacyPage; designs: Partial<Design>[] }[];
}): EditorDocument[] {
  const pages = record.pages && record.pages.length > 0 ? record.pages : [record.document];
  return pages.map(migrateDocument);
}
