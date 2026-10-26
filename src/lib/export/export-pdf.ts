/**
 * Exact-size A4 PDF export.
 *
 * The PDF page is created at exactly 210 × 297 mm (595.276 × 841.890 pt) or
 * its landscape equivalent. Designs are vector-placed: each one sets up a
 * transformation matrix that maps its local millimetre coordinates onto the
 * page, so position, rotation and size are exact rather than rasterised.
 *
 * PNG and JPEG sources are embedded byte-for-byte, with no recompression.
 * WebP is not a PDF image format, so it is converted once to lossless PNG at
 * its native resolution before embedding.
 */

import {
  PDFDocument,
  clip,
  concatTransformationMatrix,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFImage,
} from "pdf-lib";
import type { RenderPlan, PlanItem } from "@/lib/render/render-plan";
import { mmToPt } from "@/lib/layout/coordinate-conversion";

export interface PdfImageSource {
  bytes: Uint8Array;
  format: "png" | "jpg";
}

export function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.slice(0, 6);
  const n = parseInt(full, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/**
 * PDF transformation matrix for a plan item.
 * Maps local (x right, y up, millimetres) to page points.
 */
export function itemMatrix(
  item: Pick<PlanItem, "center" | "rotation">,
  pageHeightMm: number,
): [number, number, number, number, number, number] {
  const k = mmToPt(1);
  const rad = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    k * cos,
    -k * sin,
    k * sin,
    k * cos,
    k * item.center.x,
    k * (pageHeightMm - item.center.y),
  ];
}

export async function buildPdf(
  plan: RenderPlan,
  images: Map<string, PdfImageSource>,
  meta: { title: string },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(meta.title);
  doc.setCreator("Sheetfit");
  doc.setProducer("Sheetfit (pdf-lib)");
  const pageW = mmToPt(plan.page.width);
  const pageH = mmToPt(plan.page.height);
  const page = doc.addPage([pageW, pageH]);

  if (plan.background) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      color: hexToRgb(plan.background),
    });
  }

  // Embed each asset once, even if many designs use it.
  const embedded = new Map<string, PDFImage>();
  for (const item of plan.items) {
    if (embedded.has(item.assetId)) continue;
    const src = images.get(item.assetId);
    if (!src) continue;
    embedded.set(
      item.assetId,
      src.format === "png"
        ? await doc.embedPng(src.bytes)
        : await doc.embedJpg(src.bytes),
    );
  }

  for (const item of plan.items) {
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(...itemMatrix(item, plan.page.height)),
    );
    // Local rects are y-down; PDF local space is y-up, so flip each rect.
    const flip = (r: { x: number; y: number; width: number; height: number }) => ({
      x: r.x,
      y: -(r.y + r.height),
      width: r.width,
      height: r.height,
    });

    if (item.background) {
      page.drawRectangle({ ...flip(item.background.rect), color: hexToRgb(item.background.color) });
    }

    const image = embedded.get(item.assetId);
    if (image && item.image.width > 0 && item.image.height > 0) {
      const dst = item.image;
      const src = item.sourceRect;
      const cropped =
        src.x > 0 ||
        src.y > 0 ||
        src.width < item.naturalSize.width ||
        src.height < item.naturalSize.height;
      if (!cropped) {
        page.drawImage(image, flip(dst));
      } else {
        // Draw the full image scaled so the crop window lands on `dst`,
        // and clip to `dst`. The embedded data itself stays complete.
        const sx = dst.width / src.width;
        const sy = dst.height / src.height;
        const full = {
          x: dst.x - src.x * sx,
          y: dst.y - src.y * sy,
          width: item.naturalSize.width * sx,
          height: item.naturalSize.height * sy,
        };
        const clipRect = flip(dst);
        page.pushOperators(
          pushGraphicsState(),
          rectangle(clipRect.x, clipRect.y, clipRect.width, clipRect.height),
          clip(),
          endPath(),
        );
        page.drawImage(image, flip(full));
        page.pushOperators(popGraphicsState());
      }
    }

    if (item.border) {
      page.drawRectangle({
        ...flip(item.border.rect),
        borderColor: hexToRgb(item.border.color),
        borderWidth: item.border.width,
      });
    }
    page.pushOperators(popGraphicsState());
  }

  if (plan.cropMarks.length > 0) {
    const thickness = mmToPt(plan.cropMarkWidth);
    for (const m of plan.cropMarks) {
      page.drawLine({
        start: { x: mmToPt(m.x1), y: pageH - mmToPt(m.y1) },
        end: { x: mmToPt(m.x2), y: pageH - mmToPt(m.y2) },
        thickness,
        color: rgb(0, 0, 0),
      });
    }
  }

  return doc.save();
}

/** Read an asset blob into bytes pdf-lib can embed without re-encoding. */
export async function pdfSourceFromBlob(
  blob: Blob,
  convertToPng: (blob: Blob) => Promise<Blob>,
): Promise<PdfImageSource> {
  if (blob.type === "image/png") {
    return { bytes: new Uint8Array(await blob.arrayBuffer()), format: "png" };
  }
  if (blob.type === "image/jpeg") {
    return { bytes: new Uint8Array(await blob.arrayBuffer()), format: "jpg" };
  }
  const png = await convertToPng(blob);
  return { bytes: new Uint8Array(await png.arrayBuffer()), format: "png" };
}
