/**
 * "One workspace. Endless things to print." Product tiles from the real
 * catalogue in an editorial grid of mixed proportions. Tiles with a photo of a
 * printed product cross-fade, on hover or keyboard focus, to the editor's own
 * mockup of the template with its print area highlighted. Every tile opens
 * that template in the editor (`/editor?product=…`). Server-rendered.
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProductMockup } from "@/components/products/ProductMockup";
import { GROUP_LABELS, PRODUCTS, findProduct, slotSize, type ProductGroup, type ProductPreset } from "@/lib/catalogue/products";
import { colorsFor } from "@/lib/catalogue/colors";
import { renderSampleSvg, sampleDesign, svgDataUrl } from "@/lib/catalogue/sample-designs";
import { mm } from "@/lib/landing/sheet-demos";
import { productHref } from "@/lib/editor-link";
import type { PrintProcess } from "@/types/editor";
import { PHOTOS, type PhotoKey } from "./photos";

interface Tile {
  id: string;
  photo?: PhotoKey;
  process?: PrintProcess;
  /** Blank colour id for the mockup (defaults to the first). */
  color?: string;
  className: string;
}

// Four columns on wide screens; spans tile the grid without gaps.
const TILES: Tile[] = [
  { id: "mug-11oz", photo: "mugGrad", className: "col-span-2 row-span-2" },
  { id: "tee-full-front", photo: "teeLayers", process: "dtf", color: "black", className: "row-span-2" },
  { id: "tumbler-20oz", className: "" },
  { id: "coaster-round", className: "" },
  { id: "tote", photo: "toteDog", process: "dtf", className: "col-span-2" },
  { id: "cap-front", color: "navy", className: "" },
  { id: "hoodie-front", process: "dtf", color: "heather", className: "" },
];

const PROCESS_NAME: Record<PrintProcess, string> = { sublimation: "Sublimation", dtf: "DTF" };

function look(p: ProductPreset, tile: Tile, i: number) {
  const garment = p.group === "apparel" || p.art === "cap" || p.art === "tote";
  const colors = colorsFor(p);
  const color = colors.find((c) => c.id === tile.color) ?? colors[0];
  const slot = slotSize(p);
  const design = svgDataUrl(renderSampleSvg(sampleDesign(4099 + i * 6151, garment ? "emblem" : "pattern"), slot.width / slot.height));
  return { color, design };
}

function counts() {
  const by = new Map<ProductGroup, number>();
  for (const p of PRODUCTS) by.set(p.group, (by.get(p.group) ?? 0) + 1);
  return [...by.entries()];
}

export function ProductShowcase() {
  return (
    <section id="templates" aria-labelledby="templates-title" className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-20 sm:px-8 lg:py-28">
        <div data-reveal className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <h2 id="templates-title" className="studio-display max-w-[14ch] text-[clamp(2.6rem,6vw,5rem)]">
            One workspace. Endless things to print.
          </h2>
          <div className="max-w-[46ch] lg:justify-self-end">
            <p className="text-[17px] leading-relaxed text-graphite-soft">
              {PRODUCTS.length} templates with print areas taken from blank suppliers and transfer placement guides. Pick
              one and the editor opens it on the sheet it needs, at its exact size.
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-hairline pt-4 text-[14px]">
              {counts().map(([group, n]) => (
                <div key={group} className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2">
                  <dt className="text-graphite-soft">{GROUP_LABELS[group]}</dt>
                  <dd className="tnum font-semibold">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <ul data-reveal className="mt-12 grid auto-rows-[240px] grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:auto-rows-[260px]">
          {TILES.map((tile, i) => {
            const p = findProduct(tile.id)!;
            const { color, design } = look(p, tile, i);
            const process = tile.process ?? p.processes[0];
            const photo = tile.photo ? PHOTOS[tile.photo] : null;
            const mockup = (
              <ProductMockup
                product={p}
                color={color.hex}
                design={design}
                blend={process === "sublimation" && !color.dark ? "multiply" : "normal"}
                showArea={!!photo}
                className="size-[78%] max-h-[300px] drop-shadow-[0_14px_18px_rgb(34_35_31/0.18)]"
              />
            );
            return (
              <li key={tile.id} className={`studio-tile relative overflow-hidden rounded-[14px] bg-stone ${tile.className}`}>
                <Link
                  href={productHref(p.id, tile.process)}
                  aria-label={`Open the ${p.name}, ${p.detail.toLowerCase()} template in the editor`}
                  className="group absolute inset-0 rounded-[14px] focus-visible:outline-offset-[-3px]"
                >
                  {photo ? (
                    <>
                      <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 768px) 50vw, 100vw" placeholder="blur" className="tile-photo object-cover" />
                      <span className="tile-template absolute inset-0 flex items-center justify-center bg-paper-deep pb-24">{mockup}</span>
                    </>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center pb-24 transition-transform duration-500 group-hover:scale-[1.03]">{mockup}</span>
                  )}
                  <span className="absolute inset-x-2 bottom-2 rounded-[10px] bg-paper/94 p-3 pr-12 backdrop-blur-sm">
                    <span className="block text-[15px] leading-snug font-semibold">{p.name}</span>
                    <span className="tnum block text-[12.5px] leading-snug text-graphite-soft">
                      {p.detail}, {mm(p.width, p.height)}
                    </span>
                    <span className="mt-1.5 inline-block rounded-full border border-hairline px-2 py-0.5 text-[11.5px] font-semibold text-graphite-soft">{PROCESS_NAME[process]}</span>
                    <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-graphite text-paper transition-[background-color,color] duration-200 group-hover:bg-lime group-hover:text-graphite group-focus-visible:bg-lime group-focus-visible:text-graphite">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-[15px] text-graphite-soft">
          Photos show real printed products; hover or focus one to see its template&apos;s print area.{" "}
          <Link href="/editor" className="font-semibold text-graphite underline decoration-graphite/30 underline-offset-4 hover:decoration-graphite">
            Browse all {PRODUCTS.length} templates in the editor
          </Link>
        </p>
      </div>
    </section>
  );
}
