/**
 * A4 page geometry: sheet size, printable area, and bounds checks.
 *
 * Page coordinates have their origin at the top-left corner of the sheet,
 * x to the right and y downward, in millimetres. A design's `x`/`y` is the
 * top-left of its unrotated box; rotation happens around the box centre, so
 * bounds checks use the axis-aligned bounding box of the rotated rectangle.
 */

import type { Design, Margins, Orientation, PageSettings } from "@/types/editor";
import type { Rect, Size } from "@/lib/image/image-fit";

export const A4_MM: Size = { width: 210, height: 297 };

/** Floating-point tolerance for "touching the edge" comparisons, in mm. */
const EPSILON = 1e-6;

export function pageSize(orientation: Orientation): Size {
  return orientation === "portrait"
    ? { width: A4_MM.width, height: A4_MM.height }
    : { width: A4_MM.height, height: A4_MM.width };
}

export function pageRect(page: Pick<PageSettings, "orientation">): Rect {
  return { x: 0, y: 0, ...pageSize(page.orientation) };
}

export function printableRect(
  page: Pick<PageSettings, "orientation" | "margins">,
): Rect {
  const size = pageSize(page.orientation);
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
  page: Pick<PageSettings, "orientation" | "margins">,
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
