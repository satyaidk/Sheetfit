"use client";

/**
 * Products panel: the catalogue of sublimation and DTF templates.
 *
 * Each card shows the product with a sample design on it, in a blank colour,
 * so users can picture the result; the designs and colours change every time
 * the panel opens (and on Shuffle). The badge says which sheet the product
 * needs, and whether adding it will open a new page because it does not fit
 * the current one. Clicking a card adds an empty product box at the real print
 * size; images are then dropped into it.
 */

import { useMemo, useState } from "react";
import { Plus, Search, Shuffle, X } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { GROUP_LABELS, minSheetFor, searchProducts, slotSize, type ProductGroup, type ProductPreset } from "@/lib/catalogue/products";
import { colorsFor } from "@/lib/catalogue/colors";
import { randomSeed, rng, sampleDesign } from "@/lib/catalogue/sample-designs";
import { sampleUrl } from "./sample-url";
import { formatUnit } from "@/lib/layout/coordinate-conversion";
import { printableRect } from "@/lib/layout/sheet-layout";
import { addProduct } from "@/lib/editor-actions";
import { ProductMockup } from "./ProductMockup";
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
  const [seed, setSeed] = useState(randomSeed);
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
        <Tooltip label="Show different sample designs">
          <Button variant="default" size="icon" className="size-10" aria-label="Shuffle sample designs" onClick={() => setSeed(randomSeed())}>
            <Shuffle />
          </Button>
        </Tooltip>
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
                  <ProductCard product={p} seed={seed} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <CustomSizeCard />

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Sizes come from blank suppliers and print guides; brands vary, so every size stays editable. Hover a card for its
        source. Sample designs are generated by Sheetfit and free to print.
      </p>
    </div>
  );
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Sample design and blank colour for a card, stable for a given seed. */
function cardLook(product: ProductPreset, seed: number) {
  const s = (seed ^ hash(product.id)) >>> 0;
  const r = rng(s);
  const garment = product.group === "apparel" || product.art === "cap" || product.art === "tote";
  const design = sampleDesign(s, garment ? "emblem" : "any");
  const colors = colorsFor(product);
  // Sublimation-only blanks are shown in light colours, where the ink shows.
  const usable = product.processes.includes("dtf") ? colors : colors.filter((c) => !c.dark);
  const color = r() < 0.4 ? colors[0] : usable[Math.floor(r() * usable.length)];
  const slot = slotSize(product);
  return { design, color, href: sampleUrl(design, slot.width / slot.height) };
}

function ProductCard({ product, seed }: { product: ProductPreset; seed: number }) {
  const unit = useEditor((s) => s.unit);
  const page = useEditor((s) => s.doc.page);
  const hasDesigns = useEditor((s) => s.doc.designs.length > 0);
  const slot = slotSize(product);
  const sheet = minSheetFor(product);
  const area = printableRect(page);
  const fitsCurrent =
    (slot.width <= area.width && slot.height <= area.height) || (slot.width <= area.height && slot.height <= area.width);
  const otherProcess = !product.processes.includes(page.process);
  const opensPage = hasDesigns && (!fitsCurrent || otherProcess);
  const fmt = (mm: number) => formatUnit(mm, unit === "px" ? "mm" : unit, page.dpi);
  const shownUnit = unit === "px" ? "mm" : unit;
  const host = new URL(product.source).hostname.replace(/^www\./, "");
  const look = useMemo(() => cardLook(product, seed), [product, seed]);

  return (
    <Tooltip
      label={`${product.confidence === "high" ? "High" : product.confidence === "medium" ? "Medium" : "Low"} confidence size, from ${host}${
        opensPage ? `. Opens a new ${sheet?.short ?? "roll"} page.` : ""
      }`}
      side="right"
    >
      <button
        type="button"
        onClick={() => addProduct(product.id)}
        className="group flex w-full flex-col text-left"
        aria-label={`Add ${product.name}, ${product.detail}`}
      >
        <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_38%,var(--surface)_0%,var(--subtle)_55%,var(--subtle-2)_100%)] ring-1 ring-line/60 transition group-hover:ring-2 group-hover:ring-accent group-focus-visible:ring-2 group-focus-visible:ring-accent">
          <ProductMockup
            product={product}
            color={look.color.hex}
            design={look.href}
            blend={look.color.dark ? "normal" : "multiply"}
            className="size-[86%] transition-transform duration-200 group-hover:scale-[1.05]"
          />
          <span className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Plus className="size-4" />
          </span>
          <span
            className={cn(
              "absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold shadow-sm",
              opensPage ? "bg-warn-soft text-warn" : "bg-surface/95 text-ink-muted",
            )}
          >
            {sheet ? sheet.short : "Roll"}
            {opensPage && " · new page"}
          </span>
        </span>
        <span className="mt-1.5 block truncate px-0.5 text-[12.5px] font-semibold">{product.name}</span>
        <span className="block truncate px-0.5 text-[11.5px] text-ink-muted">{product.detail}</span>
        <span className="tnum block px-0.5 text-[11px] text-ink-faint">
          {fmt(product.width)} × {fmt(product.height)} {shownUnit}
        </span>
      </button>
    </Tooltip>
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
