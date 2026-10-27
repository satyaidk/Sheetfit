"use client";

/**
 * Floating pill anchored to the selection (Canva's floating toolbar):
 * duplicate, delete, lock, group and a "more" menu. It sits under the
 * selection because Konva's rotate handle sits above it, flips above when
 * there is no room, and hides while a drag or resize is in progress.
 */

import {
  ArrowDownToLine,
  ArrowUpToLine,
  CopyPlus,
  Ellipsis,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  Lock,
  LockOpen,
  Scan,
  Trash2,
  Ungroup,
} from "lucide-react";
import { PAGES_BAR_PX, PX_PER_MM, useEditor } from "@/store/editor-store";
import { designBounds } from "@/lib/layout/sheet-layout";
import { unionBounds } from "@/lib/layout/alignment";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "@/components/ui/toolbar";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const PILL_H = 40;

export function FloatingPill() {
  const designs = useEditor((s) => s.doc.designs);
  const selection = useEditor((s) => s.selection);
  const pan = useEditor((s) => s.pan);
  const zoom = useEditor((s) => s.zoom);
  const viewport = useEditor((s) => s.viewport);
  const interacting = useEditor((s) => s.interacting);
  const s = useEditor.getState;

  const picked = designs.filter((d) => selection.includes(d.id));
  const box = unionBounds(picked.map(designBounds));
  if (!box || interacting || viewport.width === 0) return null;

  const k = zoom * PX_PER_MM;
  const centerX = pan.x + (box.x + box.width / 2) * k;
  const below = pan.y + (box.y + box.height) * k + 18;
  const above = pan.y + box.y * k - PILL_H - 44;
  // Stay clear of the page strip at the bottom of the canvas.
  const top = below + PILL_H < viewport.height - PAGES_BAR_PX ? below : Math.max(30, above);
  const left = Math.min(Math.max(centerX, 150), viewport.width - 150);

  const allLocked = picked.every((d) => d.locked);
  const grouped = picked.length > 1 && picked.every((d) => d.groupId && d.groupId === picked[0].groupId);
  const first = picked[0];

  return (
    <div className="pointer-events-none absolute z-20" style={{ left, top, transform: "translateX(-50%)" }}>
      <Toolbar
        aria-label="Selection actions"
        className="pointer-events-auto h-10 rounded-full bg-surface px-1 shadow-bar ring-1 ring-black/5 animate-fade"
      >
        <Tooltip label="Duplicate" shortcut="Ctrl D">
          <ToolbarButton className="rounded-full" aria-label="Duplicate" onClick={() => s().duplicateSelection()}>
            <CopyPlus />
          </ToolbarButton>
        </Tooltip>
        {picked.length > 1 && (
          <Tooltip label={grouped ? "Ungroup" : "Group"} shortcut={grouped ? "Ctrl Shift G" : "Ctrl G"}>
            <ToolbarButton className="rounded-full" aria-label={grouped ? "Ungroup" : "Group"} onClick={() => (grouped ? s().ungroupSelection() : s().groupSelection())}>
              {grouped ? <Ungroup /> : <Group />}
            </ToolbarButton>
          </Tooltip>
        )}
        <Tooltip label={allLocked ? "Unlock" : "Lock position"} shortcut="Alt Shift L">
          <ToolbarButton
            className="rounded-full"
            aria-label={allLocked ? "Unlock" : "Lock"}
            active={allLocked}
            onClick={() => {
              for (const d of picked) s().updateDesign(d.id, { locked: !allLocked });
            }}
          >
            {allLocked ? <Lock /> : <LockOpen />}
          </ToolbarButton>
        </Tooltip>
        <Tooltip label="Delete" shortcut="Del">
          <ToolbarButton className="rounded-full hover:text-danger" aria-label="Delete" onClick={() => s().deleteSelection()}>
            <Trash2 />
          </ToolbarButton>
        </Tooltip>
        <ToolbarSeparator />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolbarButton className="rounded-full" aria-label="More actions">
              <Ellipsis />
            </ToolbarButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-56">
            <DropdownMenuItem onSelect={() => s().bringForward(first.id, true)} shortcut="Ctrl Alt ]">
              <ArrowUpToLine /> Bring to front
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().sendBackward(first.id, true)} shortcut="Ctrl Alt [">
              <ArrowDownToLine /> Send to back
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => s().flipDesigns("x")} shortcut="Shift H">
              <FlipHorizontal2 /> Flip horizontal
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().flipDesigns("y")} shortcut="Shift V">
              <FlipVertical2 /> Flip vertical
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => s().zoomToSelection()} shortcut="Shift 3">
              <Scan /> Zoom to selection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Toolbar>
    </div>
  );
}
