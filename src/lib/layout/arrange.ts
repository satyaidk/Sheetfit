/**
 * Auto Arrange: turn designs into nesting items, pack them, and turn the
 * result back into design positions.
 *
 * Rules (all tested in `tests/v09-arrange.test.ts`):
 * - Sizes, crops and aspect ratios never change. The only change besides
 *   position is an optional 90Â° turn, and only for a single design that is not
 *   rotation-locked, when the user allows turning.
 * - Card pairs (`pairId`) and groups (`groupId`) move as one rigid block and
 *   are never turned, so a front stays next to its back.
 * - Locked designs, and designs outside the scope ("selected only"), stay
 *   where they are and count as occupied space.
 * - Spacing is measured between cut paths. Each design's clearance rectangle
 *   is its cut bounds grown by max(spacing / 2, bleed overhang) on each side,
 *   so neighbouring bleeds never print onto each other either.
 * - What prints (artwork and cut path) stays inside the printable area.
 * - Anything that fits no empty page is reported, never shrunk.
 */

import type { Design, PageSettings } from "@/types/editor";
import type { Rect } from "@/lib/image/image-fit";
import { cutPaths, localBox, pathsBounds } from "@/lib/cut/cut-path";
import { printableRect, boxCenter } from "./sheet-layout";
import { nestPages, type Insets, type NestItem, type NestOrientation, type NestStrategy } from "./nesting";
import { registrationMarks } from "@/lib/render/guides";

export interface ArrangeOptions {
  scope: "all" | "selection";
  /** Allow 90Â° turns of single designs. */
  rotate: boolean;
  /** Put what does not fit on new pages (same sheet settings). */
  extraPages: boolean;
  strategy: NestStrategy;
}

export const DEFAULT_ARRANGE: ArrangeOptions = { scope: "all", rotate: false, extraPages: false, strategy: "compact" };

/** Axis-aligned page bounds of a local rectangle of a (possibly rotated) design. */
export function localRectToPage(d: Pick<Design, "x" | "y" | "width" | "height" | "rotation">, r: Rect): Rect {
  const c = boxCenter(d);
  const rad = (d.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of [
    [r.x, r.y],
    [r.x + r.width, r.y],
    [r.x, r.y + r.height],
    [r.x + r.width, r.y + r.height],
  ]) {
    xs.push(c.x + x * cos - y * sin);
    ys.push(c.y + x * sin + y * cos);
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Page bounds of the cut path (or trim). */
export function cutBounds(d: Design): Rect {
  return localRectToPage(d, pathsBounds(cutPaths(d)) ?? localBox(d));
}

/** Page bounds of everything that prints or is cut: artwork box and cut path. */
export function contentBounds(d: Design): Rect {
  return union([localRectToPage(d, localBox(d)), cutBounds(d)]);
}

function union(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}

/** Clearance rectangle: cut bounds grown by max(spacing / 2, how far content pokes out) per side. */
export function clearanceRect(d: Design, spacing: number): Rect {
  const cut = cutBounds(d);
  const content = contentBounds(d);
  const half = Math.max(0, spacing) / 2;
  const left = Math.max(half, cut.x - content.x);
  const top = Math.max(half, cut.y - content.y);
  const right = Math.max(half, content.x + content.width - (cut.x + cut.width));
  const bottom = Math.max(half, content.y + content.height - (cut.y + cut.height));
  return { x: cut.x - left, y: cut.y - top, width: cut.width + left + right, height: cut.height + top + bottom };
}

/** Designs that move together: same pair, else same group, else alone. Order follows the document. */
export function arrangeBlocks(designs: Design[]): Design[][] {
  const blocks = new Map<string, Design[]>();
  for (const d of designs) {
    const key = d.pairId ? `pair:${d.pairId}` : d.groupId ? `group:${d.groupId}` : `id:${d.id}`;
    const list = blocks.get(key);
    if (list) list.push(d);
    else blocks.set(key, [d]);
  }
  return [...blocks.values()];
}

const turned = (d: Design): Design => ({ ...d, rotation: (((d.rotation + 90) % 360) + 360) % 360 });

function orientationFor(members: Design[], spacing: number): { o: NestOrientation; clearance: Rect } {
  const clearance = union(members.map((m) => clearanceRect(m, spacing)));
  const content = union(members.map(contentBounds));
  const inset: Insets = {
    left: content.x - clearance.x,
    top: content.y - clearance.y,
    right: clearance.x + clearance.width - (content.x + content.width),
    bottom: clearance.y + clearance.height - (content.y + content.height),
  };
  return { o: { width: clearance.width, height: clearance.height, inset }, clearance };
}

export interface ArrangeReport {
  placed: number;
  /** Designs that could not be placed (left where they were). */
  unplaced: string[];
  /** Larger than the printable area even on an empty page. */
  tooLarge: string[];
  /** New pages needed (or created). */
  pagesAdded: number;
  /** Printed area / printable area, per page, 0â€“1. */
  utilisation: number[];
  turned: number;
}

export interface ArrangePlan {
  /** Updated designs of the current page (moved, others unchanged, in document order). */
  current: Design[];
  /** Designs for each new page. */
  newPages: Design[][];
  report: ArrangeReport;
}

/** Corner registration marks as obstacles, so designs keep clear of them. */
function markObstacles(page: PageSettings): Rect[] {
  if (!page.guides?.registration) return [];
  const s = page.spacing / 2;
  return registrationMarks(page).map((m) => ({ x: m.x - s, y: m.y - s, width: m.width + 2 * s, height: m.height + 2 * s }));
}

/**
 * Plan an Auto Arrange. `selection` is only used for the "selection" scope.
 * Pure: the store applies the result as one undo step.
 */
export function planArrange(designs: Design[], page: PageSettings, selection: string[], options: ArrangeOptions): ArrangePlan {
  const area = printableRect(page);
  const spacing = Math.max(0, page.spacing);
  const blocks = arrangeBlocks(designs);
  const inScope = (b: Design[]) =>
    !b.some((d) => d.locked) && (options.scope === "all" || b.some((d) => selection.includes(d.id)));
  const moving = blocks.filter(inScope);
  const fixed = blocks.filter((b) => !inScope(b));
  const obstacles = [...fixed.map((b) => union(b.map((d) => clearanceRect(d, spacing)))), ...markObstacles(page)];

  const items: NestItem[] = [];
  const meta = new Map<string, { members: Design[]; clearances: Rect[] }>();
  for (const block of moving) {
    const id = block[0].id;
    const base = orientationFor(block, spacing);
    const orientations = [base.o];
    const clearances = [base.clearance];
    const single = block.length === 1 ? block[0] : null;
    if (options.rotate && single && !single.lockRotation && !single.pairId) {
      const t = orientationFor([turned(single)], spacing);
      if (Math.abs(t.o.width - base.o.width) > 1e-6 || Math.abs(t.o.height - base.o.height) > 1e-6) {
        orientations.push(t.o);
        clearances.push(t.clearance);
      }
    }
    items.push({ id, orientations });
    meta.set(id, { members: block, clearances });
  }

  const result = nestPages(items, area, obstacles, { strategy: options.strategy, extraPages: options.extraPages });
  const moved = new Map<string, Design>();
  const newPages: Design[][] = [];
  let turnedCount = 0;
  result.pages.forEach((placements, pageIndex) => {
    const pageDesigns: Design[] = [];
    for (const p of placements) {
      const m = meta.get(p.id)!;
      const from = m.clearances[p.orientation];
      const dx = p.x - from.x;
      const dy = p.y - from.y;
      for (const member of m.members) {
        const rotated = p.orientation === 1 ? turned(member) : member;
        const next = { ...rotated, x: rotated.x + dx, y: rotated.y + dy };
        if (pageIndex === 0) moved.set(member.id, next);
        else pageDesigns.push(next);
      }
      if (p.orientation === 1) turnedCount++;
    }
    if (pageIndex > 0) newPages.push(pageDesigns);
  });

  const leaving = new Set(newPages.flat().map((d) => d.id));
  const current = designs.filter((d) => !leaving.has(d.id)).map((d) => moved.get(d.id) ?? d);
  const printableArea = area.width * area.height;
  const used = (ds: Design[]) =>
    printableArea > 0 ? Math.min(1, ds.reduce((s, d) => s + d.width * d.height, 0) / printableArea) : 0;
  const notPlaced = new Set([...result.unplaced, ...result.tooLarge]);
  const memberIds = (blockId: string) => meta.get(blockId)?.members.map((d) => d.id) ?? [blockId];
  return {
    current,
    newPages,
    report: {
      placed: [...moved.values()].length + newPages.reduce((n, p) => n + p.length, 0),
      unplaced: [...notPlaced].flatMap(memberIds),
      tooLarge: result.tooLarge.flatMap(memberIds),
      pagesAdded: newPages.length,
      utilisation: [used(current), ...newPages.map(used)],
      turned: turnedCount,
    },
  };
}
