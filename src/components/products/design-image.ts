/**
 * A design's print box rendered on its own, for product mockups.
 *
 * The mockup needs exactly what will be printed in the box (the image fitted,
 * padded, filled and flipped as on the sheet) but not where the box sits on
 * the sheet, its rotation, or output mirroring. Building a one-item render
 * plan reuses the exporters' drawing code, so the preview matches the print.
 * Results are cached by the fields that change the pixels, so dragging a box
 * around the sheet never re-renders its mockup.
 */

import type { Design } from "@/types/editor";
import type { LoadedAsset } from "@/types/image";
import { buildPlanItem, type RenderPlan } from "@/lib/render/render-plan";
import { renderPreviewDataUrl } from "@/lib/export/export-raster";

const cache = new Map<string, string>();
const LIMIT = 48;

export function designImageUrl(design: Design, asset: LoadedAsset, maxSidePx = 640): string | null {
  const key = JSON.stringify([
    asset.id,
    maxSidePx,
    design.width,
    design.height,
    design.fitMode,
    design.alignX,
    design.alignY,
    design.padding,
    design.fillColor,
    design.crop,
    design.flipX,
    design.flipY,
    design.lockAspect,
  ]);
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const plan: RenderPlan = {
      page: { width: design.width, height: design.height },
      background: null,
      mirror: false,
      items: [buildPlanItem({ ...design, x: 0, y: 0, rotation: 0 }, asset)],
      cropMarks: [],
      cropMarkWidth: 0,
    };
    const url = renderPreviewDataUrl(plan, new Map([[asset.id, asset]]), maxSidePx, "image/png");
    if (cache.size >= LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(key, url);
    return url;
  } catch {
    return null;
  }
}
