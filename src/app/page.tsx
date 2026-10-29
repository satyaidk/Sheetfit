import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Faq, ProcessCompare } from "@/components/landing/HomeSections";
import { PHOTOS, type PhotoKey } from "@/components/landing/photos";
import { productPhotoSrc } from "@/components/products/ProductArt";
import { findProduct, PRODUCTS } from "@/lib/catalogue/products";
import { productHref } from "@/lib/editor-link";

/**
 * Home page: a short, plain walk through what Sheetfit does.
 *
 * Hero (what it is, with real print photos), three steps that mirror the
 * editor (pick a product, add a design, export), a row of product templates
 * that open in the editor, Sublimation vs DTF, FAQ and a call to action.
 * Server-rendered, no scroll effects. Styles are scoped to `.home`. Photos are
 * licensed (Unsplash/Pexels, credited in the footer); product pictures are
 * renders of Sheetfit's own 3D models.
 */

const REPO = "https://github.com/satyaidk/Sheetfit";

const STEPS: { photo: PhotoKey; title: string; body: string }[] = [
  {
    photo: "mugBlank",
    title: "Pick a product",
    body: `Choose a mug, tumbler, shirt placement or any of ${PRODUCTS.length} templates. The editor opens on the right sheet with the print area at its real size.`,
  },
  {
    photo: "teeLayers",
    title: "Add your design",
    body: "Drop in your artwork. It is fitted whole, never cropped, and you see it on the product in 3D in any blank colour.",
  },
  {
    photo: "heatPressBlackTee",
    title: "Export and press",
    body: "Download a PDF, PNG or JPEG at the exact size, mirrored for sublimation and left as seen for DTF. Then press.",
  },
];

const FEATURED = ["mug-11oz", "tumbler-20oz", "tumbler-40oz-top", "tee-full-front", "hoodie-front", "tote", "cap-front", "coaster-round"];

const GALLERY: PhotoKey[] = ["mugHeart", "teeCoffee", "toteDog", "phoneCases"];

const CREDITED: PhotoKey[] = ["heatPressWorkshop", "mugGrad", ...STEPS.map((s) => s.photo), ...GALLERY];

function Cta({ light = false }: { light?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/editor"
        className={`group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[16px] font-semibold transition-transform hover:-translate-y-0.5 ${light ? "bg-white text-night" : "bg-night text-white"}`}
      >
        Start designing
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <Link
        href="/editor?sample"
        className={`rounded-full px-6 py-3.5 text-[16px] font-semibold ring-1 transition-colors ${light ? "text-white ring-white/30 hover:bg-white/10" : "text-night ring-night/20 hover:bg-night/5"}`}
      >
        Open a sample project
      </Link>
    </div>
  );
}

function Heading({ id, eyebrow, title, body }: { id: string; eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mb-10 max-w-[640px]">
      <p className="text-[14px] font-semibold text-process-magenta">{eyebrow}</p>
      <h2 id={id} className="home-display mt-2 text-[clamp(2rem,4vw,3rem)]">
        {title}
      </h2>
      {body && <p className="mt-4 text-[17px] leading-relaxed text-muted">{body}</p>}
    </div>
  );
}

export default function Home() {
  const credits = [...new Set(CREDITED)].map((k) => PHOTOS[k]);

  return (
    <div className="home min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-hairline bg-mist/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <span className="home-display text-[19px]">Sheetfit</span>
          </Link>
          <nav aria-label="Sections" className="hidden gap-7 text-[15px] text-muted md:flex">
            <a href="#how" className="hover:text-night">How it works</a>
            <a href="#products" className="hover:text-night">Products</a>
            <a href="#processes" className="hover:text-night">Sublimation vs DTF</a>
            <a href="#faq" className="hover:text-night">FAQ</a>
          </nav>
          <Link href="/editor" className="rounded-full bg-night px-5 py-2.5 text-[14.5px] font-semibold text-white">
            Open editor
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section aria-labelledby="hero-title">
          <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold ring-1 ring-hairline">
                <span className="flex gap-1" aria-hidden>
                  <span className="size-2 rounded-full bg-process-cyan" />
                  <span className="size-2 rounded-full bg-process-magenta" />
                  <span className="size-2 rounded-full bg-process-yellow" />
                </span>
                For sublimation and DTF printing
              </p>
              <h1 id="hero-title" className="home-display mt-6 text-[clamp(2.5rem,5vw,4rem)]">
                Print-ready designs for mugs, tumblers and shirts.
              </h1>
              <p className="mt-5 max-w-[50ch] text-[18px] leading-relaxed text-muted">
                Sheetfit lays out your artwork on transfer sheets at the exact size each product needs, shows it on the product in 3D, and
                exports a file that is ready for the press.
              </p>
              <div className="mt-8">
                <Cta />
              </div>
              <ul className="mt-8 grid max-w-[480px] grid-cols-2 gap-x-6 gap-y-2.5 text-[15px]">
                {[`${PRODUCTS.length} product templates`, "Exact mm, cm or inch sizes", "PDF, PNG and JPEG export", "Free, no account, no uploads"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-process-cyan" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid h-[440px] grid-cols-[1.4fr_1fr] grid-rows-2 gap-4">
              <div className="relative row-span-2 overflow-hidden rounded-3xl">
                <Image src={PHOTOS.heatPressWorkshop.src} alt={PHOTOS.heatPressWorkshop.alt} fill priority sizes="(min-width: 1024px) 34vw, 60vw" placeholder="blur" className="object-cover" />
              </div>
              <div className="relative overflow-hidden rounded-3xl">
                <Image src={PHOTOS.mugGrad.src} alt={PHOTOS.mugGrad.alt} fill sizes="(min-width: 1024px) 22vw, 40vw" placeholder="blur" className="object-cover" />
              </div>
              <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-4 ring-1 ring-hairline">
                <Image src={productPhotoSrc("mug-11oz")} alt="Sheetfit's 3D render of an 11 oz mug with a sample design" width={180} height={180} className="h-auto w-full max-w-[160px]" />
                <p className="mt-2 text-center text-[13px] text-muted">Previewed in 3D</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-20 bg-white">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8">
            <Heading id="how-title" eyebrow="How it works" title="Three steps from artwork to print." />
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="overflow-hidden rounded-3xl bg-mist ring-1 ring-hairline">
                  <div className="relative aspect-[4/3]">
                    <Image src={PHOTOS[s.photo].src} alt={PHOTOS[s.photo].alt} fill sizes="(min-width: 768px) 33vw, 100vw" placeholder="blur" className="object-cover" />
                  </div>
                  <div className="p-6">
                    <p className="text-[13px] font-semibold text-process-magenta">Step {i + 1}</p>
                    <h3 className="mt-1 text-[20px] font-semibold">{s.title}</h3>
                    <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Products */}
        <section id="products" aria-labelledby="products-title" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8">
            <Heading
              id="products-title"
              eyebrow="Products"
              title="Start from a template."
              body={`Each of the ${PRODUCTS.length} templates knows its real print area. Click one to open it in the editor.`}
            />
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {FEATURED.map((id) => {
                const p = findProduct(id)!;
                return (
                  <li key={id}>
                    <Link href={productHref(id)} className="group block rounded-3xl bg-white p-4 ring-1 ring-hairline transition-shadow hover:shadow-lg">
                      <Image src={productPhotoSrc(id)} alt={`${p.name}, ${p.detail}`} width={240} height={240} className="mx-auto h-auto w-full max-w-[200px] transition-transform group-hover:scale-[1.03]" />
                      <p className="mt-3 text-[15px] font-semibold">{p.name}</p>
                      <p className="text-[13.5px] text-muted">{p.detail}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-[15px] text-muted">
              <Link href="/editor" className="font-semibold text-night underline decoration-night/30 underline-offset-4">
                See all {PRODUCTS.length} in the editor
              </Link>
            </p>
          </div>
        </section>

        {/* Gallery */}
        <section aria-labelledby="gallery-title" className="bg-white">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8">
            <Heading id="gallery-title" eyebrow="What you can make" title="Mugs, shirts, totes, cases and more." />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {GALLERY.map((k) => (
                <div key={k} className="relative aspect-[3/4] overflow-hidden rounded-3xl">
                  <Image src={PHOTOS[k].src} alt={PHOTOS[k].alt} fill sizes="(min-width: 768px) 25vw, 50vw" placeholder="blur" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sublimation vs DTF */}
        <section id="processes" aria-labelledby="processes-title" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8">
            <Heading
              id="processes-title"
              eyebrow="Sublimation or DTF"
              title="Set up correctly for each process."
              body="Switch the process in the editor and the mirroring, sheet sizes and templates follow."
            />
            <ProcessCompare />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 bg-white">
          <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
            <Heading id="faq-title" eyebrow="FAQ" title="Questions, answered." />
            <Faq />
          </div>
        </section>

        {/* Call to action */}
        <section aria-labelledby="cta-title" className="bg-night text-white">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-8 px-4 py-20 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="cta-title" className="home-display text-[clamp(2rem,4vw,3rem)]">
                Ready for your next print?
              </h2>
              <p className="mt-3 max-w-[46ch] text-[17px] text-white/70">Free, in your browser, nothing to install.</p>
            </div>
            <Cta light />
          </div>
        </section>
      </main>

      <footer className="bg-night text-white/60">
        <div className="mx-auto grid w-full max-w-[1200px] gap-4 border-t border-white/10 px-4 py-10 text-[13.5px] sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex items-center gap-2.5 text-white">
              <Logo className="size-6" />
              <span className="home-display text-[17px]">Sheetfit</span>
            </span>
            <nav aria-label="Footer" className="flex gap-6">
              <Link href="/editor" className="hover:text-white">Editor</Link>
              <a href={REPO} className="hover:text-white" target="_blank" rel="noreferrer">GitHub</a>
            </nav>
          </div>
          <p>
            Photos used under the Unsplash and Pexels licences:{" "}
            {credits.map((c, i) => (
              <span key={c.url}>
                <a href={c.url} className="underline decoration-white/30 hover:text-white" target="_blank" rel="noreferrer">
                  {c.by}
                </a>{" "}
                on {c.site}
                {i < credits.length - 1 ? ", " : "."}
              </span>
            ))}{" "}
            Product pictures are renders of Sheetfit&apos;s own 3D models.
          </p>
        </div>
      </footer>
    </div>
  );
}
