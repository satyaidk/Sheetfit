"use client";

/**
 * Products panel: the catalogue of sublimation and DTF templates.
 *
 * Each card shows a photoreal render of the product's 3D model with a sample
 * design on it (`ProductArt`), so users see a real-looking product rather than
 * a line drawing. Badges give the print size in inches and the sheet it needs;
 * "3D" opens the interactive model in any colour.
 *
 * Clicking a card starts a new design for that product (asking to save or
 * discard current work first); the "+" button adds it to the current sheet
 * instead, for gang sheets.
 */

import { useState } from "react";
import { Box, Plus, Search, X } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { GROUP_LABELS, minSheetFor, searchProducts, type ProductGroup, type ProductPreset } from "@/lib/catalogue/products";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { addProduct, requestProduct } from "@/lib/editor-actions";
import { ProductArt, ProductDetail, hasDetailPhoto } from "./ProductArt";
import { NumberField } from "@/components/settings/NumberField";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Filter = "all" | "sublimation" | "dtf";
type GroupFilter = "all" | ProductGroup;
const GROUPS: ProductGroup[] = ["drinkware", "flat", "apparel", "accessory"];

export function ProductsPanel() {
  const process = useEditor((s) => s.doc.page.process);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(process);
  const [group, setGroup] = useState<GroupFilter>("all");
  const results = searchProducts(query, filter === "all" ? undefined : filter);
  const shownGroups = GROUPS.filter((g) => group === "all" || g === group);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mugs, tumblers, shirts…"
            aria-label="Search products"
            className="h-10 w-full rounded-md bg-subtle pr-9 pl-9 text-[13px] outline-none ring-1 ring-transparent transition placeholder:text-ink-faint focus:bg-surface focus:ring-accent"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-ink-faint hover:bg-subtle-2 hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <Segmented<Filter>
        ariaLabel="Print process"
        value={filter}
        onValueChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "sublimation", label: "Sublimation" },
          { value: "dtf", label: "DTF" },
        ]}
      />

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Product category">
        {(["all", ...GROUPS] as GroupFilter[]).map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={group === g}
            onClick={() => setGroup(g)}
            className={cn(
              "h-7 shrink-0 rounded-full px-2.5 text-[12px] font-medium transition-colors",
              group === g ? "bg-ink text-white" : "bg-subtle text-ink hover:bg-subtle-2",
            )}
          >
            {g === "all" ? "All" : GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {results.length === 0 && (
        <p className="py-6 text-center text-[13px] text-ink-muted">No products match. Use a custom size below for anything not listed.</p>
      )}

      {shownGroups.map((g) => {
        const items = results.filter((p) => p.group === g);
        if (items.length === 0) return null;
        return (
          <section key={g} className="mt-1">
            <h3 className="mb-2 text-[13px] font-semibold text-ink">
              {GROUP_LABELS[g]} <span className="font-normal text-ink-faint">{items.length}</span>
            </h3>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-3">
              {items.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <CustomSizeCard />

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Sizes come from blank suppliers and print guides; brands vary, so every size stays editable. Hover a card for its
        source. Pictures are renders of each product&apos;s 3D model with a sample design generated by Sheetfit.
      </p>
    </div>
  );
}

const inches = (mm: number) => +(mm / 25.4).toFixed(2);

function ProductCard({ product }: { product: ProductPreset }) {
  const unit = useEditor((s) => s.unit);
  const dpi = useEditor((s) => s.doc.page.dpi);
  const sheet = minSheetFor(product);
  const fmt = (mm: number) => formatUnit(mm, unit === "px" || unit === "in" ? "mm" : unit, dpi);
  const shownUnit = unit === "px" || unit === "in" ? "mm" : unit;
  const host = new URL(product.source).hostname.replace(/^www\./, "");
  const label = `${product.name}, ${product.detail}`;

  return (
    <div className="group relative">
      <Tooltip
        label={`Start a design for this product. Size from ${host}, ${product.confidence} confidence.`}
        side="right"
      >
        <button type="button" onClick={() => requestProduct(product.id)} className="flex w-full flex-col text-left" aria-label={`Design ${label}`}>
          <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_30%,var(--surface)_0%,var(--subtle-2)_70%,var(--line)_100%)] ring-1 ring-line transition group-hover:ring-2 group-hover:ring-accent group-has-[button:focus-visible]:ring-2 group-has-[button:focus-visible]:ring-accent">
            <ProductArt product={product} className="size-[94%] transition-transform duration-300 group-hover:scale-[1.05]" />
            {hasDetailPhoto(product) && (
              <span className="absolute right-1.5 bottom-1.5 size-14 overflow-hidden rounded-full bg-surface shadow-[0_2px_8px_rgb(16_24_40/0.25)] ring-2 ring-surface">
                <ProductDetail product={product} className="size-full" />
              </span>
            )}
            <span className="tnum absolute top-1.5 left-1.5 rounded-full bg-surface/95 px-2 py-0.5 text-[10.5px] font-semibold text-ink shadow-sm">
              {inches(product.width)} × {inches(product.height)} in
            </span>
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[10.5px] font-semibold text-white">
              {sheet ? sheet.short : "Roll"}
            </span>
          </span>
          <span className="mt-1.5 block truncate px-0.5 text-[12.5px] font-semibold">{product.name}</span>
          <span className="block truncate px-0.5 text-[11.5px] text-ink-muted">{product.detail}</span>
          <span className="tnum block px-0.5 text-[11px] text-ink-faint">
            {fmt(product.width)} × {fmt(product.height)} {shownUnit}
          </span>
        </button>
      </Tooltip>
      <Tooltip label="View in 3D">
        <button
          type="button"
          onClick={() => useEditor.getState().openViewer3d(product.id)}
          aria-label={`View ${label} in 3D`}
          className="absolute top-1.5 right-10 flex h-7 items-center gap-1 rounded-full bg-surface px-2 text-[11.5px] font-semibold text-ink opacity-0 shadow ring-1 ring-line transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Box className="size-3.5" />
          3D
        </button>
      </Tooltip>
      <Tooltip label="Add to the current sheet instead">
        <button
          type="button"
          onClick={() => addProduct(product.id)}
          aria-label={`Add ${label} to this sheet`}
          className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-white opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Plus className="size-4" />
        </button>
      </Tooltip>
    </div>
  );
}

function CustomSizeCard() {
  const unit = useEditor((s) => s.unit);
  const dpi = useEditor((s) => s.doc.page.dpi);
  const addEmptySlot = useEditor((s) => s.addEmptySlot);
  const [w, setW] = useState(90);
  const [h, setH] = useState(60);
  return (
    <div className="rounded-lg bg-subtle p-3">
      <p className="text-[13px] font-semibold">Custom size</p>
      <p className="mb-2 text-[11.5px] text-ink-muted">For blanks not listed: an empty box at the size you type.</p>
      <div className="flex items-center gap-1.5">
        <NumberField label="W" valueMm={w} unit={unit} dpi={dpi} min={1} max={2000} onCommit={setW} className="bg-surface" />
        <span className="text-ink-faint">×</span>
        <NumberField label="H" valueMm={h} unit={unit} dpi={dpi} min={1} max={6000} onCommit={setH} className="bg-surface" />
      </div>
      <Button variant="primary" className="mt-2 w-full" onClick={() => addEmptySlot({ width: w, height: h }, `Custom ${Math.round(w)} × ${Math.round(h)} mm`)}>
        <Plus />
        Add box
      </Button>
    </div>
  );
}
