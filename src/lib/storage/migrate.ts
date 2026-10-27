/**
 * Upgrade documents saved by older versions.
 *
 * v0.1 stored `page.paper: "A4"` and designs without slots, flips or bleed.
 * Loading always goes through `migrateDocument`, so the rest of the app can
 * rely on the current shape.
 */

import type { Design, EditorDocument, PageSettings } from "@/types/editor";
import { DEFAULT_SHEET_ID } from "@/lib/catalogue/sheets";

/** v0.1 pages had `paper: "A4"` instead of `sheet`. */
type LegacyPage = Partial<PageSettings> & { paper?: string };

export function migratePage(page: LegacyPage): PageSettings {
  const process = page.process ?? "sublimation";
  return {
    sheet: page.sheet ?? (page.paper === "A4" ? "a4" : DEFAULT_SHEET_ID),
    customSize: page.customSize ?? null,
    orientation: page.orientation ?? "portrait",
    process,
    mirrorOutput: page.mirrorOutput ?? false,
    margins: page.margins ?? { top: 5, right: 5, bottom: 5, left: 5 },
    background: page.background === undefined ? "#ffffff" : page.background,
    dpi: page.dpi ?? 300,
    showGrid: page.showGrid ?? false,
    snapToGrid: page.snapToGrid ?? false,
    gridSize: page.gridSize ?? 5,
    snapToGuides: page.snapToGuides ?? true,
    constrainToPrintable: page.constrainToPrintable ?? true,
    cropMarks: page.cropMarks ?? false,
  };
}

export function migrateDesign(d: Partial<Design>): Design {
  return {
    ...(d as Design),
    assetId: d.assetId ?? null,
    productId: d.productId ?? null,
    productColor: d.productColor ?? null,
    bleed: d.bleed ?? 0,
    flipX: d.flipX ?? false,
    flipY: d.flipY ?? false,
  };
}

export function migrateDocument(doc: { page: LegacyPage; designs: Partial<Design>[] }): EditorDocument {
  return { page: migratePage(doc.page), designs: doc.designs.map(migrateDesign) };
}

/** Pages of a stored project: v0.3 records list them, older ones only have `document`. */
export function migratePages(record: {
  document: { page: LegacyPage; designs: Partial<Design>[] };
  pages?: { page: LegacyPage; designs: Partial<Design>[] }[];
}): EditorDocument[] {
  const pages = record.pages && record.pages.length > 0 ? record.pages : [record.document];
  return pages.map(migrateDocument);
}
