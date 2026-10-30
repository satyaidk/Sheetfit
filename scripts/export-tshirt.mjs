/**
 * Export the T-shirt garment to glTF binary, with its texture maps.
 *
 *   node --import ./scripts/lib/register-ts.mjs scripts/export-tshirt.mjs
 *   (or: npm run model:tshirt)
 *
 * Writes:
 *   public/models/tshirt.glb                  adult medium, white, no print
 *   public/models/tshirt/knit-normal.png      tileable jersey normal map (12 mm tile)
 *   public/models/tshirt/fabric-roughness.png tileable roughness (G channel, 160 mm tile)
 *
 * The geometry comes from the same generator the app runs
 * (`src/lib/three/tshirt-model.ts`), so the file and the app never drift
 * apart; `tests/v08-tshirt.test.ts` checks the GLB against the generator.
 * The printable areas, sizes and UV scale travel in the GLB's `extras`.
 *
 * A minimal glTF 2.0 writer, no dependencies: three's GLTFExporter needs a
 * browser (canvas, FileReader) for textures.
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tee = await import(new URL("../src/lib/three/tshirt-model.ts", import.meta.url).href);
const maps = await import(new URL("../src/lib/three/fabric-maps.ts", import.meta.url).href);

// ---------------------------------------------------------------- PNG (RGBA, 8 bit)

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png({ size, data }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) Buffer.from(data.buffer, data.byteOffset + y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- glTF

const model = tee.teeModel(tee.ADULT_TEE);
const knit = maps.knitNormalPixels();
const rough = maps.fabricRoughnessPixels();
// glTF reads roughness from G and metalness from B: cloth is not metal.
for (let i = 0; i < rough.data.length; i += 4) rough.data[i + 2] = 0;
const knitPng = png(knit);
const roughPng = png(rough);

const chunks = [];
let byteLength = 0;
const bufferViews = [];
const accessors = [];
function addView(buf, target) {
  const pad = (4 - (byteLength % 4)) % 4;
  if (pad) {
    chunks.push(Buffer.alloc(pad));
    byteLength += pad;
  }
  bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: buf.length, ...(target ? { target } : {}) });
  chunks.push(buf);
  byteLength += buf.length;
  return bufferViews.length - 1;
}
function addAccessor(typed, type, componentType, target, extra = {}) {
  const view = addView(Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength), target);
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type];
  accessors.push({ bufferView: view, componentType, count: typed.length / size, type, ...extra });
  return accessors.length - 1;
}
const FLOAT = 5126;
const U8 = 5121;
const U16 = 5123;
const U32 = 5125;
const ARRAY = 34962;
const ELEMENTS = 34963;

const repeat = (tile) => ({ KHR_texture_transform: { scale: [tee.TEE_UV_MM / tile, tee.TEE_UV_MM / tile] } });
const textures = [
  { source: 0, sampler: 0 },
  { source: 1, sampler: 0 },
];
const fabric = (name, rgb, normalScale) => ({
  name,
  pbrMetallicRoughness: {
    baseColorFactor: [...rgb, 1],
    metallicFactor: 0,
    roughnessFactor: 1,
    metallicRoughnessTexture: { index: 1, extensions: repeat(maps.ROUGHNESS_TILE_MM) },
  },
  normalTexture: { index: 0, scale: normalScale, extensions: repeat(maps.KNIT_TILE_MM) },
  extensions: { KHR_materials_sheen: { sheenColorFactor: [1, 1, 1], sheenRoughnessFactor: 0.6 } },
});
// Linear base colours: a white blank shown at about 80 % reflectance (as the app does), the inside a little darker.
const materials = [fabric("Fabric", [0.8, 0.8, 0.8], 0.55), fabric("Inside", [0.66, 0.66, 0.66], 0.55), fabric("Rib", [0.8, 0.8, 0.8], 0.35), fabric("Seam", [0.74, 0.74, 0.74], 0.55)];
const MATERIAL = { fabric: 0, inside: 1, rib: 2, seam: 3 };

const meshes = [];
const nodes = [];
for (const part of model.parts) {
  const g = part.geometry;
  const pos = g.getAttribute("position").array;
  const nor = g.getAttribute("normal").array;
  const uv = g.getAttribute("uv")?.array;
  const col = g.getAttribute("color")?.array;
  const index = g.index.array;
  const groups = g.groups.length ? g.groups : [{ start: 0, count: index.length, materialIndex: 0 }];
  const primitives = [];
  for (const gr of groups) {
    // Each group becomes its own primitive with its own vertex range, so most fit 16-bit indices.
    const idx = index.subarray(gr.start, gr.start + gr.count);
    let lo = Infinity;
    let hi = -Infinity;
    for (const i of idx) {
      if (i < lo) lo = i;
      if (i > hi) hi = i;
    }
    const n = hi - lo + 1;
    const p = new Float32Array(pos.subarray(lo * 3, (hi + 1) * 3));
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3)
      for (let c = 0; c < 3; c++) {
        min[c] = Math.min(min[c], p[i + c]);
        max[c] = Math.max(max[c], p[i + c]);
      }
    const attributes = {
      POSITION: addAccessor(p, "VEC3", FLOAT, ARRAY, { min, max }),
      NORMAL: addAccessor(new Float32Array(nor.subarray(lo * 3, (hi + 1) * 3)), "VEC3", FLOAT, ARRAY),
    };
    // The app's UV runs up the shirt; glTF's v runs down the image.
    const t = new Float32Array(n * 2);
    if (uv)
      for (let i = 0; i < n; i++) {
        t[i * 2] = uv[(lo + i) * 2];
        t[i * 2 + 1] = 1 - uv[(lo + i) * 2 + 1];
      }
    attributes.TEXCOORD_0 = addAccessor(t, "VEC2", FLOAT, ARRAY);
    if (col) {
      const c = new Uint8Array(n * 4);
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < 3; k++) c[i * 4 + k] = Math.round(Math.min(1, col[(lo + i) * 3 + k]) * 255);
        c[i * 4 + 3] = 255;
      }
      attributes.COLOR_0 = addAccessor(c, "VEC4", U8, ARRAY, { normalized: true });
    }
    const rebased = n <= 65535 ? new Uint16Array(idx.length) : new Uint32Array(idx.length);
    for (let i = 0; i < idx.length; i++) rebased[i] = idx[i] - lo;
    primitives.push({ attributes, indices: addAccessor(rebased, "SCALAR", n <= 65535 ? U16 : U32, ELEMENTS), material: MATERIAL[part.materials[gr.materialIndex]], mode: 4 });
  }
  meshes.push({ name: part.name, primitives });
  nodes.push({ name: part.name, mesh: meshes.length - 1 });
}
const images = [
  { name: "knit-normal", mimeType: "image/png", bufferView: addView(knitPng) },
  { name: "fabric-roughness", mimeType: "image/png", bufferView: addView(roughPng) },
];
const round = (o) => JSON.parse(JSON.stringify(o, (_, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)));
// glTF works in metres: the meshes keep millimetres under a 0.001 root scale.
nodes.push({ name: "TShirt", children: nodes.map((_, i) => i), scale: [0.001, 0.001, 0.001] });
const gltf = {
  asset: {
    version: "2.0",
    generator: "SheetFit scripts/export-tshirt.mjs",
    copyright: "SheetFit contributors, MIT licence",
    extras: {
      description: "Blank crew-neck T-shirt, adult medium, regular fit. Geometry in millimetres under a 0.001 root scale (metres). Faces +Z, hem at y = 0.",
      size: tee.ADULT_TEE.name,
      uvMillimetres: tee.TEE_UV_MM,
      printable: round(model.printable),
      landmarks: round(model.landmarks),
      panels: "Print areas are in each panel's flat fabric coordinates (mm): front/back u from the centre line (to the viewer's right), v up from the hem; sleeves u from the top line, v up from the sleeve hem. See docs/models/tshirt.md.",
    },
  },
  extensionsUsed: ["KHR_materials_sheen", "KHR_texture_transform"],
  scene: 0,
  scenes: [{ name: "TShirt", nodes: [nodes.length - 1] }],
  nodes,
  meshes,
  materials,
  textures,
  images,
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  accessors,
  bufferViews,
  buffers: [{ byteLength }],
};

const bin = Buffer.concat(chunks);
const json = Buffer.from(JSON.stringify(gltf), "utf8");
const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const binPadded = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // "glTF"
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binPadded.length, 8);
const chunkHeader = (len, type) => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(len, 0);
  b.writeUInt32LE(type, 4);
  return b;
};
const glb = Buffer.concat([header, chunkHeader(jsonPadded.length, 0x4e4f534a), jsonPadded, chunkHeader(binPadded.length, 0x004e4942), binPadded]);

const outDir = path.join(root, "public", "models");
fs.mkdirSync(path.join(outDir, "tshirt"), { recursive: true });
fs.writeFileSync(path.join(outDir, "tshirt.glb"), glb);
fs.writeFileSync(path.join(outDir, "tshirt", "knit-normal.png"), knitPng);
fs.writeFileSync(path.join(outDir, "tshirt", "fabric-roughness.png"), roughPng);
const vertices = meshes.reduce((n, m) => n + m.primitives.reduce((k, p) => k + accessors[p.attributes.POSITION].count, 0), 0);
const triangles = meshes.reduce((n, m) => n + m.primitives.reduce((k, p) => k + accessors[p.indices].count / 3, 0), 0);
console.log(`tshirt.glb: ${(glb.length / 1048576).toFixed(2)} MB, ${meshes.length} meshes, ${vertices} vertices, ${triangles} triangles`);
