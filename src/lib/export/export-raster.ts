/**
 * Browser-side export orchestration: PNG, JPEG and PDF files from a plan.
 *
 * Each function renders from the shared render plan and returns a Blob. The
 * caller decides whether to download it, preview it or print it.
 */

import type { LoadedAsset } from "@/types/image";
import type { RenderPlan } from "@/lib/render/render-plan";
import { mmToPx } from "@/lib/layout/coordinate-conversion";
import { jpegExifOrientation, rasterToPng } from "@/lib/image/image-loader";
import { createCheckedCanvas, drawPlan, pagePixelSize } from "./rasterize";
import { setJpegDpi, setPngDpi } from "./dpi-metadata";
import { buildPdf, pdfSourceFromBlob, type PdfImageSource } from "./export-pdf";

export type AssetLookup = Map<string, LoadedAsset>;

export function renderPageCanvas(
  plan: RenderPlan,
  assets: AssetLookup,
  dpi: number,
  background?: string | null,
): HTMLCanvasElement {
  const size = pagePixelSize(plan.page, dpi);
  const canvas = createCheckedCanvas(size.width, size.height);
  const ctx = canvas.getContext("2d")!;
  // Use the exact rounded pixel size so the page fills the canvas edge to edge.
  drawPlan(ctx, plan, (id) => assets.get(id)?.element ?? null, {
    scale: size.width / plan.page.width,
    background,
  });
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("The browser could not encode the image."))),
      type,
      quality,
    ),
  );
}

export async function exportPng(plan: RenderPlan, assets: AssetLookup, dpi: number) {
  const canvas = renderPageCanvas(plan, assets, dpi);
  const blob = await canvasToBlob(canvas, "image/png");
  const bytes = setPngDpi(new Uint8Array(await blob.arrayBuffer()), dpi);
  return new Blob([bytes as BlobPart], { type: "image/png" });
}

export async function exportJpeg(
  plan: RenderPlan,
  assets: AssetLookup,
  dpi: number,
  background: string,
  quality = 0.95,
) {
  // JPEG has no alpha channel, so always paint a background.
  const canvas = renderPageCanvas(plan, assets, dpi, plan.background ?? background);
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  const bytes = setJpegDpi(new Uint8Array(await blob.arrayBuffer()), dpi);
  return new Blob([bytes as BlobPart], { type: "image/jpeg" });
}

async function pdfSourceForAsset(asset: LoadedAsset): Promise<PdfImageSource> {
  if (asset.mimeType === "image/jpeg") {
    const bytes = new Uint8Array(await asset.blob.arrayBuffer());
    // PDF viewers ignore EXIF rotation; bake it in losslessly when present.
    if (jpegExifOrientation(bytes) !== 1) {
      const png = await rasterToPng(asset.element);
      return { bytes: new Uint8Array(await png.arrayBuffer()), format: "png" };
    }
    return { bytes, format: "jpg" };
  }
  return pdfSourceFromBlob(asset.blob, () => rasterToPng(asset.element));
}

export async function exportPdf(plan: RenderPlan, assets: AssetLookup, title: string) {
  const sources = new Map<string, PdfImageSource>();
  for (const item of plan.items) {
    if (sources.has(item.assetId)) continue;
    const asset = assets.get(item.assetId);
    if (asset) sources.set(item.assetId, await pdfSourceForAsset(asset));
  }
  const bytes = await buildPdf(plan, sources, { title });
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/** Low-resolution preview for dialogs and thumbnails. */
export function renderPreviewDataUrl(
  plan: RenderPlan,
  assets: AssetLookup,
  maxSidePx: number,
  type: "image/png" | "image/jpeg" = "image/png",
): string {
  const longest = Math.max(plan.page.width, plan.page.height);
  const dpi = (maxSidePx / longest) * 25.4;
  const canvas = renderPageCanvas(plan, assets, dpi, type === "image/jpeg" ? (plan.background ?? "#ffffff") : undefined);
  return canvas.toDataURL(type, 0.8);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function safeFilename(name: string): string {
  return name.trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").toLowerCase() || "sheet";
}

export function estimatePixelSize(plan: RenderPlan, dpi: number) {
  return { width: Math.round(mmToPx(plan.page.width, dpi)), height: Math.round(mmToPx(plan.page.height, dpi)) };
}
