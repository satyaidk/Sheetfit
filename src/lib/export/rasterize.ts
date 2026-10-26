/**
 * Draw a render plan onto a 2D canvas context.
 *
 * Used for PNG/JPEG export, the print image, the export preview and project
 * thumbnails. The source image is passed straight to `drawImage` with its
 * source rectangle, so the browser samples the original pixels exactly once,
 * at the output resolution.
 */

import type { RenderPlan } from "@/lib/render/render-plan";
import { mmToPx } from "@/lib/layout/coordinate-conversion";

export type ImageSourceLookup = (assetId: string) => CanvasImageSource | null;

export interface RasterOptions {
  /** Pixels per millimetre on the target canvas. */
  scale: number;
  /** Overrides the plan background, e.g. white for JPEG. */
  background?: string | null;
}

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function drawPlan(
  ctx: Ctx2D,
  plan: RenderPlan,
  getImage: ImageSourceLookup,
  options: RasterOptions,
): void {
  const s = options.scale;
  const background =
    options.background !== undefined ? options.background : plan.background;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, plan.page.width * s, plan.page.height * s);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, plan.page.width * s, plan.page.height * s);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  for (const item of plan.items) {
    ctx.save();
    ctx.scale(s, s);
    ctx.translate(item.center.x, item.center.y);
    ctx.rotate((item.rotation * Math.PI) / 180);
    if (item.background) {
      const r = item.background.rect;
      ctx.fillStyle = item.background.color;
      ctx.fillRect(r.x, r.y, r.width, r.height);
    }
    const img = getImage(item.assetId);
    if (img && item.image.width > 0 && item.image.height > 0) {
      const src = item.sourceRect;
      const dst = item.image;
      ctx.drawImage(
        img,
        src.x,
        src.y,
        src.width,
        src.height,
        dst.x,
        dst.y,
        dst.width,
        dst.height,
      );
    }
    if (item.border) {
      const r = item.border.rect;
      ctx.strokeStyle = item.border.color;
      ctx.lineWidth = item.border.width;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    }
    ctx.restore();
  }

  if (plan.cropMarks.length > 0) {
    ctx.save();
    ctx.scale(s, s);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = plan.cropMarkWidth;
    ctx.beginPath();
    for (const m of plan.cropMarks) {
      ctx.moveTo(m.x1, m.y1);
      ctx.lineTo(m.x2, m.y2);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Whole-pixel canvas size for a page at a DPI. Rounding happens only here. */
export function pagePixelSize(page: { width: number; height: number }, dpi: number) {
  return {
    width: Math.round(mmToPx(page.width, dpi)),
    height: Math.round(mmToPx(page.height, dpi)),
  };
}

/**
 * Conservative canvas limits. Safari caps canvas area at 16,777,216 pixels;
 * Chromium and Firefox allow much more but large canvases can still fail
 * under memory pressure, which we detect at allocation time as well.
 */
export const SAFE_CANVAS_AREA = 16_777_216;
export const MAX_CANVAS_SIDE = 16_384;

export function canvasSizeWithinLimits(
  size: { width: number; height: number },
  maxArea = SAFE_CANVAS_AREA,
): boolean {
  return (
    size.width <= MAX_CANVAS_SIDE &&
    size.height <= MAX_CANVAS_SIDE &&
    size.width * size.height <= maxArea
  );
}

export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua);
}

/** Largest canvas area this browser is likely to handle. */
export function browserCanvasAreaLimit(): number {
  return isSafari() ? SAFE_CANVAS_AREA : 268_435_456;
}

export class CanvasTooLargeError extends Error {
  constructor(public readonly size: { width: number; height: number }) {
    super(
      `The browser could not allocate a ${size.width} × ${size.height} px canvas. Choose a lower DPI.`,
    );
    this.name = "CanvasTooLargeError";
  }
}

/** Allocate a canvas and verify the browser actually backed it with memory. */
export function createCheckedCanvas(width: number, height: number): HTMLCanvasElement {
  if (!canvasSizeWithinLimits({ width, height }, browserCanvasAreaLimit())) {
    throw new CanvasTooLargeError({ width, height });
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width !== width || canvas.height !== height) {
    throw new CanvasTooLargeError({ width, height });
  }
  // A canvas over the real limit silently ignores drawing; probe one pixel.
  ctx.fillStyle = "#010203";
  ctx.fillRect(width - 1, height - 1, 1, 1);
  const probe = ctx.getImageData(width - 1, height - 1, 1, 1).data;
  if (probe[0] !== 1 || probe[2] !== 3) throw new CanvasTooLargeError({ width, height });
  ctx.clearRect(width - 1, height - 1, 1, 1);
  return canvas;
}
