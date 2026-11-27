/**
 * Alpha contours for die-cut and kiss-cut stickers.
 *
 * Input is an alpha mask (one byte per pixel). The steps are:
 *
 * 1. Threshold: pixels with alpha above `threshold` are "ink".
 * 2. Offset: grow the ink by `offsetPx` with an exact Euclidean distance
 *    transform (Felzenszwalb and Huttenlocher, 2012). Growing the *mask* and
 *    then tracing, rather than offsetting a traced polygon, can never produce a
 *    self-intersecting outline, and nearby islands merge naturally. With
 *    `closePx`, the mask is grown further and shrunk back (a morphological
 *    closing), which fills slots too narrow to cut by hand.
 * 3. Trace: marching squares on the grown mask gives closed boundary loops.
 *    Loops are classified as outer outlines or holes by their winding.
 * 4. Simplify (Ramer–Douglas–Peucker) and smooth (Chaikin corner cutting),
 *    with tolerances in pixels so the shape changes by less than a pixel or so.
 * 5. Validate: closed, non-degenerate, not self-intersecting.
 *
 * Everything here is pure and runs in Node; the browser part (drawing the
 * artwork into a canvas to read its alpha) lives in `editor-actions`.
 */

import { polygonArea, validatePolygon } from "./cut-path";

export interface ContourOptions {
  /** Alpha (0–255) above which a pixel counts as artwork. */
  threshold: number;
  /** Outward offset in mask pixels. */
  offsetPx: number;
  /** Simplification tolerance in mask pixels. */
  tolerancePx: number;
  /** Chaikin smoothing passes (0–3). */
  smoothing: number;
  /** Keep inner holes as separate cut paths. */
  holes: boolean;
  /** Drop islands smaller than this many square pixels. */
  minAreaPx: number;
  /**
   * Morphological closing radius in mask pixels: gaps and inlets narrower
   * than twice this are filled, so the outline has no slots that scissors
   * (or a blade) cannot follow. 0 keeps every detail.
   */
  closePx: number;
}

export const DEFAULT_CONTOUR: ContourOptions = {
  threshold: 16,
  offsetPx: 0,
  tolerancePx: 0.75,
  smoothing: 1,
  holes: false,
  minAreaPx: 4,
  closePx: 0,
};

/** Threshold an RGBA buffer's alpha channel into a 0/1 mask. */
export function alphaMask(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, threshold: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) out[i] = rgba[i * 4 + 3] > threshold ? 1 : 0;
  return out;
}

const INF = 1e20;

/** 1-D squared distance transform of `f` (lower envelope of parabolas). */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Squared Euclidean distance from every pixel to the nearest ink pixel. */
export function distanceToInk(mask: Uint8Array, width: number, height: number): Float64Array {
  const grid = new Float64Array(width * height);
  for (let i = 0; i < grid.length; i++) grid[i] = mask[i] ? 0 : INF;
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x];
    edt1d(f, height, d, v, z);
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y];
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = grid[y * width + x];
    edt1d(f, width, d, v, z);
    for (let x = 0; x < width; x++) grid[y * width + x] = d[x];
  }
  return grid;
}

/** Grow the ink by `radius` pixels (exact Euclidean). */
export function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask;
  const dist = distanceToInk(mask, width, height);
  const r2 = radius * radius;
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = dist[i] <= r2 ? 1 : 0;
  return out;
}

/** Shrink the ink by `radius` pixels (exact Euclidean): the complement grown, inverted. */
export function erode(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask;
  const inverse = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) inverse[i] = mask[i] ? 0 : 1;
  const grown = dilate(inverse, width, height, radius);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = grown[i] ? 0 : 1;
  return out;
}

/**
 * Marching squares. Returns closed loops of corner points in pixel-edge
 * coordinates (a single ink pixel at (0,0) traces the square 0..1). The mask
 * is treated as surrounded by empty space, so every loop is closed.
 */
export function traceLoops(mask: Uint8Array, width: number, height: number): number[][] {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < width && y < height ? mask[y * width + x] : 0);
  // Directed boundary edges between an ink pixel and an empty one, ink on the right
  // when walking (clockwise outlines in a y-down frame). Key by start vertex.
  const W = width + 1;
  const next = new Map<number, number[]>();
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    const k = y1 * W + x1;
    const list = next.get(k);
    if (list) list.push(y2 * W + x2);
    else next.set(k, [y2 * W + x2]);
  };
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x <= width; x++) {
      // Horizontal edge between pixel (x, y-1) above and (x, y) below.
      if (x < width) {
        const above = at(x, y - 1);
        const below = at(x, y);
        if (below && !above) add(x, y, x + 1, y);
        else if (above && !below) add(x + 1, y, x, y);
      }
      // Vertical edge between pixel (x-1, y) left and (x, y) right.
      if (y < height) {
        const left = at(x - 1, y);
        const right = at(x, y);
        if (left && !right) add(x, y, x, y + 1);
        else if (right && !left) add(x, y + 1, x, y);
      }
    }
  }
  const loops: number[][] = [];
  for (const [startKey] of next) {
    while ((next.get(startKey)?.length ?? 0) > 0) {
      const loop: number[] = [];
      let key = startKey;
      let prevDir = -1;
      for (let guard = 0; guard < 4 * (width + 2) * (height + 2); guard++) {
        const list = next.get(key);
        if (!list || list.length === 0) break;
        // At a saddle (two outgoing edges) turn consistently to keep islands apart.
        let idx = 0;
        if (list.length > 1 && prevDir >= 0) {
          const kx = key % W;
          const ky = Math.floor(key / W);
          const dirs: number[] = list.map((n) => {
            const dx = (n % W) - kx;
            const dy = Math.floor(n / W) - ky;
            return dx === 1 ? 0 : dy === 1 ? 1 : dx === -1 ? 2 : 3;
          });
          const right = (prevDir + 1) % 4;
          const found = dirs.indexOf(right);
          idx = found >= 0 ? found : 0;
        }
        const to = list.splice(idx, 1)[0];
        const kx = key % W;
        const ky = Math.floor(key / W);
        loop.push(kx, ky);
        const dx = (to % W) - kx;
        const dy = Math.floor(to / W) - ky;
        prevDir = dx === 1 ? 0 : dy === 1 ? 1 : dx === -1 ? 2 : 3;
        key = to;
        if (key === startKey) break;
      }
      if (loop.length >= 6) loops.push(removeCollinear(loop));
    }
  }
  return loops;
}

function removeCollinear(pts: number[]): number[] {
  const n = pts.length / 2;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n;
    const q = (i + 1) % n;
    const cross =
      (pts[2 * i] - pts[2 * p]) * (pts[2 * q + 1] - pts[2 * i + 1]) - (pts[2 * i + 1] - pts[2 * p + 1]) * (pts[2 * q] - pts[2 * i]);
    if (Math.abs(cross) > 1e-12) out.push(pts[2 * i], pts[2 * i + 1]);
  }
  return out;
}

function perpendicular(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(px - ax, py - ay);
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
}

/** Ramer–Douglas–Peucker on an open polyline. */
function rdp(pts: number[], tol: number): number[] {
  const n = pts.length / 2;
  if (n < 3) return pts;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1;
    let dist = tol;
    for (let i = a + 1; i < b; i++) {
      const d = perpendicular(pts[2 * i], pts[2 * i + 1], pts[2 * a], pts[2 * a + 1], pts[2 * b], pts[2 * b + 1]);
      if (d > dist) {
        dist = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[2 * i], pts[2 * i + 1]);
  return out;
}

/** Simplify a closed loop: split at the point farthest from the first and run RDP on both halves. */
export function simplifyClosed(pts: number[], tol: number): number[] {
  const n = pts.length / 2;
  if (n <= 4 || tol <= 0) return pts;
  let far = 0;
  let best = -1;
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(pts[2 * i] - pts[0], pts[2 * i + 1] - pts[1]);
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const first = rdp(pts.slice(0, 2 * far + 2), tol);
  const second = rdp([...pts.slice(2 * far), pts[0], pts[1]], tol);
  const out = [...first.slice(0, -2), ...second.slice(0, -2)];
  return out.length >= 6 ? out : pts;
}

/** Chaikin corner cutting on a closed loop (each pass doubles the points and rounds corners). */
export function chaikin(pts: number[], passes: number): number[] {
  let cur = pts;
  for (let p = 0; p < passes; p++) {
    const n = cur.length / 2;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = cur[2 * i];
      const ay = cur[2 * i + 1];
      const bx = cur[2 * j];
      const by = cur[2 * j + 1];
      out.push(0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by, 0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by);
    }
    cur = out;
  }
  return cur;
}

export interface ContourResult {
  /** Outer outlines, clockwise in a y-down frame. */
  outlines: number[][];
  /** Holes (only when `holes` is on). */
  holes: number[][];
  /** Islands dropped as too small. */
  dropped: number;
  problems: string[];
}

/**
 * Trace cut contours from an alpha mask. Coordinates are mask pixels; the
 * caller maps them to millimetres. The mask must already include `offsetPx`
 * of empty padding on every side so the grown outline is not clipped.
 */
export function traceContour(mask: Uint8Array, width: number, height: number, options: Partial<ContourOptions> = {}): ContourResult {
  const o = { ...DEFAULT_CONTOUR, ...options };
  // Closing (grow by offset + close, then shrink by close) fills narrow gaps
  // while keeping the outline exactly `offsetPx` outside the artwork elsewhere.
  const grown =
    o.closePx > 0
      ? erode(dilate(mask, width, height, o.offsetPx + o.closePx), width, height, o.closePx)
      : dilate(mask, width, height, o.offsetPx);
  const loops = traceLoops(grown, width, height);
  const outlines: number[][] = [];
  const holes: number[][] = [];
  const problems: string[] = [];
  let dropped = 0;
  for (const loop of loops) {
    const area = polygonArea(loop);
    if (Math.abs(area) < o.minAreaPx) {
      dropped++;
      continue;
    }
    const isOuter = area > 0;
    if (!isOuter && !o.holes) continue;
    let pts = simplifyClosed(loop, o.tolerancePx);
    if (o.smoothing > 0) {
      // Smooth, then drop the near-collinear points smoothing adds (cutters prefer fewer nodes).
      pts = simplifyClosed(chaikin(pts, Math.min(3, o.smoothing)), o.tolerancePx / 2);
    }
    // Smoothing a very thin neck can fold it; fall back to the unsmoothed outline.
    if (validatePolygon(pts).length > 0) pts = simplifyClosed(loop, o.tolerancePx);
    const issues = validatePolygon(pts);
    if (issues.length > 0) {
      problems.push(...issues.map((i) => i.message));
      continue;
    }
    (isOuter ? outlines : holes).push(pts);
  }
  if (outlines.length === 0 && problems.length === 0) problems.push("No artwork was found to trace. Is the image fully transparent?");
  return { outlines, holes, dropped, problems };
}

/** Largest mask side used for tracing; keeps contour generation fast on big images. */
export const CONTOUR_MASK_MAX = 768;
