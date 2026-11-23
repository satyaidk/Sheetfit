/**
 * Two-sided cards: a front and a back printed side by side.
 *
 * The two sides are separate designs with the same physical size, linked by a
 * shared `pairId` and tagged `side: "front" | "back"`. Each side keeps its own
 * image, crop and fit; the pair moves, duplicates and arranges as one block.
 * The back sits to the right of the front with `pairGap` millimetres between
 * their cut paths (more if the bleeds would otherwise overlap). Nothing is
 * ever invented: a card with one image is a one-sided card, and a back is only
 * created when the user adds one.
 */

import type { Design } from "@/types/editor";
import type { Rect } from "@/lib/image/image-fit";
import { contentBounds, cutBounds } from "./arrange";

/** The gap actually used: the requested one, or more when bleeds would touch. */
export function effectivePairGap(front: Design, back: Design, pairGap: number): number {
  const fc = cutBounds(front);
  const fo = contentBounds(front);
  const bc = cutBounds(back);
  const bo = contentBounds(back);
  const overhang = fo.x + fo.width - (fc.x + fc.width) + (bc.x - bo.x);
  return Math.max(0, pairGap, overhang);
}

/** Position of the back so it sits right of the front, tops of the cut paths aligned. */
export function placeBackOf(front: Design, back: Design, pairGap: number): Pick<Design, "x" | "y"> {
  const gap = effectivePairGap(front, back, pairGap);
  const fc = cutBounds(front);
  const bc = cutBounds(back);
  return { x: back.x + (fc.x + fc.width + gap - bc.x), y: back.y + (fc.y - bc.y) };
}

/**
 * Move a block of designs (a card pair) by the smallest shift that brings
 * everything it prints inside `area`. Sizes never change; a block larger than
 * the area is left where it is (the margin warning then explains it).
 */
export function shiftBlockInto<T extends Design>(block: T[], area: Rect): T[] {
  const all = block.map(contentBounds);
  const x = Math.min(...all.map((r) => r.x));
  const y = Math.min(...all.map((r) => r.y));
  const right = Math.max(...all.map((r) => r.x + r.width));
  const bottom = Math.max(...all.map((r) => r.y + r.height));
  const shift = (lo: number, hi: number, min: number, max: number) =>
    hi - lo > max - min + 1e-9 ? 0 : lo < min ? min - lo : hi > max ? max - hi : 0;
  const dx = shift(x, right, area.x, area.x + area.width);
  const dy = shift(y, bottom, area.y, area.y + area.height);
  return dx === 0 && dy === 0 ? block : block.map((d) => ({ ...d, x: d.x + dx, y: d.y + dy }));
}

/** Members of a pair in a document, front first. */
export function pairMembers(designs: Design[], pairId: string | null): Design[] {
  if (!pairId) return [];
  return designs
    .filter((d) => d.pairId === pairId)
    .sort((a, b) => (a.side === "front" ? -1 : 0) - (b.side === "front" ? -1 : 0));
}

/** The other side of a paired design, if any. */
export function partnerOf(designs: Design[], d: Design): Design | undefined {
  return d.pairId ? designs.find((o) => o.pairId === d.pairId && o.id !== d.id) : undefined;
}

/** Measured gap between the cut paths of two side-by-side designs (mm). */
export function measuredPairGap(front: Design, back: Design): number {
  const fc = cutBounds(front);
  const bc = cutBounds(back);
  return bc.x - (fc.x + fc.width);
}
