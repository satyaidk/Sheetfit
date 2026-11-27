/**
 * Product presets for sublimation and DTF.
 *
 * Every size here comes from `reports/Canva UX and print size catalogue.md`
 * (researched 2026-10-27) and carries its source and a confidence flag, because
 * blanks vary between brands. Presets set the starting size of a design slot;
 * the user can always edit it.
 *
 * Sizes are the print area in millimetres. For wraps (mugs, tumblers, cans)
 * width runs around the circumference. Defaults that follow from the research:
 * - Sublimation flat goods: 3 mm bleed per side, output mirrored.
 * - Sublimation wraps: no bleed top/bottom, +6 mm seam overlap on the width.
 * - DTF transfers: no bleed, not mirrored, 6.35 mm (1/4 in) gap on gang sheets.
 *
 * v0.9 additions (checked 2026-11-23, see `docs/catalogue-sources.md`) carry
 * the supplier, product code, material, side count and the date checked. Only
 * sizes printed on a supplier page are used; when a page gave one dimension
 * only (a "57 mm" heart keyring) or none (lanyard ribbon, badge reel inserts),
 * no preset was made and the user enters the size with a custom box instead.
 * Heart, bone and tag outlines are pre-cut blanks: the cut guide shown is the
 * bounding rectangle, and the blank itself defines the real edge.
 */

import type { CutSpec, PrintProcess } from "@/types/editor";
import { smallestSheetFor, type SheetDefinition } from "./sheets";
import type { OutlineKind } from "./blank-outlines";
import { V10_PRODUCTS } from "./products-v10";

export type ProductGroup = "drinkware" | "flat" | "ornament" | "keyring" | "id" | "decor" | "jewelry" | "apparel" | "accessory" | "sticker";

/** Silhouette used for the reference illustration. */
export type ProductArt =
  | "mug"
  | "espresso"
  | "enamel-mug"
  | "glass-can"
  | "tumbler"
  | "tumbler-handle"
  | "travel-tumbler"
  | "wine-tumbler"
  | "can-cooler"
  | "bottle"
  | "mousepad"
  | "mousepad-round"
  | "coaster-square"
  | "coaster-round"
  | "ornament"
  | "keychain"
  | "pet-tag"
  | "luggage-tag"
  | "bookmark"
  | "card"
  | "photo-panel"
  | "puzzle"
  | "plate"
  | "tile"
  | "magnet"
  | "sticker"
  | "tshirt"
  | "longsleeve"
  | "hoodie"
  | "kids-tee"
  | "onesie"
  | "cap"
  | "tote"
  | "flag"
  | "clock"
  | "sign"
  | "wall-panel"
  | "clipboard"
  | "pillow"
  | "bracelet"
  | "pendant"
  | "cutting-board"
  | "strap";

export type Confidence = "high" | "medium" | "low";

export interface ProductPreset {
  id: string;
  name: string;
  /** Short variant label shown under the name, e.g. "Full wrap". */
  detail: string;
  group: ProductGroup;
  processes: PrintProcess[];
  /** Print area in mm (wrap: width = around the product). */
  width: number;
  height: number;
  shape: "rect" | "circle";
  wrap: boolean;
  /** Bleed added on every side when the slot is created (mm). */
  bleed: number;
  art: ProductArt;
  /** Highlighted print area on the illustration, in a 0–100 view box. */
  artArea?: { x: number; y: number; w: number; h: number };
  /** Garment placements printed on the back ("front" when omitted). */
  side?: "front" | "back";
  confidence: Confidence;
  source: string;
  note?: string;
  /** Printable faces. Two-sided products can take a separate back design (never a copy). */
  sides?: 1 | 2;
  /** Corner radius of the finished blank, mm (cut guide). */
  cornerRadius?: number;
  /** Default cut for print-and-cut products (stickers). */
  cut?: Partial<CutSpec>;
  /** Supplier or manufacturer named on the source page. */
  supplier?: string;
  /** Product code on the source page. */
  sku?: string;
  /** Material as stated by the source. */
  material?: string;
  /** Date the source was checked (ISO). */
  checked?: string;
  /** Extra search words (keyring, bag tag, ID card...). */
  aliases?: string[];
  /** Outline of a pre-cut shaped blank (heart, star...), drawn to its bounding size. */
  outline?: OutlineKind;
}

const IN = 25.4;
const inch = (w: number, h: number) => ({ width: +(w * IN).toFixed(1), height: +(h * IN).toFixed(1) });

const SUB: PrintProcess[] = ["sublimation"];
const STICKER: PrintProcess[] = ["sticker"];
const TP = "The Transfer Press (Unisub)";
const CHECKED = "2026-11-23";
const DTF: PrintProcess[] = ["dtf"];
const BOTH: PrintProcess[] = ["sublimation", "dtf"];

/** Default bleed for flat sublimation goods, per side (mm). */
export const FLAT_BLEED_MM = 3;
/** Seam overlap added to the circumference of wraps (mm). */
export const WRAP_SEAM_MM = 6;
/** Default gap between DTF transfers on a gang sheet (1/4 in). */
export const DTF_GAP_MM = 6.35;

export const PRODUCTS: ProductPreset[] = [
  // ---------------- Drinkware (sublimation wraps) ----------------
  { id: "mug-11oz", name: "Mug 11 oz", detail: "Full wrap", group: "drinkware", processes: SUB, ...inch(8.5, 3.5), shape: "rect", wrap: true, bleed: 0, art: "mug", artArea: { x: 18, y: 28, w: 52, h: 46 }, confidence: "medium", source: "https://souhil4.gumroad.com/l/MotivationalMugSublimationMugWrap", note: "Some brands use 9 × 3.5 in." },
  { id: "mug-15oz", name: "Mug 15 oz", detail: "Full wrap", group: "drinkware", processes: SUB, ...inch(9, 4), shape: "rect", wrap: true, bleed: 0, art: "mug", artArea: { x: 18, y: 24, w: 52, h: 52 }, confidence: "medium", source: "https://souhil4.gumroad.com/l/MotivationalMugSublimationMugWrap" },
  { id: "mug-enamel-12oz", name: "Enamel mug 12 oz", detail: "Wrap", group: "drinkware", processes: SUB, ...inch(7.78, 2.44), shape: "rect", wrap: true, bleed: 0, art: "enamel-mug", artArea: { x: 20, y: 38, w: 48, h: 30 }, confidence: "high", source: "https://heatpressnation.com/products/12-oz-fine-enamel-sublimation-mugs-silver-rim-48-per-case" },
  { id: "mug-espresso-6oz", name: "Espresso mug 6 oz", detail: "Wrap", group: "drinkware", processes: SUB, ...inch(7.3, 2.75), shape: "rect", wrap: true, bleed: 0, art: "espresso", artArea: { x: 22, y: 38, w: 44, h: 32 }, confidence: "high", source: "https://heatpressnation.com/products/6-oz-white-c-handle-ceramic-mugs-36-per-case" },
  { id: "mug-espresso-3oz", name: "Espresso mug 3 oz", detail: "Wrap", group: "drinkware", processes: SUB, ...inch(4.7, 2.4), shape: "rect", wrap: true, bleed: 0, art: "espresso", artArea: { x: 24, y: 42, w: 40, h: 26 }, confidence: "high", source: "https://heatpressnation.com/products/hpn-sublicraft-3oz-sublimation-ceramic-espresso-mug-36-per-case" },
  { id: "glass-can-16oz", name: "Glass can 16 oz", detail: "Wrap", group: "drinkware", processes: SUB, ...inch(9.6, 4.2), shape: "rect", wrap: true, bleed: 0, art: "glass-can", artArea: { x: 28, y: 30, w: 44, h: 46 }, confidence: "medium", source: "https://www.silhouetteschoolblog.com/2022/07/how-to-re-size-tumbler-wrap-templates.html", note: "Blanks range 9.4–9.75 × 4.2–5 in." },
  { id: "tumbler-20oz", name: "Skinny tumbler 20 oz", detail: "Straight wrap", group: "drinkware", processes: SUB, ...inch(9.3, 8.3), shape: "rect", wrap: true, bleed: 0, art: "tumbler", artArea: { x: 32, y: 18, w: 36, h: 70 }, confidence: "medium", source: "https://kindtumbler.gumroad.com/l/cuxcw", note: "Borderline on A4: fits only borderless. Brands vary slightly." },
  { id: "tumbler-30oz", name: "Skinny tumbler 30 oz", detail: "Straight wrap", group: "drinkware", processes: SUB, ...inch(9.77, 9.5), shape: "rect", wrap: true, bleed: 0, art: "tumbler", artArea: { x: 32, y: 14, w: 36, h: 76 }, confidence: "high", source: "https://heatpressnation.com/products/sublicraft-30-oz-stainless-steel-sublimation-skinny-tumbler-with-straw-silver", note: "Needs A3." },
  { id: "tumbler-40oz-top", name: "Handled tumbler 40 oz", detail: "Top wrap", group: "drinkware", processes: SUB, ...inch(12.63, 5.81), shape: "rect", wrap: true, bleed: 0, art: "tumbler-handle", artArea: { x: 22, y: 18, w: 46, h: 38 }, confidence: "medium", source: "https://jennifermaker.com/how-to-sublimate-a-40-oz-tumbler/", note: "Top section only; needs A3 or US Legal. The tapered bottom is separate." },
  { id: "tumbler-40oz-bottom", name: "Handled tumbler 40 oz", detail: "Bottom wrap (tapered)", group: "drinkware", processes: SUB, ...inch(10.13, 3.85), shape: "rect", wrap: true, bleed: 0, art: "tumbler-handle", artArea: { x: 26, y: 58, w: 38, h: 26 }, confidence: "medium", source: "https://jennifermaker.com/how-to-sublimate-a-40-oz-tumbler/", note: "Bounding box of a tapered section." },
  { id: "travel-tumbler-12oz", name: "Ceramic travel tumbler 12 oz", detail: "Wrap", group: "drinkware", processes: SUB, ...inch(10.75, 4.15), shape: "rect", wrap: true, bleed: 0, art: "travel-tumbler", artArea: { x: 28, y: 32, w: 44, h: 42 }, confidence: "high", source: "https://heatpressnation.com/products/12-oz-sublimation-travel-tumbler-with-black-lid-24-per-case" },
  { id: "wine-tumbler-12oz", name: "Stemless wine tumbler 12 oz", detail: "Wrap", group: "drinkware", processes: SUB, width: 280, height: 110, shape: "rect", wrap: true, bleed: 0, art: "wine-tumbler", artArea: { x: 26, y: 34, w: 48, h: 40 }, confidence: "medium", source: "https://titanjet.co.za/12oz-blue-stainless-steel-wine-tumbler/" },
  { id: "can-cooler-12oz", name: "Skinny can cooler 12 oz", detail: "Stainless wrap", group: "drinkware", processes: SUB, ...inch(9.1, 5.9), shape: "rect", wrap: true, bleed: 0, art: "can-cooler", artArea: { x: 30, y: 22, w: 40, h: 60 }, confidence: "high", source: "https://www.heatpressnation.com/products/sublicraft-by-heatpressnation-sublimation-blank-stainless-steel-can-cooler-for-skinny-12-oz-cans-white" },
  { id: "bottle-20oz", name: "Water bottle 20 oz", detail: "Screw top wrap", group: "drinkware", processes: SUB, ...inch(7.94, 4.86), shape: "rect", wrap: true, bleed: 0, art: "bottle", artArea: { x: 34, y: 40, w: 32, h: 40 }, confidence: "high", source: "https://heatpressnation.com/products/20-oz-stainless-steel-sublimation-water-bottle-screw-top-48-per-case" },

  // ---------------- Flat hard goods (sublimation) ----------------
  { id: "mousepad-rect", name: "Mouse pad", detail: "Rectangle 9.25 × 7.75 in", group: "flat", processes: SUB, ...inch(9.25, 7.75), shape: "rect", wrap: false, bleed: 3, art: "mousepad", confidence: "high", source: "https://mydesigns.io/product-catalog/other/product/mouse-pad-rectangle" },
  { id: "mousepad-round", name: "Mouse pad", detail: "Round 7.5 in", group: "flat", processes: SUB, ...inch(7.5, 7.5), shape: "circle", wrap: false, bleed: 3, art: "mousepad-round", confidence: "high", source: "https://heatpressnation.com/products/sublicraft-by-heatpressnation-sublimation-blank-mouse-pads-7-5-round-10-pack" },
  { id: "coaster-square", name: "Coaster", detail: "Square 4 in", group: "flat", processes: SUB, ...inch(4, 4), shape: "rect", wrap: false, bleed: 3, art: "coaster-square", confidence: "high", source: "https://swingdesign.com/products/unisub-sublimation-blank-coasters-square" },
  { id: "coaster-round", name: "Coaster", detail: "Round 3.75 in", group: "flat", processes: SUB, ...inch(3.75, 3.75), shape: "circle", wrap: false, bleed: 3, art: "coaster-round", confidence: "high", source: "https://swingdesign.com/products/unisub-sublimation-blank-coasters-square" },
  { id: "coaster-sandstone", name: "Sandstone coaster", detail: "4.25 in", group: "flat", processes: SUB, ...inch(4.25, 4.25), shape: "rect", wrap: false, bleed: 3, art: "coaster-square", confidence: "high", source: "https://www.proworldinc.com/sb-s-198-round-sandstone-coaster-with-cork.html" },
  { id: "ornament-round", name: "Ornament", detail: "Round 3.9 in", group: "flat", processes: SUB, ...inch(3.9, 3.9), shape: "circle", wrap: false, bleed: 3, art: "ornament", confidence: "medium", source: "https://imagingspectrum.com/collections/unisub" },
  { id: "keychain-round", name: "Keychain", detail: "Round 2.5 in", group: "keyring", processes: SUB, ...inch(2.5, 2.5), shape: "circle", wrap: false, bleed: 2, art: "keychain", sides: 2, confidence: "high", source: "https://heatpressnation.com/products/unisub-sublimation-blank-keychain-2-sided-2-5-round-25-pack", note: "Unisub FRP, printable on both sides. The Transfer Press lists the same keyring as 57 mm in its size column and 63.5 mm in its text." },
  { id: "keychain-rect", name: "Keychain", detail: "Rectangle 1.6 × 2.25 in", group: "keyring", processes: SUB, ...inch(1.6, 2.25), shape: "rect", wrap: false, bleed: 2, art: "keychain", sides: 2, confidence: "high", source: "https://heatpressnation.com/products/unisub-sublimation-blank-keychain-2-sided-2-5-round-25-pack", note: "Matches Unisub 5995 (aluminium, 40 × 57 mm, both sides) at The Transfer Press." },
  { id: "keyring-square-57", name: "Keyring", detail: "Square 57 mm, FRP", group: "keyring", processes: SUB, width: 57, height: 57, shape: "rect", wrap: false, bleed: 2, art: "keychain", sides: 2, supplier: TP, sku: "20UNI05524", material: "Unisub FRP plastic", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-keyring-square-c2x17076070", note: "Swing Design lists Unisub 5524 as 2.25 × 2.25 in (57.15 mm).", aliases: ["keychain", "key ring"] },
  { id: "keyring-rect-32x76", name: "Keyring", detail: "Rectangle 32 × 76 mm, FRP", group: "keyring", processes: SUB, width: 32, height: 76, shape: "rect", wrap: false, bleed: 2, art: "keychain", sides: 2, supplier: TP, sku: "20UNI05525", material: "Unisub FRP plastic", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-keyring-rectangle-c2x17076612", aliases: ["keychain", "key ring"] },
  { id: "keyring-oval-63x35", name: "Keyring", detail: "Oval 63 × 35 mm, aluminium", group: "keyring", processes: SUB, width: 63, height: 35, shape: "circle", wrap: false, bleed: 2, art: "keychain", sides: 2, supplier: TP, sku: "20UNI05917", material: "Unisub aluminium", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-aluminium-keyring-oval-c2x17079630", aliases: ["keychain", "key ring"] },
  { id: "pet-tag", name: "Pet tag", detail: "Round 1.25 × 1.5 in", group: "keyring", processes: SUB, ...inch(1.25, 1.5), shape: "rect", wrap: false, bleed: 2, art: "pet-tag", sides: 2, confidence: "high", source: "https://swingdesign.com/products/unisub-sublimation-pet-tag-blanks-2-sided" },
  { id: "pet-tag-circle-31", name: "Pet tag", detail: "Circle 31 mm, aluminium", group: "keyring", processes: SUB, width: 31, height: 31, shape: "circle", wrap: false, bleed: 1.5, art: "pet-tag", sides: 1, supplier: TP, sku: "20UNI05773", material: "White aluminium", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-pet-tag-circle-c2x17039184", note: "Printable on one side only. Supplied with a metal fixing ring.", aliases: ["dog tag"] },
  { id: "pet-tag-heart-31", name: "Pet tag", detail: "Heart 31 × 31 mm, aluminium", group: "keyring", processes: SUB, width: 31, height: 31, shape: "rect", wrap: false, bleed: 1.5, art: "pet-tag", outline: "heart", sides: 1, supplier: TP, sku: "20UNI05770", material: "White aluminium", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-pet-tag-heart-c2x17039150", note: "Overall size 31 × 31 mm, one side. The heart outline is drawn to that size as a guide; the blank defines the real edge.", aliases: ["dog tag"] },
  { id: "pet-tag-bone-38x25", name: "Pet tag", detail: "Bone 38 × 25 mm, aluminium", group: "keyring", processes: SUB, width: 38, height: 25, shape: "rect", wrap: false, bleed: 1.5, art: "pet-tag", outline: "bone", sides: 1, supplier: TP, sku: "20UNI05771", material: "White aluminium", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-pet-tag-bone-c2x17039165", note: "38 × 25 mm at the widest and longest parts, one side. The bone outline is drawn to that size as a guide; the blank defines the real edge.", aliases: ["dog tag", "dog bone"] },
  { id: "id-tag-alu", name: "ID tag", detail: "Aluminium 31.7 × 50.8 mm", group: "keyring", processes: SUB, width: 31.7, height: 50.8, shape: "rect", wrap: false, bleed: 1.5, art: "pet-tag", sides: 2, supplier: TP, sku: "20UNI05916", material: "Aluminium", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-aluminium-id-tag-c2x21695591", note: "Sized 3.17 × 5.08 cm. Both-sides code 20UNI05916; one-side code 20UNI05588 (add no back). Out of stock when checked.", aliases: ["dog tag", "military tag", "equipment tag"] },
  { id: "luggage-tag", name: "Luggage tag", detail: "2.5 × 4.25 in", group: "keyring", processes: SUB, ...inch(2.5, 4.25), shape: "rect", wrap: false, bleed: 2, art: "luggage-tag", sides: 2, confidence: "high", source: "https://heatpressnation.com/products/unisub-sublimation-blank-bag-tag-rectangle-2-5-x-4-25-5-pack", aliases: ["bag tag"] },
  { id: "luggage-tag-44x88", name: "Luggage tag", detail: "44 × 88 mm", group: "keyring", processes: SUB, width: 44, height: 88, shape: "rect", wrap: false, bleed: 2, art: "luggage-tag", sides: 2, supplier: TP, sku: "20UNI05556", material: "Glossy plastic", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-luggage-tags-c2x35720796", note: "Printable on both sides. Has a fastening slot (position not published); loops sold separately.", aliases: ["bag tag"] },
  { id: "luggage-tag-70x100", name: "Luggage tag", detail: "70 × 100 mm", group: "keyring", processes: SUB, width: 70, height: 100, shape: "rect", wrap: false, bleed: 2, art: "luggage-tag", sides: 2, supplier: TP, sku: "20UNI05503", material: "Glossy plastic", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-luggage-tags-c2x35720796", note: "Both sides, fastening slot. Swing Design lists Unisub 5503 as 4 × 2.75 in.", aliases: ["bag tag"] },
  { id: "luggage-tag-75x140", name: "Luggage tag", detail: "75 × 140 mm", group: "keyring", processes: SUB, width: 75, height: 140, shape: "rect", wrap: false, bleed: 2, art: "luggage-tag", sides: 2, supplier: TP, sku: "20UNI05505", material: "Glossy plastic", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-luggage-tags-c2x35720796", note: "Both sides, fastening slot. Swing Design lists Unisub 5505 as 5.5 × 3 in.", aliases: ["bag tag"] },
  { id: "luggage-tag-round-100", name: "Luggage tag", detail: "Round 100 mm", group: "keyring", processes: SUB, width: 100, height: 100, shape: "circle", wrap: false, bleed: 2, art: "luggage-tag", sides: 2, supplier: TP, sku: "20UNI05507", material: "Glossy plastic", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-luggage-tags-c2x35720796", note: "Both sides, fastening slot.", aliases: ["bag tag"] },
  { id: "bookmark", name: "Bookmark", detail: "1.25 × 5 in", group: "flat", processes: SUB, ...inch(1.25, 5), shape: "rect", wrap: false, bleed: 2, art: "bookmark", confidence: "high", source: "https://heatpressnation.com/products/unisub-sublimation-blank-bookmark-1-25-x-5-5-pack" },
  { id: "plate-mini", name: "Licence plate", detail: "Mini 7.4 × 14.9 cm", group: "flat", processes: SUB, width: 149, height: 74, shape: "rect", wrap: false, bleed: 3, art: "plate", sides: 1, supplier: TP, sku: "20UNI04565", material: "Glossy Unisub aluminium", checked: CHECKED, confidence: "high", source: "https://www.thetransferpress.co.uk/unisub-american-style-licence-plate-c2x19798365", note: "Printable on one side only. Hole positions are not published; keep text away from the corners.", aliases: ["bike plate", "license plate"] },
  { id: "magnet", name: "Fridge magnet", detail: "2 × 3 in", group: "flat", processes: SUB, ...inch(2, 3), shape: "rect", wrap: false, bleed: 2, art: "magnet", confidence: "high", source: "https://heatpressnation.com/products/unisub-3-2-sublimation-aluminium-magnet-w-1-25-mm-magnet-gloss-white" },
  { id: "card-cr80", name: "ID / PVC card", detail: "CR80 85.6 × 54 mm, front and back", group: "id", processes: SUB, width: 85.6, height: 53.98, shape: "rect", wrap: false, bleed: 2, art: "card", sides: 2, cornerRadius: 3.18, checked: CHECKED, confidence: "high", source: "https://en.wikipedia.org/wiki/ISO/IEC_7810", note: "ISO/IEC 7810 ID-1: 85.60 × 53.98 mm, corner radius 2.88–3.48 mm (3.18 mm used for the cut guide). Only sublimation-coated PVC cards take sublimation; plain PVC does not. Check your blank.", aliases: ["id card", "pvc card", "badge", "cr80"] },
  { id: "card-business", name: "Aluminium business card", detail: "2 × 3.5 in", group: "id", processes: SUB, ...inch(3.5, 2), shape: "rect", wrap: false, bleed: 2, art: "card", sides: 2, confidence: "medium", source: "https://jpplus.com/unisub-2-sided-aluminum-business-card" },
  { id: "name-badge-2x3", name: "Name badge", detail: "2 × 3 in, FRP", group: "id", processes: SUB, ...inch(3, 2), shape: "rect", wrap: false, bleed: 1.5, art: "card", sides: 1, supplier: "Conde Systems (Unisub)", sku: "U5530", material: "Sublimation FRP, 0.090 in thick", checked: CHECKED, confidence: "high", source: "https://www.conde.com/proddetail.asp?prod=U5530", note: "One side. Pin or magnetic backs are sold separately.", aliases: ["name tag", "badge"] },
  { id: "name-badge-1.5x3", name: "Name badge", detail: "1.5 × 3 in, FRP", group: "id", processes: SUB, ...inch(3, 1.5), shape: "rect", wrap: false, bleed: 1.5, art: "card", sides: 1, supplier: "Conde Systems (Unisub)", sku: "U5786", material: "FRP, 0.090 in thick", checked: CHECKED, confidence: "high", source: "https://www.conde.com/proddetail.asp?prod=U5786", note: "One side. Backing not included.", aliases: ["name tag", "badge"] },
  { id: "name-badge-1.25x3", name: "Name badge", detail: "1.25 × 3 in", group: "id", processes: SUB, ...inch(3, 1.25), shape: "rect", wrap: false, bleed: 1.5, art: "card", sides: 1, supplier: "Conde Systems (Unisub)", sku: "U5502", material: "Stated as both FRP and aluminium on the page", checked: CHECKED, confidence: "medium", source: "https://www.conde.com/proddetail.asp?prod=U5502", note: "One side, 0.090 in thick. The supplier page names two materials; check your blank.", aliases: ["name tag", "badge"] },
  { id: "name-badge-1x3", name: "Name badge", detail: "1 × 3 in, FRP", group: "id", processes: SUB, ...inch(3, 1), shape: "rect", wrap: false, bleed: 1.5, art: "card", sides: 1, supplier: "Conde Systems (Unisub)", sku: "U5501", material: "FRP, 0.090 in thick", checked: CHECKED, confidence: "high", source: "https://www.conde.com/proddetail.asp?prod=U5501", note: "One side. Pin or magnetic backs are sold separately.", aliases: ["name tag", "badge"] },
  { id: "panel-5x7", name: "Photo panel", detail: "5 × 7 in", group: "flat", processes: SUB, ...inch(5, 7), shape: "rect", wrap: false, bleed: 1.6, art: "photo-panel", confidence: "high", source: "https://www.jpplus.com/chromaluxe-aluminum-photo-panels" },
  { id: "panel-8x10", name: "Photo panel", detail: "8 × 10 in", group: "flat", processes: SUB, ...inch(8, 10), shape: "rect", wrap: false, bleed: 1.6, art: "photo-panel", confidence: "high", source: "https://www.jpplus.com/chromaluxe-aluminum-photo-panels", note: "ChromaLuxe asks for 8.125 × 10.125 in with bleed." },
  { id: "puzzle-a4", name: "Jigsaw puzzle", detail: "A4 blank 290 × 200 mm", group: "flat", processes: SUB, width: 290, height: 200, shape: "rect", wrap: false, bleed: 0, art: "puzzle", confidence: "high", source: "https://transfer.signdepot.eu/en/Sublimation-puzzle-A4", note: "Only 3–5 mm spare on A4; no bleed added." },
  { id: "puzzle-a5", name: "Jigsaw puzzle", detail: "A5 blank 202 × 146 mm", group: "flat", processes: SUB, width: 202, height: 146, shape: "rect", wrap: false, bleed: 3, art: "puzzle", confidence: "high", source: "https://transfer.signdepot.eu/en/Sublimation-puzzle-A4" },
  { id: "tile-6in", name: "Ceramic tile", detail: "6 × 6 in", group: "flat", processes: SUB, ...inch(6, 6), shape: "rect", wrap: false, bleed: 3, art: "tile", confidence: "high", source: "https://heatpressnation.com/products/sublimation-ceramic-tile-8-x-10-white-gloss-36-per-case" },
  { id: "plate-us", name: "Licence plate", detail: "US 6 × 12 in", group: "flat", processes: SUB, ...inch(11.88, 5.88), shape: "rect", wrap: false, bleed: 3, art: "plate", confidence: "high", source: "https://www.swingdesign.com/products/unisub-sublimation-license-plate-blanks", note: "Needs A3 or US Legal." },

  // ---------------- Apparel placements (DTF and sublimation) ----------------
  { id: "tee-left-chest", name: "T-shirt", detail: "Left chest", group: "apparel", processes: BOTH, ...inch(3.5, 3.5), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 58, y: 30, w: 12, h: 12 }, confidence: "high", source: "https://ninjatransfers.com/pages/dtf-transfer-placement-guide", note: "Common range 2.5–4.5 in wide." },
  { id: "tee-center-chest", name: "T-shirt", detail: "Centre chest", group: "apparel", processes: BOTH, ...inch(8, 4), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 36, y: 30, w: 28, h: 14 }, confidence: "high", source: "https://ninjatransfers.com/pages/dtf-transfer-placement-guide" },
  { id: "tee-full-front", name: "T-shirt", detail: "Full front 11 × 11 in", group: "apparel", processes: BOTH, ...inch(11, 11), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 31, y: 30, w: 38, h: 38 }, confidence: "high", source: "https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart", note: "Fits S–3XL; XS 8.5–9.5 in, 6XL up to 14 in wide. Needs A3." },
  { id: "tee-full-back", name: "T-shirt", detail: "Full back 12 × 14 in", group: "apparel", side: "back", processes: BOTH, ...inch(12, 14), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 30, y: 26, w: 40, h: 48 }, confidence: "high", source: "https://www.screenprinting.com/blogs/news/dtf-transfer-placement-guide", note: "Needs A3+ (13 × 19 in) or a roll." },
  { id: "tee-upper-back", name: "T-shirt", detail: "Upper back 12 × 4 in", group: "apparel", side: "back", processes: BOTH, ...inch(12, 4), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 30, y: 24, w: 40, h: 12 }, confidence: "high", source: "https://ninjatransfers.com/pages/dtf-transfer-placement-guide" },
  { id: "tee-back-neck", name: "T-shirt", detail: "Back neck label", group: "apparel", side: "back", processes: BOTH, ...inch(3, 3), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 45, y: 20, w: 10, h: 10 }, confidence: "high", source: "https://www.screenprinting.com/blogs/news/dtf-transfer-placement-guide" },
  { id: "tee-sleeve", name: "T-shirt", detail: "Sleeve logo", group: "apparel", processes: BOTH, ...inch(3.5, 3.5), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 9, y: 26, w: 11, h: 11 }, confidence: "high", source: "https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart" },
  { id: "tee-sleeve-strip", name: "T-shirt", detail: "Sleeve text strip", group: "apparel", processes: BOTH, ...inch(3, 1), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 8, y: 30, w: 12, h: 4 }, confidence: "medium", source: "https://ninjatransfers.com/pages/dtf-transfer-placement-guide" },
  { id: "longsleeve-arm", name: "Long sleeve", detail: "Down the sleeve", group: "apparel", processes: BOTH, ...inch(2.5, 14), shape: "rect", wrap: false, bleed: 0, art: "longsleeve", artArea: { x: 8, y: 30, w: 7, h: 50 }, confidence: "high", source: "https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart", note: "Needs A3." },
  { id: "pocket", name: "Pocket", detail: "3 × 3 in", group: "apparel", processes: BOTH, ...inch(3, 3), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 58, y: 32, w: 10, h: 10 }, confidence: "high", source: "https://www.rushordertees.com/blog/pocket-printing-guide/" },
  { id: "hoodie-front", name: "Hoodie", detail: "Front above pouch", group: "apparel", processes: BOTH, ...inch(10, 10), shape: "rect", wrap: false, bleed: 0, art: "hoodie", artArea: { x: 33, y: 32, w: 34, h: 30 }, confidence: "high", source: "https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more", note: "Needs A3." },
  { id: "youth-front", name: "Youth tee", detail: "Front 9 × 9 in", group: "apparel", processes: BOTH, ...inch(9, 9), shape: "rect", wrap: false, bleed: 0, art: "kids-tee", artArea: { x: 32, y: 32, w: 36, h: 36 }, confidence: "high", source: "https://ninjatransfers.com/pages/dtf-transfer-placement-guide", note: "Needs A3." },
  { id: "toddler-front", name: "Toddler tee", detail: "Front 7 × 7 in", group: "apparel", processes: BOTH, ...inch(7, 7), shape: "rect", wrap: false, bleed: 0, art: "kids-tee", artArea: { x: 35, y: 34, w: 30, h: 30 }, confidence: "high", source: "https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart" },
  { id: "onesie-front", name: "Baby bodysuit", detail: "Front 5 × 5 in", group: "apparel", processes: BOTH, ...inch(5, 5), shape: "rect", wrap: false, bleed: 0, art: "onesie", artArea: { x: 36, y: 30, w: 28, h: 28 }, confidence: "high", source: "https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more" },

  // ---------------- Accessories ----------------
  { id: "cap-front", name: "Cap", detail: "Structured front", group: "accessory", processes: DTF, ...inch(4, 2), shape: "rect", wrap: false, bleed: 0, art: "cap", artArea: { x: 34, y: 38, w: 32, h: 16 }, confidence: "high", source: "https://www.printful.com/blog/hat-logo-size-and-placement-guide" },
  { id: "cap-trucker", name: "Trucker cap", detail: "Front 5 × 2 in", group: "accessory", processes: DTF, ...inch(5, 2), shape: "rect", wrap: false, bleed: 0, art: "cap", artArea: { x: 31, y: 38, w: 38, h: 16 }, confidence: "high", source: "https://api.printful.com/products/77" },
  { id: "tote", name: "Tote bag", detail: "Safe 9 × 9 in", group: "accessory", processes: BOTH, ...inch(9, 9), shape: "rect", wrap: false, bleed: 0, art: "tote", artArea: { x: 30, y: 40, w: 40, h: 40 }, confidence: "high", source: "https://www.xtool.com/blogs/xtool-academy/dtf-transfer-size-chart", note: "Maximum about 12 × 13.5 in. Needs A3." },
  // ---------------- Stickers (print-and-cut on adhesive media, not sublimation) ----------------
  { id: "sticker-die-2", name: "Die-cut sticker", detail: "2 × 2 in, cut to shape", group: "sticker", processes: STICKER, ...inch(2, 2), shape: "rect", wrap: false, bleed: 0, art: "sticker", cut: { shape: "contour", offset: 1.5, through: "die" }, checked: CHECKED, confidence: "high", source: "https://www.stickermule.com/products/die-cut-stickers", note: "A common size option; any size works. Upload a transparent PNG and generate the contour.", aliases: ["contour", "decal"] },
  { id: "sticker-die-3", name: "Die-cut sticker", detail: "3 × 3 in, cut to shape", group: "sticker", processes: STICKER, ...inch(3, 3), shape: "rect", wrap: false, bleed: 0, art: "sticker", cut: { shape: "contour", offset: 2, through: "die" }, checked: CHECKED, confidence: "high", source: "https://www.stickermule.com/products/die-cut-stickers", note: "A common size option; any size works.", aliases: ["contour", "decal"] },
  { id: "sticker-die-4", name: "Die-cut sticker", detail: "4 × 4 in, cut to shape", group: "sticker", processes: STICKER, ...inch(4, 4), shape: "rect", wrap: false, bleed: 0, art: "sticker", cut: { shape: "contour", offset: 2, through: "die" }, checked: CHECKED, confidence: "high", source: "https://www.stickermule.com/products/die-cut-stickers", note: "A common size option; any size works.", aliases: ["contour", "decal"] },
  { id: "sticker-kiss-round-3", name: "Kiss-cut sticker", detail: "Round 3 in", group: "sticker", processes: STICKER, ...inch(3, 3), shape: "circle", wrap: false, bleed: 1.5, art: "sticker", cut: { shape: "ellipse", offset: 0, through: "kiss", safeInset: 3 }, checked: CHECKED, confidence: "medium", source: "https://www.stickermule.com/products/die-cut-stickers", note: "3 in is a size the source offers; the round shape and the 1.5 mm bleed and 3 mm safe area are starting values. Use your printer's specs.", aliases: ["circle", "label"] },
  { id: "sticker-kiss-square-3", name: "Kiss-cut sticker", detail: "Rounded square 3 in", group: "sticker", processes: STICKER, ...inch(3, 3), shape: "rect", wrap: false, bleed: 1.5, art: "sticker", cut: { shape: "rect", radius: 3, offset: 0, through: "kiss", safeInset: 3 }, checked: CHECKED, confidence: "medium", source: "https://www.stickermule.com/products/die-cut-stickers", note: "3 in is a size the source offers; radius, bleed and safe area are starting values. Use your printer's specs.", aliases: ["square", "label"] },
  { id: "garden-flag", name: "Garden flag", detail: "12 × 18 in", group: "accessory", processes: SUB, ...inch(12, 18), shape: "rect", wrap: false, bleed: 3, art: "flag", confidence: "medium", source: "https://help.gearment.com/en-us/article/flag-products-1xbyzzi", note: "Needs A3+ or a roll." },
  // v0.10: ornaments, more keyrings and tags, coasters, desk mats, home decor,
  // jewellery and DTF placements (see products-v10.ts for the sources).
  ...V10_PRODUCTS,
];

export const GROUP_LABELS: Record<ProductGroup, string> = {
  drinkware: "Drinkware",
  flat: "Flat goods",
  ornament: "Ornaments",
  keyring: "Keyrings and tags",
  id: "ID cards and badges",
  decor: "Home and decor",
  jewelry: "Jewellery",
  apparel: "Apparel",
  accessory: "Accessories",
  sticker: "Stickers",
};

/** Number of printable faces (1 unless the source says both sides print). */
export function sidesOf(p: Pick<ProductPreset, "sides"> | undefined): 1 | 2 {
  return p?.sides === 2 ? 2 : 1;
}

export function findProduct(id: string | null | undefined): ProductPreset | undefined {
  return id ? PRODUCTS.find((p) => p.id === id) : undefined;
}

/** Box size a slot gets for this product, including bleed and seam overlap. */
export function slotSize(p: ProductPreset): { width: number; height: number; bleed: number } {
  if (p.wrap) return { width: p.width + WRAP_SEAM_MM, height: p.height, bleed: 0 };
  return { width: p.width + p.bleed * 2, height: p.height + p.bleed * 2, bleed: p.bleed };
}

/** Smallest paper sheet that holds the slot, or null when it needs a roll. */
export function minSheetFor(p: ProductPreset): SheetDefinition | null {
  return smallestSheetFor(slotSize(p));
}

export function searchProducts(query: string, process?: PrintProcess): ProductPreset[] {
  const q = query.trim().toLowerCase();
  return PRODUCTS.filter((p) => {
    if (process && !p.processes.includes(process)) return false;
    if (!q) return true;
    const words = q.split(/\s+/);
    const text = `${p.name} ${p.detail} ${GROUP_LABELS[p.group]} ${(p.aliases ?? []).join(" ")} ${p.sku ?? ""}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
