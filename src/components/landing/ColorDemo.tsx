"use client";

/**
 * Interactive product preview on the landing page: the same mockup renderer
 * the editor uses. Visitors pick a product, a blank colour and a process, and
 * shuffle the sample design; sublimation blends with the blank (the dye is
 * transparent), DTF prints opaque, so the difference is visible. The 3D view
 * loads three.js only when the visitor asks for it.
 */

import { useState } from "react";
import { Box, Image as ImageIcon, Shuffle, TriangleAlert } from "lucide-react";
import { findProduct, slotSize } from "@/lib/catalogue/products";
import { colorsFor } from "@/lib/catalogue/colors";
import { renderSampleSvg, sampleDesign, svgDataUrl } from "@/lib/catalogue/sample-designs";
import { ProductMockup } from "@/components/products/ProductMockup";
import { Product3D } from "@/components/products/Product3D";
import { cn } from "@/lib/utils";

const CHOICES = [
  { id: "tee-full-front", label: "T-shirt" },
  { id: "hoodie-front", label: "Hoodie" },
  { id: "mug-11oz", label: "Mug" },
  { id: "tumbler-20oz", label: "Tumbler" },
  { id: "tote", label: "Tote" },
];

export function ColorDemo() {
  const [productId, setProductId] = useState(CHOICES[0].id);
  const [colorId, setColorId] = useState("navy");
  const [process, setProcess] = useState<"dtf" | "sublimation">("dtf");
  const [seed, setSeed] = useState(3);
  const [turn, setTurn] = useState(0);
  const [view, setView] = useState<"flat" | "3d">("flat");
  const product = findProduct(productId)!;
  const colors = colorsFor(product);
  const color = colors.find((c) => c.id === colorId) ?? colors[0];
  const garment = product.group === "apparel" || product.art === "tote";
  const slot = slotSize(product);
  const design = svgDataUrl(renderSampleSvg(sampleDesign(1000 + seed * 104729, garment ? "emblem" : "pattern"), slot.width / slot.height));
  const blend = process === "sublimation" ? "multiply" : "normal";

  return (
    <div className="grid overflow-hidden rounded-[20px] bg-white ring-1 ring-ink-deep/10 sm:grid-cols-[1fr_220px]">
      <div className="relative flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#eef0f4_70%,#e3e6ec_100%)]">
        <div className="absolute top-3 left-3 z-10 flex rounded-full bg-white p-1 shadow ring-1 ring-ink-deep/10" role="radiogroup" aria-label="Preview type">
          {(["flat", "3d"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors [&_svg]:size-3.5",
                view === v ? "bg-ink-deep text-white" : "text-ink-muted hover:text-ink-deep",
              )}
            >
              {v === "3d" ? <Box /> : <ImageIcon />}
              {v === "3d" ? "3D" : "Flat"}
            </button>
          ))}
        </div>
        {view === "3d" ? (
          <Product3D product={product} color={color.hex} designUrl={design} process={process} autoRotate />
        ) : (
        <div className="flex size-full items-center justify-center p-6">
        <ProductMockup
          product={product}
          color={color.hex}
          design={design}
          blend={blend}
          turn={turn}
          className="size-full max-w-[380px] drop-shadow-[0_18px_22px_rgb(29_27_58/0.22)] transition-[filter] duration-300"
          title={`${product.name} in ${color.name}, ${process === "dtf" ? "DTF" : "sublimation"} print`}
        />
        </div>
        )}
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-deep shadow ring-1 ring-ink-deep/10 hover:bg-subtle"
        >
          <Shuffle className="size-3.5" /> New design
        </button>
      </div>
      <div className="flex flex-col gap-4 border-t border-ink-deep/10 p-4 sm:border-t-0 sm:border-l">
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-ink-muted">Product</p>
          <div className="flex flex-wrap gap-1.5">
            {CHOICES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={productId === c.id}
                onClick={() => {
                  setProductId(c.id);
                  setTurn(0);
                }}
                className={cn(
                  "h-8 rounded-full px-3 text-[12.5px] font-medium transition-colors",
                  productId === c.id ? "bg-ink-deep text-white" : "bg-subtle text-ink hover:bg-subtle-2",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-ink-muted">
            Blank colour <span className="text-ink">{color.name}</span>
          </p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Blank colour">
            {colors.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === color.id}
                aria-label={c.name}
                onClick={() => setColorId(c.id)}
                className={cn(
                  "size-7 rounded-full ring-1 ring-black/15 transition-transform hover:scale-110",
                  c.id === color.id && "ring-2 ring-accent ring-offset-2",
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-ink-muted">Print process</p>
          <div className="grid grid-cols-2 rounded-lg bg-subtle p-1" role="radiogroup" aria-label="Print process">
            {(["dtf", "sublimation"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={process === v}
                onClick={() => setProcess(v)}
                className={cn(
                  "h-7 rounded-md text-[12.5px] font-medium",
                  process === v ? "bg-white text-ink shadow-[0_1px_2px_rgb(16_24_40/0.12)]" : "text-ink-muted hover:text-ink",
                )}
              >
                {v === "dtf" ? "DTF" : "Sublimation"}
              </button>
            ))}
          </div>
        </div>
        {product.wrap && view === "flat" && (
          <label className="text-[12px] font-semibold text-ink-muted">
            Turn the {product.name.toLowerCase().includes("mug") ? "mug" : "tumbler"}
            <input
              type="range"
              min={0}
              max={359}
              value={Math.round(turn * 360)}
              onChange={(e) => setTurn(Number(e.target.value) / 360)}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </label>
        )}
        {process === "sublimation" && color.dark && (
          <p className="flex gap-1.5 rounded-md bg-warn-soft px-2.5 py-2 text-[12px] leading-snug text-warn">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            Sublimation dye is see-through, so it fades into dark blanks. Use DTF here.
          </p>
        )}
      </div>
    </div>
  );
}
