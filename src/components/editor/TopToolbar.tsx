"use client";

import { Download, Printer, Redo2, Save, Undo2, Loader2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useEditor } from "@/store/editor-store";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { saveCurrentProject } from "@/lib/editor-actions";
import { ZoomControls } from "./ZoomControls";
import { Logo } from "@/components/Logo";

export function TopToolbar() {
  const project = useEditor((s) => s.project);
  const setProjectName = useEditor((s) => s.setProjectName);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const setDialog = useEditor((s) => s.setDialog);
  const hasDesigns = useEditor((s) => s.doc.designs.length > 0);
  const [saving, setSaving] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:px-3">
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md pr-1" aria-label="Sheetfit home">
        <Logo className="size-7" />
        <span className="font-condensed hidden text-[19px] font-bold tracking-tight sm:inline">Sheetfit</span>
      </Link>
      <span className="hidden h-5 w-px bg-line sm:block" />
      <div className="flex min-w-0 items-center gap-1.5">
        <input
          aria-label="Project name"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="h-8 w-28 min-w-0 rounded-md border border-transparent bg-transparent px-1.5 text-[13px] font-medium outline-none hover:border-line focus:border-cyan sm:w-48"
        />
        <span className="hidden text-[11px] whitespace-nowrap text-ink-faint lg:inline" aria-live="polite">
          {project.dirty ? "Unsaved changes" : project.savedAt ? "Saved" : ""}
        </span>
      </div>

      <div className="ml-1 flex items-center">
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
      </div>

      <div className="mx-auto hidden md:block">
        <ZoomControls />
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:ml-0">
        <Tooltip label="Save in this browser" shortcut="Ctrl S">
          <Button
            variant="ghost"
            size="md"
            aria-label="Save project"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await saveCurrentProject();
              setSaving(false);
            }}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            <span className="hidden lg:inline">Save</span>
          </Button>
        </Tooltip>
        <Tooltip label="Print at actual size" shortcut="Ctrl P">
          <Button variant="default" aria-label="Print" disabled={!hasDesigns} onClick={() => setDialog("print")}>
            <Printer />
            <span className="hidden lg:inline">Print</span>
          </Button>
        </Tooltip>
        <Button variant="primary" disabled={!hasDesigns} onClick={() => setDialog("export")}>
          <Download />
          Export
        </Button>
      </div>
    </header>
  );
}
