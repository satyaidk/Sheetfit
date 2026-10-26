"use client";

import { TriangleAlert } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { placementStatus } from "@/lib/layout/a4-layout";
import { pagePixelSize } from "@/lib/export/rasterize";
import { pageSize } from "@/lib/layout/a4-layout";

/** Status bar: page, resolution, counts and zoom. */
export function BottomBar() {
  const doc = useEditor((s) => s.doc);
  const zoom = useEditor((s) => s.zoom);
  const selection = useEditor((s) => s.selection);
  const page = pageSize(doc.page.orientation);
  const px = pagePixelSize(page, doc.page.dpi);
  const outside = doc.designs.filter((d) => placementStatus(d, doc.page).exceedsPrintable).length;

  return (
    <footer className="tnum hidden h-8 shrink-0 items-center gap-4 border-t border-line bg-chrome px-3 text-[12px] text-ink-muted md:flex">
      <span>Page 1 of 1</span>
      <span>
        A4 {doc.page.orientation}, {page.width} × {page.height} mm
      </span>
      <span>
        {doc.page.dpi} DPI export, {px.width} × {px.height} px
      </span>
      <span>
        {doc.designs.length} {doc.designs.length === 1 ? "design" : "designs"}
        {selection.length > 0 ? `, ${selection.length} selected` : ""}
      </span>
      {outside > 0 && (
        <span className="flex items-center gap-1 font-medium text-magenta">
          <TriangleAlert className="size-3.5" />
          {outside} outside printable area
        </span>
      )}
      <span className="ml-auto">{Math.round(zoom * 100)}%</span>
    </footer>
  );
}
