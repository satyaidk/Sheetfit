import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Landing page. One idea, shown rather than described: a design box typed in
 * millimetres, with the whole logo inside it and the leftover space labelled.
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-chrome">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8" />
          <span className="font-condensed text-[22px] font-bold tracking-tight">Sheetfit</span>
        </Link>
        <Link
          href="/editor"
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] font-medium hover:border-line-strong"
        >
          Open editor
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
        <div>
          <h1 className="font-condensed text-[44px] leading-[0.98] font-bold tracking-[-0.015em] text-ink sm:text-[60px]">
            Print the whole design, at the size you typed.
          </h1>
          <p className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-ink-muted">
            Lay out logos, transfers, stickers and cards on an A4 sheet in real millimetres. Images are fitted inside
            the size you ask for, never cropped and never stretched unless you say so, then exported as an exact-size
            PDF, PNG or JPEG.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/editor"
              className="rounded-md bg-cyan px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#006893]"
            >
              Start a sheet
            </Link>
            <Link
              href="/editor?sample"
              className="rounded-md border border-line-strong bg-surface px-5 py-3 text-[15px] font-semibold text-ink hover:border-ink-faint"
            >
              Open the sample sheet
            </Link>
          </div>
          <dl className="mt-12 grid max-w-xl gap-5 sm:grid-cols-3">
            <div>
              <dt className="text-[14px] font-semibold">Nothing cut off</dt>
              <dd className="mt-1 text-[13px] leading-snug text-ink-muted">
                Every edge of the image stays. Spare space is shown, not hidden.
              </dd>
            </div>
            <div>
              <dt className="text-[14px] font-semibold">Real sizes</dt>
              <dd className="mt-1 text-[13px] leading-snug text-ink-muted">
                Millimetres, centimetres, inches or pixels at 150, 300 or 600 DPI.
              </dd>
            </div>
            <div>
              <dt className="text-[14px] font-semibold">Stays on your device</dt>
              <dd className="mt-1 text-[13px] leading-snug text-ink-muted">
                No account, no upload. Projects save in your browser.
              </dd>
            </div>
          </dl>
        </div>

        <SheetIllustration />
      </main>
    </div>
  );
}

/** A4 sheet on the cutting mat, with a 90 × 60 mm box and a square logo fitted inside. */
function SheetIllustration() {
  return (
    <div className="mat-surface relative overflow-hidden rounded-xl p-6 sm:p-10" aria-hidden>
      <svg viewBox="0 0 250 320" className="mx-auto block w-full max-w-[460px]">
        <defs>
          <filter id="sheet-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.35" />
          </filter>
        </defs>
        {/* A4 at 1 unit = 1 mm, offset into the frame. */}
        <g transform="translate(20 12)">
          <rect width="210" height="297" fill="#fff" filter="url(#sheet-shadow)" />
          <rect x="5" y="5" width="200" height="287" fill="none" stroke="#00a0e0" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.7" />

          {/* 90 × 60 box */}
          <g transform="translate(20 22)">
            <rect width="90" height="60" fill="none" stroke="#16191c" strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="2 2" />
            <rect x="0.5" y="0.5" width="14.5" height="59" fill="#00a0e0" opacity="0.1" />
            <rect x="75" y="0.5" width="14.5" height="59" fill="#00a0e0" opacity="0.1" />
            <circle cx="45" cy="30" r="29" fill="#1f3b6f" />
            <circle cx="45" cy="30" r="24" fill="none" stroke="#f2c14e" strokeWidth="1.8" />
            <text x="45" y="34" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily="sans-serif">ACE</text>
            {/* dimension lines */}
            <g stroke="#0079ad" strokeWidth="0.45" fill="#0079ad">
              <line x1="0" y1="-6" x2="90" y2="-6" />
              <line x1="0" y1="-8" x2="0" y2="-4" />
              <line x1="90" y1="-8" x2="90" y2="-4" />
              <line x1="96" y1="0" x2="96" y2="60" />
              <line x1="94" y1="0" x2="98" y2="0" />
              <line x1="94" y1="60" x2="98" y2="60" />
            </g>
            <text x="45" y="-8.5" textAnchor="middle" fontSize="5.5" fontWeight="600" fill="#0079ad" fontFamily="sans-serif">90 mm</text>
            <text x="99.5" y="32" fontSize="5.5" fontWeight="600" fill="#0079ad" fontFamily="sans-serif">60 mm</text>
            <text x="45" y="68" textAnchor="middle" fontSize="4.6" fill="#59616a" fontFamily="sans-serif">
              logo prints 60 × 60 mm, 15 mm spare each side
            </text>
          </g>

          {/* stickers row */}
          <g transform="translate(20 110)">
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(${i * 57} 0)`}>
                <rect width="50" height="50" fill="none" stroke="#16191c" strokeOpacity="0.25" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
                <circle cx="25" cy="25" r="24" fill="#1f3b6f" />
                <circle cx="25" cy="25" r="20" fill="none" stroke="#f2c14e" strokeWidth="1.4" />
              </g>
            ))}
          </g>

          {/* wide wordmark, letterboxed */}
          <g transform="translate(20 180)">
            <rect width="170" height="40" fill="none" stroke="#16191c" strokeOpacity="0.25" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
            <text x="85" y="25" textAnchor="middle" fontSize="20" fontStyle="italic" fontWeight="900" fill="#c0185a" fontFamily="sans-serif">
              summer camp
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
