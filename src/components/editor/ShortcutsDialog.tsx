"use client";

/** Keyboard shortcut sheet (`?`), grouped like Canva's: Basics, Designs, View, Sheet. */

import { useEditor } from "@/store/editor-store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/toolbar";

export const SHORTCUTS: { group: string; items: [string, string[]][] }[] = [
  {
    group: "Basics",
    items: [
      ["Undo", ["Ctrl", "Z"]],
      ["Redo", ["Ctrl", "Shift", "Z"]],
      ["Save in browser", ["Ctrl", "S"]],
      ["Print", ["Ctrl", "P"]],
      ["Show or hide side panel", ["Ctrl", "/"]],
      ["Shortcuts", ["?"]],
    ],
  },
  {
    group: "Designs",
    items: [
      ["Copy, paste", ["Ctrl", "C / V"]],
      ["Duplicate", ["Ctrl", "D"]],
      ["Delete", ["Del"]],
      ["Select all", ["Ctrl", "A"]],
      ["Next design", ["Tab"]],
      ["Move 1 mm, 10 mm", ["Arrows", "Shift"]],
      ["Rotate 15°", ["Alt", ", / ."]],
      ["Flip horizontal, vertical", ["Shift", "H / V"]],
      ["Bring forward, send backward", ["Ctrl", "] / ["]],
      ["To front, to back", ["Ctrl", "Alt", "] / ["]],
      ["Group, ungroup", ["Ctrl", "(Shift) G"]],
      ["Lock", ["Alt", "Shift", "L"]],
    ],
  },
  {
    group: "View",
    items: [
      ["Pan", ["Space", "drag"]],
      ["Zoom at pointer", ["Ctrl", "wheel"]],
      ["Zoom in, out", ["+ / -"]],
      ["Fit sheet", ["Shift", "2"]],
      ["Fit selection", ["Shift", "3"]],
      ["Actual size", ["Shift", "0"]],
      ["Next, previous page", ["PgDn / PgUp"]],
    ],
  },
  {
    group: "Placing",
    items: [
      ["Snap off while dragging", ["Alt"]],
      ["Add to selection", ["Shift", "click"]],
      ["Select an area", ["Shift", "drag"]],
      ["Paste an image", ["Ctrl", "V"]],
    ],
  },
];

export function ShortcutsDialog() {
  const open = useEditor((s) => s.dialog === "shortcuts");
  const setDialog = useEditor((s) => s.setDialog);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDialog(null)}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>On a Mac, use Cmd for Ctrl and Option for Alt.</DialogDescription>
        </DialogHeader>
        <div className="scroll-thin grid min-h-0 flex-1 gap-x-8 gap-y-5 overflow-y-auto p-5 sm:grid-cols-2">
          {SHORTCUTS.map((g) => (
            <section key={g.group}>
              <h3 className="mb-2 text-[12px] font-semibold text-ink-muted">{g.group}</h3>
              <dl className="flex flex-col gap-1.5">
                {g.items.map(([label, keys]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-[13px]">
                    <dt>{label}</dt>
                    <dd className="flex shrink-0 gap-1">
                      {keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
