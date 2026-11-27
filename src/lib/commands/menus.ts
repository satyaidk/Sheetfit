/**
 * The application menus (File, Edit, View, Sheet, Arrange, Help) as data.
 *
 * Every entry names a command id from `editor-commands.ts`; the components in
 * `components/editor/AppMenus.tsx` only render this structure. Keeping it as
 * data lets a test check that every menu item exists and that nothing in the
 * menus is unreachable from the command palette.
 */

export type MenuEntry =
  | { kind: "command"; id: string }
  | { kind: "check"; id: string }
  | { kind: "separator" }
  | { kind: "radio"; label: string; options: { id: string; label: string }[] }
  | { kind: "submenu"; label: string; entries: MenuEntry[] };

export interface AppMenu {
  label: string;
  entries: MenuEntry[];
}

const cmd = (id: string): MenuEntry => ({ kind: "command", id });
const check = (id: string): MenuEntry => ({ kind: "check", id });
const sep: MenuEntry = { kind: "separator" };

export const MENUS: AppMenu[] = [
  {
    label: "File",
    entries: [
      cmd("file.new"),
      cmd("file.upload"),
      cmd("file.open"),
      cmd("file.sample"),
      sep,
      cmd("file.save"),
      cmd("file.download-project"),
      sep,
      cmd("file.export"),
      cmd("file.print"),
      sep,
      cmd("file.clear"),
    ],
  },
  {
    label: "Edit",
    entries: [
      cmd("edit.undo"),
      cmd("edit.redo"),
      sep,
      cmd("edit.cut"),
      cmd("edit.copy"),
      cmd("edit.paste"),
      cmd("edit.duplicate"),
      cmd("edit.delete"),
      sep,
      cmd("edit.select-all"),
      cmd("edit.deselect"),
      sep,
      cmd("edit.group"),
      cmd("edit.ungroup"),
      cmd("edit.lock"),
    ],
  },
  {
    label: "View",
    entries: [
      {
        kind: "radio",
        label: "Theme",
        options: [
          { id: "view.theme.system", label: "Match system" },
          { id: "view.theme.light", label: "Light" },
          { id: "view.theme.dark", label: "Dark" },
        ],
      },
      {
        kind: "radio",
        label: "Density",
        options: [
          { id: "view.density.comfortable", label: "Comfortable" },
          { id: "view.density.compact", label: "Compact" },
        ],
      },
      sep,
      cmd("view.zoom-in"),
      cmd("view.zoom-out"),
      cmd("view.fit"),
      cmd("view.fit-selection"),
      cmd("view.actual"),
      sep,
      check("view.grid"),
      check("view.snap"),
      sep,
      check("view.side-panel"),
      check("view.inspector"),
      check("view.preview"),
      cmd("view.reset-panels"),
    ],
  },
  {
    label: "Sheet",
    entries: [
      cmd("sheet.size"),
      sep,
      {
        kind: "radio",
        label: "Print process",
        options: [
          { id: "sheet.process.sublimation", label: "Sublimation" },
          { id: "sheet.process.dtf", label: "DTF" },
          { id: "sheet.process.sticker", label: "Stickers" },
        ],
      },
      {
        kind: "submenu",
        label: "Mirror output",
        entries: [
          {
            kind: "radio",
            label: "Mirror output",
            options: [
              { id: "sheet.mirror.auto", label: "Auto (by process)" },
              { id: "sheet.mirror.on", label: "On" },
              { id: "sheet.mirror.off", label: "Off" },
            ],
          },
        ],
      },
      sep,
      cmd("sheet.straps"),
      sep,
      cmd("page.add"),
      cmd("page.duplicate"),
      cmd("page.previous"),
      cmd("page.next"),
    ],
  },
  {
    label: "Arrange",
    entries: [
      cmd("arrange.auto"),
      cmd("arrange.fill"),
      sep,
      {
        kind: "submenu",
        label: "Align",
        entries: [
          cmd("arrange.align.left"),
          cmd("arrange.align.center-x"),
          cmd("arrange.align.right"),
          sep,
          cmd("arrange.align.top"),
          cmd("arrange.align.center-y"),
          cmd("arrange.align.bottom"),
        ],
      },
      cmd("arrange.center"),
      sep,
      cmd("arrange.forward"),
      cmd("arrange.front"),
      cmd("arrange.backward"),
      cmd("arrange.back"),
      sep,
      cmd("arrange.flip-x"),
      cmd("arrange.flip-y"),
      cmd("arrange.rotate"),
    ],
  },
  {
    label: "Help",
    entries: [cmd("help.palette"), cmd("help.shortcuts"), cmd("help.start")],
  },
];

/** Every command id the menus refer to, in menu order. */
export function menuCommandIds(entries: MenuEntry[] = MENUS.flatMap((m) => m.entries)): string[] {
  return entries.flatMap((e) => {
    if (e.kind === "command" || e.kind === "check") return [e.id];
    if (e.kind === "radio") return e.options.map((o) => o.id);
    if (e.kind === "submenu") return menuCommandIds(e.entries);
    return [];
  });
}
