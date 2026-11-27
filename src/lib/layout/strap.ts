/**
 * Lanyard and keychain straps printed on white sublimation ribbon, laid out
 * on ordinary sheets (A4 transfer paper).
 *
 * The usual home workflow: print strips the width of the ribbon on
 * sublimation paper, lay cut pieces of white polyester (satin) ribbon on the
 * strips and press. So each strap is a box exactly one ribbon wide and one
 * cut length long, and the sheet is filled with as many as fit
 * (`lib/layout/fill.ts`), mirrored like any sublimation transfer.
 *
 * Widths: white sublimation lanyard ribbon is sold in 12, 16 and 20 mm
 * (IndiaMART listings checked 2026-11-26: 16 mm and 20 mm white satin rolls
 * of 50–101 m, 12 mm sublimation lanyard tape); any other width can be typed.
 * The cut length depends on the user's clamp or hook and is never assumed:
 * no source publishes a standard keychain strap length.
 *
 * Folded straps: a keychain strap is folded at its middle around the ring and
 * clamped at both ends. Unfolded, its two halves run in opposite directions,
 * so to read upright on both faces the second half carries the artwork turned
 * 180°. `fold` does exactly that.
 *
 * This module is pure: it plans where the artwork goes inside the strap box
 * (box millimetres, origin top-left, the strap running top to bottom); the
 * browser draws that plan into one image per strap design.
 */

import type { Design, StrapInfo } from "@/types/editor";
import type { Rect } from "@/lib/image/image-fit";
import type { ProductPreset } from "@/lib/catalogue/products";

/** Quick-pick ribbon widths in mm (see the module comment for the source). */
export const RIBBON_WIDTHS = [12, 16, 20] as const;

export interface StrapSpec extends Omit<StrapInfo, "sourceAssetId"> {
  /** Ribbon width = strip width, mm. */
  width: number;
  /** Cut length of one strap, mm (user-entered). */
  length: number;
}

export interface StrapProblem {
  field: "width" | "length" | "endZone";
  message: string;
}

export function validateStrap(spec: Partial<StrapSpec>): StrapProblem[] {
  const out: StrapProblem[] = [];
  const pos = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (!pos(spec.width)) out.push({ field: "width", message: "Pick or type the ribbon width." });
  else if (spec.width > 100) out.push({ field: "width", message: "Ribbon wider than 100 mm is not a strap; use a product box instead." });
  if (!pos(spec.length)) out.push({ field: "length", message: "Enter the cut length of one strap (measure yours, including the fold and the clamp)." });
  else if (pos(spec.width) && spec.length < spec.width) out.push({ field: "length", message: "The strap must be longer than it is wide." });
  const zone = spec.endZone ?? 0;
  if (zone < 0) out.push({ field: "endZone", message: "The end zone cannot be negative." });
  else if (pos(spec.length)) {
    const usable = spec.length - 2 * zone;
    if (usable <= (spec.fold ? 2 : 1) * 2) out.push({ field: "endZone", message: "The end zones leave no room for artwork." });
  }
  return out;
}

/** A place the artwork is drawn, in strap-box millimetres. */
export interface ArtPlacement {
  /** Rectangle the (possibly turned) artwork occupies. */
  rect: Rect;
  /** Turn of the artwork inside `rect`, degrees clockwise (0, 90, 180, 270). */
  rotation: number;
  /** Fill the rectangle, cropping the artwork's excess (mode "fill"). */
  cover: boolean;
}

/**
 * Sections of the strap that carry artwork: one, or two when folded (the
 * second turned 180°). End zones are kept clear at both cut ends.
 */
export function strapSections(spec: StrapSpec): { rect: Rect; rotation: number }[] {
  const zone = Math.max(0, spec.endZone);
  if (!spec.fold) return [{ rect: { x: 0, y: zone, width: spec.width, height: spec.length - 2 * zone }, rotation: 0 }];
  const half = spec.length / 2;
  return [
    { rect: { x: 0, y: zone, width: spec.width, height: half - zone }, rotation: 0 },
    { rect: { x: 0, y: half, width: spec.width, height: half - zone }, rotation: 180 },
  ];
}

/** Gap between repeats, as a share of the artwork's length along the strap. */
export const REPEAT_GAP = 0.25;

/**
 * Where the artwork goes. `art` is the artwork's aspect (width / height). With
 * `along`, the artwork is turned 90° so its width runs along the strap, the
 * way lanyard text is printed.
 */
export function strapArtPlacements(spec: StrapSpec, artAspect: number): ArtPlacement[] {
  const out: ArtPlacement[] = [];
  const aspect = artAspect > 0 && Number.isFinite(artAspect) ? artAspect : 1;
  for (const section of strapSections(spec)) {
    const s = section.rect;
    if (s.width <= 0 || s.height <= 0) continue;
    // Artwork size as laid on the strap (before the section's own turn).
    const turn = spec.along ? 90 : 0;
    // On-strap aspect: width across the strap / length along it.
    const laid = spec.along ? 1 / aspect : aspect;
    const rot = (turn + section.rotation) % 360;
    if (spec.mode === "fill") {
      out.push({ rect: { ...s }, rotation: rot, cover: true });
      continue;
    }
    // Fit inside the section: across the strap first, then along.
    let w = s.width;
    let h = w / laid;
    if (h > s.height) {
      h = s.height;
      w = h * laid;
    }
    if (spec.mode === "once") {
      out.push({ rect: { x: s.x + (s.width - w) / 2, y: s.y + (s.height - h) / 2, width: w, height: h }, rotation: rot, cover: false });
      continue;
    }
    // Repeat along the section, evenly spaced, at the full strap width.
    const pitch = h * (1 + REPEAT_GAP);
    const n = Math.max(1, Math.floor((s.height + h * REPEAT_GAP) / pitch));
    const used = n * h + (n - 1) * h * REPEAT_GAP;
    const start = s.y + (s.height - used) / 2;
    for (let i = 0; i < n; i++) {
      out.push({ rect: { x: s.x + (s.width - w) / 2, y: start + i * pitch, width: w, height: h }, rotation: rot, cover: false });
    }
  }
  return out;
}

/** Fields of a strap design (an empty box until the artwork is composed into it). */
export function strapDesign(spec: StrapSpec, sourceAssetId: string | null = null): Partial<Design> & Pick<Design, "width" | "height"> {
  return {
    name: `Strap ${+spec.width.toFixed(1)} × ${+spec.length.toFixed(1)} mm`,
    width: spec.width,
    height: spec.length,
    fitMode: "fill",
    lockAspect: true,
    lockRotation: false,
    strap: { fold: spec.fold, endZone: spec.endZone, mode: spec.mode, along: spec.along, sourceAssetId },
  };
}

/** Pixel size of a strap image at `dpi` (capped so very long straps stay reasonable). */
export function strapImageSize(spec: Pick<StrapSpec, "width" | "length">, dpi = 600): { width: number; height: number } {
  const k = dpi / 25.4;
  const scale = Math.min(1, 12000 / (spec.length * k));
  return { width: Math.max(1, Math.round(spec.width * k * scale)), height: Math.max(1, Math.round(spec.length * k * scale)) };
}

/**
 * A product description for one strap, for the 3D preview (straps are not
 * catalogue products: their length is the user's).
 */
export function strapPreset(width: number, length: number): ProductPreset {
  return {
    id: "strap",
    name: "Keychain strap",
    detail: `${+width.toFixed(1)} mm ribbon`,
    group: "keyring",
    processes: ["sublimation"],
    width,
    height: length,
    shape: "rect",
    wrap: false,
    bleed: 0,
    art: "strap",
    confidence: "high",
    source: "https://m.indiamart.com/impcat/lanyard-rolls.html",
    note: "Width and length are your own.",
  };
}

const STORAGE_KEY = "sheetfit:strap";

/** Last strap settings (this browser only); never throws. */
export function loadStrapSpec(storage: Pick<Storage, "getItem"> | undefined): Partial<StrapSpec> {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function saveStrapSpec(storage: Pick<Storage, "setItem"> | undefined, spec: StrapSpec): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(spec));
  } catch {
    /* storage unavailable: settings are simply not remembered */
  }
}
