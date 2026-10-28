/**
 * Example sheets for the home page, laid out by the editor's own engine.
 *
 * The home page shows what a finished sheet looks like and lets visitors move
 * transfers around a miniature one. Rather than drawing pictures that could
 * drift from the product, these sheets are computed from the real catalogue
 * (`slotSize` adds bleed and seam overlap), the real sheet sizes, the editor's
 * default 5 mm margins and the shelf packer (`packShelves`) that "Arrange all"
 * uses. Tests check that every item is placed and inside the printable area.
 */

import { DTF_GAP_MM, findProduct, slotSize } from "@/lib/catalogue/products";
import { findSheet } from "@/lib/catalogue/sheets";
import { packShelves } from "@/lib/layout/auto-arrange";
import { sheetUtilisation } from "@/lib/layout/measure";
import type { Rect } from "@/lib/image/image-fit";
import type { PrintProcess } from "@/types/editor";

/** The editor's default sheet margin (`uniformMargins(5)` in the store). */
export const DEMO_MARGIN_MM = 5;
/** Gap the editor leaves between sublimation products. */
const SUB_GAP_MM = 5;

export interface DemoItem extends Rect {
  id: string;
  productId: string;
  /** e.g. "Mug 11 oz, full wrap". */
  label: string;
  shape: "rect" | "circle";
  /** Index into the sample designs, so each box gets its own artwork. */
  art: number;
}

export interface DemoSheet {
  id: string;
  /** Short name for the switcher, e.g. "Mugs and coasters". */
  name: string;
  process: PrintProcess;
  sheetName: string;
  width: number;
  height: number;
  printable: Rect;
  gap: number;
  items: DemoItem[];
  unplaced: string[];
  /** Share of the printable area covered by transfers, 0–1. */
  utilisation: number;
}

interface Spec {
  id: string;
  name: string;
  process: PrintProcess;
  sheet: string;
  orientation: "portrait" | "landscape";
  products: string[];
}

const SPECS: Spec[] = [
  {
    id: "sublimation-a4",
    name: "Mug and coasters",
    process: "sublimation",
    sheet: "a4",
    orientation: "landscape",
    products: ["mug-11oz", "coaster-round", "coaster-round", "magnet"],
  },
  {
    id: "sublimation-a3",
    name: "Tumbler and small goods",
    process: "sublimation",
    sheet: "a3",
    orientation: "portrait",
    products: ["tumbler-30oz", "bookmark", "luggage-tag", "keychain-round", "keychain-round"],
  },
  {
    id: "dtf-gang",
    name: "DTF gang sheet",
    process: "dtf",
    sheet: "dtf-22x24",
    orientation: "portrait",
    products: [
      "tee-full-front",
      "hoodie-front",
      "tee-upper-back",
      "tee-left-chest",
      "tee-left-chest",
      "tee-left-chest",
      "tee-left-chest",
      "pocket",
      "pocket",
      "cap-front",
      "cap-front",
      "cap-front",
    ],
  },
];

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function build(spec: Spec): DemoSheet {
  const sheet = findSheet(spec.sheet)!;
  const landscape = spec.orientation === "landscape";
  const width = landscape ? Math.max(sheet.width, sheet.height) : Math.min(sheet.width, sheet.height);
  const height = landscape ? Math.min(sheet.width, sheet.height) : Math.max(sheet.width, sheet.height);
  const printable = { x: DEMO_MARGIN_MM, y: DEMO_MARGIN_MM, width: width - 2 * DEMO_MARGIN_MM, height: height - 2 * DEMO_MARGIN_MM };
  const gap = spec.process === "dtf" ? DTF_GAP_MM : SUB_GAP_MM;

  const sized = spec.products.map((productId, i) => {
    const p = findProduct(productId)!;
    const slot = slotSize(p);
    return { id: `${spec.id}-${i}`, productId, p, width: slot.width, height: slot.height };
  });
  const { placements, unplaced } = packShelves(sized, printable, { x: gap, y: gap });
  const items: DemoItem[] = placements.map((pl) => {
    const s = sized.find((x) => x.id === pl.id)!;
    return {
      id: s.id,
      productId: s.productId,
      label: `${s.p.name}, ${lowerFirst(s.p.detail)}`,
      shape: s.p.shape,
      art: sized.indexOf(s),
      x: pl.x,
      y: pl.y,
      width: s.width,
      height: s.height,
    };
  });
  return {
    id: spec.id,
    name: spec.name,
    process: spec.process,
    sheetName: `${sheet.name}${sheet.kind === "paper" ? `, ${spec.orientation}` : ""}`,
    width,
    height,
    printable,
    gap,
    items,
    unplaced,
    utilisation: sheetUtilisation(items, printable),
  };
}

export const DEMO_SHEETS: DemoSheet[] = SPECS.map(build);

export function demoSheet(id: string): DemoSheet {
  return DEMO_SHEETS.find((s) => s.id === id) ?? DEMO_SHEETS[0];
}

/** "297 × 210 mm", with at most one decimal. */
export function mm(width: number, height: number): string {
  const f = (v: number) => String(+v.toFixed(1));
  return `${f(width)} × ${f(height)} mm`;
}
