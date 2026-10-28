import Link from "next/link";
import { Logo } from "@/components/Logo";
import { StudioNav } from "@/components/landing/StudioNav";
import { StudioMotion } from "@/components/landing/StudioMotion";
import { HeroComposition } from "@/components/landing/HeroComposition";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { Workflow } from "@/components/landing/Workflow";
import { SheetDemo } from "@/components/landing/SheetDemo";
import { ColorDemo } from "@/components/landing/ColorDemo";
import { SpecSheet } from "@/components/landing/SpecSheet";
import { PHOTOS } from "@/components/landing/photos";

/**
 * Home page: a print studio rather than a SaaS landing page.
 *
 * Everything is scoped to `.studio` (paper, ink, lime and coral tokens in
 * globals.css), so the editor's look is untouched. The page explains the
 * product by showing it: a real A4 sheet beside printed products, the real
 * catalogue, the four steps of a job, a miniature sheet that runs the editor's
 * own layout code, the editor's 3D preview, and a spec sheet of what the tool
 * checks. Server-rendered except the nav, the two demos and the scroll motion.
 * Every action opens a real editor flow (`/editor`, `?product=`, `?sample`).
 */

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;
const REPO = "https://github.com/satyaidk/Sheetfit";

export default function Home() {
  const credits = Object.values(PHOTOS);

  return (
    <div className="studio min-h-dvh overflow-x-clip">
      <StudioMotion />
      <StudioNav />

      <main>
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative">
          <div className="mx-auto grid w-full max-w-[1320px] items-center gap-10 px-4 pt-10 pb-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pt-16 lg:pb-24">
            <div>
              <p className="studio-rise flex items-center gap-2 text-[12px] font-bold tracking-[0.14em] text-graphite-soft uppercase" style={delay(0)}>
                <span className="size-2 rounded-full bg-lime ring-1 ring-graphite/30" />
                <span className="size-2 rounded-full bg-coral" />
                Made for sublimation &amp; DTF
              </p>
              <h1 id="hero-title" className="studio-display mt-6 text-[clamp(3.4rem,9.4vw,7.6rem)]">
                <span className="studio-rise relative z-[1] block" style={delay(80)}>
                  Your designs.
                </span>
                <span className="studio-rise relative z-[1] block" style={delay(200)}>
                  Perfectly sized.
                </span>
                <span className="studio-rise block" style={delay(320)}>
                  <span className="bg-lime box-decoration-clone px-[0.06em]">Print-ready.</span>
                </span>
              </h1>
              <p className="studio-rise mt-7 max-w-[50ch] text-[18px] leading-relaxed text-graphite-soft" style={delay(440)}>
                Arrange your artwork on real-size print sheets, preview your products, and prepare production-ready files,
                all in one creative workspace.
              </p>
              <div className="studio-rise mt-9 flex flex-wrap gap-3" style={delay(540)}>
                <Link
                  href="/editor"
                  className="rounded-full bg-graphite px-7 py-4 text-[16px] font-semibold text-paper shadow-[0_14px_30px_-14px_rgb(34_35_31/0.7)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-graphite/90 active:translate-y-0 active:scale-[0.98]"
                >
                  Start designing
                </Link>
                <a
                  href="#templates"
                  className="rounded-full px-7 py-4 text-[16px] font-semibold text-graphite ring-1 ring-graphite/25 transition-[background-color,box-shadow] duration-200 hover:bg-white hover:ring-graphite/40"
                >
                  Explore templates
                </a>
              </div>
              <p className="studio-rise mt-6 text-[14px] text-graphite-soft" style={delay(620)}>
                Free, no account. Your images never leave your browser.
              </p>
            </div>
            <HeroComposition />
          </div>
        </section>

        <ProductShowcase />

        <Workflow />

        {/* Interactive sheet */}
        <section id="try" aria-labelledby="try-title" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-20 sm:px-8 lg:py-28">
            <div data-reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <h2 id="try-title" className="studio-display max-w-[13ch] text-[clamp(2.6rem,6vw,5rem)]">
                Move a transfer. Watch the sheet.
              </h2>
              <p className="max-w-[44ch] text-[17px] leading-relaxed text-graphite-soft">
                Three real sheets, packed the way the editor packs them. Drag a transfer to see it snap to guides, measure
                its gaps in millimetres and update how much of the sheet you use.
              </p>
            </div>
            <div data-reveal>
              <SheetDemo />
            </div>
          </div>
        </section>

        {/* 3D preview */}
        <section id="preview" aria-labelledby="preview-title" className="scroll-mt-20 bg-paper-deep">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-20 sm:px-8 lg:py-28">
            <div data-reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <h2 id="preview-title" className="studio-display max-w-[15ch] text-[clamp(2.6rem,6vw,5rem)]">
                See the design before it reaches the press.
              </h2>
              <p className="max-w-[44ch] text-[17px] leading-relaxed text-graphite-soft">
                Every template has a 3D model at its real size. Turn it, change the blank colour, and compare how
                sublimation and DTF print on it. The editor shows the same preview while you design.
              </p>
            </div>
            <div data-reveal>
              <ColorDemo />
            </div>
          </div>
        </section>

        <SpecSheet />

        {/* Closing call to action */}
        <section aria-labelledby="cta-title" className="bg-lime">
          <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-20 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:py-28">
            <h2 id="cta-title" data-reveal className="studio-display max-w-[14ch] text-[clamp(2.8rem,7vw,6rem)]">
              Make your next print your best one.
            </h2>
            <div data-reveal>
              <p className="max-w-[40ch] text-[18px] leading-relaxed">
                Bring your artwork into a workspace built for preparing designs for production.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/editor" className="rounded-full bg-graphite px-7 py-4 text-[16px] font-semibold text-paper transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-graphite/90 active:scale-[0.98]">
                  Start designing
                </Link>
                <Link href="/editor?sample" className="rounded-full px-7 py-4 text-[16px] font-semibold ring-1 ring-graphite/40 transition-colors hover:bg-graphite/8">
                  Open the sample project
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-graphite text-paper/70">
        <div className="mx-auto grid w-full max-w-[1320px] gap-10 px-4 py-14 text-[14px] sm:px-8 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <span className="flex items-center gap-2.5 text-paper">
              <Logo className="size-7" />
              <span className="font-display text-[19px] font-bold">Sheetfit</span>
            </span>
            <p className="mt-3 max-w-[34ch] leading-relaxed">Print layouts for sublimation and DTF. Runs in your browser; no sign-up, no uploads.</p>
          </div>
          <nav aria-label="Product">
            <p className="font-semibold text-paper">Product</p>
            <ul className="mt-3 grid gap-2">
              <li><Link href="/editor" className="hover:text-paper">Editor</Link></li>
              <li><Link href="/editor?sample" className="hover:text-paper">Sample project</Link></li>
              <li><a href="#templates" className="hover:text-paper">Templates</a></li>
              <li><a href="#how" className="hover:text-paper">How it works</a></li>
            </ul>
          </nav>
          <nav aria-label="Project">
            <p className="font-semibold text-paper">Project</p>
            <ul className="mt-3 grid gap-2">
              <li><a href={REPO} className="hover:text-paper" target="_blank" rel="noreferrer">Source on GitHub</a></li>
              <li><a href={`${REPO}#readme`} className="hover:text-paper" target="_blank" rel="noreferrer">Documentation</a></li>
            </ul>
          </nav>
          <details className="md:col-span-3">
            <summary className="cursor-pointer text-paper/85 hover:text-paper">Photo credits</summary>
            <p className="mt-3 max-w-[90ch] leading-relaxed">
              Photos used under the Unsplash and Pexels licences:{" "}
              {credits.map((c, i) => (
                <span key={c.url}>
                  <a href={c.url} className="underline decoration-paper/30 hover:text-paper" target="_blank" rel="noreferrer">
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
