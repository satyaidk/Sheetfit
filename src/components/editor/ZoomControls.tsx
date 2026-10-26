"use client";

import { Maximize, Minus, Plus } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

export function ZoomControls() {
  const zoom = useEditor((s) => s.zoom);
  const zoomTo = useEditor((s) => s.zoomTo);
  const fitPage = useEditor((s) => s.fitPage);
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-line bg-chrome p-0.5">
      <Tooltip label="Zoom out" shortcut="-">
        <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => zoomTo(zoom / 1.25)}>
          <Minus />
        </Button>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="tnum h-7 w-14 rounded-[4px] text-[12px] font-semibold hover:bg-surface" aria-label="Zoom level">
            {Math.round(zoom * 100)}%
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-40">
          <DropdownMenuItem onSelect={fitPage} shortcut="Shift 1">
            Fit page
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => zoomTo(1)} shortcut="Shift 0">
            Actual size (100%)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {STEPS.map((s) => (
            <DropdownMenuItem key={s} onSelect={() => zoomTo(s)}>
              {s * 100}%
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip label="Zoom in" shortcut="+">
        <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => zoomTo(zoom * 1.25)}>
          <Plus />
        </Button>
      </Tooltip>
      <Tooltip label="Fit page" shortcut="Shift 1">
        <Button variant="ghost" size="icon-sm" aria-label="Fit page" onClick={fitPage}>
          <Maximize />
        </Button>
      </Tooltip>
    </div>
  );
}
