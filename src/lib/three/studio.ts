/**
 * Corrections to the studio HDRI (`public/env/`) applied when it loads.
 * Pure array maths, so it is tested in Node.
 */

/**
 * White-balance an RGBA float panorama so its average colour is neutral grey
 * (grey-world), keeping its average brightness. The studio HDRI is cool:
 * measured over the whole map, blue is about 1.3 times red, top and bottom
 * alike, which tinted black and dark blanks blue. Returns the channel gains.
 */
export function whiteBalance(data: Float32Array): [number, number, number] {
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
  const lum = 0.2126 * sum[0] + 0.7152 * sum[1] + 0.0722 * sum[2];
  const gains = sum.map((s) => (s > 0 ? lum / s : 1)) as [number, number, number];
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) data[i + c] *= gains[c];
  return gains;
}
