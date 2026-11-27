import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge told about the design system's own scales (globals.css):
 * without this it reads `text-body` as a text colour and drops it next to
 * `text-ink`, and treats `shadow-pop` as a shadow colour.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["badge", "caption", "body", "subtitle", "title", "title-lg", "display"],
      shadow: ["card", "raised", "bar", "pop", "float", "dialog"],
    },
  },
});

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
