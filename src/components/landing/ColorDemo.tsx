"use client";

/**
 * "See the design before it reaches the press": the editor's product preview
 * on the home page. Visitors pick a product, a blank colour and a process,
 * shuffle the sample design, and turn the product in 3D (the same `Product3D`
 * viewer the editor uses) or look at the flat mockup. Sublimation blends with
 * the blank (the dye is see-through) and DTF prints opaque, so the difference
 * shows. Only processes the product supports are offered.
 *
 * three.js is loaded only when this section is near the viewport, and the
 * model does not turn by itself for visitors who prefer reduced motion.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Box, Image as ImageIcon, Shuffle, TriangleAlert } from "lucide-react";
import { findProduct, slotSize } from "@/lib/catalogue/products";
import { colorsFor } from "@/lib/catalogue/colors";
import { renderSampleSvg, sampleDesign, svgDataUrl } from "@/lib/catalogue/sample-designs";
import { productHref } from "@/lib/editor-link";
import { ProductMockup } from "@/components/products/ProductMockup";
import { Product3D } from "@/components/products/Product3D";
import type { PrintProcess } from "@/types/editor";
import { cn } from "@/lib/utils";

const CHOICES = [
  { id: "tee-full-front", label: "T-shirt" },
  { id: "hoodie-front", label: "Hoodie" },
  { id: "mug-11oz", label: "Mug" },
  { id: "tumbler-20oz", label: "Tumbler" },
  { id: "tote", label: "Tote" },
  { id: "cap-front", label: "Cap" },
];

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const q = window.matchMedia(REDUCED);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

const chip = (on: boolean) =>
  cn("rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-colors", on ? "bg-night text-white" : "bg-white text-night ring-1 ring-hairline hover:bg-white");

export function ColorDemo() {
  const [productId, setProductId] = useState(CHOICES[0].id);
  const [colorId, setColorId] = useState("navy");
  const [wanted, setWanted] = useState<PrintProcess>("dtf");
  const [seed, setSeed] = useState(3);
  const [view, setView] = useState<"flat" | "3d">("3d");
  const [near, setNear] = useState(false);
  const [spin, setSpin] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const product = findProduct(productId)!;
  const process = product.processes.includes(wanted) ? wanted : product.processes[0];
  const colors = colorsFor(product);
  const color = colors.find((c) => c.id === colorId) ?? colors[0];
  const garment = product.group === "apparel" || product.art === "tote" || product.art === "cap";
  const slot = slotSize(product);
  const design = svgDataUrl(renderSampleSvg(sampleDesign(1000 + seed * 104729, garment ? "emblem" : "pattern"), slot.width / slot.height));
  const show3d = view === "3d" && near;

  return (
    <div className="grid overflow-hidden rounded-[18px] border border-hairline bg-white lg:grid-cols-[1fr_340px]">
      <div ref={stageRef} className="relative aspect-square bg-mist-2 sm:aspect-[4/3]">
        {show3d ? (
          <Product3D product={product} color={color.hex} designUrl={design} process={process} autoRotate={spin && !reduced} onInteract={() => setSpin(false)} />
        ) : (
          <div className="flex size-full items-center justify-center p-8">
            <ProductMockup
              product={product}
              color={color.hex}
              design={design}
              blend={process === "sublimation" ? "multiply" : "normal"}
              className="size-full max-w-[420px] drop-shadow-[0_18px_22px_rgb(34_35_31/0.22)]"
              title={`${product.name} in ${color.name}, ${process === "dtf" ? "DTF" : "sublimation"} print`}
            />
          </div>
        )}
        <div role="radiogroup" aria-label="Preview type" className="absolute top-3 left-3 z-10 flex rounded-full bg-white p-1 shadow-sm ring-1 ring-hairline">
          {(["3d", "flat"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors [&_svg]:size-3.5",
                view === v ? "bg-night text-white" : "text-muted hover:text-night",
              )}
            >
              {v === "3d" ? <Box /> : <ImageIcon />}
              {v === "3d" ? "3D" : "Flat"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 border-t border-hairline p-5 sm:p-6 lg:border-t-0 lg:border-l">
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-muted">Product</legend>
          <div className="flex flex-wrap gap-1.5">
            {CHOICES.map((c) => (
              <button key={c.id} type="button" aria-pressed={productId === c.id} onClick={() => setProductId(c.id)} className={chip(productId === c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-muted">
            Blank colour <span className="text-night">{color.name}</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Blank colour">
            {colors.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === color.id}
                aria-label={c.name}
                onClick={() => setColorId(c.id)}
                className={cn("size-8 rounded-full ring-1 ring-night/20 transition-transform hover:scale-110", c.id === color.id && "ring-2 ring-night ring-offset-2 ring-offset-white")}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-muted">Print process</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Print process">
            {product.processes.map((v) => (
              <button key={v} type="button" role="radio" aria-checked={process === v} onClick={() => setWanted(v)} className={chip(process === v)}>
                {v === "dtf" ? "DTF" : "Sublimation"}
              </button>
            ))}
          </div>
          {product.processes.length === 1 && <p className="mt-2 text-[13px] text-muted">{product.name} blanks are {process === "dtf" ? "printed with DTF" : "sublimated"} only.</p>}
        </fieldset>
        {process === "sublimation" && color.dark && (
          <p className="flex gap-2 rounded-[10px] bg-mist-2 px-3 py-2.5 text-[13px] leading-snug">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-process-magenta" />
            Sublimation dye is see-through, so it fades into dark blanks. Use DTF for dark garments.
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => setSeed((s) => s + 1)} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13.5px] font-semibold ring-1 ring-hairline hover:bg-white">
            <Shuffle className="size-4" /> New design
          </button>
          <Link href={productHref(product.id, process)} className="rounded-full bg-night px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-night/88">
            Design this {CHOICES.find((c) => c.id === productId)!.label.toLowerCase()}
          </Link>
        </div>
      </div>
    </div>
  );
}
