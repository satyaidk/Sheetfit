"use client";

/**
 * Theme colours for code that draws on a <canvas> (rulers, Konva overlays),
 * where CSS classes cannot reach. Read from the CSS custom properties of the
 * current theme, so canvases follow light and dark like the rest of the UI;
 * the token values themselves live only in `src/app/globals.css`.
 */

import { useMemo } from "react";
import { usePreferences } from "@/store/preferences-store";

export interface ThemeColors {
  surface: string;
  subtle: string;
  subtle2: string;
  line: string;
  lineStrong: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  accent: string;
  accentSoft: string;
}

const FALLBACK: ThemeColors = {
  surface: "#ffffff",
  subtle: "#f5f6f8",
  subtle2: "#eceef1",
  line: "#e3e6ea",
  lineStrong: "#cfd4da",
  ink: "#1b1f24",
  inkMuted: "#4f5761",
  inkFaint: "#5f6770",
  accent: "#077d89",
  accentSoft: "#eef8f9",
};

export function readThemeColors(): ThemeColors {
  if (typeof document === "undefined") return FALLBACK;
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    surface: v("--surface", FALLBACK.surface),
    subtle: v("--subtle", FALLBACK.subtle),
    subtle2: v("--subtle-2", FALLBACK.subtle2),
    line: v("--line", FALLBACK.line),
    lineStrong: v("--line-strong", FALLBACK.lineStrong),
    ink: v("--ink", FALLBACK.ink),
    inkMuted: v("--ink-muted", FALLBACK.inkMuted),
    inkFaint: v("--ink-faint", FALLBACK.inkFaint),
    accent: v("--accent", FALLBACK.accent),
    accentSoft: v("--accent-soft", FALLBACK.accentSoft),
  };
}

/** Colours of the theme in use; recomputed when the theme changes. */
export function useThemeColors(): ThemeColors {
  const theme = usePreferences((s) => s.resolvedTheme);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the theme attribute changes what getComputedStyle returns
  return useMemo(() => readThemeColors(), [theme]);
}
