"use client";

/**
 * Footer bar: sheet facts on the left (size, process, how much of the sheet is
 * used), zoom on the right (slider, percentage menu, fit buttons) as in
 * Canva's bottom bar. Sheet usage answers the most common gang-sheet
 * complaint: paying for empty film.
 */

import { FlipHorizontal2, Keyboard, Maximize, Scan, TriangleAlert } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { designBounds, pageSize, placementStatus, printableRect } from "@/lib/layout/sheet-layout";
import { sheetUtilisation } from "@/lib/layout/measure";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sheetLabel } from "@/components/settings/SheetPanel";
import { MAX_ZOOM, MIN_ZOOM } from "@/store/editor-store";

const STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const toSlider = (z: number) => (Math.log(z) - Math.log(MIN_ZOOM)) / (Math.log(MAX_ZOOM) - Math.log(MIN_ZOOM)) * 100;
const fromSlider = (v: number) => Math.exp(Math.log(MIN_ZOOM) + (v / 100) * (Math.log(MAX_ZOOM) - Math.log(MIN_ZOOM)));

export function Footer() {
  const doc = useEditor((s) => s.doc);
  const zoom = useEditor((s) => s.zoom);
  const zoomTo = useEditor((s) => s.zoomTo);
  const fitPage = useEditor((s) => s.fitPage);
  const zoomToSelection = useEditor((s) => s.zoomToSelection);
  const setDialog = useEditor((s) => s.setDialog);
  const unit = useEditor((s) => s.unit);
  const page = doc.page;
  const size = pageSize(page);
  const u = unit === "px" ? "mm" : unit;
  const used = sheetUtilisation(doc.designs.map(designBounds), printableRect(page));
  const outside = doc.designs.filter((d) => placementStatus(d, page).exceedsPrintable).length;

  return (
    <footer className="tnum relative z-20 hidden h-11 shrink-0 items-center gap-3 border-t border-line bg-surface px-3 text-[12px] text-ink-muted md:flex">
      <span className="font-medium text-ink">{sheetLabel(page)}</span>
      <span>
        {formatUnit(size.width, u, page.dpi)} × {formatUnit(size.height, u, page.dpi)} {u}
      </span>
      {page.mirrorOutput && (
        <span className="flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 font-medium text-ink">
          <FlipHorizontal2 className="size-3.5" /> Mirrored output
        </span>
      )}
      <Tooltip label="Share of the printable area covered by designs">
        <span className="flex items-center gap-2">
          Sheet used
          <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-subtle-2">
            <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.round(used * 100)}%` }} />
          </span>
          <span className="font-medium text-ink">{Math.round(used * 100)}%</span>
        </span>
      </Tooltip>
      {outside > 0 && (
        <span className="flex items-center gap-1 font-medium text-danger">
          <TriangleAlert className="size-3.5" />
          {outside} outside margins
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Slider
          aria-label="Zoom"
          className="w-32"
          min={0}
          max={100}
          step={0.5}
          value={[toSlider(zoom)]}
          onValueChange={([v]) => zoomTo(fromSlider(v))}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="h-8 w-14 rounded-md text-[12px] font-semibold text-ink hover:bg-subtle" aria-label="Zoom level">
              {Math.round(zoom * 100)}%
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-44">
            <DropdownMenuItem onSelect={fitPage} shortcut="Shift 2">
              Fit sheet
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={zoomToSelection} shortcut="Shift 3">
              Fit selection
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => zoomTo(1)} shortcut="Shift 0">
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
        <Tooltip label="Fit sheet" shortcut="Shift 2">
          <Button variant="ghost" size="icon" aria-label="Fit sheet" onClick={fitPage}>
            <Maximize />
          </Button>
        </Tooltip>
        <Tooltip label="Fit selection" shortcut="Shift 3">
          <Button variant="ghost" size="icon" aria-label="Fit selection" onClick={zoomToSelection}>
            <Scan />
          </Button>
        </Tooltip>
        <Tooltip label="Keyboard shortcuts" shortcut="?">
          <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts" onClick={() => setDialog("shortcuts")}>
            <Keyboard />
          </Button>
        </Tooltip>
      </div>
    </footer>
  );
}
