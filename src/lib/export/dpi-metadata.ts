/**
 * Write physical resolution metadata into exported raster files.
 *
 * `canvas.toBlob` produces files with no DPI (PNG) or 72/1 DPI (JPEG). Print
 * drivers and RIP software read this field to decide the physical size, so a
 * 2480 × 3508 px file tagged as 72 DPI would open as a 875 × 1237 mm poster
 * instead of an A4 sheet. These helpers stamp the real export DPI.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function readUint32(b: Uint8Array, at: number): number {
  return ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
}

function writeUint32(b: Uint8Array, at: number, v: number) {
  b[at] = (v >>> 24) & 0xff;
  b[at + 1] = (v >>> 16) & 0xff;
  b[at + 2] = (v >>> 8) & 0xff;
  b[at + 3] = v & 0xff;
}

export function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((v, i) => bytes[i] === v);
}

/** Return a copy of a PNG with a pHYs chunk declaring `dpi`. */
export function setPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  if (!isPng(png)) throw new Error("Not a PNG file");
  const ppm = Math.round(dpi / 0.0254);
  // Drop any existing pHYs chunk, then insert ours straight after IHDR.
  const chunks: Uint8Array[] = [png.subarray(0, 8)];
  let offset = 8;
  let inserted = false;
  while (offset < png.length) {
    const length = readUint32(png, offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const end = offset + 12 + length;
    if (type !== "pHYs") chunks.push(png.subarray(offset, end));
    if (type === "IHDR" && !inserted) {
      const chunk = new Uint8Array(21);
      writeUint32(chunk, 0, 9);
      chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
      writeUint32(chunk, 8, ppm);
      writeUint32(chunk, 12, ppm);
      chunk[16] = 1; // unit: metre
      writeUint32(chunk, 17, crc32(chunk.subarray(4, 17)));
      chunks.push(chunk);
      inserted = true;
    }
    offset = end;
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Read the DPI from a PNG pHYs chunk, or `null` if absent. */
export function readPngDpi(png: Uint8Array): number | null {
  let offset = 8;
  while (offset < png.length) {
    const length = readUint32(png, offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    if (type === "pHYs" && png[offset + 16] === 1) {
      return Math.round(readUint32(png, offset + 8) * 0.0254);
    }
    offset += 12 + length;
  }
  return null;
}

/** Return a copy of a JPEG whose JFIF header declares `dpi`. */
export function setJpegDpi(jpeg: Uint8Array, dpi: number): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error("Not a JPEG file");
  const d = Math.max(1, Math.min(65535, Math.round(dpi)));
  const hasJfif =
    jpeg[2] === 0xff &&
    jpeg[3] === 0xe0 &&
    String.fromCharCode(...jpeg.subarray(6, 10)) === "JFIF";
  if (hasJfif) {
    const out = jpeg.slice();
    out[13] = 1; // units: dots per inch
    out[14] = d >> 8;
    out[15] = d & 0xff;
    out[16] = d >> 8;
    out[17] = d & 0xff;
    return out;
  }
  const app0 = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
    d >> 8, d & 0xff, d >> 8, d & 0xff, 0x00, 0x00,
  ]);
  const out = new Uint8Array(jpeg.length + app0.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(jpeg.subarray(2), 2 + app0.length);
  return out;
}

export function readJpegDpi(jpeg: Uint8Array): number | null {
  if (jpeg[2] !== 0xff || jpeg[3] !== 0xe0 || jpeg[13] !== 1) return null;
  return (jpeg[14] << 8) | jpeg[15];
}
