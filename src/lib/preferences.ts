/**
 * Interface preferences: colour theme, density and panel widths.
 *
 * Why a module of its own: the same rules run in three places. The blocking
 * script in <head> (`THEME_SCRIPT`) applies the theme before React starts, so
 * the first paint is already dark or light; the preferences store changes them
 * at run time; the tests check both. Values are validated on every read,
 * because localStorage is user-editable and may hold what an older version
 * wrote. Preferences belong to the browser, not to a project: they are never
 * saved into `.sheetfit` files.
 */

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type Density = "comfortable" | "compact";
export type PanelKind = "side" | "inspector";

export interface Preferences {
  theme: ThemePreference;
  density: Density;
  /** Width of the left panel in CSS px; null follows the window (see `defaultPanelWidth`). */
  sidePanelWidth: number | null;
  /** Width of the properties inspector in CSS px; null follows the window. */
  inspectorWidth: number | null;
}

export const PREFS_KEY = "sheetfit:prefs";

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  density: "comfortable",
  sidePanelWidth: null,
  inspectorWidth: null,
};

export const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Match system" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const DENSITIES: { value: Density; label: string; hint: string }[] = [
  { value: "comfortable", label: "Comfortable", hint: "32 px controls, 14 px text" },
  { value: "compact", label: "Compact", hint: "28 px controls, 13 px text" },
];

/**
 * Panel width limits in CSS px. The minimum keeps a two-column product grid
 * readable; the maximum keeps the sheet the largest thing on screen.
 */
export const PANEL_LIMITS: Record<PanelKind, { min: number; max: number }> = {
  side: { min: 264, max: 480 },
  inspector: { min: 280, max: 440 },
};

/** The canvas never gets narrower than this because of a panel the user widened. */
export const MIN_CANVAS_WIDTH = 480;

/** Default widths: narrower panels below 1536 px (ADR 0021), wider on large screens. */
export function defaultPanelWidth(kind: PanelKind, viewportWidth: number): number {
  if (kind === "side") return viewportWidth >= 1536 ? 352 : 304;
  return viewportWidth >= 1536 ? 320 : 296;
}

/**
 * The width a panel may have in a window `viewportWidth` px wide, with
 * `othersWidth` px taken by everything else beside the canvas (the rail and
 * the other panel).
 */
export function clampPanelWidth(kind: PanelKind, width: number, viewportWidth: number, othersWidth = 0): number {
  const { min, max } = PANEL_LIMITS[kind];
  const room = viewportWidth - othersWidth - MIN_CANVAS_WIDTH;
  const upper = Math.max(min, Math.min(max, room));
  if (!Number.isFinite(width)) return defaultPanelWidth(kind, viewportWidth);
  return Math.round(Math.min(upper, Math.max(min, width)));
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  return systemDark ? "dark" : "light";
}

function validWidth(v: unknown, kind: PanelKind): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const { min, max } = PANEL_LIMITS[kind];
  return Math.round(Math.min(max, Math.max(min, v)));
}

/** Read preferences from their stored JSON; anything missing or invalid falls back to the default. */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
  if (!data || typeof data !== "object") return { ...DEFAULT_PREFERENCES };
  const o = data as Record<string, unknown>;
  return {
    theme: o.theme === "light" || o.theme === "dark" || o.theme === "system" ? o.theme : DEFAULT_PREFERENCES.theme,
    density: o.density === "compact" || o.density === "comfortable" ? o.density : DEFAULT_PREFERENCES.density,
    sidePanelWidth: validWidth(o.sidePanelWidth, "side"),
    inspectorWidth: validWidth(o.inspectorWidth, "inspector"),
  };
}

export function serializePreferences(p: Preferences): string {
  return JSON.stringify({
    theme: p.theme,
    density: p.density,
    sidePanelWidth: p.sidePanelWidth,
    inspectorWidth: p.inspectorWidth,
  });
}

/**
 * Blocking script for <head>: sets `data-theme` and `data-density` on <html>
 * before the first paint. It must stay tiny and must never throw (private
 * windows can refuse localStorage), so it falls back to the light theme.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement;try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PREFS_KEY,
)})||"{}")||{};var t=p.theme==="light"||p.theme==="dark"?p.theme:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");d.setAttribute("data-theme",t);d.setAttribute("data-density",p.density==="compact"?"compact":"comfortable")}catch(e){d.setAttribute("data-theme","light");d.setAttribute("data-density","comfortable")}})()`;
