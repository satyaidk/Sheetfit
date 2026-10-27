/**
 * Blank colours for product previews.
 *
 * These are colours of the product being printed on (a black hoodie, a pink
 * tumbler), not UI colours, so they live in the catalogue as data. They only
 * affect the mockup preview; nothing here is printed.
 *
 * `dark` drives the sublimation warning: sublimation ink is transparent and
 * bonds with polyester, so it barely shows on dark garments, while DTF prints
 * an opaque white underbase and works on any colour.
 */

import type { ProductPreset } from "./products";

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  dark: boolean;
}

const c = (id: string, name: string, hex: string, dark = false): ProductColor => ({ id, name, hex, dark });

const WHITE = c("white", "White", "#ffffff");

const GARMENT: ProductColor[] = [
  WHITE,
  c("ash", "Ash", "#e9e7e1"),
  c("heather", "Heather grey", "#c3c6cb"),
  c("pink", "Light pink", "#f6c9d4"),
  c("sky", "Sky blue", "#a9d0ec"),
  c("yellow", "Daisy", "#f7dc6f"),
  c("sand", "Sand", "#dccbaa"),
  c("red", "Red", "#c4302b", true),
  c("royal", "Royal blue", "#2b56b0", true),
  c("forest", "Forest", "#24493a", true),
  c("navy", "Navy", "#1f2a44", true),
  c("black", "Black", "#1c1d20", true),
];

const DRINKWARE: ProductColor[] = [
  WHITE,
  c("silver", "Stainless", "#cdd2d7"),
  c("blush", "Blush", "#f4c7cf"),
  c("mint", "Mint", "#bfe6d4"),
  c("lilac", "Lilac", "#d7c8f0"),
  c("matte-black", "Matte black", "#26272b", true),
];

const FLAT: ProductColor[] = [WHITE, c("warm", "Warm white", "#f7f1e6"), c("silver", "Brushed silver", "#d3d7db")];

const BAGS_AND_CAPS: ProductColor[] = [
  WHITE,
  c("natural", "Natural canvas", "#eee4cf"),
  c("khaki", "Khaki", "#c9b48a"),
  c("red", "Red", "#c4302b", true),
  c("navy", "Navy", "#1f2a44", true),
  c("black", "Black", "#1c1d20", true),
];

export function colorsFor(product: Pick<ProductPreset, "group" | "art">): ProductColor[] {
  if (product.group === "apparel") return GARMENT;
  if (product.group === "drinkware") return DRINKWARE;
  if (product.art === "cap" || product.art === "tote") return BAGS_AND_CAPS;
  return FLAT;
}

/** The colour to show for a product: the chosen one if it is offered, else the first. */
export function resolveColor(product: Pick<ProductPreset, "group" | "art">, hex: string | null | undefined): ProductColor {
  const list = colorsFor(product);
  return list.find((x) => x.hex.toLowerCase() === hex?.toLowerCase()) ?? list[0];
}

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** Mix a colour towards black (amount > 0) or white (amount < 0). */
export function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 0 : 255;
  const k = Math.abs(amount);
  return (
    "#" +
    channels(hex)
      .map((v) => Math.round(v + (target - v) * k).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Relative luminance (0 black – 1 white), used to pick outline contrast. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
