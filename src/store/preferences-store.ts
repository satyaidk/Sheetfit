/**
 * Preferences store: theme, density and panel widths for this browser.
 *
 * Kept apart from the editor store on purpose: preferences are not part of a
 * document, have no undo, and survive "Clear and start blank". Every change is
 * written to localStorage and applied to <html> at once (`data-theme`,
 * `data-density`), which is all the CSS needs (`src/app/globals.css`). Rules and
 * validation live in `lib/preferences.ts`.
 */

import { create } from "zustand";
import {
  DEFAULT_PREFERENCES,
  PREFS_KEY,
  parsePreferences,
  resolveTheme,
  serializePreferences,
  type Density,
  type PanelKind,
  type Preferences,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/preferences";

interface PreferencesState extends Preferences {
  /** The theme in use now (the system preference resolved). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  setDensity: (density: Density) => void;
  /** Set a panel width (already clamped by the caller); null restores the default. */
  setPanelWidth: (kind: PanelKind, width: number | null) => void;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemDark(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia?.(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

function load(): Preferences {
  try {
    return typeof localStorage === "undefined" ? { ...DEFAULT_PREFERENCES } : parsePreferences(localStorage.getItem(PREFS_KEY));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function persist(p: Preferences) {
  try {
    localStorage.setItem(PREFS_KEY, serializePreferences(p));
  } catch {
    // Storage refused (private window, quota): the choice still applies to this visit.
  }
}

function apply(theme: ResolvedTheme, density: Density) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-density", density);
}

const initial = load();

export const usePreferences = create<PreferencesState>()((set, get) => {
  const update = (patch: Partial<Preferences>) => {
    const next = { ...pick(get()), ...patch };
    const resolvedTheme = resolveTheme(next.theme, systemDark());
    // The attribute first: subscribers (canvas colours) read the CSS variables it selects.
    apply(resolvedTheme, next.density);
    persist(next);
    set({ ...patch, resolvedTheme });
  };
  return {
    ...initial,
    resolvedTheme: resolveTheme(initial.theme, systemDark()),
    setTheme: (theme) => update({ theme }),
    setDensity: (density) => update({ density }),
    setPanelWidth: (kind, width) => update(kind === "side" ? { sidePanelWidth: width } : { inspectorWidth: width }),
  };
});

function pick(s: PreferencesState): Preferences {
  return { theme: s.theme, density: s.density, sidePanelWidth: s.sidePanelWidth, inspectorWidth: s.inspectorWidth };
}

/**
 * Follow the operating system while the theme is "Match system", and pick up
 * changes made in another tab. Returns the cleanup function.
 */
export function watchPreferences(): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia?.(DARK_QUERY);
  const onSystem = () => {
    const s = usePreferences.getState();
    const resolvedTheme = resolveTheme(s.theme, systemDark());
    apply(resolvedTheme, s.density);
    if (resolvedTheme !== s.resolvedTheme) usePreferences.setState({ resolvedTheme });
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== PREFS_KEY) return;
    const p = parsePreferences(e.newValue);
    const resolvedTheme = resolveTheme(p.theme, systemDark());
    apply(resolvedTheme, p.density);
    usePreferences.setState({ ...p, resolvedTheme });
  };
  mq?.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  onSystem();
  return () => {
    mq?.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}
