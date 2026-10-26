/**
 * Core document model for the print-layout editor.
 *
 * Every physical quantity in this file is in millimetres. Pixels only appear
 * at the edges of the system: when an image file is decoded (source pixels)
 * and when a page is rasterised for screen or export (output pixels). Keeping
 * the document in millimetres means the layout is independent of zoom level,
 * screen density and export DPI, so a design placed at 90 × 60 mm stays
 * 90 × 60 mm whatever happens downstream.
 */

export type Unit = "mm" | "cm" | "in" | "px";

export type Orientation = "portrait" | "landscape";

export type ExportDpi = 150 | 300 | 600;

/**
 * How the source image is placed inside its design box.
 *
 * - `contain`     Whole image, aspect preserved, scaled to fit the box (default).
 * - `fit-width`   Image matches the box width; box height follows the image.
 * - `fit-height`  Image matches the box height; box width follows the image.
 * - `fill`        Same geometry as `contain`, but unused box area is painted
 *                 with a background colour. The image is never cropped.
 * - `manual`      Box hugs the image exactly; the user scales it by hand.
 * - `stretch`     Image is distorted to fill the box. Only reachable through
 *                 an explicit confirmation in the UI.
 */
export type FitMode =
  | "contain"
  | "fit-width"
  | "fit-height"
  | "fill"
  | "manual"
  | "stretch";

export type AlignX = "start" | "center" | "end";
export type AlignY = "start" | "center" | "end";

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Optional, non-destructive crop expressed as fractions (0–1) of the source. */
export interface CropInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageSettings {
  /** Paper size identifier; A4 is the only sheet the product targets today. */
  paper: "A4";
  orientation: Orientation;
  margins: Margins;
  /** `null` means transparent (honoured by PNG export only). */
  background: string | null;
  dpi: ExportDpi;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  snapToGuides: boolean;
  /** Keep designs inside the printable area while dragging. */
  constrainToPrintable: boolean;
  /** Draw corner crop marks around every design in exports. */
  cropMarks: boolean;
}

export interface Design {
  id: string;
  name: string;
  assetId: string;
  /** Top-left corner of the unrotated design box, in page millimetres. */
  x: number;
  y: number;
  /** Size of the design box (the requested print size), in millimetres. */
  width: number;
  height: number;
  /** Clockwise rotation in degrees around the box centre. */
  rotation: number;
  fitMode: FitMode;
  alignX: AlignX;
  alignY: AlignY;
  /** Inner padding between the box edge and the image, in millimetres. */
  padding: number;
  /** Background painted in `fill` mode; `null` keeps it transparent. */
  fillColor: string | null;
  lockAspect: boolean;
  /** Thin outline around the box, useful as a cut line. */
  border: boolean;
  crop: CropInsets | null;
  groupId: string | null;
  locked: boolean;
}

export interface EditorDocument {
  page: PageSettings;
  designs: Design[];
}
