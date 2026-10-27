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

/** WCAG contrast ratio between two colours (1 = same, 21 = black on white). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}

/**
 * Studio backdrop for a 3D product view, chosen for contrast with the blank.
 *
 * A white mug disappears on a white page and a black hoodie on a dark one, so
 * the backdrop moves away from the blank's lightness: light blanks sit on a
 * mid-tone, dark blanks on a light tone, and saturated blanks on a soft tint
 * of the complementary hue. `inner`/`outer` form a radial gradient (the
 * centre is lighter, like a lit studio sweep); `shadow` is the floor shadow
 * opacity that still reads on that backdrop.
 */
export function backdropFor(hex: string): { inner: string; outer: string; shadow: number; dark: boolean } {
  const [h, s, l] = toHsl(hex);
  const blankLum = luminance(hex);
  const neutral = s < 0.15;
  if (blankLum > 0.6) {
    // White, ash, silver and pastels: a mid-tone clearly darker than the blank,
    // so edges and highlights read (a fixed grey made stainless disappear).
    const hue = neutral ? 215 : (h + 180) % 360;
    const inner = Math.min(0.72, Math.max(0.42, l - 0.3));
    return { inner: fromHsl(hue, 0.14, inner), outer: fromHsl(hue, 0.18, inner - 0.16), shadow: 0.32, dark: inner < 0.5 };
  }
  if (blankLum < 0.08) {
    // Black, navy, forest, matte black: a light studio sweep.
    const hue = s > 0.15 ? h : 220;
    return { inner: fromHsl(hue, 0.12, 0.97), outer: fromHsl(hue, 0.16, 0.84), shadow: 0.24, dark: false };
  }
  // Mid-tone colours: a tint of the complementary hue keeps the colour vivid
  // (greys get a neutral cool tone instead of an arbitrary complement).
  const comp = neutral ? 215 : (h + 180) % 360;
  // Darker mid-tones (red, royal) get a pale backdrop; lighter ones a deep one.
  const paleBackdrop = l < 0.5;
  return paleBackdrop
    ? { inner: fromHsl(comp, 0.28, 0.95), outer: fromHsl(comp, 0.24, 0.82), shadow: 0.26, dark: false }
    : { inner: fromHsl(comp, 0.3, 0.36), outer: fromHsl(comp, 0.32, 0.2), shadow: 0.42, dark: true };
}
