/**
 * v0.11: the design system and the professional shell.
 *
 * - Tokens: every text and control colour pair in both themes meets WCAG 2.2
 *   contrast (4.5:1 text, 3:1 non-text), read straight from globals.css so a
 *   token edit that breaks contrast fails here.
 * - Design lint: editor components use the type ramp and semantic colours, no
 *   one-off pixel sizes or raw hex classes.
 * - Preferences: parsing, validation, panel width limits and the blocking
 *   theme script.
 * - Commands: the fuzzy matcher, shortcut labels, the registry the menu bar and
 *   the command palette share, and the menu structure.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_PREFERENCES,
  MIN_CANVAS_WIDTH,
  PANEL_LIMITS,
  PREFS_KEY,
  THEME_SCRIPT,
  clampPanelWidth,
  defaultPanelWidth,
  parsePreferences,
  resolveTheme,
  serializePreferences,
} from "@/lib/preferences";
import { usePreferences, watchPreferences } from "@/store/preferences-store";
import { matchWord, normalize, rankItems } from "@/lib/commands/fuzzy";
import { ariaShortcut, displayShortcut, isMacPlatform } from "@/lib/commands/shortcuts";
import {
  ALIGN_COMMANDS,
  catalogueCommands,
  commandById,
  commandState,
  editorCommands,
  paletteCommands,
} from "@/lib/commands/editor-commands";
import { MENUS, menuCommandIds } from "@/lib/commands/menus";
import { PRODUCTS } from "@/lib/catalogue/products";
import { SHEETS } from "@/lib/catalogue/sheets";
import { useEditor } from "@/store/editor-store";
import { makeDesign, makeDoc } from "./fixtures";

const ROOT = join(__dirname, "..");
const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

/* ------------------------------------------------------------------------ */
/* Tokens and contrast                                                      */
/* ------------------------------------------------------------------------ */

function tokenBlock(selector: RegExp): Record<string, string> {
  const m = selector.exec(css);
  if (!m) throw new Error(`no block ${selector}`);
  const body = css.slice(m.index + m[0].length, css.indexOf("}", m.index));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((x) => [x[1], x[2]]));
}

const LIGHT = tokenBlock(/:root,\s*\.home\s*\{/);
const DARK = { ...LIGHT, ...tokenBlock(/:root\[data-theme="dark"\]\s*\{/) };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("design tokens", () => {
  it("define the same roles in both themes", () => {
    const darkOnly = tokenBlock(/:root\[data-theme="dark"\]\s*\{/);
    for (const role of ["surface", "surface-raised", "subtle", "subtle-2", "canvas", "line", "line-strong", "line-control", "ink", "ink-muted", "ink-faint", "accent", "accent-soft", "on-accent", "inverse", "on-inverse", "danger", "warn", "ok"]) {
      expect(LIGHT[role], `light --${role}`).toMatch(/^#/);
      expect(darkOnly[role], `dark --${role}`).toMatch(/^#/);
    }
    // Paper is paper: the print sheet stays white in a dark theme.
    expect(LIGHT.paper).toBe("#ffffff");
    expect(darkOnly.paper).toBeUndefined();
  });

  it("measure the WCAG contrast formula correctly", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  for (const [name, t] of [
    ["light", LIGHT],
    ["dark", DARK],
  ] as const) {
    describe(`${name} theme`, () => {
      const surfaces = ["surface", "surface-raised", "subtle", "subtle-2", "canvas", "accent-soft"];
      it("text roles reach 4.5:1 on every surface", () => {
        for (const fg of ["ink", "ink-muted", "ink-faint"])
          for (const bg of surfaces) expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        for (const fg of ["ink", "ink-muted"]) expect(contrast(t[fg], t["control-selected"]), `${fg} on the chosen segment`).toBeGreaterThanOrEqual(4.5);
      });
      it("accent and status colours are readable as text", () => {
        for (const bg of ["surface", "surface-raised", "subtle", "accent-soft"]) expect(contrast(t.accent, t[bg]), `accent on ${bg}`).toBeGreaterThanOrEqual(4.5);
        for (const fg of ["danger", "warn", "ok"]) {
          for (const bg of ["surface", "surface-raised", "subtle"]) expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(t[fg], t[`${fg}-soft`]), `${fg} on ${fg}-soft`).toBeGreaterThanOrEqual(4.5);
        }
      });
      it("text on filled colours reaches 4.5:1", () => {
        expect(contrast(t["on-accent"], t.accent)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t["on-accent"], t["accent-hover"])).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t["on-inverse"], t.inverse)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t["on-danger"], t.danger)).toBeGreaterThanOrEqual(4.5);
      });
      it("control edges and the focus ring reach 3:1 (WCAG 1.4.11)", () => {
        for (const bg of ["surface", "subtle"]) expect(contrast(t["line-control"], t[bg]), `field edge on ${bg}`).toBeGreaterThanOrEqual(3);
        for (const bg of ["surface", "subtle", "subtle-2", "canvas"]) expect(contrast(t.accent, t[bg]), `focus ring on ${bg}`).toBeGreaterThanOrEqual(3);
      });
    });
  }

  it("measurement badges carry white text at 4.5:1", () => {
    expect(contrast("#ffffff", LIGHT["guide-strong"])).toBeGreaterThanOrEqual(4.5);
  });

  it("define the type ramp, with nothing in the editor below 12 px except badges", () => {
    const size = (name: string) => new RegExp(`--text-${name}:\\s*([^;]+);`).exec(css)?.[1].trim();
    expect(size("badge")).toBe("11px");
    expect(size("caption")).toBe("12px");
    expect(size("body")).toBe("var(--fs-body)");
    expect(size("title")).toBe("20px");
    // Density changes body text between 14 and 13 px, never below the caption.
    expect(/--fs-body:\s*14px/.test(css) && /--fs-body:\s*13px/.test(css)).toBe(true);
  });

  it("give compact density smaller controls than comfortable, both at least 24 px (WCAG 2.5.8)", () => {
    const heights = [...css.matchAll(/--control-h(-sm|-lg)?:\s*(\d+)px/g)].map((m) => Number(m[2]));
    expect(heights).toEqual([32, 28, 40, 28, 24, 32]);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(24);
  });
});

/* ------------------------------------------------------------------------ */
/* Design lint                                                              */
/* ------------------------------------------------------------------------ */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "landing" ? [] : sourceFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

describe("design lint (editor components)", () => {
  const files = [...sourceFiles(join(ROOT, "src/components")), ...sourceFiles(join(ROOT, "src/app/editor"))];

  it("covers the editor's components", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("use the type ramp, never one-off pixel sizes", () => {
    const offenders = files.flatMap((f) => [...readFileSync(f, "utf8").matchAll(/text-\[\d+(\.\d+)?(px|rem)\]/g)].map((m) => `${f}: ${m[0]}`));
    expect(offenders).toEqual([]);
  });

  it("use colour roles, never raw hex classes", () => {
    const offenders = files.flatMap((f) => [...readFileSync(f, "utf8").matchAll(/\b(?:bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g)].map((m) => `${f}: ${m[0]}`));
    expect(offenders).toEqual([]);
  });

  it("never pair white text with a theme colour that turns light in dark mode", () => {
    const offenders = files.flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/\bbg-(accent|ink|danger)\b[^"`]*\btext-white\b/g)].map((m) => `${f}: ${m[0].slice(0, 60)}`),
    );
    expect(offenders).toEqual([]);
  });
});

/* ------------------------------------------------------------------------ */
/* Preferences                                                              */
/* ------------------------------------------------------------------------ */

describe("preferences", () => {
  it("fall back to the defaults for missing, broken or foreign data", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("{not json")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("42")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(JSON.stringify({ theme: "sepia", density: "huge", sidePanelWidth: "wide" }))).toEqual(DEFAULT_PREFERENCES);
  });

  it("keep valid choices and clamp stored widths to the panel limits", () => {
    const p = parsePreferences(JSON.stringify({ theme: "dark", density: "compact", sidePanelWidth: 9999, inspectorWidth: 10 }));
    expect(p).toEqual({ theme: "dark", density: "compact", sidePanelWidth: PANEL_LIMITS.side.max, inspectorWidth: PANEL_LIMITS.inspector.min });
    expect(parsePreferences(serializePreferences(p))).toEqual(p);
  });

  it("resolve Match system from the operating system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("size panels for the window and always leave the canvas its minimum", () => {
    expect(defaultPanelWidth("side", 1440)).toBe(304);
    expect(defaultPanelWidth("side", 1920)).toBe(352);
    expect(defaultPanelWidth("inspector", 1366)).toBe(296);
    expect(clampPanelWidth("side", 400, 1920)).toBe(400);
    expect(clampPanelWidth("side", 10, 1920)).toBe(PANEL_LIMITS.side.min);
    expect(clampPanelWidth("side", 900, 1920)).toBe(PANEL_LIMITS.side.max);
    // 1200 px window, rail 72 and inspector 296 open: the side panel may take what is left above 480 px of canvas.
    expect(clampPanelWidth("side", 400, 1200, 72 + 296)).toBe(1200 - 72 - 296 - MIN_CANVAS_WIDTH);
    // Never below the minimum, even when the window is too small for both.
    expect(clampPanelWidth("inspector", 400, 900, 72 + 400)).toBe(PANEL_LIMITS.inspector.min);
    expect(clampPanelWidth("side", Number.NaN, 1440)).toBe(defaultPanelWidth("side", 1440));
  });

  /** Run the blocking <head> script against a fake document, storage and media query. */
  function runThemeScript(stored: string | null, systemDark: boolean, storageThrows = false) {
    const attrs: Record<string, string> = {};
    const document = { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } };
    const localStorage = {
      getItem: (key: string) => {
        if (storageThrows) throw new Error("denied");
        return key === PREFS_KEY ? stored : null;
      },
    };
    const window = { matchMedia: (q: string) => ({ matches: q.includes("dark") && systemDark }) };
    new Function("document", "localStorage", "window", THEME_SCRIPT)(document, localStorage, window);
    return attrs;
  }

  it("apply the saved theme and density before the first paint", () => {
    expect(runThemeScript(null, false)).toEqual({ "data-theme": "light", "data-density": "comfortable" });
    expect(runThemeScript(null, true)).toEqual({ "data-theme": "dark", "data-density": "comfortable" });
    expect(runThemeScript(JSON.stringify({ theme: "light", density: "compact" }), true)).toEqual({ "data-theme": "light", "data-density": "compact" });
    expect(runThemeScript(JSON.stringify({ theme: "dark" }), false)["data-theme"]).toBe("dark");
    // Private windows can refuse storage: the script never throws and falls back to light.
    expect(runThemeScript(null, true, true)).toEqual({ "data-theme": "light", "data-density": "comfortable" });
    expect(runThemeScript("{broken", true)["data-theme"]).toBe("light");
  });

  it("change through the store and survive without browser storage", () => {
    const p = usePreferences.getState();
    p.setTheme("dark");
    p.setDensity("compact");
    p.setPanelWidth("side", 333);
    expect(usePreferences.getState()).toMatchObject({ theme: "dark", resolvedTheme: "dark", density: "compact", sidePanelWidth: 333 });
    p.setTheme("system");
    expect(usePreferences.getState().resolvedTheme).toBe("light");
    p.setPanelWidth("side", null);
    p.setDensity("comfortable");
    expect(usePreferences.getState().sidePanelWidth).toBeNull();
    // Outside a browser there is nothing to watch; the cleanup still works.
    expect(() => watchPreferences()()).not.toThrow();
  });
});

/* ------------------------------------------------------------------------ */
/* Fuzzy search                                                             */
/* ------------------------------------------------------------------------ */

describe("fuzzy search", () => {
  it("ranks the kinds of match the way people expect", () => {
    const score = (q: string, t: string) => matchWord(q, t)?.score ?? 0;
    expect(score("undo", "Undo")).toBe(100);
    expect(score("fil", "Fill sheet")).toBe(80);
    expect(score("sheet", "Fill sheet")).toBe(64);
    expect(score("fs", "Fill sheet with copies")).toBe(52);
    expect(score("eet", "Fill sheet")).toBe(40);
    expect(score("mrr", "Mirror output")).toBeGreaterThan(10);
    expect(score("xyz", "Fill sheet")).toBe(0);
    // Two-letter fragments only match as prefixes, initials or substrings (no noise).
    expect(matchWord("fq", "Fill sheet")).toBeNull();
  });

  it("finds a digit-letter boundary as a word start (A3, 22in)", () => {
    expect(matchWord("in", "22in roll")?.score).toBe(64);
    expect(matchWord("3", "A3 sheet")?.score).toBe(64);
  });

  it("ignores case and accents", () => {
    expect(normalize("Crème Brûlée")).toBe("creme brulee");
    expect(matchWord("creme", "Crème mug")?.score).toBe(80);
  });

  it("requires every word, orders by score, then by shorter title, then by input order", () => {
    const items = [{ title: "Show grid" }, { title: "Fill sheet with copies" }, { title: "Fill sheet" }, { title: "Sheet size" }];
    expect(rankItems("fill", items).map((r) => r.item.title)).toEqual(["Fill sheet", "Fill sheet with copies"]);
    expect(rankItems("fill copies", items).map((r) => r.item.title)).toEqual(["Fill sheet with copies"]);
    expect(rankItems("", items).map((r) => r.item.title)).toEqual(items.map((i) => i.title));
    expect(rankItems("zzz", items)).toEqual([]);
  });

  it("searches keywords and groups at a lower weight, highlighting only the title", () => {
    const items = [
      { title: "Download for print…", keywords: ["pdf", "export"], group: "File" },
      { title: "PDF guide", group: "Help" },
    ];
    const ranked = rankItems("pdf", items);
    expect(ranked[0].item.title).toBe("PDF guide");
    expect(ranked[1].ranges).toEqual([]);
    expect(rankItems("file", items).map((r) => r.item.title)).toEqual(["Download for print…"]);
    const [first] = rankItems("sheet fill", [{ title: "Fill sheet" }]);
    expect(first.ranges).toEqual([
      [0, 4],
      [5, 10],
    ]);
  });

  it("gives a bonus when the whole query starts the title", () => {
    const [a, b] = rankItems("fill sheet", [{ title: "Sheet fill" }, { title: "Fill sheet" }]);
    expect(a.item.title).toBe("Fill sheet");
    expect(a.score).toBeGreaterThan(b.score);
  });
});

/* ------------------------------------------------------------------------ */
/* Shortcut labels                                                          */
/* ------------------------------------------------------------------------ */

describe("shortcut labels", () => {
  it("show the platform's way", () => {
    expect(displayShortcut("Ctrl Shift Z", false)).toBe("Ctrl+Shift+Z");
    expect(displayShortcut("Ctrl Shift Z", true)).toBe("⌘⇧Z");
    expect(displayShortcut("Alt Shift L", true)).toBe("⌥⇧L");
    expect(displayShortcut("?", false)).toBe("?");
    // Formatting twice changes nothing (tooltips format what callers pass).
    expect(displayShortcut(displayShortcut("Ctrl K", false), false)).toBe("Ctrl+K");
    expect(displayShortcut(displayShortcut("Ctrl K", true), true)).toBe("⌘K");
  });

  it("produce aria-keyshortcuts values", () => {
    expect(ariaShortcut("Ctrl Shift Z", false)).toBe("Control+Shift+Z");
    expect(ariaShortcut("Ctrl K", true)).toBe("Meta+K");
    expect(ariaShortcut("Esc", false)).toBe("Escape");
  });

  it("detect no Mac outside a browser", () => {
    expect(isMacPlatform()).toBe(false);
  });
});

/* ------------------------------------------------------------------------ */
/* Command registry and menus                                               */
/* ------------------------------------------------------------------------ */

const s = () => useEditor.getState();

describe("command registry", () => {
  beforeEach(() => {
    s().newProject();
    useEditor.setState({ dialog: null, leaveIntent: null, viewport: { width: 1200, height: 800 } });
    usePreferences.getState().setTheme("system");
    usePreferences.getState().setDensity("comfortable");
  });

  it("has unique ids, a title and a group for every command", () => {
    const all = [...editorCommands(), ...catalogueCommands()];
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    for (const c of all) {
      expect(c.title.length, c.id).toBeGreaterThan(1);
      expect(c.group, c.id).toBeTruthy();
    }
  });

  it("offers every product template and sheet size in the palette", () => {
    const cat = catalogueCommands();
    expect(cat.filter((c) => c.group === "Products")).toHaveLength(PRODUCTS.length);
    expect(cat.filter((c) => c.group === "Sheet sizes")).toHaveLength(SHEETS.length);
    const a4 = commandById(cat, "sheet.a4");
    expect(a4.checked).toBe(s().doc.page.sheet === "a4");
  });

  it("follows the editor state: nothing to undo, export or fill on an empty sheet", () => {
    const c = editorCommands();
    for (const id of ["edit.undo", "edit.redo", "edit.copy", "edit.paste", "file.export", "file.print", "arrange.fill", "arrange.auto"])
      expect(commandById(c, id).enabled, id).toBe(false);
    expect(commandById(c, "file.new").enabled).toBe(true);
    // The palette lists only what can run now.
    expect(paletteCommands().some((x) => x.id === "edit.undo")).toBe(false);
  });

  it("enables the design commands once a design is selected", () => {
    const d = makeDesign({ id: "a", x: 20, y: 20, width: 40, height: 40 });
    s().commit(makeDoc([d], { sheet: "a4" }));
    s().select(["a"]);
    const c = editorCommands();
    for (const id of ["edit.undo", "edit.copy", "edit.duplicate", "edit.delete", "file.export", "arrange.fill", "arrange.rotate", ...ALIGN_COMMANDS.map((a) => `arrange.align.${a.target}`)])
      expect(commandById(c, id).enabled, id).toBe(true);
    expect(commandById(c, "edit.group").enabled).toBe(false);
    expect(commandById(c, "edit.lock").title).toBe("Lock");
  });

  it("runs commands against the current store state", () => {
    const d = makeDesign({ id: "a", x: 20, y: 20, width: 40, height: 40 });
    s().commit(makeDoc([d], { sheet: "a4", showGrid: false, process: "sublimation" }));
    s().select(["a"]);
    const c = editorCommands();
    commandById(c, "view.grid").run();
    expect(s().doc.page.showGrid).toBe(true);
    commandById(c, "sheet.process.dtf").run();
    expect(s().doc.page.process).toBe("dtf");
    commandById(c, "sheet.mirror.off").run();
    expect(s().doc.page.mirrorMode).toBe("off");
    commandById(c, "arrange.rotate").run();
    expect(s().doc.designs[0].rotation).toBe(90);
    commandById(c, "edit.lock").run();
    expect(s().doc.designs[0].locked).toBe(true);
    expect(commandById(editorCommands(), "edit.lock").title).toBe("Unlock");
    commandById(c, "help.palette").run();
    expect(s().dialog).toBe("commands");
    commandById(c, "edit.undo").run();
    expect(s().doc.designs[0].locked).toBe(false);
    commandById(c, "view.theme.dark").run();
    expect(usePreferences.getState().resolvedTheme).toBe("dark");
    expect(commandById(editorCommands(), "view.theme.dark").checked).toBe(true);
    commandById(c, "view.density.compact").run();
    expect(commandState().density).toBe("compact");
  });

  it("moves between pages and panels", () => {
    commandById(editorCommands(), "page.add").run();
    expect(s().pages).toHaveLength(2);
    expect(s().activePage).toBe(1);
    const c = editorCommands();
    expect(commandById(c, "page.next").enabled).toBe(false);
    commandById(c, "page.previous").run();
    expect(s().activePage).toBe(0);
    expect(commandById(editorCommands(), "page.go.1").enabled).toBe(true);
    s().setPanelOpen(false);
    commandById(editorCommands(), "panel.layers").run();
    expect(s().panelOpen).toBe(true);
    expect(s().sidebarTab).toBe("layers");
  });

  it("finds what people type: a product, a sheet, an action", () => {
    const all = [...editorCommands(), ...catalogueCommands()];
    expect(rankItems("fill", all)[0].item.id).toBe("arrange.fill");
    expect(rankItems("dark", all)[0].item.id).toBe("view.theme.dark");
    expect(rankItems("a3", all)[0].item.id).toBe("sheet.a3");
    expect(rankItems("mug", all)[0].item.group).toBe("Products");
    expect(rankItems("export pdf", all)[0].item.id).toBe("file.export");
  });
});

describe("menus", () => {
  it("refer only to commands that exist, each once", () => {
    const ids = menuCommandIds();
    const known = new Set(editorCommands().map((c) => c.id));
    expect(ids.filter((id) => !known.has(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("follow the desktop order File, Edit, View, Sheet, Arrange, Help", () => {
    expect(MENUS.map((m) => m.label)).toEqual(["File", "Edit", "View", "Sheet", "Arrange", "Help"]);
  });

  it("leave no action command out of both the menus and the palette", () => {
    const inMenus = new Set(menuCommandIds());
    const actions = editorCommands().filter((c) => !["Panels", "Pages"].includes(c.group) && !c.id.startsWith("page.go."));
    // Everything not in a menu is still reachable from the palette (it is in the registry); the menus hold the rest.
    const missing = actions.filter((c) => !inMenus.has(c.id)).map((c) => c.id);
    expect(missing).toEqual([]);
  });
});
