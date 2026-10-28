/**
 * Informative home page sections: capabilities, Sublimation vs DTF, and FAQ.
 *
 * Every claim is something the editor does today. Numbers are either computed
 * from the catalogue (template and sheet counts) or measured (README,
 * Evaluation: the 90 × 60 mm box, the PDF and PNG sizes). Server-rendered;
 * the FAQ uses native <details>, so it works without scripts.
 */

import { Check, FileImage, FileText, FlipHorizontal2, Gauge, Layers, Lock, Maximize2, Ruler } from "lucide-react";
import { PRODUCTS } from "@/lib/catalogue/products";
import { SHEETS } from "@/lib/catalogue/sheets";

const paperCount = SHEETS.filter((s) => s.kind === "paper").length;
const rollCount = SHEETS.filter((s) => s.kind === "roll").length;
const subCount = PRODUCTS.filter((p) => p.processes.includes("sublimation")).length;
const dtfCount = PRODUCTS.filter((p) => p.processes.includes("dtf")).length;

function Card({ icon, title, body, children, className = "" }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode; className?: string }) {
  return (
    <article className={`flex flex-col gap-5 rounded-3xl bg-white p-6 ring-1 ring-hairline sm:p-7 ${className}`}>
      <div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-mist text-night [&_svg]:size-5">{icon}</span>
        <h3 className="home-display mt-4 text-[22px] tracking-[-0.02em]">{title}</h3>
        <p className="mt-2 max-w-[48ch] text-[15.5px] leading-relaxed text-muted">{body}</p>
      </div>
      {children && <div className="mt-auto">{children}</div>}
    </article>
  );
}

export function FeatureGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Card
        className="md:col-span-3"
        icon={<Ruler />}
        title="Real physical size"
        body={`Work in millimetres, centimetres or inches on ${paperCount} paper sizes, ${rollCount} roll and gang-sheet lengths, or a custom sheet. What you measure is what prints.`}
      >
        <div className="rounded-2xl bg-mist p-4">
          <div className="mx-auto h-14 w-[86%] rounded-[3px] bg-[linear-gradient(135deg,var(--process-cyan),var(--process-magenta))]" />
          <div className="mx-auto mt-2 flex w-[86%] items-center">
            <span className="h-3 w-px bg-guide" />
            <span className="h-px flex-1 bg-guide" />
            <span className="tnum mx-2 text-[12px] font-bold">215.9 mm</span>
            <span className="h-px flex-1 bg-guide" />
            <span className="h-3 w-px bg-guide" />
          </div>
        </div>
      </Card>
      <Card className="md:col-span-3" icon={<Maximize2 />} title="Nothing cropped" body="Artwork is fitted whole inside its print area. Spare space is shown and measured; stretching asks first and cropping is opt-in.">
        <div className="flex items-center gap-4 rounded-2xl bg-mist p-4">
          <div className="relative flex h-[60px] w-[90px] shrink-0 items-center justify-center rounded-[3px] border-2 border-dashed border-night/30 bg-white">
            <span className="size-[54px] rounded-full bg-process-yellow" />
          </div>
          <p className="tnum text-[13px] leading-snug text-muted">A square logo in a 90 × 60 mm box prints at 60 × 60 mm, with 15 mm spare each side.</p>
        </div>
      </Card>
      <Card className="md:col-span-2" icon={<FlipHorizontal2 />} title="Mirrored when it should be" body="Sublimation output is flipped for transfer paper in every export; DTF film stays as seen.">
        <div className="flex gap-2">
          {[
            { name: "Sublimation", flip: true },
            { name: "DTF", flip: false },
          ].map((m) => (
            <div key={m.name} className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-mist py-3">
              <span aria-hidden className={`home-display text-[30px] ${m.flip ? "-scale-x-100" : ""}`}>
                Fit
              </span>
              <span className="text-[12px] font-semibold text-muted">{m.flip ? "mirrored" : "as seen"}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="md:col-span-2" icon={<Gauge />} title="Sharpness at print size" body="Every image shows its DPI at the size it will print, so a blurry transfer is caught early.">
        <ul className="tnum flex flex-col gap-2 text-[13px]">
          <li className="flex items-center justify-between rounded-xl bg-mist px-3 py-2">
            1200 px on a 4 in coaster <span className="rounded-full bg-process-cyan px-2 py-0.5 font-bold text-white">300 DPI</span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-mist px-3 py-2">
            Same on an 11 in tee <span className="rounded-full bg-process-magenta px-2 py-0.5 font-bold text-white">109 DPI</span>
          </li>
        </ul>
      </Card>
      <Card className="md:col-span-2" icon={<Layers />} title="Pages with their own sheets" body="A tumbler wrap on A3 gets its own page; your A4 coasters stay on A4. Export or print every page at once.">
        <div className="flex items-end gap-3">
          {[
            { n: 1, label: "A4", w: 64, h: 45 },
            { n: 2, label: "A3", w: 45, h: 64 },
          ].map((p) => (
            <div key={p.n} className="flex flex-col items-center gap-1">
              <span className="relative rounded-[3px] bg-mist ring-1 ring-hairline" style={{ width: p.w, height: p.h }}>
                <span className="tnum absolute top-1 left-1.5 text-[10px] font-bold">{p.n}</span>
              </span>
              <span className="text-[12px] font-semibold text-muted">{p.label}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="md:col-span-3" icon={<FileText />} title="Print-ready files" body="PDF at the sheet's exact size, PNG and JPEG with the DPI written in, printing at 100%, and a project file to reopen later.">
        <ul className="tnum grid gap-2 text-[13px]">
          {[
            [<FileText key="a" />, "sheet.pdf", "297.0 × 210.0 mm"],
            [<FileImage key="b" />, "page-1.png", "3508 × 2480 px, 300 DPI"],
            [<FileText key="c" />, "sample.sheetfit", "project file"],
          ].map(([icon, name, meta]) => (
            <li key={name as string} className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2 [&_svg]:size-4 [&_svg]:text-muted">
              {icon}
              <span className="font-semibold">{name}</span>
              <span className="ml-auto text-muted">{meta}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="md:col-span-3" icon={<Lock />} title="Private by design" body="Sheetfit runs entirely in your browser. Images are never uploaded; projects are saved in your browser and can be exported as files.">
        <ul className="grid gap-2 text-[14px]">
          {["No account, no sign-up", "No server: nothing leaves your computer", "Open source under the MIT licence"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-process-cyan" /> {t}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

const ROWS: [string, string, string][] = [
  ["Prints on", "White or light polyester, and coated mugs, tumblers, bottles, slate and aluminium", "Cotton, polyester and blends, in any colour"],
  ["Mirror the print", "Yes: transfer paper is printed mirror-image", "No: the film is printed as seen"],
  ["Usual sheets", "A4, A3, US Letter and Legal", "22 in gang sheets from 12 to 120 in long, A3, A4"],
  ["On dark blanks", "Barely shows: the dye is see-through", "Bright, thanks to a white underbase"],
  ["Templates in Sheetfit", `${subCount}`, `${dtfCount}`],
];

export function ProcessCompare() {
  return (
    <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-hairline">
      <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
        <caption className="sr-only">Sublimation and DTF compared</caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className="w-[26%] p-5 text-[13px] font-semibold text-muted">
              &nbsp;
            </th>
            <th scope="col" className="p-5">
              <span className="flex items-center gap-2 text-[17px] font-semibold">
                <span className="size-3 rounded-full bg-process-cyan" /> Sublimation
              </span>
            </th>
            <th scope="col" className="p-5">
              <span className="flex items-center gap-2 text-[17px] font-semibold">
                <span className="size-3 rounded-full bg-process-magenta" /> DTF
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([k, sub, dtf]) => (
            <tr key={k} className="border-b border-hairline last:border-0">
              <th scope="row" className="p-5 align-top text-[14px] font-semibold text-muted">
                {k}
              </th>
              <td className="tnum p-5 align-top leading-relaxed">{sub}</td>
              <td className="tnum p-5 align-top leading-relaxed">{dtf}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FAQ: [string, string][] = [
  ["Is Sheetfit free? Do I need an account?", "It is free and open source under the MIT licence, and there is no account to create. Open the editor and start."],
  [
    "Are my images uploaded anywhere?",
    "No. Sheetfit has no server: images are read and laid out in your browser, projects are saved in your browser's storage, and you can export a .sheetfit project file to keep or move.",
  ],
  [
    "Which printers does it work with?",
    "Any printer that can print a PDF or image at 100% scale. Sheetfit prepares the file at the exact sheet size; colour profiles and printer settings stay in your printer software.",
  ],
  ["Will my design be cropped or stretched?", "Not unless you ask. Images are fitted whole inside the print area by default; stretching asks for confirmation and cropping is a separate, opt-in mode."],
  [
    "Which sheet sizes are supported?",
    `${SHEETS.filter((s) => s.kind === "paper").map((s) => s.short).join(", ")}, 22 in DTF gang sheets from 12 to 120 in long, a 13 in roll, and any custom size.`,
  ],
  ["My product is not in the list. Can I still use it?", "Yes. Add a box at any custom size from the Products panel, and every template size stays editable too."],
  ["Does it mirror the print for me?", "Yes, for sublimation: every export is mirrored for transfer paper. DTF output is left as seen. The setting follows the process, and you can change it."],
  ["Can I see my design on the product before printing?", "Yes. A live 3D model of the product sits next to the sheet while you design, in any blank colour, and a larger 3D view lets you turn it, zoom and save an image."],
];

export function Faq() {
  return (
    <div className="divide-y divide-hairline rounded-3xl bg-white ring-1 ring-hairline">
      {FAQ.map(([q, a]) => (
        <details key={q} className="group p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
            {q}
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-[18px] transition-transform duration-300 group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}
