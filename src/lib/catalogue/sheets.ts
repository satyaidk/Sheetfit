/**
 * Print sheets and rolls.
 *
 * Research (reports/Canva UX and print size catalogue.md) showed that A4 covers
 * most mugs and small hard goods, but popular 20/30/40 oz tumblers, licence
 * plates and adult full fronts need A3, US Legal or A3+, and DTF jobs are laid
 * out on 22 in wide gang-sheet rolls. Sheets are therefore data, not a
 * hard-coded A4. Sizes are portrait (width ≤ height) in millimetres.
 */

export type SheetKind = "paper" | "roll" | "custom";

export interface SheetDefinition {
  id: string;
  name: string;
  /** Short label for compact UI. */
  short: string;
  width: number;
  height: number;
  kind: SheetKind;
  /** Which process typically uses it; purely informational. */
  usedFor: string;
}

const IN = 25.4;

export const SHEETS: SheetDefinition[] = [
  { id: "a4", name: "A4", short: "A4", width: 210, height: 297, kind: "paper", usedFor: "Most mugs, coasters, small goods" },
  { id: "letter", name: "US Letter", short: "Letter", width: 8.5 * IN, height: 11 * IN, kind: "paper", usedFor: "US desktop printers" },
  { id: "legal", name: "US Legal", short: "Legal", width: 8.5 * IN, height: 14 * IN, kind: "paper", usedFor: "40 oz tumbler top, licence plates" },
  { id: "a3", name: "A3", short: "A3", width: 297, height: 420, kind: "paper", usedFor: "30 oz tumblers, adult full fronts" },
  { id: "a3plus", name: "A3+ (13 × 19 in)", short: "A3+", width: 13 * IN, height: 19 * IN, kind: "paper", usedFor: "Full backs, 12 in fronts, garden flags" },
  { id: "dtf-22x12", name: "DTF gang sheet 22 × 12 in", short: "22×12", width: 22 * IN, height: 12 * IN, kind: "roll", usedFor: "DTF gang sheet" },
  { id: "dtf-22x24", name: "DTF gang sheet 22 × 24 in", short: "22×24", width: 22 * IN, height: 24 * IN, kind: "roll", usedFor: "DTF gang sheet" },
  { id: "dtf-22x36", name: "DTF gang sheet 22 × 36 in", short: "22×36", width: 22 * IN, height: 36 * IN, kind: "roll", usedFor: "DTF gang sheet" },
  { id: "dtf-22x60", name: "DTF gang sheet 22 × 60 in", short: "22×60", width: 22 * IN, height: 60 * IN, kind: "roll", usedFor: "DTF gang sheet (PDF export)" },
  { id: "dtf-22x120", name: "DTF gang sheet 22 × 120 in", short: "22×120", width: 22 * IN, height: 120 * IN, kind: "roll", usedFor: "DTF gang sheet (PDF export)" },
  { id: "roll-13x19", name: "13 in roll, 19 in long", short: "13×19 roll", width: 13 * IN, height: 19 * IN, kind: "roll", usedFor: "Desktop DTF / sublimation roll" },
];

export const DEFAULT_SHEET_ID = "a4";

export function findSheet(id: string): SheetDefinition | undefined {
  return SHEETS.find((s) => s.id === id);
}

/**
 * Paper sheets in the order they are suggested. A4 comes before US Letter even
 * though Letter is slightly smaller in area: both hold the same products, and
 * A4 is the sheet most sublimation users already stock.
 */
export const PAPER_BY_SIZE = ["a4", "letter", "legal", "a3", "a3plus"].map((id) => SHEETS.find((s) => s.id === id)!);

export type MinSheet = "A4" | "Letter" | "Legal" | "A3" | "A3+" | "roll";

/**
 * Smallest paper sheet (in either orientation, minus margins) that holds a
 * rectangle, or null when only a roll will do.
 */
export function smallestSheetFor(
  size: { width: number; height: number },
  marginMm = 0,
): SheetDefinition | null {
  for (const sheet of PAPER_BY_SIZE) {
    const w = sheet.width - marginMm * 2;
    const h = sheet.height - marginMm * 2;
    const fits =
      (size.width <= w + 1e-6 && size.height <= h + 1e-6) ||
      (size.width <= h + 1e-6 && size.height <= w + 1e-6);
    if (fits) return sheet;
  }
  return null;
}

/** Smallest paper sheet, or failing that the shortest roll, that holds a rectangle. */
export function smallestSheetOrRollFor(
  size: { width: number; height: number },
  marginMm = 0,
): SheetDefinition | null {
  const paper = smallestSheetFor(size, marginMm);
  if (paper) return paper;
  const rolls = SHEETS.filter((s) => s.kind === "roll").sort((a, b) => a.width * a.height - b.width * b.height);
  return (
    rolls.find((s) => {
      const w = s.width - marginMm * 2;
      const h = s.height - marginMm * 2;
      return (size.width <= w && size.height <= h) || (size.width <= h && size.height <= w);
    }) ?? null
  );
}
