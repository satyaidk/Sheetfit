/**
 * Object URLs for sample designs.
 *
 * Inlining every generated SVG as a data URL put about 1.5 MB of markup into
 * the page when the Products panel was open. Blob URLs keep the DOM small,
 * and the cache means each design and aspect ratio is encoded once. Old
 * entries are revoked so shuffling for a long time does not leak memory.
 */

import { renderSampleSvg, svgDataUrl, type SampleDesign } from "@/lib/catalogue/sample-designs";

const cache = new Map<string, string>();
const LIMIT = 400;

export function sampleUrl(design: SampleDesign, aspect: number): string {
  const key = `${design.id}:${design.family}:${aspect.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const svg = renderSampleSvg(design, aspect);
  const url =
    typeof URL.createObjectURL === "function" ? URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })) : svgDataUrl(svg);
  if (cache.size >= LIMIT) {
    const [oldKey, oldUrl] = cache.entries().next().value!;
    cache.delete(oldKey);
    if (oldUrl.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
  }
  cache.set(key, url);
  return url;
}
