/**
 * The render plan: one description of the final sheet, shared by every output.
 *
 * PNG, JPEG, PDF, browser printing, SVG cut files and the export preview all
 * draw from the same plan, so what the preview shows is, by construction, what
 * each export writes. The plan is plain data in millimetres and contains no
 * browser objects, which also makes it straightforward to unit test.
 *
 * Each item is described in *local* coordinates: the origin is the centre of
 * the design box, x to the right, y downward, before rotation. A renderer
 * translates to `center`, rotates by `rotation`, and then draws the local
 * rectangles. That keeps rotation maths in exactly one place per renderer.
 *
 * The plan also carries everything that is printed but is not artwork: crop
 * marks, centre marks, registration squares, cut lines and the sheet cut. Which
 * of those appear depends on the output mode (`PlanOptions.output`), so an
 * artwork-only file, a proof with cut lines and a cut file all come from one
 * description. The whole-sheet mirror is resolved here once
 * (`lib/render/mirror.ts`) and each renderer applies it once, to everything.
 */

import type { CutGuideStyle, Design, EditorDocument } from "@/types/editor";
import type { ImageAsset } from "@/types/image";
import { computeImageRect, effectiveSourceRect, type Rect, type Size } from "@/lib/image/image-fit";
import { boxCenter, designBounds, pageSize, printableRect } from "@/lib/layout/sheet-layout";
import { cutPaths, localTrim, mapPath, roundedRectPath, type Path } from "@/lib/cut/cut-path";
import { printsCutGuide, stickerBorderFill } from "@/lib/cut/cut-method";
import { contentBounds, localRectToPage } from "@/lib/layout/arrange";
import { centreMarksFor, registrationMarks } from "./guides";
import { resolveMirror } from "./mirror";

export interface PlanItem {
  designId: string;
  assetId: string;
  center: { x: number; y: number };
  rotation: number;
  /** Box rectangle in local coordinates. */
  box: Rect;
  /** Background fill for `fill` mode, in local coordinates. */
  background: { rect: Rect; color: string } | null;
  /** Where the image lands, in local coordinates. */
  image: Rect;
  /** Which source pixels to draw (crop insets and the cover window applied). */
  sourceRect: Rect;
  /** Full decoded size of the source image, in pixels. */
  naturalSize: Size;
  /** Mirror the image inside its own rectangle. */
  flipX: boolean;
  flipY: boolean;
  border: { rect: Rect; width: number; color: string } | null;
  /** Cut paths in local coordinates (always present; drawn only when `plan.showCutlines`). */
  cut: { paths: Path[]; through: "kiss" | "die" };
  /**
   * Sticker border: the cut paths filled (even-odd, so cut holes stay empty)
   * under the artwork. Part of the artwork, so it is in every output mode.
   */
  underlay: { paths: Path[]; color: string } | null;
  /**
   * Printed cutting line along the cut paths, for cutting by hand. With
   * `inside`, the line is clipped to the sticker so it never spills past the
   * cut. Not in `artwork` files (cutter software cuts by itself).
   */
  guide: { paths: Path[]; color: string; width: number; inside: boolean } | null;
}

/** Sticker extras for one plan item (see `PlanItem.underlay` and `PlanItem.guide`). */
export interface ItemExtras {
  borderFill?: string | null;
  guide?: CutGuideStyle | null;
}

export interface PlanLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * What a file contains:
 * - `artwork`  designs only: no marks, no cut lines (for RIPs and cutter software that add their own)
 * - `print`    designs plus the marks switched on for the page (the default)
 * - `proof`    like `print`, with every cut line drawn as a visible proof line
 */
export type PlanOutput = "artwork" | "print" | "proof";

export interface PlanOptions {
  output?: PlanOutput;
}

export interface RenderPlan {
  page: Size;
  background: string | null;
  /** Flip the whole sheet horizontally, once, around the page centre (`lib/render/mirror.ts`). */
  mirror: boolean;
  items: PlanItem[];
  cropMarks: PlanLine[];
  cropMarkWidth: number;
  /** Centre ticks around each design's trim (front/back alignment). */
  centreMarks: PlanLine[];
  /** Filled registration squares, page millimetres. */
  registration: Rect[];
  /** Draw each item's cut paths as thin lines. */
  showCutlines: boolean;
  cutlineWidth: number;
  /** Cut around the whole carrier sheet (kiss-cut sheets), in page millimetres. */
  sheetCut: Path | null;
}

export const CROP_MARK = { length: 4, offset: 1.5, width: 0.15 } as const;
export const BORDER_WIDTH_MM = 0.2;
/** Proof cut lines: thin enough not to read as artwork, visible on a desktop print. */
export const CUTLINE_WIDTH_MM = 0.1;
/** Kiss cuts in magenta, die cuts and the sheet cut in cyan, as print-and-cut workflows usually colour-code them. */
export const CUTLINE_COLORS = { kiss: "#ec008c", die: "#00aeef" } as const;

export function buildPlanItem(design: Design, asset: ImageAsset, extras: ItemExtras = {}): PlanItem {
  const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
  const paths = cutPaths(design);
  const sourceRect = effectiveSourceRect(design, natural);
  const local = computeImageRect(design, { width: sourceRect.width, height: sourceRect.height });
  const hw = design.width / 2;
  const hh = design.height / 2;
  const box: Rect = { x: -hw, y: -hh, width: design.width, height: design.height };
  return {
    designId: design.id,
    assetId: asset.id,
    center: boxCenter(design),
    rotation: design.rotation,
    box,
    background:
      design.fitMode === "fill" && design.fillColor
        ? { rect: box, color: design.fillColor }
        : null,
    image: { ...local, x: local.x - hw, y: local.y - hh },
    sourceRect,
    naturalSize: natural,
    flipX: design.flipX,
    flipY: design.flipY,
    border: design.border
      ? {
          // Inset by half the stroke so the line stays inside the box edge.
          rect: {
            x: -hw + BORDER_WIDTH_MM / 2,
            y: -hh + BORDER_WIDTH_MM / 2,
            width: design.width - BORDER_WIDTH_MM,
            height: design.height - BORDER_WIDTH_MM,
          },
          width: BORDER_WIDTH_MM,
          color: "#000000",
        }
      : null,
    cut: { paths, through: design.cut?.through ?? "die" },
    underlay: extras.borderFill ? { paths, color: extras.borderFill } : null,
    guide: extras.guide
      ? { paths, color: extras.guide.color, width: extras.guide.width, inside: extras.guide.placement === "inside" }
      : null,
  };
}

/** Corner crop marks just outside a rectangle, as used by print shops. */
export function cropMarksFor(r: Rect): PlanLine[] {
  const { length: L, offset: O } = CROP_MARK;
  const l = r.x;
  const t = r.y;
  const rt = r.x + r.width;
  const b = r.y + r.height;
  return [
    // top-left
    { x1: l - O - L, y1: t, x2: l - O, y2: t },
    { x1: l, y1: t - O - L, x2: l, y2: t - O },
    // top-right
    { x1: rt + O, y1: t, x2: rt + O + L, y2: t },
    { x1: rt, y1: t - O - L, x2: rt, y2: t - O },
    // bottom-left
    { x1: l - O - L, y1: b, x2: l - O, y2: b },
    { x1: l, y1: b + O, x2: l, y2: b + O + L },
    // bottom-right
    { x1: rt + O, y1: b, x2: rt + O + L, y2: b },
    { x1: rt, y1: b + O, x2: rt, y2: b + O + L },
  ];
}

/** Page bounds of a design's trim (its finished edge). */
export function trimBounds(design: Design): Rect {
  return localRectToPage(design, localTrim(design));
}

export function buildRenderPlan(
  doc: EditorDocument,
  assets: Map<string, ImageAsset> | Record<string, ImageAsset>,
  options: PlanOptions = {},
): RenderPlan {
  const output = options.output ?? "print";
  const marksOn = output !== "artwork";
  const cutlinesOn = output === "proof" || (output === "print" && !!doc.page.guides?.cutlines);
  const lookup = (id: string) =>
    assets instanceof Map ? assets.get(id) : assets[id];
  const items: PlanItem[] = [];
  const marks: PlanLine[] = [];
  const centre: PlanLine[] = [];
  // Sticker pages: the white border is artwork (every mode); the hand-cutting
  // line is printed, but cutter software gets artwork-only files without it.
  const extras: ItemExtras = {
    borderFill: stickerBorderFill(doc.page),
    guide: output !== "artwork" && printsCutGuide(doc.page) ? doc.page.cutGuide : null,
  };
  for (const design of doc.designs) {
    // Empty product slots have no image and print nothing.
    const asset = design.assetId ? lookup(design.assetId) : undefined;
    if (!asset) continue;
    items.push(buildPlanItem(design, asset, extras));
    if (marksOn && doc.page.cropMarks) marks.push(...cropMarksFor(designBounds(design)));
    if (marksOn && doc.page.guides?.centreMarks) centre.push(...centreMarksFor(trimBounds(design)));
  }
  return {
    page: pageSize(doc.page),
    background: doc.page.background,
    mirror: resolveMirror(doc.page),
    items,
    cropMarks: marks,
    cropMarkWidth: CROP_MARK.width,
    centreMarks: centre,
    registration: marksOn && doc.page.guides?.registration ? registrationMarks(doc.page) : [],
    showCutlines: cutlinesOn,
    cutlineWidth: CUTLINE_WIDTH_MM,
    sheetCut: cutlinesOn && doc.page.sheetCut ? roundedRectPath(printableRect(doc.page), 0) : null,
  };
}

/**
 * Bounds of everything a page prints (artwork and cut paths of designs that
 * have an image), grown by `pad` mm and kept on the page; null when nothing
 * prints.
 */
export function printedBounds(doc: EditorDocument, pad = 1): Rect | null {
  const rects = doc.designs.filter((d) => d.assetId).map(contentBounds);
  if (rects.length === 0) return null;
  const size = pageSize(doc.page);
  const x0 = Math.max(0, Math.min(...rects.map((r) => r.x)) - pad);
  const y0 = Math.max(0, Math.min(...rects.map((r) => r.y)) - pad);
  const x1 = Math.min(size.width, Math.max(...rects.map((r) => r.x + r.width)) + pad);
  const y1 = Math.min(size.height, Math.max(...rects.map((r) => r.y + r.height)) + pad);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : null;
}

/**
 * The plan cropped to `rect` (page mm): `rect` becomes the page and every item
 * and mark moves with it. Cutter PNGs carry only the stickers, not the empty
 * sheet, because cutting software takes the image's size as the print size.
 */
export function cropPlan(plan: RenderPlan, rect: Rect): RenderPlan {
  const line = (l: PlanLine): PlanLine => ({ x1: l.x1 - rect.x, y1: l.y1 - rect.y, x2: l.x2 - rect.x, y2: l.y2 - rect.y });
  return {
    ...plan,
    page: { width: rect.width, height: rect.height },
    items: plan.items.map((it) => ({ ...it, center: { x: it.center.x - rect.x, y: it.center.y - rect.y } })),
    cropMarks: plan.cropMarks.map(line),
    centreMarks: plan.centreMarks.map(line),
    registration: plan.registration.map((r) => ({ ...r, x: r.x - rect.x, y: r.y - rect.y })),
    sheetCut: plan.sheetCut ? mapPath(plan.sheetCut, (x, y) => ({ x: x - rect.x, y: y - rect.y })) : null,
  };
}

/** Map a local point of a plan item to page millimetres. */
export function localToPage(
  item: Pick<PlanItem, "center" | "rotation">,
  x: number,
  y: number,
): { x: number; y: number } {
  const rad = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: item.center.x + x * cos - y * sin,
    y: item.center.y + x * sin + y * cos,
  };
}

/**
 * Every cut path of a plan in page millimetres, before the output mirror, with
 * its kind. The sheet cut (kiss-cut sheets) comes last.
 */
export function planCutPaths(plan: RenderPlan, includeSheet = true): { path: Path; through: "kiss" | "die" }[] {
  const out: { path: Path; through: "kiss" | "die" }[] = [];
  for (const item of plan.items) {
    for (const path of item.cut.paths) {
      out.push({ through: item.cut.through, path: mapPath(path, (x, y) => localToPage(item, x, y)) });
    }
  }
  if (includeSheet && plan.sheetCut) out.push({ path: plan.sheetCut, through: "die" });
  return out;
}

/** Mirror a page-space x coordinate the way the output mirror does. */
export function mirrorX(plan: Pick<RenderPlan, "page" | "mirror">, x: number): number {
  return plan.mirror ? plan.page.width - x : x;
}
