/**
 * Alignment and snapping helpers.
 *
 * Alignment moves designs so their rotated bounds line up with an edge or
 * centre of a reference rectangle (the printable area, the page, or the
 * union of the selection). Snapping proposes small corrections while a design
 * is being dragged and reports which guide lines were hit so the canvas can
 * draw them.
 */

import type { Design } from "@/types/editor";
import type { Rect } from "@/lib/image/image-fit";
import { designBounds } from "./a4-layout";

export type AlignTarget =
  | "left"
  | "center-x"
  | "right"
  | "top"
  | "center-y"
  | "bottom";

type Placed = Pick<Design, "x" | "y" | "width" | "height" | "rotation">;

export function unionBounds(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function alignDesign<T extends Placed>(
  design: T,
  target: AlignTarget,
  ref: Rect,
): T {
  const b = designBounds(design);
  let dx = 0;
  let dy = 0;
  switch (target) {
    case "left":
      dx = ref.x - b.x;
      break;
    case "center-x":
      dx = ref.x + ref.width / 2 - (b.x + b.width / 2);
      break;
    case "right":
      dx = ref.x + ref.width - (b.x + b.width);
      break;
    case "top":
      dy = ref.y - b.y;
      break;
    case "center-y":
      dy = ref.y + ref.height / 2 - (b.y + b.height / 2);
      break;
    case "bottom":
      dy = ref.y + ref.height - (b.y + b.height);
      break;
  }
  return { ...design, x: design.x + dx, y: design.y + dy };
}

/**
 * Move a set of designs as one block so the block aligns to `ref`.
 * Relative positions inside the block are preserved.
 */
export function alignGroup<T extends Placed>(
  designs: T[],
  target: AlignTarget,
  ref: Rect,
): T[] {
  const block = unionBounds(designs.map(designBounds));
  if (!block) return designs;
  const moved = alignDesign(
    { x: block.x, y: block.y, width: block.width, height: block.height, rotation: 0 },
    target,
    ref,
  );
  const dx = moved.x - block.x;
  const dy = moved.y - block.y;
  return designs.map((d) => ({ ...d, x: d.x + dx, y: d.y + dy }));
}

export interface SnapGuide {
  orientation: "vertical" | "horizontal";
  /** Position of the guide line in page millimetres. */
  position: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

/**
 * Snap a moving rectangle's edges and centre to candidate guide positions.
 * Returns the correction to apply and the guides that matched.
 */
export function snapRect(
  moving: Rect,
  verticalLines: number[],
  horizontalLines: number[],
  threshold: number,
): SnapResult {
  const xs = [moving.x, moving.x + moving.width / 2, moving.x + moving.width];
  const ys = [moving.y, moving.y + moving.height / 2, moving.y + moving.height];
  const best = (points: number[], lines: number[]) => {
    let hit: { delta: number; line: number } | null = null;
    for (const p of points) {
      for (const line of lines) {
        const delta = line - p;
        if (Math.abs(delta) <= threshold && (!hit || Math.abs(delta) < Math.abs(hit.delta))) {
          hit = { delta, line };
        }
      }
    }
    return hit;
  };
  const sx = best(xs, verticalLines);
  const sy = best(ys, horizontalLines);
  const guides: SnapGuide[] = [];
  if (sx) guides.push({ orientation: "vertical", position: sx.line });
  if (sy) guides.push({ orientation: "horizontal", position: sy.line });
  return { dx: sx?.delta ?? 0, dy: sy?.delta ?? 0, guides };
}

export function snapToGrid(value: number, grid: number, origin = 0): number {
  if (grid <= 0) return value;
  return origin + Math.round((value - origin) / grid) * grid;
}
