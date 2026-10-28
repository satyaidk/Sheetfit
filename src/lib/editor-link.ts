/**
 * Links into the editor from outside it (the home page).
 *
 * `/editor?sample` opens the sample project; `/editor?product=mug-11oz` starts
 * a new design for that product template, and `&process=dtf` picks the print
 * process when the product supports both. Unknown products and processes are
 * ignored, so a stale or hand-edited link still opens a working editor.
 */

import { findProduct } from "@/lib/catalogue/products";
import type { PrintProcess } from "@/types/editor";

export type EditorLink =
  | { kind: "sample" }
  | { kind: "product"; productId: string; process?: PrintProcess }
  | { kind: "none" };

export function parseEditorLink(search: string): EditorLink {
  const params = new URLSearchParams(search);
  if (params.has("sample")) return { kind: "sample" };
  const product = findProduct(params.get("product"));
  if (!product) return { kind: "none" };
  const wanted = params.get("process");
  const process = product.processes.find((p) => p === wanted);
  return process ? { kind: "product", productId: product.id, process } : { kind: "product", productId: product.id };
}

/** Editor URL that opens a product template, optionally with a process. */
export function productHref(productId: string, process?: PrintProcess): string {
  return `/editor?product=${encodeURIComponent(productId)}${process ? `&process=${process}` : ""}`;
}
