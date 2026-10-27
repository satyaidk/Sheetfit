import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class lists, letting later classes win (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let cachedFont: string | null = null;

/**
 * The UI font family as resolved by the browser. Canvas text (rulers, Konva
 * labels) cannot use CSS variables, and next/font hashes the family name.
 */
export function uiFontFamily(): string {
  if (typeof document === "undefined") return "system-ui, sans-serif";
  cachedFont ??= getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  return cachedFont;
}
