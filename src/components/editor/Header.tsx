"use client";

/**
 * Header bar (Canva's top bar): File menu, sheet size, print process, undo and
 * redo on the left; the project title in the middle; save state, Print and the
 * single primary Download action on the right.
 */

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileDown,
  FilePlus2,
  FolderInput,
  Keyboard,
  Loader2,
  Printer,
  Redo2,
  Save,
  Sparkles,
  Undo2,
  Ruler,
  Check,
  CloudOff,
} from "lucide-react";
import { useEditor } from "@/store/editor-store";
import type { PrintProcess } from "@/types/editor";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/Logo";
import { exportProjectFile, importProjectFile, saveCurrentProject } from "@/lib/editor-actions";
import { loadSampleSheet } from "@/lib/sample";
import { safeFilename } from "@/lib/export/export-raster";
import { pageSize } from "@/lib/layout/sheet-layout";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { sheetLabel } from "@/components/settings/SheetPanel";
import { cn } from "@/lib/utils";

export function Header() {
  const project = useEditor((s) => s.project);
  const setProjectName = useEditor((s) => s.setProjectName);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const setDialog = useEditor((s) => s.setDialog);
  const newProject = useEditor((s) => s.newProject);
  const hasDesigns = useEditor((s) => s.doc.designs.length > 0);
  const page = useEditor((s) => s.doc.page);
  const unit = useEditor((s) => s.unit);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const size = pageSize(page);
  const u = unit === "px" ? "mm" : unit;

  const save = async () => {
    setSaving(true);
    await saveCurrentProject();
    setSaving(false);
  };

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-1 border-b border-line bg-surface px-2 sm:gap-2 sm:px-3">
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md px-1 py-1" aria-label="Sheetfit home">
        <Logo className="size-8" />
        <span className="hidden text-[17px] font-bold tracking-tight lg:inline">Sheetfit</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-2.5">
            File
            <ChevronDown className="size-3.5 text-ink-faint" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-60">
          <DropdownMenuItem onSelect={() => setDialog("start")}>
            <FilePlus2 />
            New sheet…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <FolderInput />
            Open .sheetfit file…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void loadSampleSheet()}>
            <Sparkles />
            Open sample sheet
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void save()} shortcut="Ctrl S">
            <Save />
            Save in browser
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void exportProjectFile(safeFilename(project.name))}>
            <FileDown />
            Download .sheetfit file
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog("sheet")}>
            <Ruler />
            Sheet size…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("shortcuts")} shortcut="?">
            <Keyboard />
            Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => newProject()} className="text-danger [&_svg]:text-danger">
            <FilePlus2 />
            Clear and start blank
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInput}
        type="file"
        accept=".sheetfit,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importProjectFile(f);
          e.target.value = "";
        }}
      />

      <Tooltip label="Change sheet size">
        <Button variant="ghost" className="hidden gap-1 px-2.5 md:inline-flex" onClick={() => setDialog("sheet")}>
          <span className="font-semibold">{sheetLabel(page)}</span>
          <span className="tnum text-ink-muted">
            {formatUnit(size.width, u, page.dpi)} × {formatUnit(size.height, u, page.dpi)} {u}
          </span>
        </Button>
      </Tooltip>

      <ProcessSwitch />

      <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
      <Tooltip label="Undo" shortcut="Ctrl Z">
        <Button variant="ghost" size="icon" aria-label="Undo" disabled={!canUndo} onClick={undo}>
          <Undo2 />
        </Button>
      </Tooltip>
      <Tooltip label="Redo" shortcut="Ctrl Shift Z">
        <Button variant="ghost" size="icon" aria-label="Redo" disabled={!canRedo} onClick={redo}>
          <Redo2 />
        </Button>
      </Tooltip>

      <div className="mx-auto flex min-w-0 items-center gap-2 px-2">
        <input
          aria-label="Project name"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="h-9 w-24 min-w-0 truncate rounded-md bg-transparent px-2 text-center text-[14px] font-medium outline-none hover:bg-subtle focus:bg-surface focus:ring-2 focus:ring-accent sm:w-56"
        />
        <span className="hidden items-center gap-1 text-[12px] whitespace-nowrap text-ink-faint xl:flex" aria-live="polite">
          {project.dirty ? (
            <>
              <CloudOff className="size-3.5" /> Unsaved
            </>
          ) : project.savedAt ? (
            <>
              <Check className="size-3.5" /> Saved
            </>
          ) : null}
        </span>
      </div>

      <Tooltip label="Save in this browser" shortcut="Ctrl S">
        <Button variant="ghost" size="icon" aria-label="Save" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
        </Button>
      </Tooltip>
      <Tooltip label="Print at actual size" shortcut="Ctrl P">
        <Button variant="default" className="hidden sm:inline-flex" disabled={!hasDesigns} onClick={() => setDialog("print")}>
          <Printer />
          <span className="hidden lg:inline">Print</span>
        </Button>
      </Tooltip>
      <Button variant="primary" className="h-9 px-4" disabled={!hasDesigns} onClick={() => setDialog("export")}>
        <Download />
        <span className="hidden sm:inline">Download</span>
      </Button>
    </header>
  );
}

function ProcessSwitch() {
  const process = useEditor((s) => s.doc.page.process);
  const setProcess = useEditor((s) => s.setProcess);
  const options: { value: PrintProcess; label: string; hint: string }[] = [
    { value: "sublimation", label: "Sublimation", hint: "Mirrored output" },
    { value: "dtf", label: "DTF", hint: "Not mirrored, transparent PNG" },
  ];
  return (
    <div role="radiogroup" aria-label="Print process" className="hidden h-9 items-center rounded-lg bg-subtle p-1 lg:flex">
      {options.map((o) => (
        <Tooltip key={o.value} label={o.hint}>
          <button
            type="button"
            role="radio"
            aria-checked={process === o.value}
            onClick={() => setProcess(o.value)}
            className={cn(
              "h-7 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
              process === o.value ? "bg-surface text-ink shadow-[0_1px_2px_rgb(16_24_40/0.12)]" : "text-ink-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
