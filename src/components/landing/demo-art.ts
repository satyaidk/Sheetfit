/**
 * Artwork for the home page's example sheets: the editor's generated sample
 * designs (ADR 0008), drawn at each box's own aspect ratio. Seeds are fixed so
 * the server render and the browser agree; `shuffle` moves to a new set.
 */

import { renderSampleSvg, sampleDesign, svgDataUrl } from "@/lib/catalogue/sample-designs";
import type { DemoItem } from "@/lib/landing/sheet-demos";

export function demoArt(item: Pick<DemoItem, "width" | "height" | "art" | "productId">, shuffle = 0): string {
  // Small round goods and wraps read best as patterns; garments carry emblems.
  const garment = /^(tee|hoodie|pocket|cap|youth|toddler|onesie|longsleeve)/.test(item.productId);
  const design = sampleDesign(2027 + item.art * 7919 + shuffle * 104729, garment ? "emblem" : "pattern");
  return svgDataUrl(renderSampleSvg(design, item.width / item.height));
}
