/**
 * Landing hero visual: a print sheet with rulers and crop marks, onto which
 * real printed products settle like transfers, each tagged with the print
 * size Sheetfit would use. A single heat-press sweep crosses the sheet once
 * they have landed. CSS-only animation (see `.transfer` and `.press-sweep` in
 * globals.css), so it prerenders and respects reduced motion.
 */

import Image from "next/image";
import { FlipHorizontal2, Gauge } from "lucide-react";
import { PHOTOS, type PhotoKey } from "./photos";

const TRANSFERS: { photo: PhotoKey; tag: string; className: string; tilt: number; delay: number }[] = [
  { photo: "mugHeart", tag: "Mug 11 oz wrap, 8.5 × 3.5 in", className: "left-[7%] top-[8%] w-[47%] aspect-[4/3]", tilt: -4, delay: 150 },
  { photo: "teeOnAir", tag: "Full front, 11 × 11 in", className: "right-[6%] top-[5%] w-[40%] aspect-[4/5]", tilt: 3, delay: 330 },
  { photo: "phoneCases", tag: "Phone cases, sublimated", className: "left-[5%] bottom-[7%] w-[50%] aspect-[4/3]", tilt: 2.5, delay: 510 },
  { photo: "toteDog", tag: "Tote, 9 × 9 in", className: "right-[8%] bottom-[9%] w-[37%] aspect-square", tilt: -3, delay: 690 },
];

function CropMark({ className }: { className: string }) {
  return <span aria-hidden className={`absolute size-4 border-ink-deep/60 ${className}`} />;
}

export function HeroSheet() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      {/* The sheet: paper with a top and left ruler, crop marks at the corners. */}
      <div className="relative aspect-[5/6] rounded-[4px] bg-white shadow-[0_2px_4px_rgb(29_27_58/0.08),0_30px_60px_-12px_rgb(29_27_58/0.35)] ring-1 ring-ink-deep/10">
        <div
          aria-hidden
          className="absolute inset-x-6 top-0 h-3 bg-[repeating-linear-gradient(90deg,rgb(29_27_58/0.35)_0_1px,transparent_1px_10px)] [mask-image:linear-gradient(transparent_0,black_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-y-6 left-0 w-3 bg-[repeating-linear-gradient(180deg,rgb(29_27_58/0.35)_0_1px,transparent_1px_10px)] [mask-image:linear-gradient(90deg,transparent_0,black_100%)]"
        />
        <CropMark className="-top-5 -left-5 border-r border-b" />
        <CropMark className="-top-5 -right-5 border-b border-l" />
        <CropMark className="-bottom-5 -left-5 border-t border-r" />
        <CropMark className="-right-5 -bottom-5 border-t border-l" />

        {TRANSFERS.map((t) => {
          const photo = PHOTOS[t.photo];
          return (
            <figure
              key={t.photo}
              className={`transfer absolute ${t.className}`}
              style={{ "--tilt": `${t.tilt}deg`, "--delay": `${t.delay}ms` } as React.CSSProperties}
            >
              <div className="relative size-full overflow-hidden rounded-[3px] bg-white p-1.5 shadow-[0_8px_20px_-6px_rgb(29_27_58/0.45)] outline-1 outline-offset-4 outline-process-magenta/70 outline-dashed">
                <div className="relative size-full overflow-hidden rounded-[2px]">
                  <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 280px, 45vw" placeholder="blur" priority className="object-cover" />
                </div>
              </div>
              <figcaption className="tnum absolute -bottom-3 left-2 max-w-[92%] truncate rounded-full bg-ink-deep px-2 py-0.5 text-[9.5px] font-semibold whitespace-nowrap text-white shadow-md sm:left-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
                {t.tag}
              </figcaption>
            </figure>
          );
        })}

        {/* One heat-press sweep after the transfers land. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4px]">
          <div className="press-sweep absolute inset-y-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgb(255_210_31/0.28),rgb(229_0_125/0.18),transparent)]" />
        </div>
      </div>

      <div
        className="hero-copy absolute -left-4 top-[44%] flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[12.5px] font-semibold text-ink-deep shadow-[0_10px_30px_-8px_rgb(29_27_58/0.4)] ring-1 ring-ink-deep/10 sm:-left-10"
        style={{ "--delay": "1100ms" } as React.CSSProperties}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-process-cyan/15 text-process-cyan">
          <FlipHorizontal2 className="size-3.5" />
        </span>
        Mirrored for sublimation
      </div>
      <div
        className="hero-copy absolute -right-3 top-[54%] flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[12.5px] font-semibold text-ink-deep shadow-[0_10px_30px_-8px_rgb(29_27_58/0.4)] ring-1 ring-ink-deep/10 sm:-right-8"
        style={{ "--delay": "1300ms" } as React.CSSProperties}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-ok-soft text-ok">
          <Gauge className="size-3.5" />
        </span>
        Sharpness checked at print size
      </div>
    </div>
  );
}
