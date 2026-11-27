/**
 * Product presets added in v0.10 (checked 2026-11-27, see
 * docs/catalogue-sources.md, "v0.10 additions").
 *
 * Every size is the one printed on the named source page; nothing is
 * estimated. Sources:
 * - Unisub blank templates as listed by Swing Design (two template pages) and
 *   HeatPressNation's sublimation template list (shaped ornaments, car
 *   coasters), with the Unisub template number as the product code.
 * - HeatPressNation's SubliCraft linen pillow cover page.
 * - Printful (glass cutting boards) and Printify (desk mats) product pages.
 * - Kingdom DTF's sizing guide for DTF placements. It gives design *widths*
 *   only, so those boxes start square at a width inside the published range
 *   and say so; the height is the user's design.
 *
 * Shaped blanks (hearts, stars, trees...) carry an `outline`: the editor
 * draws it as the cut guide and the 3D model is extruded from it. Outlines
 * fill the published bounding size; the blank defines the real edge.
 */

import type { PrintProcess } from "@/types/editor";
import type { ProductPreset } from "./products";

const IN = 25.4;
const inch = (w: number, h: number) => ({ width: +(w * IN).toFixed(1), height: +(h * IN).toFixed(1) });
const SUB: PrintProcess[] = ["sublimation"];
const DTF: PrintProcess[] = ["dtf"];
const CHECKED = "2026-11-27";

const SWING1 = "https://www.swingdesign.com/pages/unisub-sublimation-blank-templates";
const SWING2 = "https://www.swingdesign.com/pages/unisub-sublimation-blank-templates-1";
const HPN = "https://www.heatpressnation.com/pages/sublimation-templates";
const UNISUB = "Unisub (template list)";
const KINGDOM = "https://kingdomdtf.com/blogs/dtf/how-big-should-my-dtf-design-be-sizing-guide-for-t-shirts-hoodies-more";
const SQUARE_NOTE = "The source gives the design width only; the box starts square. Set the height to your design.";
const OUTLINE_NOTE = "The outline is drawn to the published bounding size as a guide; the blank defines the real edge.";

type Base = Omit<ProductPreset, "confidence" | "checked"> & Partial<Pick<ProductPreset, "confidence">>;
const p = (x: Base): ProductPreset => ({ confidence: "high", checked: CHECKED, ...x });

export const V10_PRODUCTS: ProductPreset[] = [
  // ---------------- Ornaments ----------------
  p({ id: "ornament-round-2.75", name: "Ornament", detail: "Round 2.75 in", group: "ornament", processes: SUB, ...inch(2.75, 2.75), shape: "circle", wrap: false, bleed: 2, art: "ornament", supplier: UNISUB, sku: "4599", source: HPN, aliases: ["christmas", "bauble"] }),
  p({ id: "ornament-ball-3x3.37", name: "Ornament", detail: "Ball 3 × 3.37 in", group: "ornament", processes: SUB, ...inch(3, 3.37), shape: "circle", wrap: false, bleed: 2, art: "ornament", supplier: UNISUB, sku: "4335", source: SWING1, note: "Bounding size of the ball shape, as listed.", aliases: ["christmas", "bauble"] }),
  p({ id: "ornament-round-3.9", name: "Ornament", detail: "Large round 3.9 in", group: "ornament", processes: SUB, ...inch(3.9, 3.9), shape: "circle", wrap: false, bleed: 2, art: "ornament", supplier: UNISUB, sku: "4849", source: HPN, aliases: ["christmas", "bauble"] }),
  p({ id: "ornament-star", name: "Ornament", detail: "Star 3.81 × 3.98 in", group: "ornament", processes: SUB, ...inch(3.81, 3.98), shape: "rect", wrap: false, bleed: 2, art: "ornament", outline: "star", supplier: UNISUB, sku: "4331", source: HPN, note: OUTLINE_NOTE, aliases: ["christmas"] }),
  p({ id: "ornament-tree", name: "Ornament", detail: "Tree 3.38 × 3.95 in", group: "ornament", processes: SUB, ...inch(3.38, 3.95), shape: "rect", wrap: false, bleed: 2, art: "ornament", outline: "tree", supplier: UNISUB, sku: "4334", source: HPN, note: OUTLINE_NOTE, aliases: ["christmas"] }),
  p({ id: "ornament-heart", name: "Ornament", detail: "Heart 2.87 × 3 in", group: "ornament", processes: SUB, ...inch(2.87, 3), shape: "rect", wrap: false, bleed: 2, art: "ornament", outline: "heart", supplier: UNISUB, sku: "4332", source: HPN, note: OUTLINE_NOTE, aliases: ["valentine"] }),
  p({ id: "ornament-bell", name: "Ornament", detail: "Bell 3.3 × 3.33 in", group: "ornament", processes: SUB, ...inch(3.3, 3.33), shape: "rect", wrap: false, bleed: 2, art: "ornament", outline: "bell", supplier: UNISUB, sku: "4333", source: HPN, note: OUTLINE_NOTE, aliases: ["christmas"] }),
  p({ id: "ornament-snowflake", name: "Ornament", detail: "Snowflake 3 in", group: "ornament", processes: SUB, ...inch(3, 3), shape: "rect", wrap: false, bleed: 2, art: "ornament", outline: "snowflake", supplier: "HeatPressNation", sku: "84002", source: HPN, note: `Listed as "3 in Snowflake w/ Hole". ${OUTLINE_NOTE}`, aliases: ["christmas", "winter"] }),
  p({ id: "ornament-hexagon", name: "Ornament", detail: "Hexagon 2.6 × 3 in", group: "ornament", processes: SUB, ...inch(2.6, 3), shape: "rect", wrap: false, bleed: 2, art: "ornament", outline: "hexagon", supplier: UNISUB, sku: "4172", source: HPN, note: OUTLINE_NOTE }),
  p({ id: "ornament-oval", name: "Ornament", detail: "Oval 2.35 × 3 in", group: "ornament", processes: SUB, ...inch(2.35, 3), shape: "circle", wrap: false, bleed: 2, art: "ornament", supplier: UNISUB, sku: "4171", source: HPN }),
  p({ id: "ornament-rect", name: "Ornament", detail: "Rectangle 3 × 2 in", group: "ornament", processes: SUB, ...inch(3, 2), shape: "rect", wrap: false, bleed: 2, art: "ornament", supplier: UNISUB, sku: "4173", source: HPN, note: "Listed as a 2 × 3 in landscape rectangle." }),
  p({ id: "ornament-square-2.75", name: "Ornament", detail: "Square 2.75 in", group: "ornament", processes: SUB, ...inch(2.75, 2.75), shape: "rect", wrap: false, bleed: 2, art: "ornament", supplier: UNISUB, sku: "4859", source: HPN }),
  p({ id: "ornament-square-3.9", name: "Ornament", detail: "Jumbo square 3.9 in", group: "ornament", processes: SUB, ...inch(3.9, 3.9), shape: "rect", wrap: false, bleed: 2, art: "ornament", supplier: UNISUB, sku: "4850", source: HPN }),
  p({ id: "ornament-tag", name: "Ornament", detail: "Tag 2.5 × 3.5 in", group: "ornament", processes: SUB, ...inch(2.5, 3.5), shape: "rect", wrap: false, bleed: 2, art: "ornament", outline: "tag", supplier: UNISUB, sku: "4856", source: HPN, note: OUTLINE_NOTE, aliases: ["gift tag"] }),
  p({ id: "ornament-bone", name: "Ornament", detail: "Dog bone 2.12 × 3.25 in", group: "ornament", processes: SUB, ...inch(2.12, 3.25), shape: "rect", wrap: false, bleed: 2, art: "ornament", outline: "bone", supplier: UNISUB, sku: "4857", source: HPN, note: OUTLINE_NOTE, aliases: ["pet", "dog"] }),
  p({ id: "ornament-cross", name: "Ornament", detail: "Cross 2.9 × 3.5 in", group: "ornament", processes: SUB, ...inch(2.9, 3.5), shape: "rect", wrap: false, bleed: 2, art: "ornament", outline: "cross", supplier: UNISUB, sku: "4855", source: HPN, note: OUTLINE_NOTE }),

  // ---------------- Keyrings and tags ----------------
  p({ id: "keychain-heart-2part", name: "Keychain", detail: "Two-part heart 2.73 × 3.18 in", group: "keyring", processes: SUB, ...inch(2.73, 3.18), shape: "rect", wrap: false, bleed: 2, art: "keychain", outline: "heart", supplier: UNISUB, sku: "4664", source: SWING2, note: `A heart that splits in two. ${OUTLINE_NOTE}`, aliases: ["keyring", "valentine", "couple"] }),
  p({ id: "bag-tag-square-3", name: "Bag tag", detail: "Square 3 in", group: "keyring", processes: SUB, ...inch(3, 3), shape: "rect", wrap: false, bleed: 2, art: "luggage-tag", supplier: UNISUB, sku: "4622", source: SWING2, aliases: ["luggage tag"] }),
  p({ id: "bag-tag-2.75x4", name: "Bag tag", detail: "2.75 × 4 in", group: "keyring", processes: SUB, ...inch(2.75, 4), shape: "rect", wrap: false, bleed: 2, art: "luggage-tag", supplier: UNISUB, sku: "4623", source: SWING2, aliases: ["luggage tag"] }),
  p({ id: "bag-tag-1.75x3.5", name: "Bag tag", detail: "1.75 × 3.5 in", group: "keyring", processes: SUB, ...inch(1.75, 3.5), shape: "rect", wrap: false, bleed: 2, art: "luggage-tag", supplier: UNISUB, sku: "4624", source: SWING2, aliases: ["luggage tag"] }),
  p({ id: "bag-tag-round-3.5", name: "Bag tag", detail: "Round 3.5 in", group: "keyring", processes: SUB, ...inch(3.5, 3.5), shape: "circle", wrap: false, bleed: 2, art: "luggage-tag", supplier: UNISUB, sku: "4625", source: SWING2, aliases: ["luggage tag"] }),

  // ---------------- Flat goods ----------------
  p({ id: "magnet-round-2.5", name: "Fridge magnet", detail: "Round 2.5 in", group: "flat", processes: SUB, ...inch(2.5, 2.5), shape: "circle", wrap: false, bleed: 2, art: "magnet", supplier: UNISUB, sku: "5522", source: SWING1 }),
  p({ id: "magnet-heart", name: "Fridge magnet", detail: "Heart 2.5 × 2.25 in", group: "flat", processes: SUB, ...inch(2.5, 2.25), shape: "rect", wrap: false, bleed: 2, art: "magnet", outline: "heart", supplier: UNISUB, sku: "5527", source: SWING1, note: OUTLINE_NOTE }),
  p({ id: "coaster-square-3.54", name: "Coaster", detail: "Square 3.54 in", group: "flat", processes: SUB, ...inch(3.54, 3.54), shape: "rect", wrap: false, bleed: 3, art: "coaster-square", supplier: UNISUB, sku: "4843", source: SWING1 }),
  p({ id: "coaster-round-3.54", name: "Coaster", detail: "Round 3.54 in", group: "flat", processes: SUB, ...inch(3.54, 3.54), shape: "circle", wrap: false, bleed: 3, art: "coaster-round", supplier: UNISUB, sku: "4028", source: SWING1 }),
  p({ id: "coaster-cork-3.78", name: "Coaster", detail: "Square 3.78 in, cork back", group: "flat", processes: SUB, ...inch(3.78, 3.78), shape: "rect", wrap: false, bleed: 3, art: "coaster-square", supplier: UNISUB, sku: "5677", source: SWING1, confidence: "medium", note: "HeatPressNation's template list names the same code 3.75 in square." }),
  p({ id: "coaster-round-4.4", name: "Coaster", detail: "Round 4.4 in", group: "flat", processes: SUB, ...inch(4.4, 4.4), shape: "circle", wrap: false, bleed: 3, art: "coaster-round", supplier: "HeatPressNation", sku: "80307", source: HPN }),
  p({ id: "car-coaster-2.5", name: "Car coaster", detail: "Ceramic, round 2.5 in", group: "flat", processes: SUB, ...inch(2.5, 2.5), shape: "circle", wrap: false, bleed: 2, art: "coaster-round", supplier: "HeatPressNation", material: "Ceramic", source: HPN, aliases: ["cup holder"] }),
  p({ id: "car-coaster-2.625", name: "Car coaster", detail: "Round 2.625 in", group: "flat", processes: SUB, ...inch(2.625, 2.625), shape: "circle", wrap: false, bleed: 2, art: "coaster-round", supplier: "HeatPressNation", source: HPN, aliases: ["cup holder"] }),
  p({ id: "desk-mat-14x12", name: "Desk mat", detail: "14.4 × 12.1 in", group: "flat", processes: SUB, ...inch(14.4, 12.1), shape: "rect", wrap: false, bleed: 3, art: "mousepad", supplier: "Printify (generic brand)", source: "https://printify.com/app/products/975/generic-brand/desk-mats", aliases: ["mouse mat", "desk pad"] }),
  p({ id: "desk-mat-24x14", name: "Desk mat", detail: "23.6 × 13.8 in", group: "flat", processes: SUB, ...inch(23.6, 13.8), shape: "rect", wrap: false, bleed: 3, art: "mousepad", supplier: "Printify (generic brand)", source: "https://printify.com/app/products/975/generic-brand/desk-mats", note: "Needs a roll or a large-format sheet.", aliases: ["mouse mat", "desk pad"] }),
  p({ id: "desk-mat-32x16", name: "Desk mat", detail: "31.5 × 15.5 in", group: "flat", processes: SUB, ...inch(31.5, 15.5), shape: "rect", wrap: false, bleed: 3, art: "mousepad", supplier: "Printify (generic brand)", source: "https://printify.com/app/products/975/generic-brand/desk-mats", note: "Needs a roll or a large-format sheet.", aliases: ["mouse mat", "desk pad", "gaming"] }),
  p({ id: "cutting-board-8x11", name: "Glass cutting board", detail: "8 × 11 in", group: "decor", processes: SUB, ...inch(8, 11), shape: "rect", wrap: false, bleed: 3, art: "cutting-board", supplier: "Printful", material: "Tempered glass", source: "https://www.printful.com/custom/home-living/all/glass-cutting-board", aliases: ["kitchen"] }),
  p({ id: "cutting-board-11x15", name: "Glass cutting board", detail: "11 × 15 in", group: "decor", processes: SUB, ...inch(11, 15), shape: "rect", wrap: false, bleed: 3, art: "cutting-board", supplier: "Printful", material: "Tempered glass", source: "https://www.printful.com/custom/home-living/all/glass-cutting-board", note: "Needs A3+ or a roll.", aliases: ["kitchen"] }),

  // ---------------- Home and decor ----------------
  p({ id: "wall-clock-8.125", name: "Wall clock", detail: "Round 8.125 in", group: "decor", processes: SUB, ...inch(8.125, 8.125), shape: "circle", wrap: false, bleed: 3, art: "clock", supplier: UNISUB, sku: "5650", source: SWING1, note: "Clock kit; keep artwork clear of the centre hole.", aliases: ["clock"] }),
  p({ id: "sign-5x12", name: "Sign", detail: "Rectangle 5 × 12 in", group: "decor", processes: SUB, ...inch(12, 5), shape: "rect", wrap: false, bleed: 3, art: "plate", supplier: UNISUB, sku: "4792", source: SWING1, note: "Listed as 5 × 12 in; shown landscape.", aliases: ["name sign", "door sign"] }),
  p({ id: "yard-sign-7.75x10", name: "Yard sign", detail: "7.75 × 10 in, with stake", group: "decor", processes: SUB, ...inch(7.75, 10), shape: "rect", wrap: false, bleed: 3, art: "sign", supplier: UNISUB, sku: "4774", source: SWING1, aliases: ["garden sign", "lawn sign"] }),
  p({ id: "yard-sign-7.75x15.83", name: "Yard sign", detail: "7.75 × 15.83 in", group: "decor", processes: SUB, ...inch(7.75, 15.83), shape: "rect", wrap: false, bleed: 3, art: "sign", supplier: UNISUB, sku: "4776", source: SWING1, note: "Needs A3+ or US Legal turned.", aliases: ["garden sign", "lawn sign"] }),
  p({ id: "wall-panel-8x10", name: "Wall panel", detail: "8 × 10 in", group: "decor", processes: SUB, ...inch(8, 10), shape: "rect", wrap: false, bleed: 3, art: "wall-panel", supplier: UNISUB, sku: "4845", source: SWING2, aliases: ["wall decor", "photo"] }),
  p({ id: "wall-panel-5.7x15.5", name: "Wall panel", detail: "5.7 × 15.5 in", group: "decor", processes: SUB, ...inch(5.7, 15.5), shape: "rect", wrap: false, bleed: 3, art: "wall-panel", supplier: UNISUB, sku: "4846", source: SWING2, aliases: ["wall decor", "photo"] }),
  p({ id: "wood-print-8x8", name: "Natural wood print", detail: "8 × 8 in", group: "decor", processes: SUB, ...inch(8, 8), shape: "rect", wrap: false, bleed: 3, art: "wall-panel", supplier: UNISUB, sku: "4528", material: "Natural wood", source: SWING2, aliases: ["photo", "wood"] }),
  p({ id: "wood-print-8x10", name: "Natural wood print", detail: "8 × 10 in", group: "decor", processes: SUB, ...inch(8, 10), shape: "rect", wrap: false, bleed: 3, art: "wall-panel", supplier: UNISUB, sku: "4529", material: "Natural wood", source: SWING2, aliases: ["photo", "wood"] }),
  p({ id: "wood-print-10x10", name: "Natural wood print", detail: "10 × 10 in", group: "decor", processes: SUB, ...inch(10, 10), shape: "rect", wrap: false, bleed: 3, art: "wall-panel", supplier: UNISUB, sku: "4530", material: "Natural wood", source: SWING2, note: "Needs A3.", aliases: ["photo", "wood"] }),
  p({ id: "wood-print-11x14", name: "Natural wood print", detail: "11 × 14 in", group: "decor", processes: SUB, ...inch(11, 14), shape: "rect", wrap: false, bleed: 3, art: "wall-panel", supplier: UNISUB, sku: "4531", material: "Natural wood", source: SWING2, note: "Needs A3+.", aliases: ["photo", "wood"] }),
  p({ id: "clipboard", name: "Clipboard", detail: "9.76 × 12.68 in, flat clip", group: "decor", processes: SUB, ...inch(9.76, 12.68), shape: "rect", wrap: false, bleed: 3, art: "clipboard", supplier: UNISUB, sku: "4672", source: SWING2, note: "Needs A3. Keep artwork clear of the clip at the top.", aliases: ["teacher", "office"] }),
  p({ id: "pillow-cover-15.74", name: "Pillow cover", detail: "Linen 15.74 in square", group: "decor", processes: SUB, ...inch(15.74, 15.74), shape: "rect", wrap: false, bleed: 3, art: "pillow", supplier: "HeatPressNation (SubliCraft)", material: "Linen-look polyester", source: "https://www.heatpressnation.com/products/sublicraft-sublimation-blank-linen-pillow-cover", note: "Fits a 15.7 or 16 in insert (supplier). Needs a roll or a large-format sheet.", aliases: ["cushion", "pillow case"] }),

  // ---------------- Jewellery ----------------
  p({ id: "cuff-0.55", name: "Cuff bracelet", detail: "0.55 × 6.5 in", group: "jewelry", processes: SUB, ...inch(6.5, 0.55), shape: "rect", wrap: false, bleed: 1, art: "bracelet", supplier: UNISUB, sku: "4630", source: SWING2, aliases: ["bangle"] }),
  p({ id: "cuff-0.875", name: "Cuff bracelet", detail: "0.875 × 6.5 in", group: "jewelry", processes: SUB, ...inch(6.5, 0.875), shape: "rect", wrap: false, bleed: 1, art: "bracelet", supplier: UNISUB, sku: "4633", source: SWING2, aliases: ["bangle"] }),
  p({ id: "cuff-1.375", name: "Cuff bracelet", detail: "1.375 × 6.5 in", group: "jewelry", processes: SUB, ...inch(6.5, 1.375), shape: "rect", wrap: false, bleed: 1, art: "bracelet", supplier: UNISUB, sku: "4636", source: SWING2, aliases: ["bangle"] }),
  p({ id: "cuff-1.75", name: "Cuff bracelet", detail: "1.75 × 6.5 in", group: "jewelry", processes: SUB, ...inch(6.5, 1.75), shape: "rect", wrap: false, bleed: 1, art: "bracelet", supplier: UNISUB, sku: "4639", source: SWING2, aliases: ["bangle"] }),
  p({ id: "pendant-round-1", name: "Pendant insert", detail: "Round 1 in", group: "jewelry", processes: SUB, ...inch(1, 1), shape: "circle", wrap: false, bleed: 1, art: "pendant", supplier: UNISUB, sku: "4691", source: SWING2, aliases: ["necklace", "bezel"] }),
  p({ id: "pendant-square-1", name: "Pendant insert", detail: "Square 1 in", group: "jewelry", processes: SUB, ...inch(1, 1), shape: "rect", wrap: false, bleed: 1, art: "pendant", supplier: UNISUB, sku: "4689", source: SWING2, aliases: ["necklace", "bezel"] }),
  p({ id: "pendant-rect-2x1", name: "Pendant insert", detail: "Rectangle 2 × 1 in", group: "jewelry", processes: SUB, ...inch(2, 1), shape: "rect", wrap: false, bleed: 1, art: "pendant", supplier: UNISUB, sku: "4687", source: SWING2, note: "Listed as 2 × 1 in; turn it for a hanging pendant.", aliases: ["necklace", "bezel"] }),

  // ---------------- DTF placements (widths from Kingdom DTF) ----------------
  p({ id: "crewneck-front", name: "Crewneck sweatshirt", detail: "Front 12 in wide", group: "apparel", processes: DTF, ...inch(12, 12), shape: "rect", wrap: false, bleed: 0, art: "longsleeve", artArea: { x: 31, y: 30, w: 38, h: 38 }, supplier: "Kingdom DTF (guide)", source: KINGDOM, confidence: "medium", note: `11–12.5 in wide, front or back centre. ${SQUARE_NOTE} Needs A3.`, aliases: ["sweatshirt", "jumper"] }),
  p({ id: "jacket-back", name: "Jacket", detail: "Back 12 in wide", group: "apparel", side: "back", processes: DTF, ...inch(12, 12), shape: "rect", wrap: false, bleed: 0, art: "longsleeve", artArea: { x: 30, y: 26, w: 40, h: 40 }, supplier: "Kingdom DTF (guide)", source: KINGDOM, confidence: "medium", note: `11–13.5 in wide, back centre. ${SQUARE_NOTE} Needs A3.` }),
  p({ id: "zip-hoodie-chest", name: "Zip hoodie", detail: "Chest 4 in wide (each side)", group: "apparel", processes: DTF, ...inch(4, 4), shape: "rect", wrap: false, bleed: 0, art: "hoodie", artArea: { x: 56, y: 34, w: 13, h: 13 }, supplier: "Kingdom DTF (guide)", source: KINGDOM, confidence: "medium", note: `3.5–4 in per side; keep clear of the zipper. ${SQUARE_NOTE}` }),
  p({ id: "tank-front", name: "Tank top", detail: "Front 8 in wide", group: "apparel", processes: DTF, ...inch(8, 8), shape: "rect", wrap: false, bleed: 0, art: "tshirt", artArea: { x: 36, y: 32, w: 28, h: 28 }, supplier: "Kingdom DTF (guide)", source: KINGDOM, confidence: "medium", note: `6.5–8.5 in wide, centre chest. ${SQUARE_NOTE}` }),
  p({ id: "youth-sleeve", name: "Youth tee", detail: "Sleeve 2.5 in wide", group: "apparel", processes: DTF, ...inch(2.5, 2.5), shape: "rect", wrap: false, bleed: 0, art: "kids-tee", artArea: { x: 10, y: 30, w: 10, h: 10 }, supplier: "Kingdom DTF (guide)", source: KINGDOM, confidence: "medium", note: `2–3 in wide, outer sleeve. ${SQUARE_NOTE}` }),
];
