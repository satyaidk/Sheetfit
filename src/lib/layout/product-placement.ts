/**
 * Decide where a newly added product template goes.
 *
 * v0.2 switched the whole sheet when a product did not fit, which silently
 * moved every other design onto the bigger sheet (and back again when the user
 * changed their mind). The rule is now that adding a product never changes a
 * sheet that already holds work:
 *
 * 1. Empty page: the page adopts what the product needs (orientation, then the
 *    smallest sheet that holds it, then the product's process).
 *    Products start in the top-left corner, like a gang sheet.
 * 2. Page with work, same process, product fits: it goes in the first free
 *    spot, turned 90° if only that fits.
 * 3. Otherwise (too big, sheet full, or a process this page does not print):
 *    a new page with the right sheet and process is created for it.
 *
 * Pure function of the page and its designs, so it is unit tested directly.
 */

import type { Design, Orientation, PageSettings, PrintProcess } from "@/types/editor";
import type { Size } from "@/lib/image/image-fit";
import { slotSize, type ProductPreset } from "@/lib/catalogue/products";
import { smallestSheetOrRollFor, type SheetDefinition } from "@/lib/catalogue/sheets";
import { designBounds, printableRect } from "./sheet-layout";
import { findFreeSpot } from "./free-spot";

/**
 * Gaps tried between a new product and existing designs (mm), roomiest first.
 * Product boxes already include their bleed, so 2 mm still cuts cleanly; it
 * lets a 4 in coaster sit under an 11 oz mug wrap on A4.
 */
export const PLACEMENT_GAPS_MM = [5, 2];

export type PlacementReason = "fits" | "page-adjusted" | "too-big" | "sheet-full" | "process";

export interface ProductPlacement {
  /** "current": add to this page (possibly with `page` changed); "new-page": create a page. */
  target: "current" | "new-page";
  /** Page settings to use for the target page. */
  page: PageSettings;
  /** Top-left of the unrotated design box, in page mm. */
  x: number;
  y: number;
  rotation: 0 | 90;
  reason: PlacementReason;
  /** Sheet the page was switched to, when the sheet changed. */
  sheet: SheetDefinition | null;
}

function processFor(product: ProductPreset, page: PageSettings): PrintProcess {
  return product.processes.includes(page.process) ? page.process : product.processes[0];
}

function withProcess(page: PageSettings, process: PrintProcess): PageSettings {
  if (process === page.process) return page;
  return { ...page, process, mirrorOutput: process === "sublimation" };
}

function fits(slot: Size, page: PageSettings): boolean {
  const area = printableRect(page);
  return slot.width <= area.width + 1e-6 && slot.height <= area.height + 1e-6;
}

function flip(o: Orientation): Orientation {
  return o === "portrait" ? "landscape" : "portrait";
}

/**
 * Page settings, based on `page`, that hold `slot` without turning the slot.
 * Keeps the sheet and orientation when possible, then tries the other
 * orientation, then the smallest sheet (or roll) that holds it.
 */
export function pageFor(slot: Size, page: PageSettings): { page: PageSettings; sheet: SheetDefinition | null } {
  if (fits(slot, page)) return { page, sheet: null };
  const turned = { ...page, orientation: flip(page.orientation) };
  if (fits(slot, turned)) return { page: turned, sheet: null };
  const margin = Math.max(page.margins.top, page.margins.right, page.margins.bottom, page.margins.left);
  const sheet = smallestSheetOrRollFor(slot, margin);
  if (!sheet) {
    // Bigger than every preset: a custom sheet with the margins around it.
    const custom = { width: slot.width + margin * 2, height: slot.height + margin * 2 };
    const base = { width: Math.min(custom.width, custom.height), height: Math.max(custom.width, custom.height) };
    return { page: { ...page, sheet: "custom", customSize: base, orientation: custom.width > custom.height ? "landscape" : "portrait" }, sheet: null };
  }
  const portrait = { ...page, sheet: sheet.id, customSize: null, orientation: "portrait" as Orientation };
  return { page: fits(slot, portrait) ? portrait : { ...portrait, orientation: "landscape" }, sheet };
}

/**
 * Products start in the top-left corner of the printable area, as on a gang
 * sheet: a centred first product would split the free space and leave no room
 * for the next one.
 */
function corner(page: PageSettings) {
  const area = printableRect(page);
  return { x: area.x, y: area.y };
}

export function planProductPlacement(product: ProductPreset, page: PageSettings, designs: Design[]): ProductPlacement {
  const slot = slotSize(product);
  const process = processFor(product, page);

  if (designs.length === 0) {
    const adjusted = pageFor(slot, withProcess(page, process));
    const changed =
      adjusted.page.sheet !== page.sheet ||
      adjusted.page.orientation !== page.orientation ||
      adjusted.page.process !== page.process ||
      adjusted.page.customSize !== page.customSize;
    return {
      target: "current",
      page: adjusted.page,
      ...corner(adjusted.page),
      rotation: 0,
      reason: changed ? "page-adjusted" : "fits",
      sheet: adjusted.sheet,
    };
  }

  if (process === page.process) {
    const area = printableRect(page);
    const occupied = designs.map(designBounds);
    for (const gap of PLACEMENT_GAPS_MM) {
      const spot = findFreeSpot(slot, occupied, area, gap);
      if (spot) return { target: "current", page, ...spot, rotation: 0, reason: "fits", sheet: null };
      const turned = findFreeSpot({ width: slot.height, height: slot.width }, occupied, area, gap);
      if (turned) {
        // A 90° box keeps its centre; convert the rotated bounds back to the box corner.
        return {
          target: "current",
          page,
          x: turned.x + slot.height / 2 - slot.width / 2,
          y: turned.y + slot.width / 2 - slot.height / 2,
          rotation: 90,
          reason: "fits",
          sheet: null,
        };
      }
    }
  }

  const fresh = pageFor(slot, withProcess(page, process));
  const tooBig = !fits(slot, page) && !fits({ width: slot.height, height: slot.width }, page);
  return {
    target: "new-page",
    page: fresh.page,
    ...corner(fresh.page),
    rotation: 0,
    reason: process !== page.process ? "process" : tooBig ? "too-big" : "sheet-full",
    sheet: fresh.sheet,
  };
}
