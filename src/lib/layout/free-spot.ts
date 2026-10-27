/**
 * Find a free spot for a new box on a sheet that already holds designs.
 *
 * Adding a product used to drop it in the centre, on top of whatever was
 * there. Gang sheets are filled top-left first, so this uses the classic
 * bottom-left candidate heuristic: the only positions worth testing are the
 * area's corner and the right/bottom edges of boxes already placed. The first
 * candidate (top to bottom, then left to right) that stays inside the area and
 * keeps `gap` from every other box wins.
 */

import type { Rect, Size } from "@/lib/image/image-fit";

const EPS = 1e-6;

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x < b.x + b.width + gap - EPS &&
    b.x < a.x + a.width + gap - EPS &&
    a.y < b.y + b.height + gap - EPS &&
    b.y < a.y + a.height + gap - EPS
  );
}

/** Top-left corner for `size` inside `area` that keeps `gap` from `occupied`, or null. */
export function findFreeSpot(size: Size, occupied: Rect[], area: Rect, gap: number): { x: number; y: number } | null {
  if (size.width > area.width + EPS || size.height > area.height + EPS) return null;
  const xs = new Set([area.x, ...occupied.map((r) => r.x + r.width + gap)]);
  const ys = new Set([area.y, ...occupied.map((r) => r.y + r.height + gap)]);
  const candidates: { x: number; y: number }[] = [];
  for (const y of ys) for (const x of xs) candidates.push({ x, y });
  candidates.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const c of candidates) {
    const box = { ...c, ...size };
    if (box.x + box.width > area.x + area.width + EPS) continue;
    if (box.y + box.height > area.y + area.height + EPS) continue;
    if (occupied.some((r) => overlaps(box, r, gap))) continue;
    return c;
  }
  return null;
}
