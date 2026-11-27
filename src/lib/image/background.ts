/**
 * Plain-background detection and removal.
 *
 * Many sticker and DTF uploads are JPEGs or opaque PNGs on a white or flat
 * coloured background. They have no transparency to trace an outline from,
 * and DTF prints the background as a solid box. This module finds such a
 * background and separates it from the artwork, in pure code that runs in
 * Node (tests) and in the browser (canvas pixels):
 *
 * 1. Rim colour: the dominant colour of the image's outer rim (opaque pixels
 *    next to the canvas edge or to transparency). If too few rim pixels share
 *    one colour, the background is not plain and nothing is removed: a photo
 *    with a busy edge is never "cut out" by guesswork.
 * 2. Flood fill from the canvas edges through pixels that are transparent or
 *    within `tolerance` of the rim colour. Only background *connected to the
 *    edge* is removed, so white inside the artwork (eyes, letters) stays.
 * 3. Knockout (optional): a new RGBA buffer with the background transparent,
 *    a one-pixel soft edge, and the background colour unmixed from edge
 *    pixels so a white fringe does not show on dark garments.
 */

export interface RimColor {
  color: [number, number, number];
  /** Share (0–1) of rim pixels within tolerance of `color`. */
  share: number;
  /** Number of rim pixels inspected. */
  samples: number;
}

const dist = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) =>
  Math.hypot(r1 - r2, g1 - g2, b1 - b2);

/** Rim pixels: opaque pixels on the canvas edge or with a transparent 4-neighbour. */
function rimIndices(rgba: ArrayLike<number>, width: number, height: number, alphaThreshold: number): number[] {
  const out: number[] = [];
  const opaque = (x: number, y: number) => rgba[(y * width + x) * 4 + 3] > alphaThreshold;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!opaque(x, y)) continue;
      const edge =
        x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
        !opaque(x - 1, y) || !opaque(x + 1, y) || !opaque(x, y - 1) || !opaque(x, y + 1);
      if (edge) out.push(y * width + x);
    }
  }
  return out;
}

/**
 * Dominant rim colour, or null when the image has no opaque rim. Colours are
 * bucketed at 4 bits per channel; the winning bucket's mean is the colour.
 */
export function rimColor(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  options: { tolerance?: number; alphaThreshold?: number } = {},
): RimColor | null {
  const tolerance = options.tolerance ?? 40;
  const alphaThreshold = options.alphaThreshold ?? 16;
  const rim = rimIndices(rgba, width, height, alphaThreshold);
  if (rim.length === 0) return null;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (const i of rim) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key);
    if (e) {
      e.n++;
      e.r += r;
      e.g += g;
      e.b += b;
    } else buckets.set(key, { n: 1, r, g, b });
  }
  let best = { n: 0, r: 0, g: 0, b: 0 };
  for (const e of buckets.values()) if (e.n > best.n) best = e;
  const color: [number, number, number] = [best.r / best.n, best.g / best.n, best.b / best.n];
  let near = 0;
  for (const i of rim) {
    if (dist(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], ...color) <= tolerance) near++;
  }
  return { color, share: near / rim.length, samples: rim.length };
}

export interface BackgroundMask {
  /** 1 where artwork remains, 0 for background or transparency. */
  ink: Uint8Array;
  /** 1 for removed background pixels (opaque pixels that matched and touched the edge). */
  background: Uint8Array;
  /** Share (0–1) of the opaque pixels that were removed. */
  removed: number;
}

/**
 * Flood-fill the background from the canvas edges. A pixel is passable when it
 * is transparent or within `tolerance` of `color`; opaque passable pixels that
 * the fill reaches are background.
 */
export function floodBackground(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  color: [number, number, number],
  options: { tolerance?: number; alphaThreshold?: number } = {},
): BackgroundMask {
  const tolerance = options.tolerance ?? 40;
  const alphaThreshold = options.alphaThreshold ?? 16;
  const n = width * height;
  const seen = new Uint8Array(n);
  const background = new Uint8Array(n);
  const passable = (i: number) =>
    rgba[i * 4 + 3] <= alphaThreshold || dist(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], ...color) <= tolerance;
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const push = (i: number) => {
    if (seen[i] || !passable(i)) return;
    seen[i] = 1;
    queue[tail++] = i;
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head++];
    if (rgba[i * 4 + 3] > alphaThreshold) background[i] = 1;
    const x = i % width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (i >= width) push(i - width);
    if (i < n - width) push(i + width);
  }
  const ink = new Uint8Array(n);
  let opaque = 0;
  let removed = 0;
  for (let i = 0; i < n; i++) {
    const solid = rgba[i * 4 + 3] > alphaThreshold;
    if (solid) opaque++;
    if (background[i]) removed++;
    ink[i] = solid && !background[i] ? 1 : 0;
  }
  return { ink, background, removed: opaque > 0 ? removed / opaque : 0 };
}

export interface PlainBackground extends BackgroundMask {
  color: [number, number, number];
  rimShare: number;
}

/** Least share of rim pixels that must share one colour to call a background plain. */
export const PLAIN_RIM_SHARE = 0.6;

/**
 * Detect and separate a plain background. Returns null when there is no
 * plain background (busy rim), when nothing would be removed, or when
 * removing it would leave (almost) nothing.
 */
export function detectPlainBackground(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  options: { tolerance?: number; alphaThreshold?: number; minRimShare?: number } = {},
): PlainBackground | null {
  const rim = rimColor(rgba, width, height, options);
  if (!rim || rim.share < (options.minRimShare ?? PLAIN_RIM_SHARE)) return null;
  const mask = floodBackground(rgba, width, height, rim.color, options);
  if (mask.removed < 0.01 || mask.removed > 0.985) return null;
  return { ...mask, color: rim.color, rimShare: rim.share };
}

/**
 * Bounds of the pixels with alpha above `threshold`, or null when there are
 * none. Used to trim empty transparent margins off uploaded artwork.
 */
export function opaqueBounds(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  threshold = 8,
): { x: number; y: number; width: number; height: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * A copy of `rgba` with the background made transparent. Edge pixels (artwork
 * next to background) get a soft alpha from a 3 × 3 average, and the
 * background colour is unmixed from them: c = (c' − (1 − a)·bg) / a.
 */
export function knockOut(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  mask: Pick<BackgroundMask, "background">,
  color: [number, number, number],
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(rgba.length));
  for (let i = 0; i < rgba.length; i++) out[i] = rgba[i];
  const bg = mask.background;
  for (let i = 0; i < width * height; i++) if (bg[i]) out[i * 4 + 3] = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (bg[i] || rgba[i * 4 + 3] === 0) continue;
      let touching = false;
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          const j = yy * width + xx;
          if (bg[j]) touching = true;
          sum += bg[j] ? 0 : 1;
          count++;
        }
      }
      if (!touching) continue;
      const a = Math.max(0.35, sum / count);
      out[i * 4 + 3] = Math.round(rgba[i * 4 + 3] * a);
      for (let c = 0; c < 3; c++) out[i * 4 + c] = (rgba[i * 4 + c] - (1 - a) * color[c]) / a;
    }
  }
  return out;
}
