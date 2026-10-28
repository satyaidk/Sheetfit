/**
 * Feature highlights as a print spec sheet: one row per capability, each with
 * a small demonstration instead of an icon card. Every claim is something the
 * editor does today, and every number is either measured (README, Evaluation)
 * or plain arithmetic shown next to it. Server-rendered.
 */

import { SHEETS } from "@/lib/catalogue/sheets";

function Dimension({ label }: { label: string }) {
  return (
    <div className="w-full">
      <div className="relative mx-auto h-16 w-[86%] rounded-[3px] border border-graphite/25 bg-white">
        <span className="absolute inset-[18%] rounded-[2px] bg-[linear-gradient(135deg,var(--studio-stone),var(--studio-coral))]" />
      </div>
      <div className="relative mx-auto mt-2 flex w-[86%] items-center">
        <span className="h-3 w-px bg-guide" />
        <span className="h-px flex-1 bg-guide" />
        <span className="tnum mx-2 text-[12px] font-bold text-graphite">{label}</span>
        <span className="h-px flex-1 bg-guide" />
        <span className="h-3 w-px bg-guide" />
      </div>
    </div>
  );
}

function NotCropped() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-[60px] w-[90px] items-center justify-center rounded-[3px] border-2 border-dashed border-graphite/30 bg-white">
        <span className="size-[56px] rounded-full bg-lime ring-1 ring-graphite/20" />
        <span className="absolute inset-y-0 left-0 w-[15px] bg-[repeating-linear-gradient(45deg,var(--studio-stone)_0_3px,transparent_3px_6px)]" />
        <span className="absolute inset-y-0 right-0 w-[15px] bg-[repeating-linear-gradient(45deg,var(--studio-stone)_0_3px,transparent_3px_6px)]" />
      </div>
      <p className="tnum text-[12.5px] leading-snug text-graphite-soft">
        Square logo in a 90 × 60 mm box: printed at 60 × 60 mm, 15 mm spare each side
      </p>
    </div>
  );
}

function Mirror() {
  return (
    <div className="flex gap-3">
      {[
        { name: "Sublimation", flip: true },
        { name: "DTF", flip: false },
      ].map((m) => (
        <div key={m.name} className="flex flex-1 flex-col items-center gap-1.5 rounded-[10px] bg-white py-3 ring-1 ring-hairline">
          <span className={`font-display text-[34px] leading-none font-extrabold ${m.flip ? "-scale-x-100" : ""}`} aria-hidden>
            Fit
          </span>
          <span className="text-[12px] font-semibold text-graphite-soft">
            {m.name}: {m.flip ? "mirrored" : "as seen"}
          </span>
        </div>
      ))}
    </div>
  );
}

function Sharpness() {
  // 1200 px across 4 in = 300 DPI; across 11 in ≈ 109 DPI.
  return (
    <ul className="tnum flex flex-col gap-2 text-[12.5px]">
      <li className="flex items-center justify-between gap-2 rounded-[8px] bg-white px-3 py-2 ring-1 ring-hairline">
        <span>1200 px on a 4 in coaster</span>
        <span className="rounded-full bg-lime px-2 py-0.5 font-bold">300 DPI</span>
      </li>
      <li className="flex items-center justify-between gap-2 rounded-[8px] bg-white px-3 py-2 ring-1 ring-hairline">
        <span>Same image on an 11 in tee front</span>
        <span className="rounded-full bg-coral px-2 py-0.5 font-bold">109 DPI</span>
      </li>
    </ul>
  );
}

function Pages() {
  return (
    <div className="flex items-end gap-3">
      {[
        { n: 1, label: "A4 landscape", w: 74, h: 52 },
        { n: 2, label: "A3 portrait", w: 52, h: 74 },
      ].map((p) => (
        <div key={p.n} className="flex flex-col items-center gap-1.5">
          <span className="relative rounded-[2px] bg-white ring-1 ring-graphite/20" style={{ width: p.w, height: p.h }}>
            <span className="tnum absolute top-1 left-1.5 text-[10px] font-bold">{p.n}</span>
          </span>
          <span className="text-[11.5px] font-semibold text-graphite-soft">{p.label}</span>
        </div>
      ))}
      <span className="mb-6 text-[12px] leading-snug text-graphite-soft">One project, a sheet per page</span>
    </div>
  );
}

function Files() {
  return (
    <ul className="tnum grid gap-2 text-[12.5px]">
      {[
        ["sheet.pdf", "297.0 × 210.0 mm"],
        ["page-1.png", "3508 × 2480 px, 300 DPI"],
        ["sample.sheetfit", "project file"],
      ].map(([name, meta]) => (
        <li key={name} className="flex items-center justify-between gap-2 rounded-[8px] bg-white px-3 py-2 ring-1 ring-hairline">
          <span className="font-semibold">{name}</span>
          <span className="text-graphite-soft">{meta}</span>
        </li>
      ))}
    </ul>
  );
}

const paperCount = SHEETS.filter((s) => s.kind === "paper").length;
const rollCount = SHEETS.filter((s) => s.kind === "roll").length;

const ROWS = [
  {
    title: "Real physical size",
    body: `Work in millimetres, centimetres or inches on ${paperCount} paper sizes and ${rollCount} roll and gang-sheet lengths, or a custom sheet. What you see measured is what prints.`,
    demo: <Dimension label="215.9 mm" />,
  },
  {
    title: "Nothing cropped",
    body: "Artwork is fitted whole inside its print area. Spare space is shown and measured; stretching asks first and cropping is opt-in.",
    demo: <NotCropped />,
  },
  {
    title: "Mirrored when it should be",
    body: "Sublimation output is flipped for transfer paper in every export. DTF film stays as seen. Switching the process changes it for you.",
    demo: <Mirror />,
  },
  {
    title: "Sharpness at print size",
    body: "Every image shows its DPI at the size it will print, so a blurry transfer is caught before ink and blanks are used.",
    demo: <Sharpness />,
  },
  {
    title: "Pages with their own sheets",
    body: "A tumbler wrap on A3 gets its own page; your A4 coasters stay on A4. Export, print or save every page at once.",
    demo: <Pages />,
  },
  {
    title: "Print-ready files",
    body: "PDF at the sheet's exact size, PNG and JPEG with the DPI written in, printing at 100%, and a project file to reopen later. Everything runs in your browser; nothing is uploaded.",
    demo: <Files />,
  },
];

export function SpecSheet() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-20 sm:px-8 lg:py-28">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="features-title" className="studio-display max-w-[15ch] text-[clamp(2.6rem,6vw,5rem)]">
            Built for the print, not just the screen.
          </h2>
          <p className="max-w-[38ch] text-[17px] leading-relaxed text-graphite-soft">The checks a print shop makes by hand, done while you design.</p>
        </div>
        <dl data-reveal className="mt-12 border-t border-graphite">
          {ROWS.map((r) => (
            <div key={r.title} className="grid gap-4 border-b border-hairline py-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_340px] lg:items-center lg:gap-10">
              <dt className="font-display text-[24px] leading-tight font-bold tracking-tight">{r.title}</dt>
              <dd className="max-w-[52ch] text-[16px] leading-relaxed text-graphite-soft">{r.body}</dd>
              <dd className="md:col-span-2 lg:col-span-1">{r.demo}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
