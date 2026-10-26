/**
 * Decode uploaded files into assets the editor can draw.
 *
 * The original Blob is kept as-is and referenced through an object URL; it is
 * never re-encoded during editing. Validation happens up front so the rest of
 * the app can assume an asset is a decodable PNG, JPEG or WebP.
 */

import type { ImageAsset, LoadedAsset, SupportedMime } from "@/types/image";
import { createId } from "@/lib/id";

export const SUPPORTED_MIME: SupportedMime[] = ["image/png", "image/jpeg", "image/webp"];
export const ACCEPT_ATTR = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";
export const MAX_FILE_BYTES = 60 * 1024 * 1024;
/** Above this, decoding and drawing get slow on typical laptops. */
export const LARGE_IMAGE_MEGAPIXELS = 60;

export class ImageLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageLoadError";
  }
}

/** Infer the MIME type from the file name when the browser leaves it empty. */
export function resolveMime(file: { type: string; name: string }): SupportedMime | null {
  const type = file.type.toLowerCase();
  if ((SUPPORTED_MIME as string[]).includes(type)) return type as SupportedMime;
  if (type === "image/jpg") return "image/jpeg";
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return null;
}

export function validateFile(file: { type: string; name: string; size: number }): SupportedMime {
  const mime = resolveMime(file);
  if (!mime) {
    throw new ImageLoadError(
      `${file.name} is not a supported image. Upload a PNG, JPG or WebP file.`,
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageLoadError(
      `${file.name} is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB. Use a smaller file.`,
    );
  }
  return mime;
}

/**
 * Read the EXIF orientation tag (1–8) from JPEG bytes, or 1 when absent.
 * Browsers apply this tag when displaying, but PDF viewers do not, so the
 * PDF exporter needs to know when raw bytes cannot be embedded as-is.
 */
export function jpegExifOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return 1;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (marker === 0xe1) {
      const start = offset + 4;
      const header = String.fromCharCode(...bytes.subarray(start, start + 4));
      if (header !== "Exif") return 1;
      const tiff = start + 6;
      const little = bytes[tiff] === 0x49;
      const u16 = (at: number) =>
        little ? bytes[at] | (bytes[at + 1] << 8) : (bytes[at] << 8) | bytes[at + 1];
      const u32 = (at: number) =>
        little
          ? (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0
          : ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
      const ifd = tiff + u32(tiff + 4);
      const entries = u16(ifd);
      for (let i = 0; i < entries; i++) {
        const entry = ifd + 2 + i * 12;
        if (u16(entry) === 0x0112) return u16(entry + 8) || 1;
      }
      return 1;
    }
    if (marker === 0xda) return 1; // start of scan: no more metadata
    offset += 2 + length;
  }
  return 1;
}

export function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new ImageLoadError("The file could not be decoded. It may be damaged."));
    img.src = src;
  });
}

/**
 * Check for transparency on a downscaled copy. Sampling at up to 256 px is
 * enough to find transparent regions and avoids a full-size pixel read.
 */
export function detectAlpha(img: HTMLImageElement, mime: SupportedMime): boolean {
  if (mime === "image/jpeg") return false;
  const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return mime === "image/png";
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

export async function loadAssetFromBlob(
  blob: Blob,
  meta: Partial<ImageAsset> & { name: string; mimeType: SupportedMime },
): Promise<LoadedAsset> {
  const typed = blob.type === meta.mimeType ? blob : new Blob([blob], { type: meta.mimeType });
  const objectUrl = URL.createObjectURL(typed);
  try {
    const element = await decodeImage(objectUrl);
    if (!element.naturalWidth || !element.naturalHeight) {
      throw new ImageLoadError("The image has no pixels.");
    }
    return {
      id: meta.id ?? createId("asset"),
      name: meta.name,
      mimeType: meta.mimeType,
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
      sizeBytes: typed.size,
      hasAlpha: meta.hasAlpha ?? detectAlpha(element, meta.mimeType),
      createdAt: meta.createdAt ?? Date.now(),
      blob: typed,
      objectUrl,
      element,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export async function loadAssetFromFile(file: File): Promise<LoadedAsset> {
  const mimeType = validateFile(file);
  return loadAssetFromBlob(file, { name: file.name, mimeType });
}

/** Lossless PNG copy at native resolution, as displayed (EXIF applied). */
export async function rasterToPng(img: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(img, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed."))), "image/png"),
  );
}

export function megapixels(asset: Pick<ImageAsset, "naturalWidth" | "naturalHeight">): number {
  return (asset.naturalWidth * asset.naturalHeight) / 1_000_000;
}
