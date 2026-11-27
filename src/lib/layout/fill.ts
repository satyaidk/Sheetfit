/**
 * Fill a sheet with copies of one design (step and repeat).
 *
 * Gang-sheet builders call this "Auto Fill": one design duplicated to fill
 * the sheet. Sheetfit works out how many copies fit and lays them out:
 *
 * - Sizes never change. Copies keep the design's size, crop, fit and cut.
 * - Spacing is the page's spacing *between cut paths*, measured exactly like
 *   Auto Arrange (`clearanceRect`), so bleeds never print onto a neighbour.
 * - Everything that prints stays inside the printable area.
 * - Other designs on the page are left where they are; copies only go into
 *   the free space around them.
 * - Copies of the same design already on the page ("twins": same image,
 *   size, crop and cut) are replaced, so pressing Fill twice gives the same
 *   sheet rather than one more copy.
 *
 * On an empty sheet the layout is a clean grid, and the best of these wins
 * (ties go to the simpler layout):
 *   1. a grid in the design's orientation;
 *   2. a grid turned 90° (when turning is allowed);
 *   3. either grid plus a band of turned copies in the strip left over on the
 *      right or at the bottom.
 * With other designs on the page, the MaxRects packer places the copies.
 * The grid block is centred in the printable area so the margins are even.
 */

import type { Design, PageSettings } from "@/types/editor";
import type { Rect } from "@/lib/image/image-fit";
import { printableRect } from "./sheet-layout";
import { clearanceRect, markObstacles, orientationFor, turned } from "./arrange";
import { nest, type NestItem, type NestOrientation } from "./nesting";

export interface FillOptions {
  /** Allow copies turned 90° (never for rotation-locked or two-sided designs). */
  rotate: boolean;
  /** Most copies to place, source included. */
  max?: number;
  /** Ignore the other designs (capacity of an empty page). */
  emptyPage?: boolean;
}

export interface FillSlot {
  /** Top-left of the unrotated design box, page mm. */
  x: number;
  y: number;
  rotation: number;
}

export interface FillPlan {
  /** Where the source (first) and each copy go. */
  slots: FillSlot[];
  layout: "grid" | "grid-turned" | "grid-mixed" | "packed" | "none";
  /** Columns and rows of the main grid, when the layout is a grid. */
  cols: number;
  rows: number;
  /** Twins already on the page that the fill replaces. */
  replaces: string[];
}

/**
 * Whether copies of a design may be turned 90° when filling: never for a
 * rotation-locked design; always for straps (their layout already mixes
 * directions); otherwise as the user set it for Auto Arrange.
 */
export function fillTurns(design: Pick<Design, "lockRotation" | "strap">, arrangeRotate: boolean): boolean {
  return !design.lockRotation && (arrangeRotate || !!design.strap);
}

/** Upper bound on copies one fill may make. */
export const MAX_FILL = 1000;

const EPS = 1e-6;
const sameNum = (a: number, b: number) => Math.abs(a - b) < 0.01;

/**
 * Copies of `source` on the page: same image (or the same empty product box),
 * same size, crop, fit, flips and cut, at any quarter turn. Pairs and locked
 * designs are never twins.
 */
export function twinsOf(source: Design, designs: Design[]): Design[] {
  const key = (d: Design) =>
    JSON.stringify([
      d.assetId,
      d.productId,
      d.fitMode,
      d.crop,
      d.view,
      d.flipX,
      d.flipY,
      d.padding,
      d.bleed,
      d.cut ? [d.cut.shape, d.cut.offset, d.cut.radius, d.cut.through] : null,
      d.strap ? [d.strap.fold, d.strap.endZone, d.strap.mode, d.strap.along] : null,
    ]);
  const k = key(source);
  return designs.filter(
    (d) =>
      d.id !== source.id &&
      !d.locked &&
      !d.pairId &&
      sameNum(d.width, source.width) &&
      sameNum(d.height, source.height) &&
      // Any quarter turn: a copy Fill turned to fit is still a copy.
      Math.abs(d.rotation - Math.round(d.rotation / 90) * 90) < 1e-6 &&
      key(d) === k,
  );
}

interface Orient {
  o: NestOrientation;
  /** Clearance rectangle of the design in this orientation, at its current position. */
  clearance: Rect;
  design: Design;
}

function region(area: Rect, o: NestOrientation): Rect {
  return {
    x: area.x - o.inset.left,
    y: area.y - o.inset.top,
    width: area.width + o.inset.left + o.inset.right,
    height: area.height + o.inset.top + o.inset.bottom,
  };
}

const fitCount = (len: number, cell: number) => (cell > 0 ? Math.max(0, Math.floor((len + EPS) / cell)) : 0);

/** A grid's clearance-rectangle positions (top-left), within `r`. */
function gridCells(r: Rect, o: NestOrientation, cols: number, rows: number, at: { x: number; y: number }) {
  const cells: { x: number; y: number }[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ x: at.x + i * o.width, y: at.y + j * o.height });
  return cells;
}

interface Candidate {
  layout: FillPlan["layout"];
  cols: number;
  rows: number;
  /** Clearance positions with their orientation. */
  cells: { x: number; y: number; orient: Orient }[];
}

function gridCandidates(area: Rect, a: Orient, b: Orient | null): Candidate[] {
  const out: Candidate[] = [];
  const build = (main: Orient, other: Orient | null, layout: Candidate["layout"]) => {
    const rm = region(area, main.o);
    const cols = fitCount(rm.width, main.o.width);
    const rows = fitCount(rm.height, main.o.height);
    if (cols * rows === 0) return;
    const usedW = cols * main.o.width;
    const usedH = rows * main.o.height;
    // Centre the block in the allowed region.
    const base = { x: rm.x + (rm.width - usedW) / 2, y: rm.y + (rm.height - usedH) / 2 };
    const cells = gridCells(rm, main.o, cols, rows, base).map((c) => ({ ...c, orient: main }));
    out.push({ layout, cols, rows, cells });
    if (!other) return;
    const ro = region(area, other.o);
    // Band on the right: the main grid packed to the left, turned copies in the strip.
    const bandW = ro.x + ro.width - (rm.x + usedW);
    const bCols = fitCount(bandW, other.o.width);
    const bRows = fitCount(ro.height, other.o.height);
    if (bCols * bRows > 0) {
      const left = gridCells(rm, main.o, cols, rows, { x: rm.x, y: rm.y + (rm.height - usedH) / 2 }).map((c) => ({ ...c, orient: main }));
      const bx = rm.x + usedW;
      const band = gridCells(ro, other.o, bCols, bRows, { x: bx, y: ro.y + (ro.height - bRows * other.o.height) / 2 }).map((c) => ({ ...c, orient: other }));
      out.push({ layout: "grid-mixed", cols, rows, cells: [...left, ...band] });
    }
    // Band at the bottom.
    const bandH = ro.y + ro.height - (rm.y + usedH);
    const hRows = fitCount(bandH, other.o.height);
    const hCols = fitCount(ro.width, other.o.width);
    if (hCols * hRows > 0) {
      const top = gridCells(rm, main.o, cols, rows, { x: rm.x + (rm.width - usedW) / 2, y: rm.y }).map((c) => ({ ...c, orient: main }));
      const by = rm.y + usedH;
      const band = gridCells(ro, other.o, hCols, hRows, { x: ro.x + (ro.width - hCols * other.o.width) / 2, y: by }).map((c) => ({ ...c, orient: other }));
      out.push({ layout: "grid-mixed", cols, rows, cells: [...top, ...band] });
    }
  };
  build(a, b, "grid");
  if (b) build(b, a, "grid-turned");
  return out;
}

function orientations(source: Design, spacing: number, rotate: boolean): { a: Orient; b: Orient | null } {
  const base = orientationFor([source], spacing);
  const a: Orient = { o: base.o, clearance: base.clearance, design: source };
  if (!rotate || source.lockRotation || source.pairId) return { a, b: null };
  const t = turned(source);
  const tb = orientationFor([t], spacing);
  if (Math.abs(tb.o.width - base.o.width) < EPS && Math.abs(tb.o.height - base.o.height) < EPS) return { a, b: null };
  return { a, b: { o: tb.o, clearance: tb.clearance, design: t } };
}

const toSlot = (cell: { x: number; y: number; orient: Orient }): FillSlot => ({
  x: cell.orient.design.x + (cell.x - cell.orient.clearance.x),
  y: cell.orient.design.y + (cell.y - cell.orient.clearance.y),
  rotation: cell.orient.design.rotation,
});

/**
 * Plan a fill of `page` with copies of `source`. `designs` are the page's
 * designs (the source and its twins included; they are handled here).
 */
export function planFill(source: Design, page: PageSettings, designs: Design[], options: FillOptions): FillPlan {
  const area = printableRect(page);
  const spacing = Math.max(0, page.spacing);
  const max = Math.max(1, Math.min(MAX_FILL, options.max ?? MAX_FILL));
  const twins = twinsOf(source, designs);
  const replaces = twins.map((t) => t.id);
  const others = options.emptyPage
    ? []
    : designs.filter((d) => d.id !== source.id && !replaces.includes(d.id));
  const { a, b } = orientations(source, spacing, options.rotate);
  const obstacles = [...others.map((d) => clearanceRect(d, spacing)), ...markObstacles(page)];
  const none: FillPlan = { slots: [], layout: "none", cols: 0, rows: 0, replaces };

  if (obstacles.length === 0) {
    const candidates = gridCandidates(area, a, b);
    if (candidates.length === 0) return none;
    // Most copies wins; on a tie the earlier (simpler) candidate stays.
    let best = candidates[0];
    for (const c of candidates) if (c.cells.length > best.cells.length) best = c;
    const cells = best.cells.slice(0, max);
    return { slots: cells.map(toSlot), layout: best.layout, cols: best.cols, rows: best.rows, replaces };
  }

  // Around other designs: pack identical items with MaxRects.
  const items: NestItem[] = [];
  const cellArea = a.o.width * a.o.height;
  const bound = Math.min(max, Math.ceil((region(area, a.o).width * region(area, a.o).height) / Math.max(cellArea, EPS)) + 1);
  for (let i = 0; i < bound; i++) {
    items.push({ id: `c${String(i).padStart(4, "0")}`, orientations: b ? [a.o, b.o] : [a.o] });
  }
  const result = nest(items, area, obstacles, "rows");
  const orients = b ? [a, b] : [a];
  const slots = result.placements
    .sort((p, q) => p.y - q.y || p.x - q.x)
    .map((p) => toSlot({ x: p.x, y: p.y, orient: orients[p.orientation] }));
  return { slots, layout: slots.length > 0 ? "packed" : "none", cols: 0, rows: 0, replaces };
}

/** How many copies of `source` fit: on this page (around other designs) and on an empty page. */
export function fillCapacity(source: Design, page: PageSettings, designs: Design[], rotate: boolean): { here: number; empty: number } {
  const empty = planFill(source, page, [source], { rotate, emptyPage: true }).slots.length;
  const others = designs.filter((d) => d.id !== source.id && !twinsOf(source, designs).some((t) => t.id === d.id));
  const here = others.length === 0 ? empty : planFill(source, page, designs, { rotate }).slots.length;
  return { here, empty };
}
