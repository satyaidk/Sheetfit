/**
 * Measurements shown while arranging: live gaps and sheet utilisation.
 *
 * In a print layout the gap between two transfers is a cutting specification,
 * so the canvas shows the distance in millimetres to the nearest neighbour on
 * each side while a design is dragged (research: Figma only shows distances
 * on hover, and users ask for them during drags).
 */

import type { Rect } from "@/lib/image/image-fit";

export interface Gap {
  axis: "x" | "y";
  /** Start and end of the measured span along `axis`, in mm. */
  from: number;
  to: number;
  /** Position of the measurement line on the other axis, in mm. */
  at: number;
  value: number;
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

/**
 * Nearest gap on each of the four sides of `moving` to another rectangle that
 * overlaps it on the perpendicular axis, or to the edges of `area`.
 */
export function measureGaps(moving: Rect, others: Rect[], area: Rect | null): Gap[] {
  const m = { l: moving.x, r: moving.x + moving.width, t: moving.y, b: moving.y + moving.height };
  const midY = (m.t + m.b) / 2;
  const midX = (m.l + m.r) / 2;
  let left: Gap | null = null;
  let right: Gap | null = null;
  let up: Gap | null = null;
  let down: Gap | null = null;

  for (const o of others) {
    const ol = o.x;
    const or = o.x + o.width;
    const ot = o.y;
    const ob = o.y + o.height;
    if (overlaps(m.t, m.b, ot, ob)) {
      const at = (Math.max(m.t, ot) + Math.min(m.b, ob)) / 2;
      if (or <= m.l && (!left || m.l - or < left.value)) left = { axis: "x", from: or, to: m.l, at, value: m.l - or };
      if (ol >= m.r && (!right || ol - m.r < right.value)) right = { axis: "x", from: m.r, to: ol, at, value: ol - m.r };
    }
    if (overlaps(m.l, m.r, ol, or)) {
      const at = (Math.max(m.l, ol) + Math.min(m.r, or)) / 2;
      if (ob <= m.t && (!up || m.t - ob < up.value)) up = { axis: "y", from: ob, to: m.t, at, value: m.t - ob };
      if (ot >= m.b && (!down || ot - m.b < down.value)) down = { axis: "y", from: m.b, to: ot, at, value: ot - m.b };
    }
  }

  if (area) {
    const al = area.x;
    const ar = area.x + area.width;
    const at = area.y;
    const ab = area.y + area.height;
    if (!left && m.l >= al) left = { axis: "x", from: al, to: m.l, at: midY, value: m.l - al };
    if (!right && m.r <= ar) right = { axis: "x", from: m.r, to: ar, at: midY, value: ar - m.r };
    if (!up && m.t >= at) up = { axis: "y", from: at, to: m.t, at: midX, value: m.t - at };
    if (!down && m.b <= ab) down = { axis: "y", from: m.b, to: ab, at: midX, value: ab - m.b };
  }
  return [left, right, up, down].filter((g): g is Gap => g !== null && g.value > 0.05);
}

/**
 * Share of the printable area covered by designs, 0–1. Overlaps are counted
 * once by rasterising onto a 1 mm grid, which is precise enough for a readout.
 */
export function sheetUtilisation(boxes: Rect[], area: Rect): number {
  if (area.width <= 0 || area.height <= 0) return 0;
  const cols = Math.ceil(area.width);
  const rows = Math.ceil(area.height);
  const covered = new Uint8Array(cols * rows);
  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor(b.x - area.x));
    const y0 = Math.max(0, Math.floor(b.y - area.y));
    const x1 = Math.min(cols, Math.ceil(b.x + b.width - area.x));
    const y1 = Math.min(rows, Math.ceil(b.y + b.height - area.y));
    for (let y = y0; y < y1; y++) covered.fill(1, y * cols + x0, y * cols + Math.max(x0, x1));
  }
  let n = 0;
  for (let i = 0; i < covered.length; i++) n += covered[i];
  return Math.min(1, n / (cols * rows));
}
