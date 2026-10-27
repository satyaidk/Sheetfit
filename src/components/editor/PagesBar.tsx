"use client";

/**
 * Page strip under the canvas (Canva's page navigator).
 *
 * Each page has its own sheet, so a 30 oz tumbler on A3 and a set of coasters
 * on A4 live side by side without one forcing its sheet on the other. Each
 * thumbnail is a live miniature (images in place, empty product boxes dashed),
 * labelled with the page number and sheet. The menu duplicates, deletes or
 * resizes a page; "+" adds a page with the same sheet or a chosen one.
 */

import { useState } from "react";
import { Copy, Ellipsis, Plus, Ruler, Trash2 } from "lucide-react";
import { allPages, useEditor } from "@/store/editor-store";
import type { EditorDocument, PageSettings } from "@/types/editor";
import { designBounds, pageSize, sheetLabel } from "@/lib/layout/sheet-layout";
import { findSheet } from "@/lib/catalogue/sheets";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NEW_PAGE_SHEETS = ["a4", "letter", "a3", "a3plus", "dtf-22x24"];

export function PagesBar() {
  const doc = useEditor((s) => s.doc);
  const pages = useEditor((s) => s.pages);
  const activePage = useEditor((s) => s.activePage);
  const assets = useEditor((s) => s.assets);
  const interacting = useEditor((s) => s.interacting);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const docs = allPages({ pages, activePage, doc });
  const s = useEditor.getState;

  const remove = (i: number) => (docs[i].designs.length > 0 ? setConfirmDelete(i) : s().deletePage(i));
  const addWith = (sheet: string) => {
    const base: PageSettings = { ...doc.page, sheet, customSize: null, orientation: "portrait" };
    s().addPage(base);
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex justify-center px-4 transition-opacity",
        interacting && "opacity-40",
      )}
    >
      <nav
        aria-label="Pages"
        className="scroll-thin pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-surface p-1 shadow-bar ring-1 ring-line"
      >
        {docs.map((d, i) => (
          <PageThumb
            key={pages[i].id}
            doc={d}
            index={i}
            active={i === activePage}
            single={docs.length === 1}
            assets={assets}
            onOpen={() => s().switchPage(i)}
            onDuplicate={() => s().duplicatePage(i)}
            onDelete={() => remove(i)}
            onResize={() => {
              s().switchPage(i);
              s().setDialog("sheet");
            }}
          />
        ))}
        <DropdownMenu>
          <Tooltip label="Add a page with its own sheet">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Add page"
                className="flex h-12 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium text-ink-muted hover:bg-subtle hover:text-ink"
              >
                <Plus className="size-4" />
                {docs.length === 1 && "Add page"}
              </button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent side="top" align="end" className="min-w-56">
            <DropdownMenuItem onSelect={() => s().addPage()}>
              <Plus />
              Same sheet ({sheetLabel(doc.page)})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {NEW_PAGE_SHEETS.filter((id) => id !== doc.page.sheet).map((id) => (
              <DropdownMenuItem key={id} onSelect={() => addWith(id)}>
                <span className="w-5" />
                {findSheet(id)!.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                s().addPage();
                s().setDialog("sheet");
              }}
            >
              <Ruler />
              Other size…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent
          title={`Delete page ${(confirmDelete ?? 0) + 1}?`}
          description="The page and its designs are removed from this project. Undo cannot bring a deleted page back."
          confirmLabel="Delete page"
          tone="danger"
          onConfirm={() => {
            if (confirmDelete !== null) s().deletePage(confirmDelete);
            setConfirmDelete(null);
          }}
        />
      </AlertDialog>
    </div>
  );
}

function PageThumb({
  doc,
  index,
  active,
  single,
  assets,
  onOpen,
  onDuplicate,
  onDelete,
  onResize,
}: {
  doc: EditorDocument;
  index: number;
  active: boolean;
  single: boolean;
  assets: ReturnType<typeof useEditor.getState>["assets"];
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onResize: () => void;
}) {
  const size = pageSize(doc.page);
  const h = 36;
  const w = Math.max(16, Math.min(64, (size.width / size.height) * h));
  const label = `Page ${index + 1}, ${sheetLabel(doc.page)} ${doc.page.orientation}, ${doc.designs.length} ${doc.designs.length === 1 ? "design" : "designs"}`;

  return (
    <div className={cn("group relative flex shrink-0 items-center rounded-lg", active ? "bg-accent-soft" : "hover:bg-subtle")}>
      <Tooltip label={label} side="top">
        <button
          type="button"
          aria-label={label}
          aria-current={active ? "page" : undefined}
          onClick={onOpen}
          className="flex h-12 items-center gap-2 py-1 pr-2 pl-1.5"
        >
          <svg
            viewBox={`0 0 ${size.width} ${size.height}`}
            width={w}
            height={h}
            className={cn("rounded-[2px] bg-white shadow-[0_0_0_1px_var(--line-strong)]", active && "shadow-[0_0_0_2px_var(--accent)]")}
            aria-hidden
          >
            {doc.designs.map((d) => {
              const asset = d.assetId ? assets[d.assetId] : undefined;
              const b = designBounds(d);
              const cx = d.x + d.width / 2;
              const cy = d.y + d.height / 2;
              return asset ? (
                <image
                  key={d.id}
                  href={asset.objectUrl}
                  x={d.x}
                  y={d.y}
                  width={d.width}
                  height={d.height}
                  preserveAspectRatio="xMidYMid meet"
                  transform={`rotate(${d.rotation} ${cx} ${cy})`}
                />
              ) : (
                <rect key={d.id} x={b.x} y={b.y} width={b.width} height={b.height} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={Math.max(size.width, size.height) / 90} strokeDasharray="6 4" />
              );
            })}
          </svg>
          <span className="flex flex-col items-start leading-tight">
            <span className={cn("tnum text-[12px] font-semibold", active ? "text-accent" : "text-ink")}>{index + 1}</span>
            <span className="text-[10.5px] whitespace-nowrap text-ink-muted">{findSheet(doc.page.sheet)?.short ?? "Custom"}</span>
          </span>
        </button>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Page ${index + 1} options`}
            className={cn(
              "mr-1 flex size-6 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink",
              active ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            )}
          >
            <Ellipsis className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-48">
          <DropdownMenuItem onSelect={onResize}>
            <Ruler />
            Sheet size…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy />
            Duplicate page
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onDelete} disabled={single} className="text-danger [&_svg]:text-danger">
            <Trash2 />
            Delete page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
