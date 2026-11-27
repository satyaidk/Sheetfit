"use client";

/**
 * The application menus: File, Edit, View, Sheet, Arrange and Help.
 *
 * Desktop and tablet get a real menu bar (WAI-ARIA menubar); phones get the
 * same menus as submenus of one "Menu" button. Both render the same
 * structure, and every item is a command from the shared registry
 * (`lib/commands/editor-commands.ts`), so titles, shortcuts and enabled
 * states match the command palette exactly.
 */

import { Menu as MenuIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useEditor } from "@/store/editor-store";
import { usePreferences } from "@/store/preferences-store";
import { editorCommands, type Command, type CommandState } from "@/lib/commands/editor-commands";
import { ariaShortcut, displayShortcut } from "@/lib/commands/shortcuts";
import { MENUS, type MenuEntry as Entry } from "@/lib/commands/menus";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/** Commands with live enabled and checked states (menus render only while open). */
function useLiveCommands(): Map<string, Command> {
  const s = useEditor(
    useShallow((x) => ({
      doc: x.doc,
      selection: x.selection,
      past: x.past,
      future: x.future,
      clipboard: x.clipboard,
      pages: x.pages,
      activePage: x.activePage,
      panelOpen: x.panelOpen,
      inspectorOpen: x.inspectorOpen,
      previewDock: x.previewDock,
      sidebarTab: x.sidebarTab,
      project: x.project,
    })),
  );
  const theme = usePreferences((p) => p.theme);
  const density = usePreferences((p) => p.density);
  const state: CommandState = { ...s, theme, density };
  return new Map(editorCommands(state).map((c) => [c.id, c]));
}

interface Kit {
  Item: typeof MenubarItem;
  CheckboxItem: typeof MenubarCheckboxItem;
  RadioGroup: typeof MenubarRadioGroup;
  RadioItem: typeof MenubarRadioItem;
  Separator: typeof MenubarSeparator;
  Label: typeof MenubarLabel;
  Sub: typeof MenubarSub;
  SubTrigger: typeof MenubarSubTrigger;
  SubContent: typeof MenubarSubContent;
}

const BAR_KIT: Kit = {
  Item: MenubarItem,
  CheckboxItem: MenubarCheckboxItem,
  RadioGroup: MenubarRadioGroup,
  RadioItem: MenubarRadioItem,
  Separator: MenubarSeparator,
  Label: MenubarLabel,
  Sub: MenubarSub,
  SubTrigger: MenubarSubTrigger,
  SubContent: MenubarSubContent,
};

const DROPDOWN_KIT = {
  Item: DropdownMenuItem,
  CheckboxItem: DropdownMenuCheckboxItem,
  RadioGroup: DropdownMenuRadioGroup,
  RadioItem: DropdownMenuRadioItem,
  Separator: DropdownMenuSeparator,
  Label: DropdownMenuLabel,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
} as unknown as Kit;

function Entries({ entries, kit, commands }: { entries: Entry[]; kit: Kit; commands: Map<string, Command> }) {
  return (
    <>
      {entries.map((e, i) => {
        if (e.kind === "separator") return <kit.Separator key={`sep-${i}`} />;
        if (e.kind === "submenu")
          return (
            <kit.Sub key={e.label}>
              <kit.SubTrigger>{e.label}</kit.SubTrigger>
              <kit.SubContent>
                <Entries entries={e.entries} kit={kit} commands={commands} />
              </kit.SubContent>
            </kit.Sub>
          );
        if (e.kind === "radio") {
          const options = e.options.map((o) => ({ ...o, command: commands.get(o.id)! }));
          const value = options.find((o) => o.command.checked)?.id ?? "";
          return (
            <div key={e.label} role="none">
              <kit.Label>{e.label}</kit.Label>
              <kit.RadioGroup value={value} onValueChange={(id: string) => commands.get(id)?.run()}>
                {options.map((o) => (
                  <kit.RadioItem key={o.id} value={o.id} disabled={!o.command.enabled}>
                    {o.label}
                  </kit.RadioItem>
                ))}
              </kit.RadioGroup>
            </div>
          );
        }
        const c = commands.get(e.id);
        if (!c) return null;
        const shortcut = c.shortcut ? displayShortcut(c.shortcut) : undefined;
        const aria = c.shortcut ? ariaShortcut(c.shortcut) : undefined;
        if (e.kind === "check")
          return (
            <kit.CheckboxItem key={c.id} checked={!!c.checked} disabled={!c.enabled} onCheckedChange={() => c.run()} shortcut={shortcut} aria-keyshortcuts={aria}>
              {c.title}
            </kit.CheckboxItem>
          );
        return (
          <kit.Item key={c.id} disabled={!c.enabled} danger={c.danger} onSelect={() => c.run()} shortcut={shortcut} aria-keyshortcuts={aria}>
            {c.title}
          </kit.Item>
        );
      })}
    </>
  );
}

function BarMenuContent({ entries }: { entries: Entry[] }) {
  const commands = useLiveCommands();
  return (
    <MenubarContent>
      <Entries entries={entries} kit={BAR_KIT} commands={commands} />
    </MenubarContent>
  );
}

/** The menu bar (tablet and desktop). */
export function AppMenubar({ className }: { className?: string }) {
  return (
    <Menubar aria-label="Application menu" className={className}>
      {MENUS.map((m) => (
        <MenubarMenu key={m.label}>
          <MenubarTrigger>{m.label}</MenubarTrigger>
          <BarMenuContent entries={m.entries} />
        </MenubarMenu>
      ))}
    </Menubar>
  );
}

function CompactMenuContent() {
  const commands = useLiveCommands();
  return (
    <DropdownMenuContent align="start" className="min-w-56">
      {MENUS.map((m) => (
        <DropdownMenuSub key={m.label}>
          <DropdownMenuSubTrigger>{m.label}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-56">
            <Entries entries={m.entries} kit={DROPDOWN_KIT} commands={commands} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ))}
    </DropdownMenuContent>
  );
}

/** One "Menu" button holding the same menus (phones). */
export function AppMenuButton({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu" className={className}>
          <MenuIcon />
        </Button>
      </DropdownMenuTrigger>
      <CompactMenuContent />
    </DropdownMenu>
  );
}
