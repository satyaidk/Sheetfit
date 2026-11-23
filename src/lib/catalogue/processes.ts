/**
 * Print processes as shown to users. Kept as data so every label and hint
 * reads the same across the header, the sheet panel and dialogs.
 */

import type { PrintProcess } from "@/types/editor";

export const PROCESS_LABELS: Record<PrintProcess, string> = {
  sublimation: "Sublimation",
  dtf: "DTF",
  sticker: "Stickers",
};

export const PROCESS_HINTS: Record<PrintProcess, string> = {
  sublimation: "Mirrored transfer paper",
  dtf: "Not mirrored, transparent PNG",
  sticker: "Print-and-cut, not mirrored",
};

export const PROCESS_ORDER: PrintProcess[] = ["sublimation", "dtf", "sticker"];
