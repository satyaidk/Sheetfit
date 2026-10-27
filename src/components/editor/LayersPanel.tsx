"use client";

/**
 * Layers panel (Canva's Position → Layers): every design, top-most first,
 * with drag-to-reorder, an insertion line, lock toggles and a warning icon for
 * designs outside the printable area.
 */

/* eslint-disable @next/next/no-img-element -- local object URLs */
import { useState } from "react";
import { GripVertical, Lock, LockOpen, TriangleAlert, ImagePlus } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { placementStatus } from "@/lib/layout/sheet-layout";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { findProduct } from "@/lib/catalogue/products";
import { ProductArt } from "@/components/products/ProductArt";
import { cn } from "@/lib/utils";

export function LayersPanel() {
  const designs = useEditor((s) => s.doc.designs);
  const page = useEditor((s) => s.doc.page);
  const assets = useEditor((s) => s.assets);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const updateDesign = useEditor((s) => s.updateDesign);
  const moveLayer = useEditor((s) => s.moveLayer);
  const unit = useEditor((s) => s.unit);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const u = unit === "px" ? "mm" : unit;
  const fmt = (mm: number) => formatUnit(mm, u, page.dpi);
  const visual = [...designs].reverse();

  if (designs.length === 0) {
    return <p className="p-6 text-center text-[13px] text-ink-muted">Layers appear here as you add designs.</p>;
  }

  return (
    <ul
      className="flex flex-col gap-0.5 p-2"
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null);
      }}
    >
      {visual.map((d, i) => {
        const a = d.assetId ? assets[d.assetId] : undefined;
        const product = findProduct(d.productId);
        const out = placementStatus(d, page).exceedsPrintable;
        const active = selection.includes(d.id);
        return (
          <li
            key={d.id}
            className="relative"
            draggable
            onDragStart={(e) => {
              setDragId(d.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", d.id);
            }}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              setDropAt(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId && dropAt !== null) {
                // Visual order is reversed: index 0 is the top of the stack.
                const from = visual.findIndex((x) => x.id === dragId);
                const target = dropAt > from ? dropAt - 1 : dropAt;
                moveLayer(dragId, designs.length - 1 - target);
              }
              setDragId(null);
              setDropAt(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDropAt(null);
            }}
          >
            {dropAt === i && <span className="absolute -top-px right-2 left-2 h-0.5 rounded bg-accent" />}
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => select([d.id], e.shiftKey || e.ctrlKey || e.metaKey ? "toggle" : "replace")}
              onKeyDown={(e) => e.key === "Enter" && select([d.id])}
              className={cn(
                "group flex items-center gap-2 rounded-md px-1.5 py-1.5",
                active ? "bg-accent-soft" : "hover:bg-subtle",
                dragId === d.id && "opacity-40",
              )}
            >
              <GripVertical className="size-3.5 shrink-0 cursor-grab text-ink-faint opacity-0 group-hover:opacity-100" />
              <span className="checker flex size-9 shrink-0 items-center justify-center overflow-hidden rounded ring-1 ring-line">
                {a ? (
                  <img src={a.objectUrl} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
                ) : product ? (
                  <ProductArt product={product} className="size-8" />
                ) : (
                  <ImagePlus className="size-4 text-ink-faint" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{d.name || "Untitled"}</span>
                <span className="tnum block text-[11px] text-ink-muted">
                  {fmt(d.width)} × {fmt(d.height)} {u}
                  {!d.assetId ? ", empty" : ""}
                </span>
              </span>
              {out && <TriangleAlert className="size-4 shrink-0 text-danger" aria-label="Outside the printable area" />}
              <button
                type="button"
                aria-label={d.locked ? "Unlock" : "Lock"}
                aria-pressed={d.locked}
                onClick={(e) => {
                  e.stopPropagation();
                  updateDesign(d.id, { locked: !d.locked });
                }}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded text-ink-faint hover:bg-subtle-2 hover:text-ink",
                  !d.locked && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                )}
              >
                {d.locked ? <Lock className="size-3.5 text-ink" /> : <LockOpen className="size-3.5" />}
              </button>
            </div>
          </li>
        );
      })}
      {dropAt === visual.length && <li className="mx-2 h-0.5 rounded bg-accent" />}
    </ul>
  );
}
