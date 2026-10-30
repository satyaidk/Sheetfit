/**
 * Tileable detail maps for knitted fabric, as plain RGBA pixels.
 *
 * Pure (no DOM), so the same pixels feed the browser textures
 * (`print-textures.ts`) and the PNGs packed into `public/models/tshirt.glb`
 * by `scripts/export-tshirt.mjs`.
 *
 * - The knit normal map draws single jersey, the face of a T-shirt: columns
 *   (wales) of V-shaped loops, one course above the other, with a little
 *   irregularity per loop as real yarn has.
 * - The roughness map is a soft cloud of slightly duller and slightly shinier
 *   patches (green channel, as three.js and glTF read roughness), which stops a
 *   large plain area of fabric from looking like one even coat of paint.
 */

/** Physical size of one knit tile (16 wales, 20 courses: a fine 21-gauge jersey). */
export const KNIT_TILE_MM = 12;
/** Physical size of one roughness tile. */
export const ROUGHNESS_TILE_MM = 160;

export interface PixelMap {
  size: number;
  /** RGBA, 8 bits per channel, row 0 at the top. */
  data: Uint8ClampedArray;
}

function random(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Height field to a tangent-space normal map (OpenGL convention, +Y up), wrapping at the edges. */
function normalsFromHeight(height: Float32Array, size: number, strength: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      // Image rows run downwards, texture V upwards.
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** Single-jersey knit: `wales` columns of V loops, `courses` rows. Tiles seamlessly. */
export function knitNormalPixels(size = 256, wales = 16, courses = 20): PixelMap {
  const height = new Float32Array(size * size);
  const rand = random(17);
  // One random offset per loop (tileable: loops repeat exactly at the tile edge).
  const jitter = Array.from({ length: wales * courses }, () => 0.85 + rand() * 0.3);
  const pw = size / wales;
  const pc = size / courses;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const w = Math.floor(x / pw);
      const c = Math.floor(y / pc);
      const fx = (x % pw) / pw;
      // fy = 0 at the bottom of the loop, where both legs meet.
      const fy = 1 - (y % pc) / pc;
      const spread = 0.07 + 0.25 * fy;
      let h = 0;
      for (const side of [-1, 1]) {
        const d = (fx - (0.5 + side * spread)) / 0.16;
        h = Math.max(h, Math.max(0, 1 - d * d));
      }
      // Loops are rounded where one course passes under the next.
      h *= Math.sqrt(Math.sin(Math.PI * Math.min(1, Math.max(0, fy * 0.9 + 0.05))));
      height[y * size + x] = h * jitter[c * wales + w] + rand() * 0.05;
    }
  }
  return { size, data: normalsFromHeight(height, size, 2.4) };
}

/** Smooth tileable value noise in [0, 1]: a few octaves on wrapping lattices. */
function cloud(size: number, seed: number): Float32Array {
  const out = new Float32Array(size * size);
  const rand = random(seed);
  let amp = 1;
  let total = 0;
  for (const cells of [4, 8, 16, 32]) {
    const lattice = Array.from({ length: cells * cells }, () => rand());
    const g = (i: number, j: number) => lattice[((j + cells) % cells) * cells + ((i + cells) % cells)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const fy = (y / size) * cells;
        const i = Math.floor(fx);
        const j = Math.floor(fy);
        const sx = (fx - i) * (fx - i) * (3 - 2 * (fx - i));
        const sy = (fy - j) * (fy - j) * (3 - 2 * (fy - j));
        const top = g(i, j) * (1 - sx) + g(i + 1, j) * sx;
        const bottom = g(i, j + 1) * (1 - sx) + g(i + 1, j + 1) * sx;
        out[y * size + x] += (top * (1 - sy) + bottom * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.55;
  }
  for (let k = 0; k < out.length; k++) out[k] /= total;
  return out;
}

/** Roughness between `min` and `max` in the green channel (red and blue equal, alpha opaque). */
export function fabricRoughnessPixels(size = 128, min = 0.8, max = 0.95): PixelMap {
  const n = cloud(size, 29);
  const data = new Uint8ClampedArray(size * size * 4);
  for (let k = 0; k < n.length; k++) {
    const v = Math.round((min + (max - min) * n[k]) * 255);
    data[k * 4] = v;
    data[k * 4 + 1] = v;
    data[k * 4 + 2] = v;
    data[k * 4 + 3] = 255;
  }
  return { size, data };
}
