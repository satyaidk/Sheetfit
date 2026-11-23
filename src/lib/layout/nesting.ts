/**
 * Rectangle nesting for Auto Arrange: MaxRects.
 *
 * Why MaxRects: designs are rectangles (rotated designs and contour stickers
 * are handled through their axis-aligned clearance rectangles), jobs are
 * small (tens to a few hundred items), and MaxRects with best-short-side-fit
 * is one of the tightest simple packers for mixed sizes (Jukka Jylänki, "A
 * Thousand Ways to Pack the Bin", 2010). It also accepts pre-placed
 * obstacles (locked designs) by simply cutting them out of the free space,
 * which shelf and guillotine packers handle poorly.
 *
 * Each item is a *clearance rectangle* (its cut path grown by half the
 * required spacing, or by its bleed when that is larger), so two clearance
 * rectangles that do not overlap guarantee the spacing between cut paths and
 * that no bleed prints onto a neighbour. Each orientation also carries how far
 * its printed content sits inside that rectangle on each side, so the packer
 * can keep the content (not the clearance) inside the printable area.
 *
 * Deterministic: items are ordered by area, then longest side, then id, and
 * ties between positions break on y then x. Same input, same layout.
 */

import type { Rect } from "@/lib/image/image-fit";

export interface Insets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface NestOrientation {
  width: number;
  height: number;
  /** Distance from each clearance edge to the content that must stay inside the area. */
  inset: Insets;
}

export interface NestItem {
  id: string;
  /** Allowed orientations; index 0 is the current one, index 1 (if any) is turned 90°. */
  orientations: NestOrientation[];
}

export interface NestPlacement {
  id: string;
  orientation: number;
  /** Top-left of the clearance rectangle. */
  x: number;
  y: number;
}

export type NestStrategy = "compact" | "rows";

export interface NestResult {
  placements: NestPlacement[];
  unplaced: string[];
}

const EPS = 1e-6;

function contains(a: Rect, b: Rect): boolean {
  return b.x >= a.x - EPS && b.y >= a.y - EPS && b.x + b.width <= a.x + a.width + EPS && b.y + b.height <= a.y + a.height + EPS;
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width - EPS && b.x < a.x + a.width - EPS && a.y < b.y + b.height - EPS && b.y < a.y + a.height - EPS;
}

function intersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.width, b.x + b.width);
  const btm = Math.min(a.y + a.height, b.y + b.height);
  return r - x > -EPS && btm - y > -EPS ? { x, y, width: Math.max(0, r - x), height: Math.max(0, btm - y) } : null;
}

/** Content area plus each orientation's insets: where its clearance rectangle may go. */
function allowedRegion(area: Rect, inset: Insets): Rect {
  return {
    x: area.x - inset.left,
    y: area.y - inset.top,
    width: area.width + inset.left + inset.right,
    height: area.height + inset.top + inset.bottom,
  };
}

export class MaxRectsBin {
  free: Rect[];

  constructor(readonly area: Rect, readonly bound: Rect) {
    this.free = [bound];
  }

  /** Remove an occupied rectangle from the free space. */
  occupy(r: Rect) {
    const next: Rect[] = [];
    for (const f of this.free) {
      if (!intersects(f, r)) {
        next.push(f);
        continue;
      }
      if (r.x > f.x + EPS) next.push({ x: f.x, y: f.y, width: r.x - f.x, height: f.height });
      if (r.x + r.width < f.x + f.width - EPS)
        next.push({ x: r.x + r.width, y: f.y, width: f.x + f.width - (r.x + r.width), height: f.height });
      if (r.y > f.y + EPS) next.push({ x: f.x, y: f.y, width: f.width, height: r.y - f.y });
      if (r.y + r.height < f.y + f.height - EPS)
        next.push({ x: f.x, y: r.y + r.height, width: f.width, height: f.y + f.height - (r.y + r.height) });
    }
    // Prune rectangles contained in another (keep the first of equal pairs).
    this.free = next.filter((a, i) => !next.some((b, j) => j !== i && contains(b, a) && (!contains(a, b) || j < i)));
  }

  /** Best position for one orientation, or null. Lower score is better. */
  find(o: NestOrientation, strategy: NestStrategy): { x: number; y: number; score: number[] } | null {
    const region = allowedRegion(this.area, o.inset);
    let best: { x: number; y: number; score: number[] } | null = null;
    for (const f of this.free) {
      const space = intersection(f, region);
      if (!space || space.width < o.width - EPS || space.height < o.height - EPS) continue;
      const leftoverW = space.width - o.width;
      const leftoverH = space.height - o.height;
      const score =
        strategy === "rows"
          ? [round(space.y), round(space.x)]
          : [round(Math.min(leftoverW, leftoverH)), round(Math.max(leftoverW, leftoverH)), round(space.y), round(space.x)];
      if (!best || compareScores(score, best.score) < 0) best = { x: space.x, y: space.y, score };
    }
    return best;
  }
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;

function compareScores(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function maxInset(items: NestItem[]): Insets {
  const m = { left: 0, top: 0, right: 0, bottom: 0 };
  for (const it of items)
    for (const o of it.orientations) {
      m.left = Math.max(m.left, o.inset.left);
      m.top = Math.max(m.top, o.inset.top);
      m.right = Math.max(m.right, o.inset.right);
      m.bottom = Math.max(m.bottom, o.inset.bottom);
    }
  return m;
}

/** Deterministic packing order: big first. */
export function nestOrder(items: NestItem[]): NestItem[] {
  return [...items].sort((a, b) => {
    const A = a.orientations[0];
    const B = b.orientations[0];
    return (
      B.width * B.height - A.width * A.height ||
      Math.max(B.width, B.height) - Math.max(A.width, A.height) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );
  });
}

/** True when an item could fit on an empty area in some orientation. */
export function fitsEmpty(item: NestItem, area: Rect): boolean {
  return item.orientations.some((o) => {
    const r = allowedRegion(area, o.inset);
    return o.width <= r.width + EPS && o.height <= r.height + EPS;
  });
}

/**
 * Pack items into one area around fixed obstacles (clearance rectangles of
 * designs that must not move). `area` is where content must stay (the
 * printable area).
 */
export function nest(items: NestItem[], area: Rect, obstacles: Rect[] = [], strategy: NestStrategy = "compact"): NestResult {
  const m = maxInset(items);
  const bin = new MaxRectsBin(area, allowedRegion(area, m));
  for (const ob of obstacles) bin.occupy(ob);
  const placements: NestPlacement[] = [];
  const unplaced: string[] = [];
  for (const item of nestOrder(items)) {
    let chosen: { orientation: number; x: number; y: number; score: number[] } | null = null;
    item.orientations.forEach((o, i) => {
      const hit = bin.find(o, strategy);
      if (hit && (!chosen || compareScores(hit.score, chosen.score) < 0)) chosen = { orientation: i, ...hit };
    });
    if (!chosen) {
      unplaced.push(item.id);
      continue;
    }
    const c = chosen as { orientation: number; x: number; y: number };
    const o = item.orientations[c.orientation];
    bin.occupy({ x: c.x, y: c.y, width: o.width, height: o.height });
    placements.push({ id: item.id, orientation: c.orientation, x: c.x, y: c.y });
  }
  return { placements, unplaced };
}

export interface MultiPageResult {
  /** Placements per page; page 0 is the current page (with its obstacles). */
  pages: NestPlacement[][];
  /** Items that fit on no empty page at all (larger than the printable area). */
  tooLarge: string[];
  /** Items left over when extra pages are not allowed or the page cap is hit. */
  unplaced: string[];
}

/** Hard cap on pages one Auto Arrange may create. */
export const MAX_ARRANGE_PAGES = 50;

/**
 * Pack onto the current page, then onto as many fresh pages as needed (when
 * `extraPages` is on). Items that do not fit even an empty page are reported,
 * never scaled.
 */
export function nestPages(
  items: NestItem[],
  area: Rect,
  obstacles: Rect[],
  options: { strategy?: NestStrategy; extraPages: boolean; maxPages?: number },
): MultiPageResult {
  const tooLarge = items.filter((i) => !fitsEmpty(i, area)).map((i) => i.id);
  let remaining = items.filter((i) => !tooLarge.includes(i.id));
  const pages: NestPlacement[][] = [];
  const first = nest(remaining, area, obstacles, options.strategy);
  pages.push(first.placements);
  remaining = remaining.filter((i) => first.unplaced.includes(i.id));
  const cap = options.maxPages ?? MAX_ARRANGE_PAGES;
  while (options.extraPages && remaining.length > 0 && pages.length < cap) {
    const r = nest(remaining, area, [], options.strategy);
    if (r.placements.length === 0) break;
    pages.push(r.placements);
    remaining = remaining.filter((i) => r.unplaced.includes(i.id));
  }
  return { pages, tooLarge, unplaced: remaining.map((i) => i.id) };
}
