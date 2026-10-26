"use client";

/**
 * Left sidebar: an icon rail that switches between panels. On narrow screens
 * the rail becomes a bottom tab bar and the panel opens as a sheet.
 */

import { useEffect, useRef, useState } from "react";
/* eslint-disable @next/next/no-img-element -- local data URLs and object URLs */
import {
  Copy,
  FilePlus2,
  FolderInput,
  FolderOpen,
  Grid3x3,
  Image as ImageIcon,
  Layers,
  PaintBucket,
  Ruler,
  Trash2,
  TriangleAlert,
  Upload,
  X,
  FileText,
} from "lucide-react";
import { useEditor, type SidebarTab } from "@/store/editor-store";
import { ImageUploader } from "@/components/uploads/ImageUploader";
import { BackgroundSettings, GuideSettings, PageSettings } from "@/components/settings/PageSettings";
import { Note, Section } from "@/components/settings/Section";
import { NumberField } from "@/components/settings/NumberField";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { LayoutWarning } from "./PropertiesPanel";
import { placementStatus } from "@/lib/layout/a4-layout";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { deleteProject, duplicateProject, listProjects } from "@/lib/storage/project-storage";
import { importProjectFile, openProject } from "@/lib/editor-actions";
import type { ProjectSummary } from "@/types/project";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const TABS: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
  { id: "uploads", label: "Uploads", icon: <Upload /> },
  { id: "designs", label: "Designs", icon: <Layers /> },
  { id: "page", label: "Page", icon: <FileText /> },
  { id: "background", label: "Background", icon: <PaintBucket /> },
  { id: "guides", label: "Guides", icon: <Ruler /> },
  { id: "projects", label: "Projects", icon: <FolderOpen /> },
];

export function SidebarRail({ orientation = "vertical", onPick }: { orientation?: "vertical" | "horizontal"; onPick?: (tab: SidebarTab) => void }) {
  const tab = useEditor((s) => s.sidebarTab);
  const setTab = useEditor((s) => s.setSidebarTab);
  return (
    <nav
      aria-label="Editor panels"
      className={cn(
        "flex shrink-0 bg-chrome",
        orientation === "vertical" ? "w-[68px] flex-col gap-0.5 border-r border-line py-2" : "h-14 w-full justify-around border-t border-line",
      )}
    >
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => {
              setTab(t.id);
              onPick?.(t.id);
            }}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors [&_svg]:size-[18px]",
              orientation === "vertical" ? "mx-1.5 h-14 rounded-md" : "flex-1",
              active ? "text-cyan" : "text-ink-muted hover:text-ink",
              active && orientation === "vertical" && "bg-surface shadow-[0_0_0_1px_var(--line)]",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

export function SidebarPanel({ onClose }: { onClose?: () => void }) {
  const tab = useEditor((s) => s.sidebarTab);
  const title = TABS.find((t) => t.id === tab)?.label;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="font-condensed text-[17px] font-semibold tracking-tight">{title}</h2>
        {onClose && (
          <Button size="icon-sm" variant="ghost" aria-label="Close panel" onClick={onClose}>
            <X />
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "uploads" && <ImageUploader />}
        {tab === "designs" && <DesignsList />}
        {tab === "page" && <PageSettings />}
        {tab === "background" && <BackgroundSettings />}
        {tab === "guides" && <GuideSettings />}
        {tab === "projects" && <ProjectsPanel />}
      </div>
    </div>
  );
}

function DesignsList() {
  const doc = useEditor((s) => s.doc);
  const assets = useEditor((s) => s.assets);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const unit = useEditor((s) => s.unit);
  const autoArrange = useEditor((s) => s.autoArrange);
  const gap = useEditor((s) => s.layoutGap);
  const setLayoutGap = useEditor((s) => s.setLayoutGap);
  const [ran, setRan] = useState(false);
  const fmt = (mm: number) => formatUnit(mm, unit, doc.page.dpi);

  return (
    <div>
      <Section title="Auto-arrange">
        <p className="mb-2 text-[12px] text-ink-muted">
          Places every design in rows, tallest first, inside the margins. Sizes never change.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="↔" valueMm={gap.x} unit={unit} dpi={doc.page.dpi} min={0} max={50} onCommit={(x) => setLayoutGap({ ...gap, x })} />
          <NumberField label="↕" valueMm={gap.y} unit={unit} dpi={doc.page.dpi} min={0} max={50} onCommit={(y) => setLayoutGap({ ...gap, y })} />
        </div>
        <Button
          className="mt-1.5 w-full"
          size="sm"
          variant="dark"
          disabled={doc.designs.length === 0}
          onClick={() => {
            autoArrange("all");
            setRan(true);
          }}
        >
          <Grid3x3 />
          Arrange all designs
        </Button>
        {ran && <LayoutWarning />}
      </Section>
      <Section title={`On this sheet (${doc.designs.length})`}>
        {doc.designs.length === 0 ? (
          <p className="text-[12px] text-ink-muted">Nothing yet. Upload an image to place it on the sheet.</p>
        ) : (
          <ul className="-mx-1.5 flex flex-col">
            {[...doc.designs].reverse().map((d) => {
              const a = assets[d.assetId];
              const out = placementStatus(d, doc.page).exceedsPrintable;
              const active = selection.includes(d.id);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={(e) => select([d.id], e.shiftKey || e.ctrlKey || e.metaKey ? "toggle" : "replace")}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left",
                      active ? "bg-cyan-wash" : "hover:bg-chrome-sunk",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-line bg-surface">
                      {a ? <img src={a.objectUrl} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{d.name || "Untitled"}</span>
                      <span className="tnum block text-[11px] text-ink-muted">
                        {fmt(d.width)} × {fmt(d.height)} {unit}
                        {d.rotation ? `, ${Math.round(d.rotation)}°` : ""}
                      </span>
                    </span>
                    {out && <TriangleAlert className="size-4 shrink-0 text-magenta" aria-label="Outside the printable area" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function ProjectsPanel() {
  const project = useEditor((s) => s.project);
  const newProject = useEditor((s) => s.newProject);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "new" | "open" | "delete"; id?: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () =>
    listProjects()
      .then((p) => {
        setProjects(p);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((p) => !cancelled && setProjects(p))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [project.savedAt]);

  const runConfirmed = async () => {
    if (!confirm) return;
    if (confirm.kind === "new") newProject();
    if (confirm.kind === "open" && confirm.id) await openProject(confirm.id);
    if (confirm.kind === "delete" && confirm.id) {
      await deleteProject(confirm.id).catch((e: Error) => toast.error(e.message));
      await refresh();
    }
    setConfirm(null);
  };

  return (
    <div>
      <Section title="Current project">
        <p className="truncate text-[13px] font-medium">{project.name}</p>
        <p className="text-[12px] text-ink-muted">
          {project.savedAt ? `Saved ${new Date(project.savedAt).toLocaleString()}` : "Not saved yet"}
          {project.dirty ? ", with unsaved changes" : ""}
        </p>
        <div className="mt-2 flex gap-1.5">
          <Button className="flex-1" size="sm" onClick={() => (project.dirty ? setConfirm({ kind: "new" }) : newProject())}>
            <FilePlus2 />
            New project
          </Button>
          <Button className="flex-1" size="sm" onClick={() => fileInput.current?.click()}>
            <FolderInput />
            Open file
          </Button>
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
        </div>
      </Section>
      <Section title="Saved in this browser">
        {error && <Note tone="error">{error}</Note>}
        {!error && projects === null && <p className="text-[12px] text-ink-muted">Loading…</p>}
        {!error && projects?.length === 0 && (
          <p className="text-[12px] text-ink-muted">No saved projects. Use Save in the top bar or press Ctrl S.</p>
        )}
        <ul className="flex flex-col gap-2">
          {projects?.map((p) => (
            <li key={p.id} className={cn("rounded-md border bg-surface p-2", p.id === project.id ? "border-cyan" : "border-line")}>
              <button
                type="button"
                className="flex w-full gap-2.5 text-left"
                onClick={() => (project.dirty && p.id !== project.id ? setConfirm({ kind: "open", id: p.id }) : void openProject(p.id))}
              >
                <span className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-line bg-white">
                  {p.thumbnail ? <img src={p.thumbnail} alt="" className="max-h-full max-w-full" /> : <FileText className="size-4 text-ink-faint" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{p.name}</span>
                  <span className="block text-[11px] text-ink-muted">
                    {p.designCount} {p.designCount === 1 ? "design" : "designs"}
                  </span>
                  <span className="block text-[11px] text-ink-muted">{new Date(p.updatedAt).toLocaleDateString()}</span>
                </span>
              </button>
              <div className="mt-1.5 flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await duplicateProject(p.id).catch((e: Error) => toast.error(e.message));
                    await refresh();
                  }}
                >
                  <Copy />
                  Duplicate
                </Button>
                <Button size="sm" variant="ghost" className="text-magenta" onClick={() => setConfirm({ kind: "delete", id: p.id })}>
                  <Trash2 />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent
          title={confirm?.kind === "delete" ? "Delete this project?" : "Discard unsaved changes?"}
          description={
            confirm?.kind === "delete"
              ? "The project and any images only it uses are removed from this browser. This cannot be undone."
              : "The current sheet has changes that are not saved. They will be lost."
          }
          confirmLabel={confirm?.kind === "delete" ? "Delete project" : "Discard changes"}
          tone="danger"
          onConfirm={() => void runConfirmed()}
        />
      </AlertDialog>
    </div>
  );
}
