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
 * - `cover`       Image fills the whole padded box, aspect preserved; the
 *                 excess is cropped (non-destructively, through `view`).
 * - `manual`      Box hugs the image exactly; the user scales it by hand.
 * - `stretch`     Image is distorted to fill the box. Only reachable through
 *                 an explicit confirmation in the UI.
 */
export type FitMode =
  | "contain"
  | "fit-width"
  | "fit-height"
  | "fill"
  | "cover"
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

/**
 * Print process of a page. Sublimation output is mirrored by default; DTF and
 * sticker (print-and-cut on adhesive media) output is not. Stickers are not a
 * sublimation product: they have their own process and cut workflow.
 */
export type PrintProcess = "sublimation" | "dtf" | "sticker";

/**
 * Whole-sheet output mirror. `auto` follows the process default
 * (`lib/render/mirror.ts`); `on` and `off` override it. The mirror is applied
 * exactly once, in the shared render plan, never on the editor canvas.
 */
export type MirrorMode = "auto" | "on" | "off";

/** Marks drawn around designs in print and export (never part of the artwork). */
export interface OutputGuides {
  /** Print each design's cut path as a thin proof line (hand trimming, proofs). */
  cutlines: boolean;
  /** Short ticks at the middle of every trim edge, to line up front and back. */
  centreMarks: boolean;
  /** Generic square corner marks for print-and-cut (no cutter-brand protocol). */
  registration: boolean;
  /** Side of each registration square, in mm. */
  registrationSize: number;
}

/**
 * Pan and zoom of the image inside a `cover` box, in source-relative terms so
 * it is independent of screen zoom, DPI and box size.
 * - `zoom` ≥ 1: 1 is the smallest crop that still covers the box.
 * - `x`, `y` in 0–1: where the crop window sits in the free range (0.5 = centred).
 */
export interface CropView {
  zoom: number;
  x: number;
  y: number;
}

/** Which face of a two-sided product a design prints on. */
export type CardSide = "front" | "back";

/** Kiss-cut leaves the backing; die-cut goes through it. */
export type CutThrough = "kiss" | "die";

/**
 * Generated contour. Paths are closed polygons in box-relative coordinates
 * (0–1 of the box width and height; values outside 0–1 are allowed when the
 * offset grows past the box). `generatedFor` records the inputs so the editor
 * can tell when the contour is out of date.
 */
export interface ContourData {
  paths: number[][];
  generatedFor: { assetId: string; width: number; height: number; offset: number; key: string };
}

/**
 * Cut path of a design (stickers, cards). Geometry is relative to the trim
 * rectangle: the design box inset by its bleed.
 */
export interface CutSpec {
  shape: "rect" | "ellipse" | "contour";
  /** Corner radius of a `rect` cut, in mm. */
  radius: number;
  /** Distance of the cut outside the trim (rect, ellipse) or the artwork (contour), in mm. */
  offset: number;
  through: CutThrough;
  /** Guide drawn inside the cut; keep text inside it. Editor only, in mm. */
  safeInset: number;
  contour: ContourData | null;
}

export interface PageSettings {
  /** Sheet id from `lib/catalogue/sheets.ts`, or "custom". */
  sheet: string;
  /** Portrait (width ≤ height) size in mm, used when `sheet` is "custom". */
  customSize: { width: number; height: number } | null;
  orientation: Orientation;
  process: PrintProcess;
  /** Flip the whole sheet horizontally in every output (not on screen); see `MirrorMode`. */
  mirrorMode: MirrorMode;
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
  /** Clear space between cut paths for Auto Arrange and card pairs, in mm. */
  spacing: number;
  /** Space between the front and back of a card pair, between their cut paths, in mm. */
  pairGap: number;
  guides: OutputGuides;
  /** Cut around the whole carrier sheet (kiss-cut sticker sheets), at the margins. */
  sheetCut: boolean;
}

export interface Design {
  id: string;
  name: string;
  /** Source image, or `null` for an empty product slot waiting for an image. */
  assetId: string | null;
  /** Product preset this design was created from, if any. */
  productId: string | null;
  /** Blank colour shown in the product preview (hex); `null` is the product's default. Never printed. */
  productColor: string | null;
  /** Bleed included in the box on every side, in mm (shown as a trim guide). */
  bleed: number;
  /** Mirror the image inside its box (a design choice, unlike output mirroring). */
  flipX: boolean;
  flipY: boolean;
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
  /** Pan and zoom inside a `cover` box; `null` is centred at zoom 1. */
  view: CropView | null;
  /** Never turned by Auto Arrange (direction-sensitive artwork). */
  lockRotation: boolean;
  /** Front or back of a two-sided product; `null` for one-sided designs. */
  side: CardSide | null;
  /** Shared by the front and back of one card; they move and arrange together. */
  pairId: string | null;
  /** Cut path for print-and-cut and hand trimming; `null` cuts at the trim box. */
  cut: CutSpec | null;
}

/** One page of a project: a sheet and the designs on it. */
export interface EditorDocument {
  page: PageSettings;
  designs: Design[];
}
