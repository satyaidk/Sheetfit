/**
 * Resolve where a dragged design should land.
 *
 * The canvas proposes a raw position from the pointer; this function applies,
 * in order: grid snapping or guide snapping (page centre, printable edges and
 * the edges/centres of other designs), then the optional constraint that keeps
 * the design inside the printable area. It returns the guides that matched so
 * the canvas can draw them.
 */

import type { Design, PageSettings } from "@/types/editor";
import { clampIntoRect, designBounds, pageSize, printableRect } from "./a4-layout";
import { snapRect, snapToGrid, type SnapGuide } from "./alignment";

/** Snap distance in screen pixels; converted to millimetres using the zoom. */
export const SNAP_SCREEN_PX = 6;

export interface DragContext {
  page: PageSettings;
  others: Pick<Design, "x" | "y" | "width" | "height" | "rotation">[];
  /** Screen pixels per millimetre at the current zoom. */
  pxPerMm: number;
  /** Disable snapping temporarily (e.g. while Alt is held). */
  bypassSnap?: boolean;
}

export function resolveDrag<T extends Pick<Design, "x" | "y" | "width" | "height" | "rotation">>(
  candidate: T,
  ctx: DragContext,
): { x: number; y: number; guides: SnapGuide[] } {
  let { x, y } = candidate;
  let guides: SnapGuide[] = [];
  const b = designBounds(candidate);

  if (!ctx.bypassSnap && ctx.page.snapToGrid && ctx.page.gridSize > 0) {
    x += snapToGrid(b.x, ctx.page.gridSize) - b.x;
    y += snapToGrid(b.y, ctx.page.gridSize) - b.y;
  } else if (!ctx.bypassSnap && ctx.page.snapToGuides) {
    const size = pageSize(ctx.page.orientation);
    const printable = printableRect(ctx.page);
    const vertical = [
      size.width / 2,
      printable.x,
      printable.x + printable.width,
      0,
      size.width,
    ];
    const horizontal = [
      size.height / 2,
      printable.y,
      printable.y + printable.height,
      0,
      size.height,
    ];
    for (const o of ctx.others) {
      const ob = designBounds(o);
      vertical.push(ob.x, ob.x + ob.width / 2, ob.x + ob.width);
      horizontal.push(ob.y, ob.y + ob.height / 2, ob.y + ob.height);
    }
    const snap = snapRect(b, vertical, horizontal, SNAP_SCREEN_PX / ctx.pxPerMm);
    x += snap.dx;
    y += snap.dy;
    guides = snap.guides;
  }

  if (ctx.page.constrainToPrintable) {
    const clamped = clampIntoRect({ ...candidate, x, y }, printableRect(ctx.page));
    // Drop guides that the clamp moved us away from.
    if (clamped.x !== x) guides = guides.filter((g) => g.orientation !== "vertical");
    if (clamped.y !== y) guides = guides.filter((g) => g.orientation !== "horizontal");
    x = clamped.x;
    y = clamped.y;
  }
  return { x, y, guides };
}
