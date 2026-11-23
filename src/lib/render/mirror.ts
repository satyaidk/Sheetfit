/**
 * The whole-sheet output mirror, decided in one place.
 *
 * Sublimation transfers are printed mirror-image so they read correctly once
 * pressed face-down; DTF film and sticker media print as seen. Users whose
 * printer driver already mirrors (or who need the opposite for a particular
 * blank) override the process default with `on` or `off`. Every output (PDF,
 * PNG, JPEG, browser print, cut files) reads the resolved value from the render
 * plan and applies it exactly once, around the page's vertical centre line.
 *
 * A web page cannot read or change a printer driver's own mirror checkbox, so
 * the UI explains what to set there (`driverAdvice`).
 */

import type { MirrorMode, PageSettings, PrintProcess } from "@/types/editor";

/** Process defaults: unchanged from earlier versions for sublimation and DTF. */
export function processMirrorDefault(process: PrintProcess): boolean {
  return process === "sublimation";
}

/** The effective mirror for a page. */
export function resolveMirror(page: Pick<PageSettings, "process" | "mirrorMode">): boolean {
  if (page.mirrorMode === "on") return true;
  if (page.mirrorMode === "off") return false;
  return processMirrorDefault(page.process);
}

/**
 * Mode that reproduces a stored boolean exactly: `auto` when it equals the
 * process default, else an explicit override. Used to migrate older projects
 * so they print exactly as before.
 */
export function mirrorModeFor(process: PrintProcess, mirrored: boolean): MirrorMode {
  if (mirrored === processMirrorDefault(process)) return "auto";
  return mirrored ? "on" : "off";
}

export const MIRROR_LABELS: Record<MirrorMode, string> = {
  auto: "Process default",
  on: "Mirror on",
  off: "Mirror off",
};

/** One-line explanation of the effective setting and what to do in the driver. */
export function driverAdvice(page: Pick<PageSettings, "process" | "mirrorMode">): string {
  const mirrored = resolveMirror(page);
  const source = page.mirrorMode === "auto" ? "by the process default" : "by your choice";
  return mirrored
    ? `Sheetfit mirrors this output (${source}). Turn mirroring OFF in the printer driver, or it flips back.`
    : `Sheetfit does not mirror this output (${source}). If the transfer must be mirrored, turn mirroring ON in the printer driver instead.`;
}
