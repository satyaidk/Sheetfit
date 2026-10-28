"use client";

/**
 * "From artwork to print-ready": the four steps of a job as a scroll story.
 *
 * On wide screens the drawing panel stays pinned (CSS `position: sticky`, no
 * scroll hijacking) while the steps scroll past; the step nearest the middle
 * of the screen becomes active and its drawing plays (`.wf-*` in globals.css).
 * On narrow screens each step shows its own drawing inline. Sizes are the
 * real ones for an 11 oz mug on A4.
 */

import { useEffect, useRef, useState } from "react";
import { Check, FileImage, FileText } from "lucide-react";
import { ProductArt } from "@/components/products/ProductArt";
import { PRODUCTS, findProduct, slotSize } from "@/lib/catalogue/products";
import { mm } from "@/lib/landing/sheet-demos";
import { renderSampleSvg, sampleDesign, svgDataUrl } from "@/lib/catalogue/sample-designs";
import { cn } from "@/lib/utils";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_50%_30%,#fff,var(--home-mist-2))] text-night">{children}</div>;
}

function ChooseProduct() {
  const picks = ["tumbler-20oz", "mug-11oz", "tee-full-front"].map((id) => findProduct(id)!);
  return (
    <Panel>
      <div className="absolute inset-x-[8%] top-[12%] grid grid-cols-3 gap-[5%]">
        {picks.map((p) => {
          const chosen = p.id === "mug-11oz";
          return (
            <div key={p.id} className={cn("relative flex aspect-square items-center justify-center rounded-2xl bg-white", chosen ? "ring-2 ring-process-cyan" : "ring-1 ring-hairline")}>
              <ProductArt product={p} sizes="120px" className="size-[86%]" />
              {chosen && (
                <span className="wf-pop absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-process-cyan text-white ring-2 ring-white" style={delay(350)}>
                  <Check className="size-3.5" />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="wf-pop absolute inset-x-[8%] bottom-[12%] flex items-center justify-between rounded-xl bg-white px-4 py-3 text-[13px] shadow-sm ring-1 ring-hairline" style={delay(650)}>
        <span className="font-semibold">Mug 11 oz, full wrap</span>
        <span className="tnum text-muted">opens on A4</span>
      </div>
    </Panel>
  );
}

function AddArtwork() {
  const mug = findProduct("mug-11oz")!;
  const slot = slotSize(mug);
  const art = svgDataUrl(renderSampleSvg(sampleDesign(5, "emblem"), slot.width / slot.height));
  return (
    <Panel>
      <div className="absolute inset-x-[8%] top-1/2 -translate-y-1/2" style={{ aspectRatio: `${slot.width} / ${slot.height}` }}>
        <div className="absolute inset-0 rounded-[4px] border-2 border-dashed border-night/30 bg-white" />
        {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL */}
        <img src={art} alt="" className="wf-drop absolute inset-0 size-full object-contain" />
        <span className="tnum absolute -bottom-7 left-0 text-[12px] font-semibold text-muted">{mm(slot.width, slot.height)}, incl. 6 mm seam</span>
      </div>
      <span className="wf-pop absolute top-[10%] right-[8%] rounded-full bg-white px-3 py-1 text-[12px] font-semibold shadow-sm ring-1 ring-hairline" style={delay(800)}>
        Fitted whole, not cropped
      </span>
    </Panel>
  );
}

function FitAndArrange() {
  return (
    <Panel>
      <div className="absolute inset-[10%] rounded-[4px] bg-white shadow-sm ring-1 ring-hairline">
        <div className="absolute top-[12%] left-[8%] h-[46%] w-[40%] rounded-[3px] bg-[linear-gradient(135deg,var(--process-cyan),var(--process-magenta))]" />
        <div className="absolute top-[12%] left-[56%] h-[46%] w-[34%] rounded-full bg-process-yellow" />
        <div className="absolute bottom-[10%] left-[8%] h-[20%] w-[82%] rounded-[3px] bg-[repeating-linear-gradient(90deg,var(--home-night)_0_6px,transparent_6px_12px)] opacity-80" />
        <span aria-hidden className="wf-draw absolute top-[12%] left-0 h-px w-full bg-guide" style={delay(300)} />
        <span aria-hidden className="wf-draw absolute top-[35%] left-[48%] h-px w-[8%] bg-guide" style={delay(650)} />
        <span className="wf-pop tnum absolute top-[22%] left-[52%] -translate-x-1/2 rounded bg-guide px-1 py-px text-[10px] font-bold text-white" style={delay(850)}>
          5 mm
        </span>
      </div>
      <span className="wf-pop absolute right-[6%] bottom-[4%] rounded-full bg-white px-3 py-1 text-[12px] font-semibold shadow-sm ring-1 ring-hairline" style={delay(1000)}>
        Arrange all
      </span>
    </Panel>
  );
}

function ExportPrint() {
  return (
    <Panel>
      <div className="absolute top-[14%] left-[8%] w-[44%] rounded-[3px] bg-white shadow-[0_14px_28px_-14px_rgb(13_12_34/0.5)] ring-1 ring-hairline" style={{ aspectRatio: "297 / 210" }}>
        <div className="absolute inset-[8%] grid grid-cols-3 gap-[6%]">
          <span className="col-span-2 rounded-[2px] bg-[linear-gradient(135deg,var(--process-cyan),var(--process-magenta))]" />
          <span className="rounded-full bg-process-yellow" />
          <span className="col-span-3 rounded-[2px] bg-[repeating-linear-gradient(90deg,var(--home-night)_0_4px,transparent_4px_8px)] opacity-80" />
        </div>
        <span className="wf-pop absolute -top-3 -right-3 rotate-6 rounded-full bg-process-yellow px-2 py-0.5 text-[11px] font-bold" style={delay(1100)}>
          Ready
        </span>
      </div>
      <ul className="absolute top-[14%] right-[6%] flex w-[40%] flex-col gap-2 text-[12px]">
        {[
          { icon: <FileText />, name: "sheet.pdf", meta: "297 × 210 mm" },
          { icon: <FileImage />, name: "page-1.png", meta: "300 DPI" },
          { icon: <FileImage />, name: "page-1.jpg", meta: "300 DPI" },
        ].map((f, i) => (
          <li key={f.name} className="wf-pop flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-hairline [&_svg]:size-3.5 [&_svg]:shrink-0" style={delay(350 + i * 180)}>
            {f.icon}
            <span className="min-w-0">
              <span className="block truncate font-semibold">{f.name}</span>
              <span className="tnum block truncate text-muted">{f.meta}</span>
            </span>
          </li>
        ))}
      </ul>
      <span className="wf-pop absolute bottom-[9%] left-[8%] flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold shadow-sm ring-1 ring-hairline" style={delay(950)}>
        <span className="size-2 rounded-full bg-process-magenta" /> Mirrored for sublimation
      </span>
    </Panel>
  );
}

const STEPS = [
  {
    title: "Choose your product",
    body: `Pick one of ${PRODUCTS.length} templates, from mugs and tumblers to shirts, caps and totes. Sheetfit opens it on the sheet it needs: A4, A3, US Letter or Legal, or a 22 in DTF roll.`,
    art: <ChooseProduct />,
  },
  {
    title: "Add your artwork",
    body: "Upload a design or drop one onto the print area. It is fitted whole: nothing is cropped or stretched unless you choose to, and its DPI at the printed size is shown straight away.",
    art: <AddArtwork />,
  },
  {
    title: "Fit and arrange",
    body: "Snap to guides, read live gaps in millimetres, add more products to fill the sheet, or let Arrange all pack it. Every page keeps its own sheet size.",
    art: <FitAndArrange />,
  },
  {
    title: "Export and print",
    body: "Download an exact-size PDF, or PNG and JPEG with the DPI written in, or print at 100%. Sublimation output is mirrored for transfer paper; DTF film stays as seen.",
    art: <ExportPrint />,
  },
];

export function StoryWorkflow() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of refs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      {/* Pinned drawing (wide screens) */}
      <div className="hidden lg:block">
        <div className="sticky top-28">
          <div className="relative">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                data-active={i === active}
                aria-hidden={i !== active}
                className={cn("transition-[opacity,transform] duration-500", i === active ? "relative opacity-100" : "pointer-events-none absolute inset-0 translate-y-3 opacity-0")}
              >
                {s.art}
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s.title} className={cn("h-1 flex-1 rounded-full transition-colors duration-500", i <= active ? "bg-process-cyan" : "bg-white/15")} />
            ))}
          </div>
        </div>
      </div>

      <ol className="flex flex-col gap-10 lg:gap-0">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-step={i}
            data-active={i === active}
            className="flex flex-col justify-center gap-5 lg:min-h-[78vh]"
          >
            <div className="lg:hidden" data-active="true">
              {s.art}
            </div>
            <div className={cn("transition-opacity duration-500", i === active ? "lg:opacity-100" : "lg:opacity-40")}>
              <span className="tnum text-[14px] font-semibold text-process-cyan">Step {i + 1} of {STEPS.length}</span>
              <h3 className="home-display mt-2 text-[clamp(1.75rem,3.2vw,2.5rem)]">{s.title}</h3>
              <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-white/70">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
