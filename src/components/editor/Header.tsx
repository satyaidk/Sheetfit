"use client";

/**
 * Header (the document title bar of Google Docs and Microsoft 365).
 *
 * Left: the mark, then the document title with its save state above the menu
 * bar. Centre: a search box that opens the command palette (Ctrl+K). Right:
 * the page's sheet and print process, undo and redo, Print, and the one
 * primary action, Download. On narrow screens the menu bar folds into a
 * "Menu" button and the page settings move to the Sheet menu, the Sheet panel
 * and the palette, so nothing is lost.
 */

import Link from "next/link";
import { Check, CloudOff, Download, Printer, Redo2, Search, Undo2 } from "lucide-react";
import { useState } from "react";
import { useEditor } from "@/store/editor-store";
import type { PrintProcess } from "@/types/editor";
import { PROCESS_HINTS, PROCESS_LABELS, PROCESS_ORDER } from "@/lib/catalogue/processes";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Logo } from "@/components/Logo";
import { changeSheet } from "@/lib/editor-actions";
import { SheetSelect } from "@/components/settings/SheetSelect";
import { pageSize } from "@/lib/layout/sheet-layout";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { ariaShortcut, displayShortcut } from "@/lib/commands/shortcuts";
import { cn } from "@/lib/utils";
import { AppMenuButton, AppMenubar } from "./AppMenus";

export function Header() {
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const setDialog = useEditor((s) => s.setDialog);
  const hasDesigns = useEditor((s) => s.doc.designs.length > 0);
  const page = useEditor((s) => s.doc.page);
  const unit = useEditor((s) => s.unit);
  const size = pageSize(page);
  const u = unit === "px" ? "mm" : unit;

  return (
    <header className="relative z-30 flex h-(--header-h) shrink-0 items-center gap-1 border-b border-line bg-surface px-2 sm:gap-2 sm:px-3">
      <Link href="/" className="flex shrink-0 items-center rounded-md p-1" aria-label="Sheetfit home">
        <Logo className="size-8" />
      </Link>

      <AppMenuButton className="md:hidden" />
      <div className="flex min-w-0 flex-col justify-center">
        <DocumentTitle />
        <AppMenubar className="-ml-1 hidden md:flex" />
      </div>

      <SearchButton />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        <div className="hidden w-[232px] xl:block 2xl:w-[272px]">
          <SheetSelect
            variant="ghost"
            value={page.sheet}
            onChange={changeSheet}
            unit={unit}
            ariaLabel="Sheet size for this page"
            shownSize={size}
            customLabel={`Custom ${formatUnit(size.width, u, page.dpi)} × ${formatUnit(size.height, u, page.dpi)} ${u}`}
          />
        </div>
        <ProcessSwitch />

        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
        <Tooltip label="Undo" shortcut={displayShortcut("Ctrl Z")}>
          <Button variant="ghost" size="icon" aria-label="Undo" aria-keyshortcuts={ariaShortcut("Ctrl Z")} disabled={!canUndo} onClick={undo}>
            <Undo2 />
          </Button>
        </Tooltip>
        <Tooltip label="Redo" shortcut={displayShortcut("Ctrl Shift Z")}>
          <Button variant="ghost" size="icon" aria-label="Redo" aria-keyshortcuts={ariaShortcut("Ctrl Shift Z")} disabled={!canRedo} onClick={redo}>
            <Redo2 />
          </Button>
        </Tooltip>
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />

        <Tooltip label="Print at actual size" shortcut={displayShortcut("Ctrl P")}>
          <Button variant="default" className="hidden sm:inline-flex max-lg:w-(--control-h) max-lg:px-0" disabled={!hasDesigns} onClick={() => setDialog("print")}>
            <Printer />
            <span className="hidden lg:inline">Print</span>
          </Button>
        </Tooltip>
        <Button variant="primary" className="px-3 sm:px-4" disabled={!hasDesigns} onClick={() => setDialog("export")} aria-keyshortcuts={ariaShortcut("Ctrl Shift E")}>
          <Download />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </div>
    </header>
  );
}

/** Editable project name with its save state, as in Google Docs. */
function DocumentTitle() {
  const project = useEditor((s) => s.project);
  const setProjectName = useEditor((s) => s.setProjectName);
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        aria-label="Project name"
        value={project.name}
        onChange={(e) => setProjectName(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        size={Math.max(8, Math.min(32, project.name.length + 1))}
        className={cn(
          "h-7 min-w-0 max-w-[14rem] truncate rounded-md border border-transparent bg-transparent px-1 text-subtitle font-semibold text-ink outline-none sm:max-w-[18rem]",
          "hover:border-line-strong focus:border-accent focus:ring-1 focus:ring-accent",
        )}
      />
      {!focused && <SaveState />}
    </div>
  );
}

function SaveState() {
  const dirty = useEditor((s) => s.project.dirty);
  const savedAt = useEditor((s) => s.project.savedAt);
  return (
    <span className="hidden items-center gap-1 text-caption whitespace-nowrap text-ink-muted lg:flex" aria-live="polite">
      {dirty ? (
        <>
          <CloudOff className="size-3.5" aria-hidden /> Unsaved changes
        </>
      ) : savedAt ? (
        <>
          <Check className="size-3.5" aria-hidden /> Saved in this browser
        </>
      ) : null}
    </span>
  );
}

/** Looks like a search field (the Microsoft 365 and GitHub header pattern); opens the command palette. */
function SearchButton() {
  const setDialog = useEditor((s) => s.setDialog);
  const shortcut = displayShortcut("Ctrl K");
  return (
    <button
      type="button"
      onClick={() => setDialog("commands")}
      aria-label="Search actions, products and sheet sizes"
      aria-keyshortcuts={ariaShortcut("Ctrl K")}
      aria-haspopup="dialog"
      className={cn(
        "mx-auto flex h-(--control-h) shrink-0 items-center gap-2 rounded-md text-ink-muted transition-colors duration-(--duration-fast)",
        "w-(--control-h) justify-center hover:bg-subtle-2 hover:text-ink",
        "2xl:w-[min(360px,24vw)] 2xl:justify-start 2xl:border 2xl:border-line-strong 2xl:bg-subtle 2xl:px-3 2xl:hover:bg-subtle-2",
      )}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="hidden min-w-0 flex-1 truncate text-left text-body 2xl:inline">Search actions and products</span>
      <kbd className="hidden shrink-0 rounded border border-line-strong bg-surface px-1.5 font-sans text-caption 2xl:inline">{shortcut}</kbd>
    </button>
  );
}

function ProcessSwitch() {
  const process = useEditor((s) => s.doc.page.process);
  const setProcess = useEditor((s) => s.setProcess);
  const options: { value: PrintProcess; label: string; hint: string }[] = PROCESS_ORDER.map((value) => ({
    value,
    label: PROCESS_LABELS[value],
    hint: PROCESS_HINTS[value],
  }));
  return (
    <div role="radiogroup" aria-label="Print process" className="hidden h-(--control-h) items-center rounded-md bg-subtle-2 p-0.5 lg:flex">
      {options.map((o) => (
        <Tooltip key={o.value} label={o.hint}>
          <button
            type="button"
            role="radio"
            aria-checked={process === o.value}
            onClick={() => setProcess(o.value)}
            className={cn(
              "h-full rounded-[6px] px-2.5 text-caption font-medium transition-colors duration-(--duration-fast)",
              process === o.value ? "bg-control-selected text-ink shadow-card" : "text-ink-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
