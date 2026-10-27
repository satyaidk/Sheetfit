/**
 * Sheet geometry: sheet size, printable area, and bounds checks.
 *
 * Page coordinates have their origin at the top-left corner of the sheet,
 * x to the right and y downward, in millimetres. A design's `x`/`y` is the
 * top-left of its unrotated box; rotation happens around the box centre, so
 * bounds checks use the axis-aligned bounding box of the rotated rectangle.
 * The sheet itself (A4, A3, Letter, DTF roll, custom) comes from
 * `lib/catalogue/sheets.ts`.
 */

import type { Design, Margins, Orientation, PageSettings } from "@/types/editor";
import type { Rect, Size } from "@/lib/image/image-fit";
import { DEFAULT_SHEET_ID, findSheet } from "@/lib/catalogue/sheets";

export const A4_MM: Size = { width: 210, height: 297 };

/** Floating-point tolerance for "touching the edge" comparisons, in mm. */
const EPSILON = 1e-6;

export type SheetRef = Pick<PageSettings, "sheet" | "customSize" | "orientation">;

/** Portrait size of a sheet reference (width ≤ height for paper presets). */
export function sheetBaseSize(page: Pick<PageSettings, "sheet" | "customSize">): Size {
  if (page.sheet === "custom" && page.customSize) return { ...page.customSize };
  const sheet = findSheet(page.sheet) ?? findSheet(DEFAULT_SHEET_ID)!;
  return { width: sheet.width, height: sheet.height };
}

/** Sheet size in the chosen orientation. Landscape puts the long side across. */
export function pageSize(page: SheetRef): Size {
  const base = sheetBaseSize(page);
  const long = Math.max(base.width, base.height);
  const short = Math.min(base.width, base.height);
  return page.orientation === "portrait" ? { width: short, height: long } : { width: long, height: short };
}

/** Display name of a page's sheet, e.g. "A3" or "DTF gang sheet 22 × 24 in". */
export function sheetLabel(page: Pick<PageSettings, "sheet">): string {
  if (page.sheet === "custom") return "Custom";
  return findSheet(page.sheet)?.name ?? "A4";
}

export function orientationFor(size: Size): Orientation {
  return size.width > size.height ? "landscape" : "portrait";
}

export function pageRect(page: SheetRef): Rect {
  return { x: 0, y: 0, ...pageSize(page) };
}

export function printableRect(page: SheetRef & Pick<PageSettings, "margins">): Rect {
  const size = pageSize(page);
  const m = page.margins;
  return {
    x: m.left,
    y: m.top,
    width: Math.max(0, size.width - m.left - m.right),
    height: Math.max(0, size.height - m.top - m.bottom),
  };
}

export function uniformMargins(mm: number): Margins {
  return { top: mm, right: mm, bottom: mm, left: mm };
}

type Placed = Pick<Design, "x" | "y" | "width" | "height" | "rotation">;

export function boxCenter(d: Placed): { x: number; y: number } {
  return { x: d.x + d.width / 2, y: d.y + d.height / 2 };
}

/** Axis-aligned bounds of a (possibly rotated) design box. */
export function designBounds(d: Placed): Rect {
  const rad = (d.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = d.width * cos + d.height * sin;
  const h = d.width * sin + d.height * cos;
  const c = boxCenter(d);
  return { x: c.x - w / 2, y: c.y - h / 2, width: w, height: h };
}

export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x - EPSILON &&
    inner.y >= outer.y - EPSILON &&
    inner.x + inner.width <= outer.x + outer.width + EPSILON &&
    inner.y + inner.height <= outer.y + outer.height + EPSILON
  );
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width - EPSILON &&
    b.x < a.x + a.width - EPSILON &&
    a.y < b.y + b.height - EPSILON &&
    b.y < a.y + a.height - EPSILON
  );
}

export interface PlacementStatus {
  exceedsPage: boolean;
  exceedsPrintable: boolean;
  /** True when the design is larger than the printable area on some axis. */
  largerThanPrintable: boolean;
}

export function placementStatus(
  design: Placed,
  page: SheetRef & Pick<PageSettings, "margins">,
): PlacementStatus {
  const bounds = designBounds(design);
  const printable = printableRect(page);
  return {
    exceedsPage: !rectContains(pageRect(page), bounds),
    exceedsPrintable: !rectContains(printable, bounds),
    largerThanPrintable:
      bounds.width > printable.width + EPSILON ||
      bounds.height > printable.height + EPSILON,
  };
}

/**
 * Move a design so its bounds sit inside `area`, without resizing it.
 * When the design is larger than the area on an axis it is centred on that
 * axis instead, which keeps the overflow symmetrical and visible.
 */
export function clampIntoRect<T extends Placed>(design: T, area: Rect): T {
  const b = designBounds(design);
  let dx = 0;
  let dy = 0;
  if (b.width > area.width) dx = area.x + (area.width - b.width) / 2 - b.x;
  else if (b.x < area.x) dx = area.x - b.x;
  else if (b.x + b.width > area.x + area.width)
    dx = area.x + area.width - (b.x + b.width);
  if (b.height > area.height) dy = area.y + (area.height - b.height) / 2 - b.y;
  else if (b.y < area.y) dy = area.y - b.y;
  else if (b.y + b.height > area.y + area.height)
    dy = area.y + area.height - (b.y + b.height);
  return { ...design, x: design.x + dx, y: design.y + dy };
}

/** Position that centres a design's bounds inside `area`. */
export function centerIn<T extends Placed>(
  design: T,
  area: Rect,
  axis: "both" | "x" | "y" = "both",
): T {
  const b = designBounds(design);
  const dx = area.x + (area.width - b.width) / 2 - b.x;
  const dy = area.y + (area.height - b.height) / 2 - b.y;
  return {
    ...design,
    x: axis === "y" ? design.x : design.x + dx,
    y: axis === "x" ? design.y : design.y + dy,
  };
}

/** True when a page point (mm) lies inside a design's rotated box. */
export function pointInDesign(d: Placed, p: { x: number; y: number }): boolean {
  const c = boxCenter(d);
  const rad = (-d.rotation * Math.PI) / 180;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(lx) <= d.width / 2 && Math.abs(ly) <= d.height / 2;
}

/** Top-most design (last in z-order) under a point that matches `filter`. */
export function designAt<T extends Placed>(designs: T[], p: { x: number; y: number }, filter: (d: T) => boolean = () => true): T | undefined {
  for (let i = designs.length - 1; i >= 0; i--) {
    if (filter(designs[i]) && pointInDesign(designs[i], p)) return designs[i];
  }
  return undefined;
}
