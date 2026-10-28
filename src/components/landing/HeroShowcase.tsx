"use client";

/**
 * Hero product stage: renders of real templates (the same 3D models as the
 * editor, see `ProductArt`) cross-fade one after another on a slowly turning
 * CMY glow, each with a spec card taken from the catalogue: print size, the
 * smallest sheet that holds it, and the processes it supports. Visitors can
 * pick a product; auto-advance pauses on hover or keyboard focus and never
 * runs for visitors who prefer reduced motion.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { findProduct, minSheetFor } from "@/lib/catalogue/products";
import { mm } from "@/lib/landing/sheet-demos";
import { productHref } from "@/lib/editor-link";
import { ProductArt } from "@/components/products/ProductArt";
import { cn } from "@/lib/utils";

const IDS = ["mug-11oz", "tee-full-front", "tumbler-20oz", "hoodie-front", "cap-front", "tote"];
const SHORT: Record<string, string> = {
  "mug-11oz": "Mug",
  "tee-full-front": "T-shirt",
  "tumbler-20oz": "Tumbler",
  "hoodie-front": "Hoodie",
  "cap-front": "Cap",
  tote: "Tote",
};
const inches = (v: number) => +(v / 25.4).toFixed(2);

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const q = window.matchMedia(REDUCED);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

export function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => true);

  useEffect(() => {
    if (paused || reduced) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % IDS.length), 4200);
    return () => window.clearInterval(t);
  }, [paused, reduced]);

  const products = IDS.map((id) => findProduct(id)!);
  const p = products[index];
  const sheet = minSheetFor(p);

  return (
    <div
      className="relative mx-auto w-full max-w-[560px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Stage */}
      <div className="relative aspect-square">
        <div aria-hidden className="absolute inset-[8%] overflow-hidden rounded-full opacity-70 blur-3xl">
          <div className="home-glow absolute -inset-1/4 bg-[conic-gradient(from_0deg,var(--process-cyan),var(--process-magenta),var(--process-yellow),var(--process-cyan))]" />
        </div>
        <div aria-hidden className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/0.95),rgb(232_234_243/0.9)_60%,rgb(232_234_243/0.75))]" />
        {products.map((q, i) => (
          <div
            key={q.id}
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-[11%] transition-[opacity,transform] duration-700 ease-out",
              i === index ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
            )}
          >
            <div className="home-float size-full">
              <ProductArt
                product={q}
                alt={`${q.name}, ${q.detail.toLowerCase()}, with a sample design: a render of the 3D model the editor shows`}
                sizes="(min-width: 1024px) 500px, 88vw"
                className="size-full drop-shadow-[0_30px_40px_rgb(13_12_34/0.35)]"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Spec card for the current product */}
      <div className="home-fade absolute -right-1 -bottom-[7%] w-[min(250px,58%)] rounded-2xl bg-night-2/80 p-4 text-white shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)] ring-1 ring-white/10 backdrop-blur-xl sm:-right-10" style={{ "--delay": "500ms" } as React.CSSProperties}>
        <p className="text-[12px] font-semibold text-white/60">Template</p>
        <p className="mt-0.5 text-[16px] leading-snug font-semibold" aria-live="polite">
          {p.name}, {p.detail.toLowerCase()}
        </p>
        <dl className="tnum mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
          <dt className="text-white/55">Print area</dt>
          <dd className="text-right">
            {inches(p.width)} × {inches(p.height)} in
          </dd>
          <dt className="text-white/55">In mm</dt>
          <dd className="text-right">{mm(p.width, p.height)}</dd>
          <dt className="text-white/55">Sheet</dt>
          <dd className="text-right">{sheet ? sheet.name : "DTF roll"}</dd>
          <dt className="text-white/55">Process</dt>
          <dd className="text-right">{p.processes.map((x) => (x === "dtf" ? "DTF" : "Sublimation")).join(" or ")}</dd>
        </dl>
        <Link href={productHref(p.id, p.processes.includes("dtf") && p.group !== "drinkware" ? "dtf" : undefined)} className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-process-yellow hover:underline">
          Open this template <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Picker */}
      <div role="tablist" aria-label="Showcased product" className="mt-16 flex flex-wrap justify-center gap-1.5 sm:justify-start sm:pr-[44%]">
        {products.map((q, i) => (
          <button
            key={q.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              i === index ? "bg-white text-night" : "bg-white/8 text-white/70 ring-1 ring-white/12 hover:bg-white/14 hover:text-white",
            )}
          >
            {SHORT[q.id]}
          </button>
        ))}
      </div>
    </div>
  );
}
