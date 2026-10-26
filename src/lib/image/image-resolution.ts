/**
 * Print-quality checks.
 *
 * The question a printer asks is "how many source pixels land on each inch of
 * paper?". That is the effective DPI, and it depends only on the source pixel
 * count and the printed size, not on the export DPI. Exporting at 600 DPI
 * cannot add detail that a 72 DPI placement does not have; it only resamples.
 */

import type { CropInsets } from "@/types/editor";
import type { QualityLevel, ResolutionReport } from "@/types/image";
import { MM_PER_INCH } from "@/lib/layout/coordinate-conversion";
import { croppedSourceSize, type Size } from "./image-fit";

/** Thresholds commonly used for sublimation and photo-quality printing. */
export const QUALITY_THRESHOLDS = {
  high: 250,
  acceptable: 150,
} as const;

export function qualityForDpi(dpi: number): QualityLevel {
  if (dpi >= QUALITY_THRESHOLDS.high) return "high";
  if (dpi >= QUALITY_THRESHOLDS.acceptable) return "acceptable";
  return "low";
}

export function effectiveDpi(sourcePx: Size, printedMm: Size): number {
  if (printedMm.width <= 0 || printedMm.height <= 0) return 0;
  const dpiX = sourcePx.width / (printedMm.width / MM_PER_INCH);
  const dpiY = sourcePx.height / (printedMm.height / MM_PER_INCH);
  return Math.min(dpiX, dpiY);
}

export function resolutionReport(
  natural: Size,
  crop: CropInsets | null,
  printedMm: Size,
): ResolutionReport {
  const source = croppedSourceSize(natural, crop);
  const dpi = effectiveDpi(source, printedMm);
  return {
    effectiveDpi: dpi,
    level: qualityForDpi(dpi),
    printedWidthMm: printedMm.width,
    printedHeightMm: printedMm.height,
  };
}

/** Largest print size (mm) the image supports at the given DPI. */
export function maxPrintSizeAt(natural: Size, dpi: number): Size {
  return {
    width: (natural.width / dpi) * MM_PER_INCH,
    height: (natural.height / dpi) * MM_PER_INCH,
  };
}

export const QUALITY_COPY: Record<QualityLevel, { title: string; body: string }> =
  {
    high: {
      title: "High quality",
      body: "Enough detail for sharp prints at this size.",
    },
    acceptable: {
      title: "Acceptable quality",
      body: "Fine at arm's length. Fine detail may look soft up close.",
    },
    low: {
      title: "Low resolution",
      body: "The print may look pixelated. Use a larger source file or print smaller.",
    },
  };
