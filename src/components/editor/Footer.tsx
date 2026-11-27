"use client";

/**
 * Status bar (the VS Code and Office pattern): the page's facts on the left,
 * each one a button that changes it (sheet size, print process, mirror),
 * then how much of the sheet is used and any warnings; zoom on the right.
 * Sheet usage answers the most common gang-sheet complaint: paying for empty
 * film.
 */

import { FlipHorizontal2, Keyboard, Maximize, Minus, Plus, Scan, TriangleAlert } from "lucide-react";
import { resolveMirror } from "@/lib/render/mirror";
import { useEditor } from "@/store/editor-store";
import { designBounds, pageSize, placementStatus, printableRect } from "@/lib/layout/sheet-layout";
import { sheetUtilisation } from "@/lib/layout/measure";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { PROCESS_LABELS, PROCESS_ORDER } from "@/lib/catalogue/processes";
import { MIRROR_CHOICES } from "@/lib/commands/editor-commands";
import { displayShortcut } from "@/lib/commands/shortcuts";
import type { MirrorMode, PrintProcess } from "@/types/editor";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sheetLabel } from "@/components/settings/SheetPanel";
import { MAX_ZOOM, MIN_ZOOM } from "@/store/editor-store";
import { cn } from "@/lib/utils";

const STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const toSlider = (z: number) => (Math.log(z) - Math.log(MIN_ZOOM)) / (Math.log(MAX_ZOOM) - Math.log(MIN_ZOOM)) * 100;
const fromSlider = (v: number) => Math.exp(Math.log(MIN_ZOOM) + (v / 100) * (Math.log(MAX_ZOOM) - Math.log(MIN_ZOOM)));

/** A status bar item: full height, quiet until hovered, like VS Code's. */
const itemClass =
  "flex h-full shrink-0 items-center gap-1.5 rounded-none px-2 whitespace-nowrap text-ink-muted outline-none transition-colors duration-(--duration-fast) hover:bg-subtle-2 hover:text-ink focus-visible:bg-subtle-2 focus-visible:text-ink data-[state=open]:bg-subtle-2 [&_svg]:size-3.5";

export function Footer() {
  const doc = useEditor((s) => s.doc);
  const zoom = useEditor((s) => s.zoom);
  const zoomTo = useEditor((s) => s.zoomTo);
  const fitPage = useEditor((s) => s.fitPage);
  const zoomToSelection = useEditor((s) => s.zoomToSelection);
  const setDialog = useEditor((s) => s.setDialog);
  const setProcess = useEditor((s) => s.setProcess);
  const setPage = useEditor((s) => s.setPage);
  const pageCount = useEditor((s) => s.pages.length);
  const activePage = useEditor((s) => s.activePage);
  const unit = useEditor((s) => s.unit);
  const page = doc.page;
  const size = pageSize(page);
  const u = unit === "px" ? "mm" : unit;
  const used = sheetUtilisation(doc.designs.map(designBounds), printableRect(page));
  const outside = doc.designs.filter((d) => placementStatus(d, page).exceedsPrintable).length;
  const mirrored = resolveMirror(page);

  return (
    <footer
      aria-label="Status bar"
      className="tnum relative z-20 hidden h-(--statusbar-h) shrink-0 items-stretch border-t border-line bg-surface text-caption md:flex"
    >
      <div className="flex min-w-0 items-stretch overflow-hidden">
        {pageCount > 1 && (
          <span className={cn(itemClass, "hover:bg-transparent hover:text-ink-muted")}>
            Page {activePage + 1} of {pageCount}
          </span>
        )}
        <Tooltip label="Change the sheet size" side="top">
          <button type="button" className={itemClass} onClick={() => setDialog("sheet")}>
            <span className="font-semibold text-ink">{sheetLabel(page)}</span>
            <span>
              {formatUnit(size.width, u, page.dpi)} × {formatUnit(size.height, u, page.dpi)} {u}
            </span>
          </button>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger className={itemClass} aria-label={`Print process: ${PROCESS_LABELS[page.process]}. Change`}>
            <ProcessDot process={page.process} />
            {PROCESS_LABELS[page.process]}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-52">
            <DropdownMenuLabel>Print process for this page</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={page.process} onValueChange={(v) => setProcess(v as PrintProcess)}>
              {PROCESS_ORDER.map((p) => (
                <DropdownMenuRadioItem key={p} value={p}>
                  {PROCESS_LABELS[p]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className={itemClass} aria-label={`Output ${mirrored ? "mirrored" : "not mirrored"}. Change`}>
            <FlipHorizontal2 className={mirrored ? "text-accent" : undefined} />
            {mirrored ? "Mirrored" : "Not mirrored"}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-60">
            <DropdownMenuLabel>Mirror the printed output</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={page.mirrorMode} onValueChange={(v) => setPage({ mirrorMode: v as MirrorMode })}>
              {MIRROR_CHOICES.map((m) => (
                <DropdownMenuRadioItem key={m.value} value={m.value}>
                  {m.title.replace("Mirror output: ", "")}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip label="Share of the printable area covered by designs" side="top">
          <span className={cn(itemClass, "gap-2 hover:bg-transparent hover:text-ink-muted")}>
            Sheet used
            <span
              role="meter"
              aria-label="Sheet used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(used * 100)}
              className="relative h-1.5 w-16 overflow-hidden rounded-full bg-line-strong"
            >
              <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.round(used * 100)}%` }} />
            </span>
            <span className="font-semibold text-ink">{Math.round(used * 100)}%</span>
          </span>
        </Tooltip>
        {outside > 0 && (
          <span className={cn(itemClass, "font-semibold text-danger hover:bg-transparent hover:text-danger")} role="status">
            <TriangleAlert />
            {outside} outside the margins
          </span>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5 pr-1.5">
        <Tooltip label="Zoom out" shortcut="-" side="top">
          <button type="button" aria-label="Zoom out" className={cn(itemClass, "h-7 rounded-md px-1.5")} onClick={() => zoomTo(zoom / 1.25)}>
            <Minus />
          </button>
        </Tooltip>
        <Slider aria-label="Zoom" className="w-28" min={0} max={100} step={0.5} value={[toSlider(zoom)]} onValueChange={([v]) => zoomTo(fromSlider(v))} />
        <Tooltip label="Zoom in" shortcut="+" side="top">
          <button type="button" aria-label="Zoom in" className={cn(itemClass, "h-7 rounded-md px-1.5")} onClick={() => zoomTo(zoom * 1.25)}>
            <Plus />
          </button>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(itemClass, "h-7 w-14 justify-center rounded-md font-semibold text-ink")} aria-label="Zoom level">
              {Math.round(zoom * 100)}%
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-48">
            <DropdownMenuItem onSelect={fitPage} shortcut={displayShortcut("Shift 2")}>
              Fit sheet
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={zoomToSelection} shortcut={displayShortcut("Shift 3")}>
              Fit selection
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => zoomTo(1)} shortcut={displayShortcut("Shift 0")}>
              Actual size
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {STEPS.map((s) => (
              <DropdownMenuItem key={s} onSelect={() => zoomTo(s)}>
                {s * 100}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <Tooltip label="Fit sheet" shortcut={displayShortcut("Shift 2")} side="top">
          <button type="button" aria-label="Fit sheet" className={cn(itemClass, "h-7 rounded-md px-1.5")} onClick={fitPage}>
            <Maximize />
          </button>
        </Tooltip>
        <Tooltip label="Fit selection" shortcut={displayShortcut("Shift 3")} side="top">
          <button type="button" aria-label="Fit selection" className={cn(itemClass, "h-7 rounded-md px-1.5")} onClick={zoomToSelection}>
            <Scan />
          </button>
        </Tooltip>
        <Tooltip label="Keyboard shortcuts" shortcut="?" side="top">
          <button type="button" aria-label="Keyboard shortcuts" className={cn(itemClass, "h-7 rounded-md px-1.5")} onClick={() => setDialog("shortcuts")}>
            <Keyboard />
          </button>
        </Tooltip>
      </div>
    </footer>
  );
}

/** Process colour key: cyan for sublimation, magenta for DTF, yellow for stickers (the print inks). */
function ProcessDot({ process }: { process: PrintProcess }) {
  const color = process === "sublimation" ? "bg-process-cyan" : process === "dtf" ? "bg-process-magenta" : "bg-process-yellow";
  return <span aria-hidden className={cn("size-2 rounded-full ring-1 ring-line-strong", color)} />;
}
