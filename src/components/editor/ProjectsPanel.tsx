"use client";

/**
 * Projects panel: the current project, projects saved in this browser, and
 * `.sheetfit` files. Destructive or state-losing actions ask first.
 */

/* eslint-disable @next/next/no-img-element -- local data URLs */
import { useEffect, useRef, useState } from "react";
import { Copy, FilePlus2, FileText, FolderInput, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/store/editor-store";
import { Note, Section } from "@/components/settings/Section";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { deleteProject, duplicateProject, listProjects } from "@/lib/storage/project-storage";
import { importProjectFile, openProject } from "@/lib/editor-actions";
import type { ProjectSummary } from "@/types/project";
import { cn } from "@/lib/utils";

export function ProjectsPanel() {
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
            <li key={p.id} className={cn("rounded-lg bg-surface p-2", p.id === project.id ? "ring-1 ring-accent" : "ring-1 ring-line")}>
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
                    {p.pageCount > 1 && `, ${p.pageCount} pages`}
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
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirm({ kind: "delete", id: p.id })}>
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
