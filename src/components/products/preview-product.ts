/**
 * Which product a design is previewed on: its own product, a strap, a sticker
 * (any design on a sticker page, at the design's own size and cut), or a
 * T-shirt for a plain image elsewhere.
 */

import type { Design, PrintProcess } from "@/types/editor";
import { findProduct, type ProductPreset } from "@/lib/catalogue/products";
import { strapPreset } from "@/lib/layout/strap";
import { boxOutline } from "@/lib/cut/cut-path";

export type PreviewKind = "product" | "strap" | "sticker" | "tee";

export function previewProductFor(d: Design | undefined, process: PrintProcess): { product: ProductPreset; kind: PreviewKind } {
  const tee = findProduct("tee-full-front")!;
  if (!d) return { product: tee, kind: "tee" };
  if (d.strap) return { product: strapPreset(d.width, d.height), kind: "strap" };
  const p = findProduct(d.productId);
  if (p && p.art !== "sticker") return { product: p, kind: "product" };
  if (p || process === "sticker") {
    const base = p ?? findProduct("sticker-die-3")!;
    return {
      product: { ...base, name: p ? base.name : "Sticker", detail: `${+d.width.toFixed(1)} × ${+d.height.toFixed(1)} mm`, width: d.width, height: d.height, bleed: 0 },
      kind: "sticker",
    };
  }
  return { product: tee, kind: "tee" };
}

/** The sticker's real outline for the 3D model (box-relative), or null for other previews. */
export function previewOutline(d: Design | undefined, kind: PreviewKind): number[] | null {
  return d && kind === "sticker" ? boxOutline(d) : null;
}
