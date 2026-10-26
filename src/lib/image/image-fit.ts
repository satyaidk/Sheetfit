/**
 * The non-cropping image fitting engine.
 *
 * A `Design` has a box (the print size the user asked for) and a source image.
 * This module answers one question: where, inside that box, does the image
 * go? The rules are deliberately conservative:
 *
 * 1. Every mode except `stretch` preserves the source aspect ratio exactly.
 * 2. No mode ever places image pixels outside the box, so nothing is cropped
 *    by the fit itself. Cropping is a separate, opt-in `crop` setting that
 *    changes which source pixels count as "the image" before fitting.
 * 3. When the box and the image disagree on aspect ratio, the difference is
 *    left as empty space (or background colour in `fill` mode) and reported
 *    through `describeFit` so the UI can explain it.
 *
 * All box and rect values are millimetres; source sizes are pixels. Only the
 * ratio of the source size matters to the geometry.
 */

import type { CropInsets, Design, FitMode } from "@/types/editor";

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
  if (design.fitMode === "stretch") {
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
