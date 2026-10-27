/**
 * Reference illustration for a product preset: the plain white blank with its
 * print area outlined. Used in lists and the start dialog; `ProductMockup`
 * draws the same illustrations in colour and with a design applied.
 */

import { ProductMockup, type MockupProduct } from "./ProductMockup";

export function ProductArt({ product, className }: { product: MockupProduct; className?: string }) {
  return <ProductMockup product={product} showArea className={className} />;
}
