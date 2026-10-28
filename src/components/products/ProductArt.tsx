/**
 * Product pictures for lists, cards and dialogs.
 *
 * Each template has a photoreal render of its 3D model with a sample design
 * on it (`public/products/<id>.webp`, transparent background, made from the
 * same `Product3DView` the editor uses; see `docs/design.md`, section 18). A
 * real-looking product tells users more than a line drawing, and a static
 * image is far cheaper than a live 3D view per card. `ProductMockup` still
 * draws the flat illustration where a design has to be shown live.
 */

import Image from "next/image";
import type { ProductPreset } from "@/lib/catalogue/products";
import { cn } from "@/lib/utils";

/** Rendered images are 720 px square. */
export const PRODUCT_PHOTO_PX = 720;

export function productPhotoSrc(id: string): string {
  return `/products/${id}.webp`;
}

export function ProductArt({
  product,
  className,
  sizes = "160px",
  alt = "",
}: {
  product: Pick<ProductPreset, "id">;
  className?: string;
  /** `sizes` for the responsive image; the default suits cards in a two-column panel. */
  sizes?: string;
  alt?: string;
}) {
  return (
    <Image
      src={productPhotoSrc(product.id)}
      alt={alt}
      width={PRODUCT_PHOTO_PX}
      height={PRODUCT_PHOTO_PX}
      sizes={sizes}
      className={cn("object-contain", className)}
    />
  );
}

/**
 * Small placements (left chest, sleeve, pocket, neck label, cap front) are a
 * speck at card size, so they also get a detail crop of the same render
 * (`<id>-detail.webp`), shown as an inset. Same rule as the print-area size.
 */
export function hasDetailPhoto(product: Pick<ProductPreset, "artArea">): boolean {
  const a = product.artArea;
  return !!a && a.w * a.h < 520;
}

export function ProductDetail({ product, className }: { product: Pick<ProductPreset, "id">; className?: string }) {
  return <Image src={`/products/${product.id}-detail.webp`} alt="" width={320} height={320} sizes="64px" className={cn("object-cover", className)} />;
}
