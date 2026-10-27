import Image from "next/image";
import Link from "next/link";
import { Files, FlipHorizontal2, Gauge, LayoutGrid, Maximize2, ShieldCheck, Ruler, Shirt } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ProductMockup } from "@/components/products/ProductMockup";
import { PRODUCTS, slotSize, type ProductPreset } from "@/lib/catalogue/products";
import { colorsFor } from "@/lib/catalogue/colors";
import { renderSampleSvg, sampleDesign, svgDataUrl } from "@/lib/catalogue/sample-designs";

/**
 * Landing page. Opens with the product itself (a real editor screenshot), then
 * the catalogue of researched product sizes, then what makes the output
 * print-ready. Kept static so it prerenders.
 */

const SHOWCASE = [
  "mug-11oz",
  "tumbler-20oz",
  "tumbler-40oz-top",
  "glass-can-16oz",
  "coaster-square",
  "mousepad-rect",
  "tee-left-chest",
  "tee-full-front",
  "hoodie-front",
  "cap-front",
  "tote",
  "onesie-front",
];

const FEATURES = [
  { icon: <Maximize2 />, title: "Nothing cropped", body: "Images are fitted whole inside the size you ask for. Spare space is shown and measured." },
  { icon: <Ruler />, title: "True physical size", body: "Millimetres, centimetres or inches on A4, A3, Letter, Legal, A3+ and 22 in DTF gang sheets." },
  { icon: <FlipHorizontal2 />, title: "Mirrored when it should be", body: "Sublimation output is flipped for transfer; DTF stays as seen with a transparent PNG." },
  { icon: <Gauge />, title: "Print quality you can see", body: "Every image shows its effective DPI at the printed size before ink is wasted." },
  { icon: <LayoutGrid />, title: "Fill the sheet", body: "Repeat, auto-arrange and live millimetre gaps. Sheet usage shows how much film you pay for." },
  { icon: <ShieldCheck />, title: "Private by design", body: "No sign-up and no upload. Images and projects stay in your browser." },
  { icon: <Shirt />, title: "See it on the product", body: "Preview every design on the mug, tumbler or shirt in any blank colour, and turn a mug around." },
  { icon: <Files />, title: "A sheet per size", body: "Pages keep their own sheet, so an A3 tumbler wrap never pushes your A4 coasters onto A3." },
];

/** Fixed sample designs for the showcase, so the server render is stable. */
function showcaseLook(p: ProductPreset, i: number) {
  const garment = p.group === "apparel" || p.art === "cap" || p.art === "tote";
  const design = sampleDesign(1009 + i * 7919, garment ? "emblem" : "pattern");
  const colors = colorsFor(p);
  const color = garment ? colors[(i * 5) % colors.length] : colors[0];
  const slot = slotSize(p);
  return { color: color.hex, dark: color.dark, href: svgDataUrl(renderSampleSvg(design, slot.width / slot.height)) };
}

export default function Home() {
  const showcase = SHOWCASE.map((id) => PRODUCTS.find((p) => p.id === id)!);
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-10 border-b border-line/70 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="size-8" />
            <span className="text-[19px] font-bold tracking-tight">Sheetfit</span>
          </Link>
          <nav className="flex items-center gap-1 text-[14px]">
            <a href="#products" className="hidden rounded-md px-3 py-2 text-ink-muted hover:text-ink sm:block">
              Products
            </a>
            <a href="#features" className="hidden rounded-md px-3 py-2 text-ink-muted hover:text-ink sm:block">
              Features
            </a>
            <Link href="/editor" className="ml-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-hover">
              Open editor
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20">
          <p className="mx-auto mb-5 w-fit rounded-full bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent">
            For sublimation and DTF print shops
          </p>
          <h1 className="mx-auto max-w-3xl text-[40px] leading-[1.05] font-bold tracking-[-0.025em] text-ink sm:text-[60px]">
            Lay out print sheets at the exact size you need.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-muted sm:text-[18px]">
            Pick a mug, tumbler or shirt placement, drop in your design, and export a print-ready PDF or PNG. The
            whole image is kept, the size is true to the millimetre, and transfers come out mirrored when they should.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/editor" className="rounded-xl bg-accent px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_6px_20px_rgb(7_125_137/0.28)] hover:bg-accent-hover">
              Start a sheet, free
            </Link>
            <Link href="/editor?sample" className="rounded-xl bg-subtle px-6 py-3.5 text-[15px] font-semibold text-ink hover:bg-subtle-2">
              Try the sample sheet
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-ink-faint">No account. Nothing leaves your browser.</p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6" aria-label="Editor preview">
          <div className="overflow-hidden rounded-2xl bg-canvas p-2 shadow-[0_2px_6px_rgb(16_24_40/0.06),0_24px_60px_rgb(16_24_40/0.14)] ring-1 ring-black/5 sm:p-3">
            <Image
              src="/editor-preview.png"
              alt="The Sheetfit editor: product templates on the left, an A4 sheet with a mug wrap, coasters and a magnet in the middle, and print settings on the right"
              width={1440}
              height={900}
              priority
              className="h-auto w-full rounded-xl"
            />
          </div>
        </section>

        <section id="products" className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[36px]">
              {PRODUCTS.length} product templates, sized from real blanks
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">
              Print areas come from blank suppliers and DTF placement guides, each with its source. Wraps include seam
              overlap, flat goods include bleed, and every size stays editable because brands vary.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {showcase.map((p, i) => {
              const look = showcaseLook(p, i);
              return (
                <li key={p.id} className="rounded-xl bg-subtle p-3">
                  <span className="flex aspect-square items-center justify-center rounded-lg bg-[radial-gradient(circle_at_50%_38%,var(--surface),var(--subtle-2))]">
                    <ProductMockup product={p} color={look.color} design={look.href} blend={look.dark ? "normal" : "multiply"} className="size-[86%]" />
                  </span>
                  <p className="mt-2.5 truncate text-[14px] font-semibold">{p.name}</p>
                  <p className="truncate text-[12.5px] text-ink-muted">{p.detail}</p>
                  <p className="tnum text-[12px] text-ink-faint">
                    {+p.width.toFixed(1)} × {+p.height.toFixed(1)} mm
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
          <h2 className="mb-10 max-w-2xl text-[30px] leading-tight font-bold tracking-tight sm:text-[36px]">
            Built for the print, not just the screen
          </h2>
          <dl className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <dt className="flex items-center gap-3 text-[16px] font-semibold">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent [&_svg]:size-[18px]">{f.icon}</span>
                  {f.title}
                </dt>
                <dd className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{f.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto mb-20 w-full max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start gap-5 rounded-2xl bg-ink px-8 py-10 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[24px] font-bold tracking-tight">Your next sheet, sized right the first time.</p>
              <p className="mt-1 text-[15px] text-white/70">Open the editor and pick what you are printing.</p>
            </div>
            <Link href="/editor" className="shrink-0 rounded-xl bg-white px-6 py-3 text-[15px] font-semibold text-ink hover:bg-white/90">
              Open the editor
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-ink-faint sm:px-6">
          <span>Sheetfit, MIT licensed.</span>
          <span>Sizes researched October 2026. Always check your blank supplier&apos;s template.</span>
        </div>
      </footer>
    </div>
  );
}
