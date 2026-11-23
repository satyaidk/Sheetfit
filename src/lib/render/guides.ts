/**
 * Print marks that are not artwork: centre marks for lining up the front and
 * back of a card, and generic corner registration squares for print-and-cut.
 *
 * Registration squares here are a generic aid (a filled square at each corner
 * of the printable area). They are not any cutter brand's registration
 * protocol: Cricut, Silhouette and others add their own marks in their own
 * software, and that is what their optical sensors look for.
 */

import type { PageSettings } from "@/types/editor";
import type { Rect } from "@/lib/image/image-fit";
import { printableRect } from "@/lib/layout/sheet-layout";

export const CENTRE_MARK = { length: 3, offset: 1 } as const;

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Ticks pointing at the middle of each edge of `r`, just outside it. */
export function centreMarksFor(r: Rect): Line[] {
  const { length: L, offset: O } = CENTRE_MARK;
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  return [
    { x1: cx, y1: r.y - O - L, x2: cx, y2: r.y - O },
    { x1: cx, y1: r.y + r.height + O, x2: cx, y2: r.y + r.height + O + L },
    { x1: r.x - O - L, y1: cy, x2: r.x - O, y2: cy },
    { x1: r.x + r.width + O, y1: cy, x2: r.x + r.width + O + L, y2: cy },
  ];
}

/** Square registration marks in the four corners of the printable area. */
export function registrationMarks(page: Pick<PageSettings, "sheet" | "customSize" | "orientation" | "margins" | "guides">): Rect[] {
  const size = Math.max(1, page.guides?.registrationSize ?? 5);
  const a = printableRect(page);
  if (a.width < size * 2 || a.height < size * 2) return [];
  return [
    { x: a.x, y: a.y, width: size, height: size },
    { x: a.x + a.width - size, y: a.y, width: size, height: size },
    { x: a.x, y: a.y + a.height - size, width: size, height: size },
    { x: a.x + a.width - size, y: a.y + a.height - size, width: size, height: size },
  ];
}
