/**
 * Metadata for an uploaded source image.
 *
 * The original file is kept untouched as a Blob. Everything the editor does to
 * an image (fit, rotate, crop, position) is stored as metadata on a `Design`
 * and applied only when drawing, so the source can always be restored.
 */

export type SupportedMime = "image/png" | "image/jpeg" | "image/webp";

export interface ImageAsset {
  id: string;
  name: string;
  mimeType: SupportedMime;
  /** Decoded pixel size of the original file. */
  naturalWidth: number;
  naturalHeight: number;
  sizeBytes: number;
  /** True when at least one pixel is not fully opaque. */
  hasAlpha: boolean;
  createdAt: number;
}

/** An asset plus the live, in-memory resources needed to draw it. */
export interface LoadedAsset extends ImageAsset {
  blob: Blob;
  objectUrl: string;
  element: HTMLImageElement;
}

export type QualityLevel = "high" | "acceptable" | "low";

export interface ResolutionReport {
  /** Effective pixels per inch at the printed size (lower of the two axes). */
  effectiveDpi: number;
  level: QualityLevel;
  /** Printed size of the image itself (not the box), in millimetres. */
  printedWidthMm: number;
  printedHeightMm: number;
}
