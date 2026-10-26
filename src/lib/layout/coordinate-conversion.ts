/**
 * Conversions between physical units and pixel/point spaces.
 *
 * The document stores millimetres. These helpers are the only place where a
 * DPI or the 25.4 mm-per-inch constant appears, so any conversion bug has a
 * single home. Values stay as floating point; rounding to whole pixels happens
 * only when an export canvas is allocated (see `pagePixelSize`).
 */

import type { Unit } from "@/types/editor";

export const MM_PER_INCH = 25.4;
export const POINTS_PER_INCH = 72;
/** CSS reference pixel density; 96 CSS px make one CSS inch. */
export const CSS_DPI = 96;

export function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

/** PDF user-space units (1/72 inch). */
export function mmToPt(mm: number): number {
  return (mm / MM_PER_INCH) * POINTS_PER_INCH;
}

export function ptToMm(pt: number): number {
  return (pt / POINTS_PER_INCH) * MM_PER_INCH;
}

/**
 * Convert a value expressed in `unit` to millimetres.
 * `dpi` is required to interpret pixels; it is ignored for physical units.
 */
export function toMm(value: number, unit: Unit, dpi: number): number {
  switch (unit) {
    case "mm":
      return value;
    case "cm":
      return value * 10;
    case "in":
      return value * MM_PER_INCH;
    case "px":
      return pxToMm(value, dpi);
  }
}

export function fromMm(mm: number, unit: Unit, dpi: number): number {
  switch (unit) {
    case "mm":
      return mm;
    case "cm":
      return mm / 10;
    case "in":
      return mm / MM_PER_INCH;
    case "px":
      return mmToPx(mm, dpi);
  }
}

/** Sensible display precision for each unit in form fields. */
export function unitPrecision(unit: Unit): number {
  switch (unit) {
    case "mm":
      return 1;
    case "cm":
      return 2;
    case "in":
      return 3;
    case "px":
      return 0;
  }
}

/** Round for display only; never feed the result back into layout maths. */
export function formatUnit(mm: number, unit: Unit, dpi: number): string {
  const value = fromMm(mm, unit, dpi);
  const digits = unitPrecision(unit);
  return Number(value.toFixed(digits)).toString();
}

export const UNIT_LABELS: Record<Unit, string> = {
  mm: "mm",
  cm: "cm",
  in: "in",
  px: "px",
};
