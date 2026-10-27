/**
 * Garment outlines shared by the 2D mockups and the 3D models.
 *
 * Paths are in the illustrations' 100 × 100 box (y down). Keeping one copy
 * means the flat preview and the 3D model can never disagree about where a
 * print sits on the garment. `parsePath` turns a path into points so the 3D
 * builder can extrude it without a DOM (three's SVGLoader needs DOMParser,
 * which unit tests in Node do not have).
 */

export const OUTLINES = {
  tee: "M34 14 l-18 8 -12 18 12 8 8 -8 v48 h52 v-48 l8 8 12 -8 -12 -18 -18 -8 c-2 7 -9 11 -16 11 s-14 -4 -16 -11z",
  teeCollar: "M34 14 c2 7 9 11 16 11 s14 -4 16 -11",
  teeBackNeck: "M34 14 c2 7 9 11 16 11 s14 -4 16 -11 c-4 3 -10 4 -16 4 s-12 -1 -16 -4z",
  kidsTee: "M36 20 l-14 8 -10 16 10 6 6 -6 v40 h44 v-40 l6 6 10 -6 -10 -16 -14 -8 c-2 6 -8 9 -14 9 s-12 -3 -14 -9z",
  kidsCollar: "M36 20 c2 6 8 9 14 9 s12 -3 14 -9",
  kidsBackNeck: "M36 20 c2 6 8 9 14 9 s12 -3 14 -9 c-4 3 -9 4 -14 4 s-10 -1 -14 -4z",
  longsleeve: "M34 14 l-18 8 -8 60 10 2 8 -46 v48 h48 v-48 l8 46 10 -2 -8 -60 -18 -8 c-2 7 -9 11 -16 11 s-14 -4 -16 -11z",
  hoodie: "M32 18 l-16 8 -10 18 10 8 8 -8 v46 h52 v-46 l8 8 10 -8 -10 -18 -16 -8 c0 -12 -8 -16 -18 -16 s-18 4 -18 16z",
  hoodieHood: "M32 18 c4 8 10 11 18 11 s14 -3 18 -11",
  hoodiePocket: "M36 70 h28 l4 13 h-36z",
  onesie: "M38 14 l-14 8 -10 14 9 6 7 -6 v34 c0 8 10 14 20 18 c10 -4 20 -10 20 -18 v-34 l7 6 9 -6 -10 -14 -14 -8 c-2 5 -6 8 -12 8 s-10 -3 -12 -8z",
  onesieCollar: "M38 14 c2 5 6 8 12 8 s10 -3 12 -8",
} as const;

export type Point = { x: number; y: number };

/** Sample a cubic Bézier segment (excluding its start point). */
function cubic(p0: Point, p1: Point, p2: Point, p3: Point, steps: number, out: Point[]) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
}

/**
 * Points along an SVG path made of M/L/H/V/C/S/Q/Z commands (absolute or
 * relative), with curves sampled into `steps` segments. Enough for the
 * outlines above; arcs are not supported.
 */
export function parsePath(d: string, steps = 10): { points: Point[]; closed: boolean } {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const points: Point[] = [];
  let i = 0;
  let cmd = "";
  let cur: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let lastCtrl: Point | null = null;
  let closed = false;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const base = rel ? cur : { x: 0, y: 0 };
    switch (cmd.toLowerCase()) {
      case "m": {
        cur = { x: base.x + num(), y: base.y + num() };
        start = cur;
        points.push(cur);
        cmd = rel ? "l" : "L"; // further pairs are implicit line-tos
        lastCtrl = null;
        break;
      }
      case "l":
        cur = { x: base.x + num(), y: base.y + num() };
        points.push(cur);
        lastCtrl = null;
        break;
      case "h":
        cur = { x: (rel ? cur.x : 0) + num(), y: cur.y };
        points.push(cur);
        lastCtrl = null;
        break;
      case "v":
        cur = { x: cur.x, y: (rel ? cur.y : 0) + num() };
        points.push(cur);
        lastCtrl = null;
        break;
      case "c": {
        const c1 = { x: base.x + num(), y: base.y + num() };
        const c2 = { x: base.x + num(), y: base.y + num() };
        const end = { x: base.x + num(), y: base.y + num() };
        cubic(cur, c1, c2, end, steps, points);
        lastCtrl = c2;
        cur = end;
        break;
      }
      case "s": {
        const c1 = lastCtrl ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur;
        const c2 = { x: base.x + num(), y: base.y + num() };
        const end = { x: base.x + num(), y: base.y + num() };
        cubic(cur, c1, c2, end, steps, points);
        lastCtrl = c2;
        cur = end;
        break;
      }
      case "q": {
        const c = { x: base.x + num(), y: base.y + num() };
        const end = { x: base.x + num(), y: base.y + num() };
        // A quadratic is a cubic with both control points at 2/3 of the way to c.
        const c1 = { x: cur.x + (2 / 3) * (c.x - cur.x), y: cur.y + (2 / 3) * (c.y - cur.y) };
        const c2 = { x: end.x + (2 / 3) * (c.x - end.x), y: end.y + (2 / 3) * (c.y - end.y) };
        cubic(cur, c1, c2, end, steps, points);
        lastCtrl = null;
        cur = end;
        break;
      }
      case "z":
        closed = true;
        cur = start;
        lastCtrl = null;
        break;
      default:
        throw new Error(`Unsupported path command ${cmd}`);
    }
  }
  // A closing segment back to the start is implicit; drop a duplicate end point.
  const last = points[points.length - 1];
  if (closed && points.length > 1 && Math.hypot(last.x - points[0].x, last.y - points[0].y) < 1e-6) points.pop();
  return { points, closed };
}
