/**
 * The render plan: one description of the final sheet, shared by every output.
 *
 * PNG, JPEG, PDF, browser printing and the export preview all draw from the
 * same plan, so what the preview shows is, by construction, what each export
 * writes. The plan is plain data in millimetres and contains no browser
 * objects, which also makes it straightforward to unit test.
 *
 * Each item is described in *local* coordinates: the origin is the centre of
 * the design box, x to the right, y downward, before rotation. A renderer
 * translates to `center`, rotates by `rotation`, and then draws the local
 * rectangles. That keeps rotation maths in exactly one place per renderer.
 */

import type { Design, EditorDocument } from "@/types/editor";
import type { ImageAsset } from "@/types/image";
import {
  computeImageRect,
  croppedSourceSize,
  sourceCropRect,
  type Rect,
  type Size,
} from "@/lib/image/image-fit";
import { boxCenter, designBounds, pageSize } from "@/lib/layout/a4-layout";

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
  /** Which source pixels to draw (respects the optional crop). */
  sourceRect: Rect;
  /** Full decoded size of the source image, in pixels. */
  naturalSize: Size;
  border: { rect: Rect; width: number; color: string } | null;
}

export interface PlanLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RenderPlan {
  page: Size;
  background: string | null;
  items: PlanItem[];
  cropMarks: PlanLine[];
  cropMarkWidth: number;
}

export const CROP_MARK = { length: 4, offset: 1.5, width: 0.15 } as const;
export const BORDER_WIDTH_MM = 0.2;

export function buildPlanItem(design: Design, asset: ImageAsset): PlanItem {
  const natural = { width: asset.naturalWidth, height: asset.naturalHeight };
  const source = croppedSourceSize(natural, design.crop);
  const local = computeImageRect(design, source);
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
    sourceRect: sourceCropRect(natural, design.crop),
    naturalSize: natural,
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

export function buildRenderPlan(
  doc: EditorDocument,
  assets: Map<string, ImageAsset> | Record<string, ImageAsset>,
): RenderPlan {
  const lookup = (id: string) =>
    assets instanceof Map ? assets.get(id) : assets[id];
  const items: PlanItem[] = [];
  const marks: PlanLine[] = [];
  for (const design of doc.designs) {
    const asset = lookup(design.assetId);
    if (!asset) continue;
    items.push(buildPlanItem(design, asset));
    if (doc.page.cropMarks) marks.push(...cropMarksFor(designBounds(design)));
  }
  return {
    page: pageSize(doc.page.orientation),
    background: doc.page.background,
    items,
    cropMarks: marks,
    cropMarkWidth: CROP_MARK.width,
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
