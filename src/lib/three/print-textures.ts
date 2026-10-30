/**
 * Textures for the 3D product models, drawn on canvases in the browser.
 *
 * - The print texture composites the design onto the blank the way the
 *   process does: sublimation dye multiplies with the blank colour (it is
 *   transparent), so for wraps and flat faces the blank is filled first and
 *   the design multiplied over it. Bleed and seam overlap are cropped off.
 * - The overlay for garments, caps and totes is the design alone: on white
 *   for sublimation (the material multiplies it over the fabric), with its
 *   transparency for DTF (the material lays it on top as a film).
 * - Weave and cork are small procedural textures, generated once per viewer.
 * - Knit normal and roughness maps for T-shirts come from `fabric-maps.ts`
 *   (the same pixels the GLB export packs), uploaded as data textures.
 */

import * as THREE from "three";
import { printCrop, printStyle, type ModelProduct } from "./product-model";
import { KNIT_TILE_MM, ROUGHNESS_TILE_MM, fabricRoughnessPixels, knitNormalPixels, type PixelMap } from "./fabric-maps";
import { TEE_UV_MM } from "./tshirt-model";
import type { PrintProcess } from "@/types/editor";

const MAX_SIDE = 2048;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The design image could not be loaded."));
    img.src = src;
  });
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}

/**
 * Draw a source region into the canvas. Product boxes have the print area's
 * proportions, so they fill it; a plain image previewed on a product may not,
 * and is then fitted whole and centred (never stretched, as in the editor).
 */
function drawFitted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  src: { x: number; y: number; w: number; h: number },
  w: number,
  h: number,
) {
  const srcAspect = src.w / src.h;
  const dstAspect = w / h;
  if (Math.abs(srcAspect / dstAspect - 1) < 0.01) {
    ctx.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, w, h);
    return;
  }
  const dw = srcAspect > dstAspect ? w : h * srcAspect;
  const dh = srcAspect > dstAspect ? w / srcAspect : h;
  ctx.drawImage(img, src.x, src.y, src.w, src.h, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function sized(aspect: number) {
  return aspect >= 1 ? { w: MAX_SIDE, h: MAX_SIDE / aspect } : { w: MAX_SIDE * aspect, h: MAX_SIDE };
}

/** Jigsaw cut lines, drawn over a puzzle print so the pieces read in 3D. */
function puzzleLines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cols = 6;
  const rows = 4;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = Math.max(1.5, w / 700);
  const cw = w / cols;
  const ch = h / rows;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      const x = c * cw;
      const y = r * ch;
      const dir = (r + c) % 2 ? 1 : -1;
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + ch * 0.35);
      ctx.bezierCurveTo(x + dir * cw * 0.22, y + ch * 0.25, x + dir * cw * 0.22, y + ch * 0.75, x, y + ch * 0.65);
      ctx.lineTo(x, y + ch);
    }
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      const y = r * ch;
      const dir = (r + c) % 2 ? -1 : 1;
      ctx.moveTo(x, y);
      ctx.lineTo(x + cw * 0.35, y);
      ctx.bezierCurveTo(x + cw * 0.25, y + dir * ch * 0.22, x + cw * 0.75, y + dir * ch * 0.22, x + cw * 0.65, y);
      ctx.lineTo(x + cw, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Canvas for the product's print, or null when there is nothing to draw
 * (an overlay product with no design yet uses the plain blank).
 */
export function printCanvas(p: ModelProduct, design: HTMLImageElement | null, color: string, process: PrintProcess): HTMLCanvasElement | null {
  const style = printStyle(p);
  if (style === "overlay") {
    if (!design) return null;
    const { w, h } = sized(p.width / p.height);
    const c = canvas(w, h);
    const ctx = c.getContext("2d")!;
    // Multiply blending treats white as "no ink".
    if (process === "sublimation") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    drawFitted(ctx, design, { x: 0, y: 0, w: design.naturalWidth, h: design.naturalHeight }, c.width, c.height);
    return c;
  }
  const { w, h } = sized(p.width / p.height);
  const c = canvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  if (design) {
    const crop = printCrop(p);
    ctx.globalCompositeOperation = process === "sublimation" ? "multiply" : "source-over";
    drawFitted(
      ctx,
      design,
      { x: crop.x * design.naturalWidth, y: crop.y * design.naturalHeight, w: crop.w * design.naturalWidth, h: crop.h * design.naturalHeight },
      c.width,
      c.height,
    );
    ctx.globalCompositeOperation = "source-over";
  }
  if (p.art === "puzzle") puzzleLines(ctx, c.width, c.height);
  return c;
}

export function colorTexture(c: HTMLCanvasElement, anisotropy = 8): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

/** Tileable normal map of a plain weave: threads that go over and under in alternate cells. */
export function weaveNormalTexture(size = 128, threads = 16): THREE.CanvasTexture {
  const c = canvas(size, size);
  const ctx = c.getContext("2d")!;
  const period = size / threads;
  const height = new Float32Array(size * size);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / period);
      const cy = Math.floor(y / period);
      const u = (x % period) / period;
      const v = (y % period) / period;
      const warpOnTop = (cx + cy) % 2 === 0;
      height[y * size + x] = (warpOnTop ? Math.sin(Math.PI * u) : Math.sin(Math.PI * v) * 0.85) + rand() * 0.08;
    }
  }
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  const strength = 2.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** Cork: warm brown with darker and lighter granules. */
export function corkTexture(size = 256): THREE.CanvasTexture {
  const c = canvas(size, size);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#b38957";
  ctx.fillRect(0, 0, size, size);
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * 14; i++) {
    const shadeV = rand();
    ctx.fillStyle = shadeV < 0.5 ? `rgba(92,60,30,${0.25 + rand() * 0.35})` : `rgba(226,190,140,${0.2 + rand() * 0.3})`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 0.6 + rand() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 40, 1 / 40);
  t.needsUpdate = true;
  return t;
}

/** A tiling, mipmapped data texture from fabric pixels, repeated to its physical tile size on the T-shirt atlas. */
function fabricTexture(map: PixelMap, tileMm: number): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array(map.data.buffer), map.size, map.size);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(TEE_UV_MM / tileMm, TEE_UV_MM / tileMm);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Single-jersey knit normal map for T-shirts. */
export function knitNormalTexture(): THREE.DataTexture {
  return fabricTexture(knitNormalPixels(), KNIT_TILE_MM);
}

/** Gentle roughness variation for T-shirt fabric. */
export function fabricRoughnessTexture(): THREE.DataTexture {
  return fabricTexture(fabricRoughnessPixels(), ROUGHNESS_TILE_MM);
}
