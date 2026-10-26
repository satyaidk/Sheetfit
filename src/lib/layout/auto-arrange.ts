/**
 * Automatic sheet layout.
 *
 * Two strategies are offered:
 *
 * - `packShelves` places designs of different sizes in rows ("shelves"),
 *   tallest first, which is a simple and predictable way to reduce wasted
 *   paper for mixed jobs.
 * - `arrangeGrid` places repeated copies of one design in a fixed grid, which
 *   is what most sticker and label sheets need.
 *
 * Neither strategy resizes, rotates or crops anything. If a design does not
 * fit, it is returned in `unplaced` so the UI can say so and suggest changes.
 * Layout runs on rotated bounding boxes and converts back to box positions.
 */

import type { Design, PageSettings } from "@/types/editor";
import type { Rect, Size } from "@/lib/image/image-fit";
import { designBounds, printableRect } from "./a4-layout";
import { unionBounds } from "./alignment";

export interface LayoutGap {
  x: number;
  y: number;
}

export interface Placement {
  id: string;
  /** Top-left of the rotated bounding box, in page millimetres. */
  x: number;
  y: number;
}

export interface LayoutResult {
  placements: Placement[];
  unplaced: string[];
}

interface PackItem extends Size {
  id: string;
}

const EPS = 1e-6;

export function packShelves(
  items: PackItem[],
  area: Rect,
  gap: LayoutGap,
  options: { sortByHeight?: boolean; center?: boolean } = {},
): LayoutResult {
  const { sortByHeight = true, center = true } = options;
  const order = sortByHeight
    ? [...items].sort((a, b) => b.height - a.height || b.width - a.width)
    : items;
  const shelves: { y: number; height: number; cursor: number }[] = [];
  const placements: Placement[] = [];
  const unplaced: string[] = [];
  const right = area.x + area.width;
  const bottom = area.y + area.height;

  for (const item of order) {
    if (item.width > area.width + EPS || item.height > area.height + EPS) {
      unplaced.push(item.id);
      continue;
    }
    let shelf = shelves.find(
      (s) =>
        item.height <= s.height + EPS &&
        s.cursor + item.width <= right + EPS,
    );
    if (!shelf) {
      const last = shelves[shelves.length - 1];
      const y = last ? last.y + last.height + gap.y : area.y;
      if (y + item.height > bottom + EPS) {
        unplaced.push(item.id);
        continue;
      }
      shelf = { y, height: item.height, cursor: area.x };
      shelves.push(shelf);
    }
    placements.push({ id: item.id, x: shelf.cursor, y: shelf.y });
    shelf.cursor += item.width + gap.x;
  }

  return {
    placements: center ? centerPlacements(placements, items, area) : placements,
    unplaced,
  };
}

/** How many copies of `item` fit in `area` as a grid. */
export function gridCapacity(item: Size, area: Rect, gap: LayoutGap) {
  const fit = (avail: number, size: number, g: number) =>
    size <= 0 || size > avail + EPS
      ? 0
      : Math.floor((avail + g + EPS) / (size + g));
  const cols = fit(area.width, item.width, gap.x);
  const rows = fit(area.height, item.height, gap.y);
  return { cols, rows, count: cols * rows };
}

/**
 * Place `ids` (copies of one size) left-to-right, top-to-bottom in a grid.
 * `columns` caps the column count; by default as many as fit are used.
 */
export function arrangeGrid(
  ids: string[],
  item: Size,
  area: Rect,
  gap: LayoutGap,
  options: { columns?: number; center?: boolean } = {},
): LayoutResult {
  const capacity = gridCapacity(item, area, gap);
  const cols = Math.max(
    1,
    Math.min(options.columns ?? capacity.cols, capacity.cols || 1),
  );
  const placements: Placement[] = [];
  const unplaced: string[] = [];
  ids.forEach((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    if (capacity.count === 0 || row >= capacity.rows) {
      unplaced.push(id);
      return;
    }
    placements.push({
      id,
      x: area.x + col * (item.width + gap.x),
      y: area.y + row * (item.height + gap.y),
    });
  });
  const items = ids.map((id) => ({ id, ...item }));
  return {
    placements:
      options.center === false
        ? placements
        : centerPlacements(placements, items, area),
    unplaced,
  };
}

function centerPlacements(
  placements: Placement[],
  items: PackItem[],
  area: Rect,
): Placement[] {
  const sizes = new Map(items.map((i) => [i.id, i]));
  const block = unionBounds(
    placements.map((p) => {
      const s = sizes.get(p.id)!;
      return { x: p.x, y: p.y, width: s.width, height: s.height };
    }),
  );
  if (!block) return placements;
  const dx = area.x + (area.width - block.width) / 2 - block.x;
  const dy = area.y + (area.height - block.height) / 2 - block.y;
  return placements.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
}

/** Convert bounding-box placements back to design box positions. */
export function applyPlacements<T extends Design>(
  designs: T[],
  placements: Placement[],
): T[] {
  const byId = new Map(placements.map((p) => [p.id, p]));
  return designs.map((d) => {
    const p = byId.get(d.id);
    if (!p) return d;
    const b = designBounds(d);
    return { ...d, x: p.x + (b.width - d.width) / 2, y: p.y + (b.height - d.height) / 2 };
  });
}

export function packItemsFor(designs: Design[]): PackItem[] {
  return designs.map((d) => {
    const b = designBounds(d);
    return { id: d.id, width: b.width, height: b.height };
  });
}

/**
 * Plain-language suggestions when a layout leaves designs unplaced.
 * Each suggestion is checked by actually re-running the layout.
 */
export function suggestLayoutFixes(
  designs: Design[],
  page: Pick<PageSettings, "orientation" | "margins">,
  gap: LayoutGap,
): string[] {
  const items = packItemsFor(designs);
  const current = packShelves(items, printableRect(page), gap);
  if (current.unplaced.length === 0) return [];
  const suggestions: string[] = [];
  const placed = current.placements.length;
  suggestions.push(
    `Reduce the number of designs to ${placed} to fit this sheet.`,
  );
  const other = page.orientation === "portrait" ? "landscape" : "portrait";
  const flipped = packShelves(
    items,
    printableRect({ ...page, orientation: other }),
    gap,
  );
  if (flipped.placements.length > placed) {
    suggestions.push(
      `Switch to ${other}: ${flipped.placements.length} of ${items.length} designs fit.`,
    );
  }
  const tight = packShelves(items, printableRect(page), { x: 0, y: 0 });
  if ((gap.x > 0 || gap.y > 0) && tight.placements.length > placed) {
    suggestions.push(
      `Remove the spacing: ${tight.placements.length} of ${items.length} designs fit.`,
    );
  }
  const noMargins = packShelves(
    items,
    printableRect({ ...page, margins: { top: 0, right: 0, bottom: 0, left: 0 } }),
    gap,
  );
  if (noMargins.placements.length > placed) {
    suggestions.push(
      `Reduce the page margins: up to ${noMargins.placements.length} designs fit with no margins.`,
    );
  }
  suggestions.push("Make some designs smaller.");
  return suggestions;
}
