"use client";

/**
 * Right-click menu for the canvas. On a design it mirrors the floating pill's
 * "more" menu (Canva convention); on empty canvas it offers sheet actions.
 * The canvas selects the design under the pointer before the menu opens.
 */

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Crosshair,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  Layers,
  Lock,
  LockOpen,
  Maximize,
  MousePointer2,
  Package,
  Ruler,
  Scan,
  Trash2,
  Ungroup,
  Shirt,
  FileOutput,
} from "lucide-react";
import { useEditor } from "@/store/editor-store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { AlignTarget } from "@/lib/layout/alignment";

export const ALIGN_ITEMS: { target: AlignTarget; label: string; icon: React.ReactNode }[] = [
  { target: "left", label: "Left", icon: <AlignStartVertical /> },
  { target: "center-x", label: "Centre", icon: <AlignCenterVertical /> },
  { target: "right", label: "Right", icon: <AlignEndVertical /> },
  { target: "top", label: "Top", icon: <AlignStartHorizontal /> },
  { target: "center-y", label: "Middle", icon: <AlignCenterHorizontal /> },
  { target: "bottom", label: "Bottom", icon: <AlignEndHorizontal /> },
];

export function CanvasContextMenu({ children }: { children: React.ReactNode }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <MenuBody />
    </ContextMenu>
  );
}

function MenuBody() {
  const selection = useEditor((s) => s.selection);
  const designs = useEditor((s) => s.doc.designs);
  const clipboard = useEditor((s) => s.clipboard);
  const pageCount = useEditor((s) => s.pages.length);
  const activePage = useEditor((s) => s.activePage);
  const s = useEditor.getState;
  const picked = designs.filter((d) => selection.includes(d.id));
  const allLocked = picked.length > 0 && picked.every((d) => d.locked);
  const grouped = picked.length > 1 && picked.every((d) => d.groupId && d.groupId === picked[0].groupId);

  if (picked.length === 0) {
    return (
      <ContextMenuContent>
        <ContextMenuItem disabled={clipboard.length === 0} onSelect={() => s().paste()} shortcut="Ctrl V">
          <ClipboardPaste /> Paste
        </ContextMenuItem>
        <ContextMenuItem disabled={designs.length === 0} onSelect={() => s().selectAll()} shortcut="Ctrl A">
          <MousePointer2 /> Select all
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            s().setSidebarTab("products");
            s().setPanelOpen(true);
          }}
        >
          <Package /> Add a product template
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => s().setDialog("sheet")}>
          <Ruler /> Sheet size…
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => s().fitPage()} shortcut="Shift 2">
          <Maximize /> Fit sheet to screen
        </ContextMenuItem>
      </ContextMenuContent>
    );
  }

  const first = picked[0];
  return (
    <ContextMenuContent>
      {picked.length === 1 && (first.productId || first.assetId) && (
        <>
          <ContextMenuItem onSelect={() => s().openMockup(first.id)}>
            <Shirt /> Preview on product
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}
      <ContextMenuItem onSelect={() => s().copySelection()} shortcut="Ctrl C">
        <Copy /> Copy
      </ContextMenuItem>
      <ContextMenuItem disabled={clipboard.length === 0} onSelect={() => s().paste()} shortcut="Ctrl V">
        <ClipboardPaste /> Paste
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => s().duplicateSelection()} shortcut="Ctrl D">
        <CopyPlus /> Duplicate
      </ContextMenuItem>
      <ContextMenuItem danger onSelect={() => s().deleteSelection()} shortcut="Del">
        <Trash2 /> Delete
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Layers /> Layer
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onSelect={() => s().bringForward(first.id, true)} shortcut="Ctrl Alt ]">
            <ArrowUpToLine /> Bring to front
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => s().bringForward(first.id)} shortcut="Ctrl ]">
            <ArrowUp /> Bring forward
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => s().sendBackward(first.id)} shortcut="Ctrl [">
            <ArrowDown /> Send backward
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => s().sendBackward(first.id, true)} shortcut="Ctrl Alt [">
            <ArrowDownToLine /> Send to back
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <AlignCenterVertical /> Align to sheet
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {ALIGN_ITEMS.map((a) => (
            <ContextMenuItem key={a.target} onSelect={() => s().alignSelection(a.target, "printable")}>
              {a.icon} {a.label}
            </ContextMenuItem>
          ))}
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => s().centerSelection()}>
            <Crosshair /> Centre on sheet
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      {pageCount > 1 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FileOutput /> Move to page
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {Array.from({ length: pageCount }, (_, i) => i)
              .filter((i) => i !== activePage)
              .map((i) => (
                <ContextMenuItem key={i} onSelect={() => s().moveDesignsToPage(selection, i)}>
                  Page {i + 1}
                </ContextMenuItem>
              ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      <ContextMenuItem onSelect={() => s().flipDesigns("x")} shortcut="Shift H">
        <FlipHorizontal2 /> Flip horizontal
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => s().flipDesigns("y")} shortcut="Shift V">
        <FlipVertical2 /> Flip vertical
      </ContextMenuItem>
      <ContextMenuSeparator />
      {picked.length > 1 &&
        (grouped ? (
          <ContextMenuItem onSelect={() => s().ungroupSelection()} shortcut="Ctrl Shift G">
            <Ungroup /> Ungroup
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onSelect={() => s().groupSelection()} shortcut="Ctrl G">
            <Group /> Group
          </ContextMenuItem>
        ))}
      <ContextMenuItem
        onSelect={() => {
          for (const d of picked) s().updateDesign(d.id, { locked: !allLocked });
        }}
        shortcut="Alt Shift L"
      >
        {allLocked ? <LockOpen /> : <Lock />} {allLocked ? "Unlock" : "Lock"}
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => s().zoomToSelection()} shortcut="Shift 3">
        <Scan /> Zoom to selection
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
