/**
 * The non-cropping image fitting engine.
 *
 * A `Design` has a box (the print size the user asked for) and a source image.
 * This module answers one question: where, inside that box, does the image
 * go? The rules are deliberately conservative:
 *
 * 1. Every mode except `stretch` preserves the source aspect ratio exactly.
 * 2. No mode ever places image pixels outside the box. Cropping is opt-in and
 *    non-destructive: the `crop` insets and the `cover` mode only change which
 *    source pixels count as "the image" before fitting (`effectiveSourceRect`).
 *    `cover` picks the largest window of the box's shape (then `view` pans and
 *    zooms it), so the image fills the box and only the excess is left out.
 * 3. When the box and the image disagree on aspect ratio, the difference is
 *    left as empty space (or background colour in `fill` mode) and reported
 *    through `describeFit` so the UI can explain it.
 *
 * All box and rect values are millimetres; source sizes are pixels. Only the
 * ratio of the source size matters to the geometry.
 */

import type { CropInsets, CropView, Design, FitMode } from "@/types/editor";

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

/** Scale `source` to fit entirely inside `target` while keeping its aspect. */
export function fitContain(source: Size, target: Size): Size {
  if (source.width <= 0 || source.height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(
    target.width / source.width,
    target.height / source.height,
  );
  return { width: source.width * scale, height: source.height * scale };
}

export function aspectRatio(size: Size): number {
  return size.height === 0 ? 0 : size.width / size.height;
}

/** Source pixel size after the optional crop insets are applied. */
export function croppedSourceSize(natural: Size, crop: CropInsets | null): Size {
  if (!crop) return natural;
  return {
    width: natural.width * Math.max(0, 1 - crop.left - crop.right),
    height: natural.height * Math.max(0, 1 - crop.top - crop.bottom),
  };
}

/** Source rectangle (in source pixels) that should be drawn. */
export function sourceCropRect(natural: Size, crop: CropInsets | null): Rect {
  const size = croppedSourceSize(natural, crop);
  return {
    x: crop ? natural.width * crop.left : 0,
    y: crop ? natural.height * crop.top : 0,
    ...size,
  };
}

/** Inner (padded) box in millimetres. */
export function innerBox(design: Pick<Design, "width" | "height" | "padding">): Size {
  const pad = Math.min(design.padding, design.width / 2, design.height / 2);
  return { width: Math.max(0, design.width - pad * 2), height: Math.max(0, design.height - pad * 2) };
}

export const DEFAULT_VIEW: CropView = { zoom: 1, x: 0.5, y: 0.5 };
export const MAX_COVER_ZOOM = 8;

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));

/** Clamp a view into its valid range (zoom 1–8, position 0–1). */
export function normalizeView(view: CropView | null | undefined): CropView {
  const v = view ?? DEFAULT_VIEW;
  const zoom = Number.isFinite(v.zoom) ? Math.min(MAX_COVER_ZOOM, Math.max(1, v.zoom)) : 1;
  return { zoom, x: clamp01(v.x), y: clamp01(v.y) };
}

/**
 * The window of `base` (source pixels) that covers a box of `targetAspect`
 * (width / height): the largest such window at zoom 1, smaller as zoom grows,
 * positioned inside `base` by `view.x` / `view.y`.
 */
export function coverWindow(base: Rect, targetAspect: number, view: CropView | null): Rect {
  if (base.width <= 0 || base.height <= 0 || !(targetAspect > 0)) return base;
  const v = normalizeView(view);
  let w = base.width;
  let h = base.height;
  if (base.width / base.height > targetAspect) w = base.height * targetAspect;
  else h = base.width / targetAspect;
  w /= v.zoom;
  h /= v.zoom;
  return { x: base.x + (base.width - w) * v.x, y: base.y + (base.height - h) * v.y, width: w, height: h };
}

type SourceInput = Pick<Design, "crop" | "fitMode" | "width" | "height" | "padding"> & { view?: CropView | null };

/**
 * Source pixels that are actually drawn: the crop insets, then (in `cover`
 * mode) the cover window. Every renderer and every resolution check uses this.
 */
export function effectiveSourceRect(design: SourceInput, natural: Size): Rect {
  const base = sourceCropRect(natural, design.crop);
  if (design.fitMode !== "cover") return base;
  const inner = innerBox(design);
  if (inner.width <= 0 || inner.height <= 0) return base;
  return coverWindow(base, inner.width / inner.height, design.view ?? null);
}

/** Size of `effectiveSourceRect`, the source the fitting engine fits into the box. */
export function effectiveSourceSize(design: SourceInput, natural: Size): Size {
  const r = effectiveSourceRect(design, natural);
  return { width: r.width, height: r.height };
}

/** `effectiveSourceRect` as crop insets (fractions of the source), or null when nothing is cut. */
export function effectiveCrop(design: SourceInput, natural: Size): CropInsets | null {
  const r = effectiveSourceRect(design, natural);
  if (natural.width <= 0 || natural.height <= 0) return null;
  const insets = {
    left: r.x / natural.width,
    top: r.y / natural.height,
    right: 1 - (r.x + r.width) / natural.width,
    bottom: 1 - (r.y + r.height) / natural.height,
  };
  const none = Object.values(insets).every((v) => Math.abs(v) < 1e-9);
  return none ? null : insets;
}

/** Share of the (crop-inset) source left out by `cover`, 0–1, for "x % cropped" notes. */
export function coverCroppedFraction(design: SourceInput, natural: Size): number {
  if (design.fitMode !== "cover") return 0;
  const base = sourceCropRect(natural, design.crop);
  const win = effectiveSourceRect(design, natural);
  const a = base.width * base.height;
  return a > 0 ? Math.max(0, 1 - (win.width * win.height) / a) : 0;
}

/**
 * Move a cover view by a drag of (dxMm, dyMm) on the printed box: the image
 * follows the pointer. Pure, so the crop gesture is testable.
 */
export function panView(design: SourceInput, natural: Size, dxMm: number, dyMm: number): CropView {
  const v = normalizeView(design.view);
  const base = sourceCropRect(natural, design.crop);
  const win = effectiveSourceRect({ ...design, fitMode: "cover" }, natural);
  const inner = innerBox(design);
  if (inner.width <= 0 || win.width <= 0) return v;
  const pxPerMm = win.width / inner.width;
  const freeX = base.width - win.width;
  const freeY = base.height - win.height;
  return normalizeView({
    zoom: v.zoom,
    x: freeX > 1e-9 ? v.x - (dxMm * pxPerMm) / freeX : 0.5,
    y: freeY > 1e-9 ? v.y - (dyMm * pxPerMm) / freeY : 0.5,
  });
}

/** Zoom a cover view, keeping the window centre where it is. */
export function zoomView(design: SourceInput, natural: Size, zoom: number): CropView {
  const v = normalizeView(design.view);
  const base = sourceCropRect(natural, design.crop);
  const before = effectiveSourceRect({ ...design, fitMode: "cover", view: v }, natural);
  const cx = before.x + before.width / 2;
  const cy = before.y + before.height / 2;
  const nz = normalizeView({ ...v, zoom }).zoom;
  const w = (before.width * v.zoom) / nz;
  const h = (before.height * v.zoom) / nz;
  const freeX = base.width - w;
  const freeY = base.height - h;
  return normalizeView({
    zoom: nz,
    x: freeX > 1e-9 ? (cx - w / 2 - base.x) / freeX : 0.5,
    y: freeY > 1e-9 ? (cy - h / 2 - base.y) / freeY : 0.5,
  });
}

/** Modes whose box shape is derived from the image rather than typed in. */
export function boxFollowsImage(mode: FitMode): boolean {
  return mode === "fit-width" || mode === "fit-height" || mode === "manual";
}

type BoxInput = Pick<Design, "width" | "height" | "padding" | "fitMode">;

/**
 * Return the box size implied by the fit mode.
 *
 * `fit-width` keeps the typed width and derives the height from the image;
 * `fit-height` does the reverse; `manual` keeps the width and hugs the image.
 * Other modes return the box unchanged.
 */
export function normalizeBox(design: BoxInput, source: Size): Size {
  const pad2 = design.padding * 2;
  const ratio = aspectRatio(source);
  if (ratio === 0) return { width: design.width, height: design.height };
  switch (design.fitMode) {
    case "fit-width":
    case "manual": {
      const innerW = Math.max(0, design.width - pad2);
      return { width: design.width, height: innerW / ratio + pad2 };
    }
    case "fit-height": {
      const innerH = Math.max(0, design.height - pad2);
      return { width: innerH * ratio + pad2, height: design.height };
    }
    default:
      return { width: design.width, height: design.height };
  }
}

type FitInput = Pick<
  Design,
  "width" | "height" | "padding" | "fitMode" | "alignX" | "alignY"
>;

function alignOffset(free: number, align: "start" | "center" | "end"): number {
  if (align === "start") return 0;
  if (align === "end") return free;
  return free / 2;
}

/**
 * Image rectangle relative to the box's top-left corner, in millimetres.
 * The result always lies inside the padded box.
 */
export function computeImageRect(design: FitInput, source: Size): Rect {
  const pad = Math.min(design.padding, design.width / 2, design.height / 2);
  const inner: Size = {
    width: Math.max(0, design.width - pad * 2),
    height: Math.max(0, design.height - pad * 2),
  };
  // `cover` draws a source window of the box's own shape, so it fills the box exactly.
  if (design.fitMode === "stretch" || design.fitMode === "cover") {
    return { x: pad, y: pad, ...inner };
  }
  const fitted = fitContain(source, inner);
  return {
    x: pad + alignOffset(inner.width - fitted.width, design.alignX),
    y: pad + alignOffset(inner.height - fitted.height, design.alignY),
    ...fitted,
  };
}

export interface FitDescription {
  image: Rect;
  sourceAspect: number;
  boxAspect: number;
  /** True when the box shape differs from the image shape by more than 0.5%. */
  aspectMismatch: boolean;
  /** Empty space left inside the box on each axis, in millimetres. */
  unusedWidth: number;
  unusedHeight: number;
  distorted: boolean;
}

export function describeFit(design: FitInput, source: Size): FitDescription {
  const image = computeImageRect(design, source);
  const pad2 = Math.min(design.padding * 2, design.width, design.height);
  const innerW = design.width - pad2;
  const innerH = design.height - pad2;
  const sourceAspect = aspectRatio(source);
  const boxAspect = innerH === 0 ? 0 : innerW / innerH;
  const mismatch =
    sourceAspect > 0 && Math.abs(boxAspect / sourceAspect - 1) > 0.005;
  return {
    image,
    sourceAspect,
    boxAspect,
    aspectMismatch: mismatch,
    unusedWidth: Math.max(0, innerW - image.width),
    unusedHeight: Math.max(0, innerH - image.height),
    distorted: design.fitMode === "stretch" && mismatch,
  };
}

/**
 * Apply a typed width and/or height to a design box.
 *
 * With the aspect lock on, the missing dimension is derived from the source
 * image proportions (not the current box), so locking always converges on a
 * box that the image fills edge to edge.
 */
export function resizeBox(
  design: Pick<Design, "width" | "height" | "padding" | "lockAspect">,
  source: Size,
  next: Partial<Size>,
): Size {
  const ratio = aspectRatio(source);
  const pad2 = design.padding * 2;
  let width = next.width ?? design.width;
  let height = next.height ?? design.height;
  if (design.lockAspect && ratio > 0) {
    if (next.width !== undefined && next.height === undefined) {
      height = Math.max(0, width - pad2) / ratio + pad2;
    } else if (next.height !== undefined && next.width === undefined) {
      width = Math.max(0, height - pad2) * ratio + pad2;
    }
  }
  return { width: Math.max(0.1, width), height: Math.max(0.1, height) };
}

/** Initial box for a newly placed image: requested size, contain-fitted. */
export function initialBoxForImage(
  source: Size,
  maxBox: Size,
  preferred?: Size,
): Size {
  if (preferred) return preferred;
  // Default to the image's own proportions, at most 60% of the printable area.
  return fitContain(source, {
    width: maxBox.width * 0.6,
    height: maxBox.height * 0.6,
  });
}
