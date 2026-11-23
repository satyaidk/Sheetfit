/**
 * Strip layouts on continuous roll stock: white polyester sublimation lanyard
 * ribbon.
 *
 * The roll is raw material, not a finished product: artwork is printed in
 * repeating segments along it, and the printed ribbon is cut into ID-card
 * lanyard straps or keychain wristlet straps. These are two finished uses of
 * one material, so there is one roll profile and two layout presets that
 * reference it.
 *
 * No standard width or length is assumed. Sheetfit could not verify a
 * supplier's ribbon width or roll length (see docs/catalogue-sources.md), so
 * every number comes from the user and is marked as user-entered. The values
 * stay separate on purpose: roll width, usable printable width, edge margin,
 * segment (cut) length, repeat gap and the end zone kept clear for hardware.
 */

import type { Design, PageSettings } from "@/types/editor";

export interface StripProfile {
  name: string;
  /** Physical ribbon width, mm (user-entered). */
  rollWidth: number;
  /** Printable width across the ribbon, mm; must be ≤ rollWidth. */
  printableWidth: number;
  /** Length of one finished strap before folding or crimping, mm. */
  segmentLength: number;
  /** Blank space between segments along the roll, mm (0 = cut on a shared line). */
  repeatGap: number;
  /** Keep artwork this far from each cut end (hooks, crimps, fold overlap), mm. Guide only. */
  endZone: number;
  /** Margin before the first and after the last segment, mm. */
  leadIn: number;
  /** Where these numbers came from. Built-in presets are blank until the user fills them. */
  origin: "user";
}

export type StripUse = "id-lanyard" | "keychain-wristlet";

export const STRIP_USES: Record<StripUse, { label: string; hint: string }> = {
  "id-lanyard": {
    label: "ID-card lanyard strap",
    hint: "Neck strap for an ID card. Enter the cut length your hardware needs, including any fold or overlap.",
  },
  "keychain-wristlet": {
    label: "Keychain wristlet strap",
    hint: "Short strap folded through a keyring clamp. Enter the cut length for your clamp, including the fold.",
  },
};

export interface StripProblem {
  field: keyof StripProfile | "count" | "sectionLength";
  message: string;
}

/** Check a profile; every number must be entered and consistent. */
export function validateStrip(p: Partial<StripProfile>, count: number, sectionLength: number): StripProblem[] {
  const out: StripProblem[] = [];
  const pos = (v: number | undefined) => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (!pos(p.rollWidth)) out.push({ field: "rollWidth", message: "Enter the ribbon width from your supplier." });
  if (!pos(p.printableWidth)) out.push({ field: "printableWidth", message: "Enter the printable width across the ribbon." });
  else if (pos(p.rollWidth) && p.printableWidth! > p.rollWidth!) out.push({ field: "printableWidth", message: "The printable width cannot exceed the ribbon width." });
  if (!pos(p.segmentLength)) out.push({ field: "segmentLength", message: "Enter the cut length of one strap." });
  if ((p.repeatGap ?? 0) < 0) out.push({ field: "repeatGap", message: "The gap cannot be negative." });
  if ((p.leadIn ?? 0) < 0) out.push({ field: "leadIn", message: "The lead-in cannot be negative." });
  if (pos(p.segmentLength) && (p.endZone ?? 0) * 2 >= p.segmentLength!) out.push({ field: "endZone", message: "The end zones leave no room for artwork." });
  if (!(Number.isInteger(count) && count >= 1 && count <= 1000)) out.push({ field: "count", message: "Enter how many straps (1–1000)." });
  if (!(sectionLength > 0)) out.push({ field: "sectionLength", message: "Enter the longest section you can print in one go." });
  else if (pos(p.segmentLength) && sectionLength < p.segmentLength! + 2 * (p.leadIn ?? 0)) out.push({ field: "sectionLength", message: "One strap does not fit in a section of this length." });
  else if (out.length === 0) {
    const pages = stripPageCount(p as StripProfile, count, sectionLength);
    if (pages > MAX_STRIP_PAGES)
      out.push({ field: "sectionLength", message: `That makes ${pages} pages; the limit is ${MAX_STRIP_PAGES}. Use longer sections or fewer straps.` });
  }
  return out;
}

/** Most pages one strip layout may create. */
export const MAX_STRIP_PAGES = 50;

function perSection(p: StripProfile, sectionLength: number): number {
  const pitch = p.segmentLength + p.repeatGap;
  return Math.max(1, Math.floor((sectionLength - 2 * p.leadIn + p.repeatGap) / pitch));
}

/** Pages (sections) a layout needs. */
export function stripPageCount(p: StripProfile, count: number, sectionLength: number): number {
  return Number.isFinite(sectionLength) ? Math.ceil(count / perSection(p, sectionLength)) : 1;
}

export interface StripSection {
  page: Pick<PageSettings, "sheet" | "customSize" | "orientation" | "margins">;
  /** Segment boxes in page mm (width = printable width, centred across the ribbon). */
  segments: { x: number; y: number; width: number; height: number }[];
}

/**
 * Lay out `count` straps along the roll, split into sections no longer than
 * `sectionLength` (one page each). The page is the ribbon itself: its width
 * is the roll width and its length the working length of that section.
 */
export function planStrip(p: StripProfile, count: number, sectionLength: number): StripSection[] {
  const pitch = p.segmentLength + p.repeatGap;
  const per = Number.isFinite(sectionLength) ? perSection(p, sectionLength) : count;
  const sections: StripSection[] = [];
  for (let start = 0; start < count; start += per) {
    const n = Math.min(per, count - start);
    const length = 2 * p.leadIn + n * p.segmentLength + (n - 1) * p.repeatGap;
    const x = (p.rollWidth - p.printableWidth) / 2;
    sections.push({
      page: {
        sheet: "custom",
        // Custom sizes are stored portrait (width ≤ height); a strip is always taller than wide.
        customSize: { width: Math.min(p.rollWidth, length), height: Math.max(p.rollWidth, length) },
        orientation: p.rollWidth <= length ? "portrait" : "landscape",
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
      },
      segments: Array.from({ length: n }, (_, i) => ({
        x,
        y: p.leadIn + i * pitch,
        width: p.printableWidth,
        height: p.segmentLength,
      })),
    });
  }
  return sections;
}

/** Design fields for one strap segment (an empty slot with a cut guide at each end). */
export function stripSegmentDesign(p: StripProfile, use: StripUse, index: number): Partial<Design> {
  return {
    name: `${STRIP_USES[use].label} ${index + 1}`,
    fitMode: "cover",
    cut: { shape: "rect", radius: 0, offset: 0, through: "die", safeInset: p.endZone, contour: null },
  };
}

const STORAGE_KEY = "sheetfit:strip-profiles";

/** Saved user profiles (this browser only). Never throws. */
export function loadStripProfiles(storage: Pick<Storage, "getItem"> | undefined): StripProfile[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((x) => x && typeof x.name === "string" && validateStrip(x, 1, Infinity).length === 0).map((x) => ({ ...x, origin: "user" }))
      : [];
  } catch {
    return [];
  }
}

export function saveStripProfiles(storage: Pick<Storage, "setItem"> | undefined, list: StripProfile[]): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(list));
    return !!storage;
  } catch {
    return false;
  }
}
