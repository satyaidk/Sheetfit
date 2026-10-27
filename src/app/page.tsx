import Image from "next/image";
import Link from "next/link";
import { Box, Download, FlipHorizontal2, Gauge, LayoutGrid, Maximize2, Ruler, ShieldCheck, Files } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ProductMockup } from "@/components/products/ProductMockup";
import { HeroSheet } from "@/components/landing/HeroSheet";
import { ColorDemo } from "@/components/landing/ColorDemo";
import { PHOTOS, type PhotoKey } from "@/components/landing/photos";
import { PRODUCTS, slotSize, type ProductPreset } from "@/lib/catalogue/products";
import { colorsFor } from "@/lib/catalogue/colors";
import { renderSampleSvg, sampleDesign, svgDataUrl } from "@/lib/catalogue/sample-designs";
import editorShot from "../../public/editor-preview.png";

/**
 * Landing page, built around the print shop's own world: a sheet with rulers
 * and crop marks that real transfers settle onto (the one orchestrated
 * animation), real photos of sublimated and DTF-printed products, the four
 * steps from template to press, the facts that separate sublimation from DTF,
 * and the template catalogue drawn with the editor's own mockup renderer.
 * Static except the interactive preview, so it prerenders.
 */

const INK_BAR = ["#00a3c4", "#e5007d", "#ffd21f", "#1d1b3a", "#7fd1e2", "#f27fbe", "#ffe88f", "#8e8da0"];

const PRINTS: { photo: PhotoKey; product: string; process: "Sublimation" | "DTF"; className: string }[] = [
  // Four columns, three rows; the spans tile the grid with no gaps.
  { photo: "mugHeart", product: "Ceramic mug", process: "Sublimation", className: "sm:col-span-2 sm:row-span-2" },
  { photo: "teeCoffee", product: "White tee, full front", process: "DTF", className: "" },
  { photo: "toteDog", product: "Canvas tote", process: "DTF", className: "" },
  { photo: "teeLayers", product: "Black tee, full front", process: "DTF", className: "sm:row-span-2" },
  { photo: "mugGrad", product: "Gift mug", process: "Sublimation", className: "" },
  { photo: "teeBestMom", product: "Slogan tee", process: "DTF", className: "sm:col-span-2" },
  { photo: "heatPressBlackTee", product: "Pressing a transfer", process: "DTF", className: "" },
];

const FEATURES = [
  { icon: <Maximize2 />, title: "Nothing cropped", body: "Images are fitted whole inside the print area. Spare space is shown and measured, never cut off." },
  { icon: <Ruler />, title: "True physical size", body: "Millimetres, centimetres or inches, on A4, A3, Letter, Legal, A3+ and 22 in DTF gang sheets." },
  { icon: <FlipHorizontal2 />, title: "Mirrored when it should be", body: "Sublimation output is flipped for transfer paper. DTF film stays as seen, as a transparent PNG." },
  { icon: <Gauge />, title: "Sharpness you can see", body: "Every image shows its DPI at the printed size, so a blurry print is caught before ink is used." },
  { icon: <LayoutGrid />, title: "Fill the sheet", body: "Repeat, auto-arrange and live millimetre gaps; the footer shows how much of the sheet you are paying for." },
  { icon: <Files />, title: "One sheet per job", body: "Each product gets the sheet it needs. A tumbler wrap on A3 never pushes your A4 coasters onto A3." },
  { icon: <Box />, title: "Every product in 3D", body: "All 52 templates have a 3D model at real size: glazed mugs, steel tumblers, fabric tees, cork-backed coasters." },
];

const SHOWCASE = ["mug-11oz", "tumbler-20oz", "tumbler-40oz-top", "glass-can-16oz", "coaster-square", "mousepad-rect", "tee-left-chest", "tee-full-front", "hoodie-front", "cap-front", "tote", "onesie-front"];

/** Fixed sample designs for the catalogue, so the server render is stable. */
function showcaseLook(p: ProductPreset, i: number) {
  const garment = p.group === "apparel" || p.art === "cap" || p.art === "tote";
  const design = sampleDesign(1009 + i * 7919, garment ? "emblem" : "pattern");
  const colors = colorsFor(p);
  const color = garment ? colors[(i * 5) % colors.length] : colors[0];
  const slot = slotSize(p);
  return { color: color.hex, dark: color.dark, href: svgDataUrl(renderSampleSvg(design, slot.width / slot.height)) };
}

function ProcessChip({ process }: { process: "Sublimation" | "DTF" }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold text-ink-deep shadow-sm">
      <span className={`size-2 rounded-full ${process === "DTF" ? "bg-process-magenta" : "bg-process-cyan"}`} />
      {process}
    </span>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span aria-hidden className="font-display block text-[72px] leading-none font-extrabold text-transparent [-webkit-text-stroke:1.5px_var(--ink-deep)]">
      {n}
    </span>
  );
}

export default function Home() {
  const showcase = SHOWCASE.map((id) => PRODUCTS.find((p) => p.id === id)!);
  const credits = Object.values(PHOTOS);

  return (
    <div className="min-h-dvh overflow-x-clip bg-white text-ink">
      <header className="sticky top-0 z-30 border-b border-ink-deep/10 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="size-8" />
            <span className="font-display text-[21px] font-bold tracking-tight text-ink-deep">Sheetfit</span>
          </Link>
          <nav className="flex items-center gap-1 text-[14px]">
            <a href="#how" className="hidden rounded-md px-3 py-2 text-ink-muted hover:text-ink-deep md:block">
              How it works
            </a>
            <a href="#processes" className="hidden rounded-md px-3 py-2 text-ink-muted hover:text-ink-deep md:block">
              Sublimation or DTF
            </a>
            <a href="#templates" className="hidden rounded-md px-3 py-2 text-ink-muted hover:text-ink-deep md:block">
              Templates
            </a>
            <Link href="/editor" className="ml-2 rounded-full bg-ink-deep px-4 py-2 font-semibold text-white transition-colors hover:bg-ink-deep-2">
              Open the editor
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_85%_20%,rgb(0_163_196/0.10),transparent_60%),radial-gradient(50%_50%_at_10%_90%,rgb(229_0_125/0.07),transparent_60%),radial-gradient(40%_40%_at_60%_100%,rgb(255_210_31/0.10),transparent_60%)]"
          />
          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:pt-20 lg:pb-28">
            <div className="max-w-xl">
              <h1
                className="hero-copy font-display text-[44px] leading-[0.98] font-extrabold tracking-[-0.035em] text-ink-deep [font-stretch:92%] sm:text-[64px] lg:text-[72px]"
                style={{ "--delay": "0ms" } as React.CSSProperties}
              >
                Your design on the mug, at the exact size.
              </h1>
              <p className="hero-copy mt-6 max-w-[52ch] text-[17px] leading-relaxed text-ink-muted sm:text-[18px]" style={{ "--delay": "120ms" } as React.CSSProperties}>
                Sheetfit lays out sublimation and DTF transfers on A4, A3 and 22 in gang sheets. Pick a product, drop in
                your artwork, see it on the blank, and download a file that prints true to the millimetre.
              </p>
              <div className="hero-copy mt-9 flex flex-wrap gap-3" style={{ "--delay": "240ms" } as React.CSSProperties}>
                <Link
                  href="/editor"
                  className="rounded-full bg-accent px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-8px_rgb(7_125_137/0.6)] transition-colors hover:bg-accent-hover"
                >
                  Start designing
                </Link>
                <Link
                  href="/editor?sample"
                  className="rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-ink-deep ring-1 ring-ink-deep/15 transition-colors hover:bg-subtle"
                >
                  Open the sample project
                </Link>
              </div>
              <p className="hero-copy mt-5 text-[13.5px] text-ink-faint" style={{ "--delay": "320ms" } as React.CSSProperties}>
                Free. No account. Your images never leave your browser.
              </p>
            </div>
            <HeroSheet />
          </div>
          {/* A printer's colour bar marks the edge of the sheet world. */}
          <div aria-hidden className="grid h-2.5 grid-cols-8">
            {INK_BAR.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
        </section>

        {/* Real prints */}
        <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-28" aria-labelledby="prints-title">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <h2 id="prints-title" className="font-display max-w-xl text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink-deep sm:text-[46px]">
              The prints you sell, from mugs to gang-sheet tees.
            </h2>
            <p className="max-w-sm text-[15px] leading-relaxed text-ink-muted">
              Sublimation dyes coated mugs, bottles and light polyester. DTF presses a printed film onto any fabric, any
              colour. Sheetfit has templates for both.
            </p>
          </div>
          <ul className="grid auto-rows-[220px] grid-cols-1 gap-3 sm:grid-flow-dense sm:grid-cols-4 sm:auto-rows-[200px] lg:auto-rows-[240px]">
            {PRINTS.map((item) => {
              const photo = PHOTOS[item.photo];
              return (
                <li key={item.photo} className={`group relative overflow-hidden rounded-2xl bg-subtle ${item.className}`}>
                  <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw" placeholder="blur" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-[linear-gradient(transparent,rgb(29_27_58/0.6))] p-3 pt-10">
                    <span className="text-[13.5px] font-semibold text-white drop-shadow">{item.product}</span>
                    <ProcessChip process={item.process} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 bg-[#f4f5f9]" aria-labelledby="how-title">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 id="how-title" className="font-display mb-16 max-w-2xl text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink-deep sm:text-[46px]">
              From blank to press in four steps.
            </h2>
            <ol className="relative flex flex-col gap-20 before:absolute before:top-4 before:bottom-4 before:left-[22px] before:hidden before:border-l-2 before:border-dashed before:border-ink-deep/20 lg:gap-28 lg:before:block">
              <li className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pl-20">
                <div>
                  <StepNumber n={1} />
                  <h3 className="font-display mt-3 text-[26px] font-bold tracking-tight text-ink-deep">Pick what you are printing</h3>
                  <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-ink-muted">
                    52 templates with real print areas: an 11 oz mug wrap, a 20 oz tumbler, a left-chest transfer, a tote.
                    Sheetfit opens the sheet that holds it: A4, A3 or a 22 in roll.
                  </p>
                </div>
                <div className="relative">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                    <Image src={PHOTOS.mugBlank.src} alt={PHOTOS.mugBlank.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" placeholder="blur" className="object-cover" />
                  </div>
                  <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl bg-white p-3 pr-5 shadow-[0_18px_40px_-12px_rgb(29_27_58/0.35)] ring-1 ring-ink-deep/10 sm:left-8">
                    <span className="flex size-16 items-center justify-center rounded-xl bg-subtle">
                      <ProductMockup product={findShowcase("mug-11oz")} showArea className="size-14" />
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold text-ink-deep">Mug 11 oz, full wrap</span>
                      <span className="tnum block text-[12.5px] text-ink-muted">215.9 × 88.9 mm on an A4 sheet</span>
                    </span>
                  </div>
                </div>
              </li>

              <li className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pl-20">
                <div className="lg:order-2">
                  <StepNumber n={2} />
                  <h3 className="font-display mt-3 text-[26px] font-bold tracking-tight text-ink-deep">Drop in your design</h3>
                  <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-ink-muted">
                    Your artwork is fitted whole into the print area, never cropped. Gaps, margins and sharpness are
                    measured in millimetres and DPI while you work, the way you would check them on paper.
                  </p>
                </div>
                <div className="overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_24px_50px_-16px_rgb(29_27_58/0.35)] ring-1 ring-ink-deep/10 lg:order-1">
                  <Image src={editorShot} alt="The Sheetfit editor with product templates, a sheet of mug, coaster and magnet prints, and the live product preview" sizes="(min-width: 1024px) 50vw, 100vw" placeholder="blur" className="h-auto w-full rounded-xl" />
                </div>
              </li>

              <li className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pl-20">
                <div>
                  <StepNumber n={3} />
                  <h3 className="font-display mt-3 text-[26px] font-bold tracking-tight text-ink-deep">See it on the product</h3>
                  <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-ink-muted">
                    Turn the product around in 3D, with the design on it, in any blank colour, or check the flat view.
                    Save an image for your customer. Try it here.
                  </p>
                </div>
                <ColorDemo />
              </li>

              <li className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pl-20">
                <div className="lg:order-2">
                  <StepNumber n={4} />
                  <h3 className="font-display mt-3 text-[26px] font-bold tracking-tight text-ink-deep">Print and press</h3>
                  <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-ink-muted">
                    Download a PDF at the sheet&apos;s exact size, mirrored for sublimation and left as seen for DTF, or a
                    PNG with the DPI written in. Or print from the browser at 100%.
                  </p>
                </div>
                <div className="relative lg:order-1">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                    <Image src={PHOTOS.heatPressWorkshop.src} alt={PHOTOS.heatPressWorkshop.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" placeholder="blur" className="object-cover" />
                  </div>
                  <div className="absolute -right-2 -bottom-5 flex items-center gap-2.5 rounded-2xl bg-white p-3 pr-4 shadow-[0_18px_40px_-12px_rgb(29_27_58/0.35)] ring-1 ring-ink-deep/10 sm:right-6">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-white">
                      <Download className="size-5" />
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold text-ink-deep">sheet.pdf</span>
                      <span className="tnum block text-[12.5px] text-ink-muted">297 × 420 mm, mirrored</span>
                    </span>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Sublimation or DTF */}
        <section id="processes" className="scroll-mt-16 bg-ink-deep text-white" aria-labelledby="proc-title">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 id="proc-title" className="font-display max-w-2xl text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[46px]">
              Sublimation or DTF? Sheetfit sets up each one correctly.
            </h2>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">
              Switch the process and the mirroring, sheet sizes and product templates follow.
            </p>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {[
                {
                  name: "Sublimation",
                  dot: "bg-process-cyan",
                  photo: PHOTOS.mugGrad,
                  facts: [
                    ["Prints on", "White or light polyester, and coated mugs, tumblers, bottles, slate and aluminium"],
                    ["Mirror the print", "Yes. The transfer paper is printed mirror-image"],
                    ["Usual sheets", "A4, A3, US Letter and Legal, 13 in rolls"],
                    ["On dark blanks", "Barely shows: the dye is see-through"],
                  ],
                },
                {
                  name: "DTF",
                  dot: "bg-process-magenta",
                  photo: PHOTOS.teeOnAir,
                  facts: [
                    ["Prints on", "Cotton, polyester and blends, in any colour"],
                    ["Mirror the print", "No. The film is printed as seen"],
                    ["Usual sheets", "22 in gang sheets from 12 to 120 in long, A3, A4"],
                    ["On dark blanks", "Bright, thanks to a white underbase"],
                  ],
                },
              ].map((p) => (
                <article key={p.name} className="overflow-hidden rounded-3xl bg-ink-deep-2 ring-1 ring-white/10">
                  <div className="relative aspect-[16/9]">
                    <Image src={p.photo.src} alt={p.photo.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" placeholder="blur" className="object-cover" />
                  </div>
                  <div className="p-6 sm:p-8">
                    <h3 className="font-display flex items-center gap-3 text-[28px] font-bold tracking-tight">
                      <span className={`size-3 rounded-full ${p.dot}`} />
                      {p.name}
                    </h3>
                    <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-[150px_1fr]">
                      {p.facts.map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-[13.5px] font-semibold text-white/60">{k}</dt>
                          <dd className="text-[15px] leading-snug text-white/90">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Precision */}
        <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-28" aria-labelledby="exact-title">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
            <Image src={PHOTOS.cmykLoupe.src} alt={PHOTOS.cmykLoupe.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" placeholder="blur" className="object-cover" />
            <div aria-hidden className="absolute inset-x-6 top-6 h-4 rounded-sm bg-white/85 bg-[repeating-linear-gradient(90deg,rgb(29_27_58/0.6)_0_1px,transparent_1px_8px)] backdrop-blur" />
          </div>
          <div>
            <h2 id="exact-title" className="font-display max-w-xl text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink-deep sm:text-[46px]">
              Built for the print, not just the screen.
            </h2>
            <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <dt className="flex items-center gap-3 text-[16px] font-semibold text-ink-deep">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent [&_svg]:size-[18px]">{f.icon}</span>
                    {f.title}
                  </dt>
                  <dd className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{f.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="scroll-mt-16 bg-[#f4f5f9]" aria-labelledby="tpl-title">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <h2 id="tpl-title" className="font-display max-w-xl text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink-deep sm:text-[46px]">
                {PRODUCTS.length} templates, sized from real blanks.
              </h2>
              <p className="max-w-sm text-[15px] leading-relaxed text-ink-muted">
                Print areas come from blank suppliers and DTF placement guides, each with its source. Wraps include seam
                overlap, flat goods include bleed, and every size stays editable.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {showcase.map((p, i) => {
                const look = showcaseLook(p, i);
                return (
                  <li key={p.id} className="rounded-2xl bg-white p-3 ring-1 ring-ink-deep/5">
                    <span className="flex aspect-square items-center justify-center rounded-xl bg-[radial-gradient(circle_at_50%_32%,#ffffff,#e9ecf1)]">
                      <ProductMockup product={p} color={look.color} design={look.href} blend={look.dark ? "normal" : "multiply"} className="size-[88%] drop-shadow-[0_8px_10px_rgb(29_27_58/0.18)]" />
                    </span>
                    <p className="mt-2.5 truncate text-[14px] font-semibold text-ink-deep">{p.name}</p>
                    <p className="truncate text-[12.5px] text-ink-muted">{p.detail}</p>
                    <p className="tnum text-[12px] text-ink-faint">
                      {+p.width.toFixed(1)} × {+p.height.toFixed(1)} mm
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Call to action */}
        <section className="relative isolate overflow-hidden">
          <Image src={PHOTOS.rollPrinter.src} alt="" fill sizes="100vw" placeholder="blur" className="-z-20 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(29_27_58/0.94)_30%,rgb(29_27_58/0.6))]" />
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-24 sm:px-6 lg:py-32">
            <h2 className="font-display max-w-2xl text-[36px] leading-[1.02] font-extrabold tracking-[-0.03em] text-white sm:text-[54px]">
              Set up your next sheet in a minute.
            </h2>
            <p className="max-w-xl text-[17px] leading-relaxed text-white/75">
              Choose a product, add your design, and download a print-ready file. Nothing to install, nothing uploaded.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/editor" className="rounded-full bg-process-yellow px-7 py-3.5 text-[15px] font-semibold text-ink-deep transition-colors hover:bg-[#ffe066]">
                Start designing
              </Link>
              <Link href="/editor?sample" className="rounded-full px-7 py-3.5 text-[15px] font-semibold text-white ring-1 ring-white/40 transition-colors hover:bg-white/10">
                Open the sample project
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink-deep text-white/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 text-[13px] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-white">
              <Logo className="size-6" />
              <span className="font-display font-bold">Sheetfit</span>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4" /> Runs in your browser. No sign-up, no uploads.
            </span>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-white/80 hover:text-white">Photo credits</summary>
            <p className="mt-3 leading-relaxed">
              Photos used under the Unsplash and Pexels licences:{" "}
              {credits.map((c, i) => (
                <span key={c.url}>
                  <a href={c.url} className="underline decoration-white/30 hover:text-white" target="_blank" rel="noreferrer">
                    {c.by}
                  </a>{" "}
                  on {c.site}
                  {i < credits.length - 1 ? ", " : "."}
                </span>
              ))}
            </p>
          </details>
        </div>
      </footer>
    </div>
  );
}

function findShowcase(id: string): ProductPreset {
  return PRODUCTS.find((p) => p.id === id)!;
}
