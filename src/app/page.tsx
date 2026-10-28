import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Crop, FlipHorizontal2, Ruler } from "lucide-react";
import { Logo } from "@/components/Logo";
import { HomeNav } from "@/components/landing/HomeNav";
import { StudioMotion } from "@/components/landing/StudioMotion";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { ProductMarquee } from "@/components/landing/ProductMarquee";
import { StoryWorkflow } from "@/components/landing/StoryWorkflow";
import { SheetDemo } from "@/components/landing/SheetDemo";
import { ColorDemo } from "@/components/landing/ColorDemo";
import { Faq, FeatureGrid, ProcessCompare } from "@/components/landing/HomeSections";
import { PHOTOS, type PhotoKey } from "@/components/landing/photos";
import { GROUP_LABELS, PRODUCTS, type ProductGroup } from "@/lib/catalogue/products";

/**
 * Home page ("Night press"): explains what Sheetfit is for, shows it working,
 * and links every action into a real editor flow.
 *
 * Order: hero with product renders, why it exists, the catalogue, the four
 * steps as a scroll story, a live sheet to try, the 3D preview, capabilities,
 * Sublimation vs DTF, FAQ, call to action. Styles are scoped to `.home`
 * (globals.css), so the editor is untouched. Server-rendered except the nav,
 * hero picker, scroll story, the two demos and the scroll motion.
 */

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;
const REPO = "https://github.com/satyaidk/Sheetfit";
const USED_PHOTOS: PhotoKey[] = ["heatPressWorkshop", "rollPrinter"];

const PROBLEMS = [
  {
    icon: <Ruler />,
    problem: "The print comes out the wrong size.",
    fix: "Every template has its real print area in millimetres, sourced from blank suppliers, and the sheet is exported at its exact size.",
  },
  {
    icon: <Crop />,
    problem: "Part of the design gets cut off.",
    fix: "Artwork is fitted whole inside the print area. Spare space is measured; nothing is cropped unless you choose to crop.",
  },
  {
    icon: <FlipHorizontal2 />,
    problem: "The transfer comes out backwards.",
    fix: "Sublimation output is mirrored for transfer paper automatically; DTF film is left as seen.",
  },
];

function SectionHead({ id, eyebrow, title, body, dark = false }: { id: string; eyebrow: string; title: string; body?: string; dark?: boolean }) {
  return (
    <div data-reveal className="mb-12 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
      <div>
        <p className={`text-[14px] font-semibold ${dark ? "text-process-cyan" : "text-process-magenta"}`}>{eyebrow}</p>
        <h2 id={id} className="home-display mt-3 max-w-[18ch] text-[clamp(2.2rem,4.6vw,3.6rem)]">
          {title}
        </h2>
      </div>
      {body && <p className={`max-w-[48ch] text-[17px] leading-relaxed lg:justify-self-end ${dark ? "text-white/70" : "text-muted"}`}>{body}</p>}
    </div>
  );
}

export default function Home() {
  const groups = (Object.keys(GROUP_LABELS) as ProductGroup[]).map((g) => [GROUP_LABELS[g], PRODUCTS.filter((p) => p.group === g).length] as const);
  const credits = USED_PHOTOS.map((k) => PHOTOS[k]);

  return (
    <div className="home min-h-dvh overflow-x-clip">
      <StudioMotion />
      <HomeNav />

      <main>
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-night text-white">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_75%_40%,rgb(0_163_196/0.22),transparent_70%),radial-gradient(40%_40%_at_10%_90%,rgb(229_0_125/0.18),transparent_70%)]" />
          <div aria-hidden data-parallax="0.12" className="absolute inset-0 -z-10 bg-[linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />
          <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-4 pt-28 pb-16 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-36 lg:pb-24">
            <div>
              <p className="home-rise inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/12" style={delay(0)}>
                <span className="flex gap-1" aria-hidden>
                  <span className="size-2 rounded-full bg-process-cyan" />
                  <span className="size-2 rounded-full bg-process-magenta" />
                  <span className="size-2 rounded-full bg-process-yellow" />
                </span>
                For sublimation and DTF printing
              </p>
              <h1 id="hero-title" className="home-display mt-6 text-[clamp(2.6rem,5.4vw,4.6rem)]">
                <span className="home-rise block" style={delay(100)}>
                  Print-ready layouts,
                </span>
                <span className="home-rise block bg-[linear-gradient(90deg,var(--process-cyan),var(--process-magenta)_55%,var(--process-yellow))] bg-clip-text pb-1 text-transparent" style={delay(220)}>
                  sized to the millimetre.
                </span>
              </h1>
              <p className="home-rise mt-6 max-w-[52ch] text-[18px] leading-relaxed text-white/72" style={delay(340)}>
                Pick a mug, tumbler, shirt or any of {PRODUCTS.length} templates, drop in your artwork, see it on the product in 3D, and
                download a file that prints at the exact size, mirrored when it should be.
              </p>
              <div className="home-rise mt-9 flex flex-wrap gap-3" style={delay(460)}>
                <Link
                  href="/editor"
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-[16px] font-semibold text-night shadow-[0_18px_40px_-16px_rgb(0_163_196/0.8)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  Start designing
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link href="/editor?sample" className="rounded-full px-7 py-4 text-[16px] font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10">
                  Open a sample project
                </Link>
              </div>
              <ul className="home-rise mt-10 grid max-w-[520px] grid-cols-2 gap-x-6 gap-y-3 text-[14.5px] text-white/80" style={delay(580)}>
                {[`${PRODUCTS.length} product templates`, "Exact mm, cm or inch sizes", "PDF, PNG and JPEG export", "Free, no account, no uploads"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-process-cyan" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="home-fade" style={delay(300)}>
              <HeroShowcase />
            </div>
          </div>
          <div aria-hidden className="home-inkbar h-1.5" />
        </section>

        {/* Why */}
        <section id="why" aria-labelledby="why-title" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
            <SectionHead
              id="why-title"
              eyebrow="Why Sheetfit"
              title="Built for the press, not just the screen."
              body="General design tools think in pixels. A heat press thinks in millimetres, mirror images and transfer sheets. Sheetfit closes that gap, so what you print is what you planned."
            />
            <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_1.1fr]">
              <div data-reveal className="relative min-h-[320px] overflow-hidden rounded-3xl">
                <Image src={PHOTOS.heatPressWorkshop.src} alt={PHOTOS.heatPressWorkshop.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" placeholder="blur" className="object-cover" />
                <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-night/80 p-4 text-white backdrop-blur-md">
                  <p className="text-[13px] text-white/65">A transfer only gets one chance</p>
                  <p className="mt-1 text-[16px] font-semibold">Ink, paper and blanks are spent the moment the press closes.</p>
                </div>
              </div>
              <ol data-reveal className="flex flex-col gap-4">
                {PROBLEMS.map((p) => (
                  <li key={p.problem} className="flex gap-5 rounded-3xl bg-white p-6 ring-1 ring-hairline">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-night text-white [&_svg]:size-5">{p.icon}</span>
                    <div>
                      <p className="text-[17px] font-semibold">{p.problem}</p>
                      <p className="mt-1.5 text-[15.5px] leading-relaxed text-muted">{p.fix}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Catalogue */}
        <section id="templates" aria-labelledby="templates-title" className="scroll-mt-20 border-y border-hairline bg-white">
          <div className="mx-auto w-full max-w-[1280px] px-4 pt-24 sm:px-8 lg:pt-32">
            <SectionHead
              id="templates-title"
              eyebrow="Templates"
              title={`${PRODUCTS.length} products, each at its real print size.`}
              body="Print areas come from blank suppliers and transfer placement guides. Open any of them and the editor starts on the sheet it needs."
            />
            <dl data-reveal className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {groups.map(([label, n]) => (
                <div key={label} className="rounded-2xl bg-mist px-5 py-4">
                  <dt className="text-[14px] text-muted">{label}</dt>
                  <dd className="home-display tnum mt-1 text-[30px]">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div data-reveal className="pb-24 lg:pb-32">
            <ProductMarquee />
            <p className="mx-auto mt-8 w-full max-w-[1280px] px-4 text-[15px] text-muted sm:px-8">
              Pictures are renders of each template&apos;s 3D model with a sample design.{" "}
              <Link href="/editor" className="font-semibold text-night underline decoration-night/30 underline-offset-4 hover:decoration-night">
                Browse them all in the editor
              </Link>
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-20 bg-night text-white">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
            <SectionHead id="how-title" dark eyebrow="How it works" title="From artwork to print-ready in four steps." />
            <StoryWorkflow />
          </div>
        </section>

        {/* Try the sheet */}
        <section id="try" aria-labelledby="try-title" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
            <SectionHead
              id="try-title"
              eyebrow="Try it here"
              title="Move a transfer. Watch the sheet."
              body="Three real sheets, packed the way the editor packs them. Drag a transfer to see it snap to guides, measure its gaps in millimetres and update how much of the sheet you use."
            />
            <div data-reveal>
              <SheetDemo />
            </div>
          </div>
        </section>

        {/* 3D preview */}
        <section id="preview" aria-labelledby="preview-title" className="scroll-mt-20 bg-night text-white">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
            <SectionHead
              id="preview-title"
              dark
              eyebrow="3D preview"
              title="See the design on the product before it reaches the press."
              body="Every template has a 3D model at its real size. Turn it, zoom in, jump to the front, side or back, change the blank colour, and compare how sublimation and DTF print on it."
            />
            <div data-reveal className="text-night">
              <ColorDemo />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-title" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
            <SectionHead id="features-title" eyebrow="Features" title="The checks a print shop makes by hand, done while you design." />
            <div data-reveal>
              <FeatureGrid />
            </div>
          </div>
        </section>

        {/* Sublimation vs DTF */}
        <section id="processes" aria-labelledby="processes-title" className="scroll-mt-20 bg-white">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
            <SectionHead
              id="processes-title"
              eyebrow="Sublimation or DTF"
              title="Two processes, set up correctly for each."
              body="Switch the process in the editor and the mirroring, sheet sizes and available templates follow."
            />
            <div data-reveal>
              <ProcessCompare />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20">
          <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
            <div data-reveal>
              <p className="text-[14px] font-semibold text-process-magenta">FAQ</p>
              <h2 id="faq-title" className="home-display mt-3 max-w-[14ch] text-[clamp(2.2rem,4.6vw,3.6rem)]">
                Questions, answered.
              </h2>
              <p className="mt-5 max-w-[36ch] text-[17px] leading-relaxed text-muted">
                Anything else? The source and documentation are on{" "}
                <a href={REPO} target="_blank" rel="noreferrer" className="font-semibold text-night underline decoration-night/30 underline-offset-4">
                  GitHub
                </a>
                .
              </p>
            </div>
            <div data-reveal>
              <Faq />
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-night text-white">
          <Image src={PHOTOS.rollPrinter.src} alt="" fill sizes="100vw" placeholder="blur" className="-z-20 object-cover opacity-35" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,var(--home-night)_35%,rgb(13_12_34/0.55))]" />
          <div className="mx-auto w-full max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
            <h2 id="cta-title" data-reveal className="home-display max-w-[16ch] text-[clamp(2.4rem,5.4vw,4.4rem)]">
              Make your next print your best one.
            </h2>
            <div data-reveal>
              <p className="mt-6 max-w-[46ch] text-[18px] leading-relaxed text-white/72">
                Bring your artwork into a workspace built for preparing designs for production. Free, in your browser, nothing to install.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/editor" className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-[16px] font-semibold text-night transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]">
                  Start designing
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link href="/editor?sample" className="rounded-full px-7 py-4 text-[16px] font-semibold ring-1 ring-white/30 transition-colors hover:bg-white/10">
                  Open a sample project
                </Link>
              </div>
            </div>
          </div>
          <div aria-hidden className="home-inkbar h-1.5" />
        </section>
      </main>

      <footer className="bg-night text-white/65">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-14 text-[14px] sm:px-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <span className="flex items-center gap-2.5 text-white">
              <Logo className="size-7" />
              <span className="home-display text-[19px] tracking-[-0.02em]">Sheetfit</span>
            </span>
            <p className="mt-3 max-w-[34ch] leading-relaxed">Print layouts for sublimation and DTF. Runs in your browser; no sign-up, no uploads.</p>
          </div>
          <nav aria-label="Product">
            <p className="font-semibold text-white">Product</p>
            <ul className="mt-3 grid gap-2">
              <li><Link href="/editor" className="hover:text-white">Editor</Link></li>
              <li><Link href="/editor?sample" className="hover:text-white">Sample project</Link></li>
              <li><a href="#templates" className="hover:text-white">Templates</a></li>
              <li><a href="#how" className="hover:text-white">How it works</a></li>
            </ul>
          </nav>
          <nav aria-label="Project">
            <p className="font-semibold text-white">Project</p>
            <ul className="mt-3 grid gap-2">
              <li><a href={REPO} className="hover:text-white" target="_blank" rel="noreferrer">Source on GitHub</a></li>
              <li><a href={`${REPO}#readme`} className="hover:text-white" target="_blank" rel="noreferrer">Documentation</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
            </ul>
          </nav>
          <p className="text-[13px] md:col-span-3">
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
