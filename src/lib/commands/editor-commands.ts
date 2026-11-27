/**
 * The editor's command registry: every action the menu bar and the command
 * palette (Ctrl+K) offer, defined once.
 *
 * Why a registry: a professional editor exposes the same action in several
 * places (menu, palette, toolbar, shortcut). Defining each action once keeps
 * their names, shortcuts, enabled states and behaviour identical everywhere,
 * and makes them testable without rendering anything. `run` always reads the
 * store when it runs, so a command built a moment ago never acts on stale
 * state. Keyboard handling itself stays in `use-editor-shortcuts.ts`; the
 * `shortcut` here is the label shown next to the command.
 */

import { useEditor, type EditorState, type SidebarTab } from "@/store/editor-store";
import { usePreferences } from "@/store/preferences-store";
import { PRODUCTS, minSheetFor } from "@/lib/catalogue/products";
import { SHEETS } from "@/lib/catalogue/sheets";
import { PROCESS_LABELS, PROCESS_ORDER } from "@/lib/catalogue/processes";
import { DENSITIES, THEMES, type Density, type ThemePreference } from "@/lib/preferences";
import type { AlignTarget } from "@/lib/layout/alignment";
import type { MirrorMode } from "@/types/editor";
import { sheetLabel } from "@/lib/layout/sheet-layout";
import { safeFilename } from "@/lib/export/export-raster";
import {
  changeSheet,
  chooseAndImportProject,
  chooseAndUploadImages,
  exportProjectFile,
  fillSheetWith,
  requestLeave,
  requestProduct,
  saveCurrentProject,
} from "@/lib/editor-actions";

export type CommandGroup =
  | "File"
  | "Edit"
  | "View"
  | "Sheet"
  | "Arrange"
  | "Help"
  | "Panels"
  | "Pages"
  | "Products"
  | "Sheet sizes";

export interface Command {
  /** Stable id ("file.save"); menus and tests refer to commands by id. */
  id: string;
  title: string;
  group: CommandGroup;
  /** Extra words people search with ("export", "pdf"). */
  keywords?: string[];
  /** Shortcut label, Windows style ("Ctrl S"); shown the platform's way. */
  shortcut?: string;
  /** One line of context in the palette (a product's size, a sheet's use). */
  hint?: string;
  enabled: boolean;
  /** Toggles and choices: on now. */
  checked?: boolean;
  /** Destructive: drawn in the danger colour. */
  danger?: boolean;
  run: () => void;
}

const editor = () => useEditor.getState();
const prefs = () => usePreferences.getState();

export const ALIGN_COMMANDS: { target: AlignTarget; title: string }[] = [
  { target: "left", title: "Align left" },
  { target: "center-x", title: "Align centre" },
  { target: "right", title: "Align right" },
  { target: "top", title: "Align top" },
  { target: "center-y", title: "Align middle" },
  { target: "bottom", title: "Align bottom" },
];

export const MIRROR_CHOICES: { value: MirrorMode; title: string }[] = [
  { value: "auto", title: "Mirror output: Auto (by process)" },
  { value: "on", title: "Mirror output: On" },
  { value: "off", title: "Mirror output: Off" },
];

const PANEL_TITLES: { tab: SidebarTab; title: string; keywords: string[] }[] = [
  { tab: "products", title: "Show product templates", keywords: ["mug", "tumbler", "template", "catalogue"] },
  { tab: "designs", title: "Show sample designs", keywords: ["samples", "artwork"] },
  { tab: "uploads", title: "Show uploads", keywords: ["images", "files"] },
  { tab: "layers", title: "Show layers", keywords: ["order", "objects"] },
  { tab: "sheet", title: "Show sheet settings", keywords: ["margins", "grid", "spacing", "dpi"] },
  { tab: "projects", title: "Show saved projects", keywords: ["open", "recent"] },
];

/** The view-state slice commands depend on (what makes them enabled or checked). */
export type CommandState = Pick<
  EditorState,
  "doc" | "selection" | "past" | "future" | "clipboard" | "pages" | "activePage" | "panelOpen" | "inspectorOpen" | "previewDock" | "sidebarTab" | "project"
> & { theme: ThemePreference; density: Density };

export function commandState(): CommandState {
  const s = editor();
  const p = prefs();
  return {
    doc: s.doc,
    selection: s.selection,
    past: s.past,
    future: s.future,
    clipboard: s.clipboard,
    pages: s.pages,
    activePage: s.activePage,
    panelOpen: s.panelOpen,
    inspectorOpen: s.inspectorOpen,
    previewDock: s.previewDock,
    sidebarTab: s.sidebarTab,
    project: s.project,
    theme: p.theme,
    density: p.density,
  };
}

/**
 * Every action command (File, Edit, View, Sheet, Arrange, Help, panels and
 * pages). Product templates and sheet sizes are added by `paletteCommands`.
 */
export function editorCommands(state: CommandState = commandState()): Command[] {
  const hasDesigns = state.doc.designs.length > 0;
  const picked = state.doc.designs.filter((d) => state.selection.includes(d.id));
  const one = picked.length === 1 ? picked[0] : undefined;
  const any = picked.length > 0;
  const unlocked = picked.filter((d) => !d.locked);
  const page = state.doc.page;
  const pageCount = state.pages.length;

  const commands: Command[] = [
    // File
    { id: "file.new", group: "File", title: "New design…", keywords: ["start", "template", "blank"], enabled: true, run: () => requestLeave({ kind: "start" }) },
    { id: "file.upload", group: "File", title: "Upload images…", keywords: ["add", "image", "png", "jpg", "import"], enabled: true, run: () => void chooseAndUploadImages() },
    { id: "file.open", group: "File", title: "Open .sheetfit file…", keywords: ["import", "project", "load"], enabled: true, run: () => void chooseAndImportProject() },
    { id: "file.sample", group: "File", title: "Open sample sheet", keywords: ["example", "demo"], enabled: true, run: () => requestLeave({ kind: "sample" }) },
    { id: "file.save", group: "File", title: "Save in this browser", keywords: ["store"], shortcut: "Ctrl S", enabled: true, run: () => void saveCurrentProject() },
    {
      id: "file.download-project",
      group: "File",
      title: "Download .sheetfit file",
      keywords: ["backup", "project", "share"],
      enabled: true,
      run: () => void exportProjectFile(safeFilename(editor().project.name)),
    },
    { id: "file.export", group: "File", title: "Download for print…", keywords: ["export", "pdf", "png", "jpeg", "svg", "cricut"], shortcut: "Ctrl Shift E", enabled: hasDesigns, run: () => editor().setDialog("export") },
    { id: "file.print", group: "File", title: "Print at actual size…", keywords: ["printer", "100%"], shortcut: "Ctrl P", enabled: hasDesigns, run: () => editor().setDialog("print") },
    { id: "file.clear", group: "File", title: "Clear and start blank", keywords: ["reset", "empty"], danger: true, enabled: true, run: () => requestLeave({ kind: "blank" }) },

    // Edit
    { id: "edit.undo", group: "Edit", title: "Undo", shortcut: "Ctrl Z", enabled: state.past.length > 0, run: () => editor().undo() },
    { id: "edit.redo", group: "Edit", title: "Redo", shortcut: "Ctrl Shift Z", enabled: state.future.length > 0, run: () => editor().redo() },
    {
      id: "edit.cut",
      group: "Edit",
      title: "Cut",
      shortcut: "Ctrl X",
      enabled: any,
      run: () => {
        editor().copySelection();
        editor().deleteSelection();
      },
    },
    { id: "edit.copy", group: "Edit", title: "Copy", shortcut: "Ctrl C", enabled: any, run: () => editor().copySelection() },
    { id: "edit.paste", group: "Edit", title: "Paste", shortcut: "Ctrl V", enabled: state.clipboard.length > 0, run: () => editor().paste() },
    { id: "edit.duplicate", group: "Edit", title: "Duplicate", keywords: ["copy"], shortcut: "Ctrl D", enabled: any, run: () => editor().duplicateSelection() },
    { id: "edit.delete", group: "Edit", title: "Delete", keywords: ["remove"], shortcut: "Delete", enabled: any, danger: true, run: () => editor().deleteSelection() },
    { id: "edit.select-all", group: "Edit", title: "Select all", shortcut: "Ctrl A", enabled: hasDesigns, run: () => editor().selectAll() },
    { id: "edit.deselect", group: "Edit", title: "Deselect", shortcut: "Esc", enabled: any, run: () => editor().clearSelection() },
    { id: "edit.group", group: "Edit", title: "Group", shortcut: "Ctrl G", enabled: picked.length > 1, run: () => editor().groupSelection() },
    { id: "edit.ungroup", group: "Edit", title: "Ungroup", shortcut: "Ctrl Shift G", enabled: picked.some((d) => d.groupId), run: () => editor().ungroupSelection() },
    {
      id: "edit.lock",
      group: "Edit",
      title: any && picked.every((d) => d.locked) ? "Unlock" : "Lock",
      keywords: ["pin", "freeze"],
      shortcut: "Alt Shift L",
      enabled: any,
      run: () => {
        const s = editor();
        const sel = s.doc.designs.filter((d) => s.selection.includes(d.id));
        const lock = !sel.every((d) => d.locked);
        for (const d of sel) s.updateDesign(d.id, { locked: lock });
      },
    },

    // View
    ...THEMES.map<Command>((t) => ({
      id: `view.theme.${t.value}`,
      group: "View",
      title: `Theme: ${t.label}`,
      keywords: ["appearance", "dark mode", "light mode", "colour"],
      enabled: true,
      checked: state.theme === t.value,
      run: () => prefs().setTheme(t.value),
    })),
    ...DENSITIES.map<Command>((d) => ({
      id: `view.density.${d.value}`,
      group: "View",
      title: `Density: ${d.label}`,
      hint: d.hint,
      keywords: ["spacing", "size", "compact", "comfortable"],
      enabled: true,
      checked: state.density === d.value,
      run: () => prefs().setDensity(d.value),
    })),
    { id: "view.zoom-in", group: "View", title: "Zoom in", shortcut: "+", enabled: true, run: () => editor().zoomTo(editor().zoom * 1.25) },
    { id: "view.zoom-out", group: "View", title: "Zoom out", shortcut: "-", enabled: true, run: () => editor().zoomTo(editor().zoom / 1.25) },
    { id: "view.fit", group: "View", title: "Fit sheet", keywords: ["zoom"], shortcut: "Shift 2", enabled: true, run: () => editor().fitPage() },
    { id: "view.fit-selection", group: "View", title: "Fit selection", keywords: ["zoom"], shortcut: "Shift 3", enabled: any, run: () => editor().zoomToSelection() },
    { id: "view.actual", group: "View", title: "Actual size", keywords: ["zoom", "100%"], shortcut: "Shift 0", enabled: true, run: () => editor().zoomTo(1) },
    { id: "view.grid", group: "View", title: "Show grid", keywords: ["guides"], enabled: true, checked: page.showGrid, run: () => editor().setPage({ showGrid: !editor().doc.page.showGrid }) },
    {
      id: "view.snap",
      group: "View",
      title: "Snap to guides",
      keywords: ["align", "magnet"],
      enabled: true,
      checked: page.snapToGuides,
      run: () => editor().setPage({ snapToGuides: !editor().doc.page.snapToGuides }),
    },
    { id: "view.side-panel", group: "View", title: "Side panel", keywords: ["sidebar", "hide", "show"], shortcut: "Ctrl /", enabled: true, checked: state.panelOpen, run: () => editor().setPanelOpen(!editor().panelOpen) },
    {
      id: "view.inspector",
      group: "View",
      title: "Properties panel",
      keywords: ["inspector"],
      enabled: true,
      checked: state.inspectorOpen,
      run: () => editor().setInspectorOpen(!editor().inspectorOpen),
    },
    { id: "view.preview", group: "View", title: "Live product preview", keywords: ["3d", "mockup", "dock"], enabled: true, checked: state.previewDock, run: () => editor().setPreviewDock(!editor().previewDock) },
    {
      id: "view.reset-panels",
      group: "View",
      title: "Reset panel widths",
      keywords: ["resize"],
      enabled: true,
      run: () => {
        prefs().setPanelWidth("side", null);
        prefs().setPanelWidth("inspector", null);
      },
    },

    // Sheet
    { id: "sheet.size", group: "Sheet", title: "Sheet size and orientation…", keywords: ["a4", "a3", "letter", "custom", "landscape"], enabled: true, run: () => editor().setDialog("sheet") },
    ...PROCESS_ORDER.map<Command>((p) => ({
      id: `sheet.process.${p}`,
      group: "Sheet",
      title: `Print process: ${PROCESS_LABELS[p]}`,
      keywords: ["process", "mode"],
      enabled: true,
      checked: page.process === p,
      run: () => editor().setProcess(p),
    })),
    ...MIRROR_CHOICES.map<Command>((m) => ({
      id: `sheet.mirror.${m.value}`,
      group: "Sheet",
      title: m.title,
      keywords: ["flip", "reverse"],
      enabled: true,
      checked: page.mirrorMode === m.value,
      run: () => editor().setPage({ mirrorMode: m.value }),
    })),
    { id: "sheet.straps", group: "Sheet", title: "Lanyard and keychain straps…", keywords: ["ribbon", "strap", "12 mm", "16 mm", "20 mm"], enabled: true, run: () => editor().setDialog("strip") },

    // Arrange
    { id: "arrange.auto", group: "Arrange", title: "Auto Arrange…", keywords: ["pack", "nest", "layout"], enabled: hasDesigns, run: () => editor().setDialog("arrange") },
    {
      id: "arrange.fill",
      group: "Arrange",
      title: "Fill sheet with copies",
      keywords: ["repeat", "step and repeat", "multiply", "copies"],
      enabled: !!one && !one.locked && !one.pairId,
      run: () => {
        const id = editor().selection[0];
        if (id) fillSheetWith(id);
      },
    },
    ...ALIGN_COMMANDS.map<Command>((a) => ({
      id: `arrange.align.${a.target}`,
      group: "Arrange",
      title: a.title,
      keywords: ["align"],
      enabled: unlocked.length > 0,
      run: () => editor().alignSelection(a.target, editor().selection.length > 1 ? "selection" : "printable"),
    })),
    { id: "arrange.center", group: "Arrange", title: "Centre on sheet", keywords: ["middle"], enabled: unlocked.length > 0, run: () => editor().centerSelection() },
    { id: "arrange.forward", group: "Arrange", title: "Bring forward", keywords: ["order", "layer"], shortcut: "Ctrl ]", enabled: !!one, run: () => editor().bringForward(editor().selection[0]) },
    { id: "arrange.front", group: "Arrange", title: "Bring to front", keywords: ["order", "layer"], shortcut: "Ctrl Alt ]", enabled: !!one, run: () => editor().bringForward(editor().selection[0], true) },
    { id: "arrange.backward", group: "Arrange", title: "Send backward", keywords: ["order", "layer"], shortcut: "Ctrl [", enabled: !!one, run: () => editor().sendBackward(editor().selection[0]) },
    { id: "arrange.back", group: "Arrange", title: "Send to back", keywords: ["order", "layer"], shortcut: "Ctrl Alt [", enabled: !!one, run: () => editor().sendBackward(editor().selection[0], true) },
    { id: "arrange.flip-x", group: "Arrange", title: "Flip horizontal", keywords: ["mirror"], shortcut: "Shift H", enabled: any, run: () => editor().flipDesigns("x") },
    { id: "arrange.flip-y", group: "Arrange", title: "Flip vertical", keywords: ["mirror"], shortcut: "Shift V", enabled: any, run: () => editor().flipDesigns("y") },
    {
      id: "arrange.rotate",
      group: "Arrange",
      title: "Rotate 90° clockwise",
      keywords: ["turn"],
      enabled: unlocked.length > 0,
      run: () => {
        const s = editor();
        for (const d of s.doc.designs.filter((x) => s.selection.includes(x.id) && !x.locked)) s.updateDesign(d.id, { rotation: (d.rotation + 90) % 360 });
      },
    },

    // Pages
    { id: "page.add", group: "Pages", title: "Add page", keywords: ["new sheet"], enabled: true, run: () => editor().switchPage(editor().addPage()) },
    { id: "page.duplicate", group: "Pages", title: "Duplicate page", keywords: ["copy sheet"], enabled: true, run: () => editor().duplicatePage(editor().activePage) },
    { id: "page.next", group: "Pages", title: "Next page", shortcut: "PageDown", enabled: state.activePage < pageCount - 1, run: () => editor().switchPage(editor().activePage + 1) },
    { id: "page.previous", group: "Pages", title: "Previous page", shortcut: "PageUp", enabled: state.activePage > 0, run: () => editor().switchPage(editor().activePage - 1) },

    // Help
    { id: "help.palette", group: "Help", title: "Command palette", keywords: ["search", "actions"], shortcut: "Ctrl K", enabled: true, run: () => editor().setDialog("commands") },
    { id: "help.shortcuts", group: "Help", title: "Keyboard shortcuts", keywords: ["keys", "hotkeys"], shortcut: "?", enabled: true, run: () => editor().setDialog("shortcuts") },
    { id: "help.start", group: "Help", title: "Start guide…", keywords: ["onboarding", "welcome", "tutorial"], enabled: true, run: () => editor().setDialog("start") },
  ];

  for (const p of PANEL_TITLES) {
    commands.push({
      id: `panel.${p.tab}`,
      group: "Panels",
      title: p.title,
      keywords: p.keywords,
      enabled: true,
      checked: state.panelOpen && state.sidebarTab === p.tab,
      run: () => {
        editor().setSidebarTab(p.tab);
        editor().setPanelOpen(true);
      },
    });
  }
  for (let i = 0; i < pageCount; i++) {
    if (pageCount < 2) break;
    commands.push({
      id: `page.go.${i}`,
      group: "Pages",
      title: `Go to page ${i + 1}`,
      enabled: i !== state.activePage,
      run: () => editor().switchPage(i),
    });
  }
  return commands;
}

function sheetHint(p: (typeof PRODUCTS)[number]): string {
  const sheet = minSheetFor(p);
  return sheet ? `, fits ${sheetLabel({ sheet: sheet.id })}` : "";
}

/** Product templates and sheet sizes, searchable in the palette (not in the menus). */
export function catalogueCommands(state: CommandState = commandState()): Command[] {
  const fmt = (n: number) => `${Math.round(n * 10) / 10}`;
  const products = PRODUCTS.map<Command>((p) => ({
    id: `product.${p.id}`,
    group: "Products",
    title: `${p.name}: ${p.detail}`,
    hint: `${fmt(p.width)} × ${fmt(p.height)} mm print area${sheetHint(p)}`,
    keywords: [p.group, ...(p.aliases ?? []), ...p.processes.map((x) => PROCESS_LABELS[x])],
    enabled: true,
    run: () => requestProduct(p.id),
  }));
  const sheets = SHEETS.map<Command>((s) => ({
    id: `sheet.${s.id}`,
    group: "Sheet sizes",
    title: `Sheet: ${s.name}`,
    hint: `${fmt(s.width)} × ${fmt(s.height)} mm · ${s.usedFor}`,
    keywords: [s.short, s.kind],
    enabled: true,
    checked: state.doc.page.sheet === s.id,
    run: () => changeSheet(s.id),
  }));
  return [...products, ...sheets];
}

/** Everything the palette can search: actions first, then the catalogue. */
export function paletteCommands(state: CommandState = commandState()): Command[] {
  return [...editorCommands(state), ...catalogueCommands(state)].filter((c) => c.enabled);
}

/** Look a command up by id in a list built by `editorCommands`. */
export function commandById(commands: Command[], id: string): Command {
  const c = commands.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown command ${id}`);
  return c;
}
