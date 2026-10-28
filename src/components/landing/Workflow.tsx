/**
 * "From artwork to print-ready": the four steps of a job as one connected
 * strip. Each step has a small drawing of what happens in the editor, which
 * plays once when the strip scrolls into view (CSS, `.wf-*` in globals.css):
 * a product is picked, artwork drops into its print area, a guide and a gap
 * appear, and the sheet leaves as files. Sizes shown are the real ones for an
 * 11 oz mug on A4. Server-rendered; without scripts the final state shows.
 */

import { Check, FileImage, FileText } from "lucide-react";
import { ProductMockup } from "@/components/products/ProductMockup";
import { PRODUCTS, findProduct, slotSize } from "@/lib/catalogue/products";
import { mm } from "@/lib/landing/sheet-demos";
import { renderSampleSvg, sampleDesign, svgDataUrl } from "@/lib/catalogue/sample-designs";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] border border-hairline bg-paper-deep">{children}</div>;
}

function ChooseProduct() {
  const picks = ["tumbler-20oz", "mug-11oz", "tee-full-front"].map((id) => findProduct(id)!);
  return (
    <Panel>
      <div className="absolute inset-x-[8%] top-[14%] grid grid-cols-3 gap-[6%]">
        {picks.map((p) => {
          const chosen = p.id === "mug-11oz";
          return (
            <div key={p.id} className={`relative flex aspect-square items-center justify-center rounded-[10px] bg-white ${chosen ? "ring-2 ring-graphite" : "ring-1 ring-hairline"}`}>
              <ProductMockup product={p} showArea={chosen} className="size-[80%]" />
              {chosen && (
                <span className="wf-pop absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-lime ring-2 ring-white" style={delay(400)}>
                  <Check className="size-3" />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="wf-pop absolute inset-x-[8%] bottom-[12%] flex items-center justify-between rounded-[8px] bg-white px-3 py-2 text-[12px] ring-1 ring-hairline" style={delay(700)}>
        <span className="font-semibold">Mug 11 oz, full wrap</span>
        <span className="tnum text-graphite-soft">on A4</span>
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
        <div className="absolute inset-0 rounded-[3px] border-2 border-dashed border-graphite/30 bg-white" />
        {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL */}
        <img src={art} alt="" className="wf-drop absolute inset-0 size-full object-contain" />
        <span className="tnum absolute -bottom-7 left-0 text-[11.5px] font-semibold text-graphite-soft">{mm(slot.width, slot.height)}, incl. 6 mm seam</span>
      </div>
      <span className="wf-pop absolute top-[10%] right-[8%] rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-hairline" style={delay(900)}>
        Fitted whole, not cropped
      </span>
    </Panel>
  );
}

function FitAndArrange() {
  return (
    <Panel>
      <div className="absolute inset-[10%] rounded-[3px] bg-white ring-1 ring-hairline">
        <div className="absolute top-[12%] left-[8%] h-[46%] w-[40%] rounded-[2px] bg-[linear-gradient(135deg,var(--studio-stone),var(--studio-coral))] opacity-90" />
        <div className="absolute top-[12%] left-[56%] h-[46%] w-[34%] rounded-full bg-lime ring-1 ring-graphite/15" />
        <div className="absolute bottom-[10%] left-[8%] h-[20%] w-[82%] rounded-[2px] bg-[repeating-linear-gradient(90deg,var(--studio-graphite)_0_6px,var(--studio-paper)_6px_12px)] opacity-80" />
        {/* Shared top edge: a magenta alignment guide. */}
        <span aria-hidden className="wf-draw absolute top-[12%] left-0 h-px w-full bg-guide" style={delay(350)} />
        {/* Live gap between the two boxes. */}
        <span aria-hidden className="wf-draw absolute top-[35%] left-[48%] h-px w-[8%] bg-guide" style={delay(700)} />
        <span className="wf-pop tnum absolute top-[22%] left-[52%] -translate-x-1/2 rounded bg-guide px-1 py-px text-[10px] font-bold text-white" style={delay(900)}>
          5 mm
        </span>
      </div>
      <span className="wf-pop absolute right-[6%] bottom-[4%] rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-hairline" style={delay(1100)}>
        Arrange all
      </span>
    </Panel>
  );
}

function ExportPrint() {
  return (
    <Panel>
      <div className="absolute top-[12%] left-[8%] w-[44%] rounded-[2px] bg-white shadow-[0_10px_24px_-12px_rgb(34_35_31/0.5)] ring-1 ring-hairline" style={{ aspectRatio: "297 / 210" }}>
        <div className="absolute inset-[8%] grid grid-cols-3 gap-[6%]">
          <span className="col-span-2 rounded-[2px] bg-[linear-gradient(135deg,var(--studio-stone),var(--studio-coral))]" />
          <span className="rounded-full bg-lime ring-1 ring-graphite/15" />
          <span className="col-span-3 rounded-[2px] bg-[repeating-linear-gradient(90deg,var(--studio-graphite)_0_4px,var(--studio-paper)_4px_8px)] opacity-80" />
        </div>
        <span className="wf-pop absolute -top-2.5 -right-3 rotate-6 rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold" style={delay(1200)}>
          Ready
        </span>
      </div>
      <ul className="absolute top-[12%] right-[6%] flex w-[40%] flex-col gap-2 text-[11.5px]">
        {[
          { icon: <FileText />, name: "sheet.pdf", meta: "297 × 210 mm" },
          { icon: <FileImage />, name: "page-1.png", meta: "300 DPI" },
          { icon: <FileImage />, name: "page-1.jpg", meta: "300 DPI" },
        ].map((f, i) => (
          <li key={f.name} className="wf-pop flex items-center gap-1.5 rounded-[8px] bg-white px-2 py-1.5 ring-1 ring-hairline [&_svg]:size-3.5 [&_svg]:shrink-0" style={delay(400 + i * 200)}>
            {f.icon}
            <span className="min-w-0">
              <span className="block truncate font-semibold">{f.name}</span>
              <span className="tnum block truncate text-graphite-soft">{f.meta}</span>
            </span>
          </li>
        ))}
      </ul>
      <span className="wf-pop absolute bottom-[8%] left-[8%] flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-hairline" style={delay(1000)}>
        <span className="size-2 rounded-full bg-coral" /> Mirrored for sublimation
      </span>
    </Panel>
  );
}

const STEPS = [
  {
    title: "Choose your product",
    body: `Pick one of ${PRODUCTS.length} templates. Sheetfit opens it on the sheet it needs: A4, A3, US Letter or Legal, or a 22 in DTF roll.`,
    art: <ChooseProduct />,
  },
  {
    title: "Add your artwork",
    body: "Upload a design or drop one onto the print area. It is fitted whole: nothing is cropped or stretched unless you choose to.",
    art: <AddArtwork />,
  },
  {
    title: "Fit and arrange",
    body: "Snap to guides, read live gaps in millimetres, check DPI at the printed size, or let Arrange all pack the sheet.",
    art: <FitAndArrange />,
  },
  {
    title: "Export and print",
    body: "Download an exact-size PDF, or PNG and JPEG with the DPI written in, or print at 100%. Sublimation output is mirrored; DTF is not.",
    art: <ExportPrint />,
  },
];

export function Workflow() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 bg-graphite text-paper">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-20 sm:px-8 lg:py-28">
        <h2 id="how-title" data-reveal className="studio-display max-w-[16ch] text-[clamp(2.6rem,6vw,5rem)]">
          From artwork to print-ready.
        </h2>
        <ol data-reveal className="relative mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* The thread that joins the steps on wide screens. */}
          <span aria-hidden className="wf-draw absolute top-[15px] right-[12%] left-[2%] hidden h-px bg-[repeating-linear-gradient(90deg,var(--studio-lime)_0_6px,transparent_6px_12px)] lg:block" style={delay(100)} />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex flex-col gap-5">
              <span className="tnum relative flex size-8 items-center justify-center rounded-full bg-lime text-[13px] font-bold text-graphite">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="text-graphite">{s.art}</div>
              <div>
                <h3 className="font-display text-[22px] font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-paper/72">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
