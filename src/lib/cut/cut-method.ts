/**
 * How printed stickers are cut, and what each method needs from the sheet.
 *
 * Most people who print stickers at home have no cutting machine and cut by
 * hand, so `hand` is the default for new sticker pages: a thin, visible line
 * is printed along every cut path and the sticker border is painted white, so
 * the line is easy to follow with scissors and nothing is cut into the
 * artwork. Cutting machines read their own registration marks instead; for
 * them Sheetfit prints no line and exports what their software imports.
 *
 * Numbers and their sources (checked 2026-11-27, see docs/catalogue-sources.md):
 * - Hand cutting: print a visible outline, cut just outside it, keep shapes
 *   simple and leave at least 3 mm between stickers (stickerit.co, "How to
 *   make sticker sheets"). Typical borders are 2–4 mm (Atomm); Sticker Mule's
 *   minimum border is 1/16 in.
 * - Cricut Print Then Cut: Design Space prints the sheet itself and adds its
 *   registration marks. Largest image on A4 paper 7.2 × 10.62 in, on Letter
 *   7.44 × 9.94 in (Cricut Help, "How large can I Print Then Cut?", table as
 *   quoted in search results; the page blocks automated reading).
 * - Silhouette Print & Cut: Silhouette Studio adds registration marks in the
 *   top-left, top-right and bottom-left corners; the page setup in Studio
 *   must match the printer's paper size (Silhouette America support).
 */

import type { CutGuideStyle, CutMethod, PageSettings } from "@/types/editor";
import type { Rect } from "@/lib/image/image-fit";
import { pageSize } from "@/lib/layout/sheet-layout";

export const CUT_METHODS: CutMethod[] = ["hand", "cricut", "silhouette", "file"];

export const CUT_METHOD_INFO: Record<CutMethod, { label: string; short: string; hint: string }> = {
  hand: {
    label: "By hand",
    short: "Scissors or craft knife",
    hint: "A thin line is printed around every sticker. Cut just outside it; the white border keeps the blade off the artwork.",
  },
  cricut: {
    label: "Cricut",
    short: "Print Then Cut",
    hint: "No line is printed. Download a transparent PNG for Design Space; Cricut prints its own registration marks and cuts around each sticker's border.",
  },
  silhouette: {
    label: "Silhouette",
    short: "Print & Cut",
    hint: "No line is printed. Download a transparent PNG (or the SVG cut file with Designer Edition); Silhouette Studio adds registration marks in three corners.",
  },
  file: {
    label: "Cutter or print shop",
    short: "SVG / PDF cut lines",
    hint: "No line is printed on the artwork. The SVG and PDF downloads carry every cut path as a vector, kiss or die.",
  },
};

/** Default printed line: black, thin, inside the cut so it stays on the sticker as an even outline. */
export const DEFAULT_CUT_GUIDE: CutGuideStyle = { color: "#000000", width: 0.25, placement: "inside" };

export const GUIDE_WIDTHS: { label: string; width: number }[] = [
  { label: "Hairline", width: 0.1 },
  { label: "Thin", width: 0.25 },
  { label: "Medium", width: 0.4 },
  { label: "Bold", width: 0.75 },
];

export const GUIDE_COLORS: { label: string; color: string }[] = [
  { label: "Black", color: "#000000" },
  { label: "Dark grey", color: "#555555" },
  { label: "Light grey", color: "#b4b4b4" },
];

/** Least clear space between stickers that scissors need (stickerit.co). */
export const HAND_MIN_SPACING_MM = 3;
/** Border added outside the artwork when a sticker outline is traced automatically. */
export const DEFAULT_STICKER_BORDER_MM = 3;

const IN = 25.4;
/** Cricut Print Then Cut largest image, portrait, per paper size (mm). */
export const CRICUT_PRINT_AREA: Record<"a4" | "letter", { width: number; height: number; label: string }> = {
  a4: { width: 7.2 * IN, height: 10.62 * IN, label: "7.2 × 10.62 in" },
  letter: { width: 7.44 * IN, height: 9.94 * IN, label: "7.44 × 9.94 in" },
};

/** Normalise an untrusted cut-method value; old pages (no value) printed no guide, so they get `file`. */
export function cutMethodOf(v: unknown): CutMethod {
  return CUT_METHODS.includes(v as CutMethod) ? (v as CutMethod) : "file";
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Normalise an untrusted guide style (colour, a sane width, placement). */
export function cutGuideOf(v: Partial<CutGuideStyle> | null | undefined): CutGuideStyle {
  const width = typeof v?.width === "number" && Number.isFinite(v.width) ? Math.min(2, Math.max(0.05, v.width)) : DEFAULT_CUT_GUIDE.width;
  return {
    color: typeof v?.color === "string" && HEX.test(v.color) ? v.color : DEFAULT_CUT_GUIDE.color,
    width,
    placement: v?.placement === "centre" ? "centre" : "inside",
  };
}

/** True when this page prints a cutting line around its stickers. */
export function printsCutGuide(page: Pick<PageSettings, "process" | "cutMethod">): boolean {
  return page.process === "sticker" && page.cutMethod === "hand";
}

/** Colour painted inside sticker cut paths on this page, if any. */
export function stickerBorderFill(page: Pick<PageSettings, "process" | "borderFill">): string | null {
  return page.process === "sticker" ? page.borderFill : null;
}

export interface OutlineSettings {
  /** Border between the artwork and the cut, mm. */
  offsetMm: number;
  /** Closing radius, mm: slots narrower than twice this are filled. */
  closeMm: number;
  /** Chaikin smoothing passes. */
  smoothing: number;
  /** Cut inner holes as separate paths. */
  holes: boolean;
  /** Grow the closing until the design is one sticker (hand cutting). */
  mergeIslands: boolean;
}

/**
 * Outline settings for an automatically traced sticker. Hand cutting gets a
 * rounder, simpler outline (no slots under 3 mm, no inner holes, one piece per
 * design); machines can follow finer detail. A border the design already has
 * (a product preset or the user's last choice) is kept.
 */
export function stickerOutlineDefaults(method: CutMethod, currentOffset?: number | null): OutlineSettings {
  const offsetMm = currentOffset != null && currentOffset > 0 ? currentOffset : DEFAULT_STICKER_BORDER_MM;
  return method === "hand"
    ? { offsetMm, closeMm: 1.5, smoothing: 2, holes: false, mergeIslands: true }
    : { offsetMm, closeMm: 0.5, smoothing: 1, holes: false, mergeIslands: false };
}

/**
 * The Cricut Print Then Cut area for the page's paper, centred on the page,
 * or null when the sheet is not A4 or US Letter (Design Space prints those).
 */
export function cricutArea(page: Pick<PageSettings, "sheet" | "customSize" | "orientation">): (Rect & { label: string }) | null {
  const key = page.sheet === "a4" || page.sheet === "letter" ? page.sheet : null;
  if (!key) return null;
  const size = pageSize(page);
  const a = CRICUT_PRINT_AREA[key];
  const landscape = size.width > size.height;
  const w = landscape ? a.height : a.width;
  const h = landscape ? a.width : a.height;
  return { x: (size.width - w) / 2, y: (size.height - h) / 2, width: w, height: h, label: a.label };
}
