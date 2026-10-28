/**
 * Hero artwork: a real A4 sublimation sheet next to the products it prints.
 *
 * The sheet is the "Mug and coasters" example from `sheet-demos.ts`, so every
 * box sits where the editor's packer puts it, at its real size. The mug wrap
 * is shown selected, with its size, and the gap to its neighbour is measured
 * with the editor's own `measureGaps`. Two photos of printed products sit
 * beside the sheet. Motion is CSS only: transfers settle in turn, then the
 * annotations appear and drift by a few pixels; the photos move with a gentle
 * parallax (StudioMotion). All of it prerenders.
 */

import Image from "next/image";
import { demoSheet, mm } from "@/lib/landing/sheet-demos";
import { measureGaps } from "@/lib/layout/measure";
import { PHOTOS } from "./photos";
import { demoArt } from "./demo-art";

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

function Ruler({ length, vertical = false }: { length: number; vertical?: boolean }) {
  const ticks = Array.from({ length: Math.floor(length / 10) + 1 }, (_, i) => i * 10);
  return (
    <svg
      aria-hidden
      viewBox={vertical ? `0 0 6 ${length}` : `0 0 ${length} 6`}
      preserveAspectRatio="none"
      className={vertical ? "absolute top-0 -left-3 h-full w-2" : "absolute -top-3 left-0 h-2 w-full"}
    >
      {ticks.map((t) => (
        <line
          key={t}
          x1={vertical ? (t % 50 ? 3.5 : 0) : t}
          x2={vertical ? 6 : t}
          y1={vertical ? t : t % 50 ? 3.5 : 0}
          y2={vertical ? t : 6}
          stroke="currentColor"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export function HeroComposition() {
  const sheet = demoSheet("sublimation-a4");
  const { width: W, height: H } = sheet;
  const mug = sheet.items.find((i) => i.productId === "mug-11oz")!;
  const first = sheet.items.find((i) => i.productId === "coaster-round")!;
  const others = sheet.items.filter((i) => i !== first);
  const gap = measureGaps(first, others, null).find((g) => g.axis === "x" && g.from >= first.x + first.width - 0.01);

  return (
    <div className="relative mx-auto w-full max-w-[640px] pt-[21%] pb-[25%]">
      {/* Photos of printed products, laid over the sheet's quieter corners. */}
      <div data-parallax="0.05" className="absolute top-0 right-0 z-20 w-[29%]">
        <figure className="studio-settle rotate-[4deg] rounded-[6px] bg-white p-1.5 shadow-[0_24px_48px_-20px_rgb(34_35_31/0.45)]" style={delay(900)}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[3px]">
            <Image src={PHOTOS.mugHeart.src} alt={PHOTOS.mugHeart.alt} fill priority sizes="(min-width: 1024px) 190px, 30vw" placeholder="blur" className="object-cover" />
          </div>
          <figcaption className="tnum px-1 pt-1.5 pb-0.5 text-[11px] leading-tight font-semibold sm:text-[12px]">Mug 11 oz, 8.5 × 3.5 in wrap</figcaption>
        </figure>
      </div>
      <div data-parallax="0.09" className="absolute right-[7%] bottom-0 z-20 w-[27%]">
        <figure className="studio-settle -rotate-[4deg] rounded-[6px] bg-white p-1.5 shadow-[0_24px_48px_-20px_rgb(34_35_31/0.5)]" style={delay(1050)}>
          <div className="relative aspect-square overflow-hidden rounded-[3px]">
            <Image src={PHOTOS.teeOnAir.src} alt={PHOTOS.teeOnAir.alt} fill priority sizes="(min-width: 1024px) 180px, 28vw" placeholder="blur" className="object-cover" />
          </div>
          <figcaption className="tnum px-1 pt-1.5 pb-0.5 text-[11px] leading-tight font-semibold sm:text-[12px]">DTF, full front 11 × 11 in</figcaption>
        </figure>
      </div>

      {/* The sheet, at its real proportions, with rulers. */}
      <div className="relative z-10 ml-[3%] w-[86%] text-graphite/45">
        <Ruler length={W} />
        <Ruler length={H} vertical />
        <span className="tnum studio-fade absolute -top-8 left-0 text-[11.5px] font-semibold text-graphite-soft" style={delay(1300)}>
          {sheet.sheetName}, {mm(W, H)}
        </span>
        <div
          className="relative overflow-hidden rounded-[2px] bg-white shadow-[0_1px_2px_rgb(34_35_31/0.08),0_40px_70px_-28px_rgb(34_35_31/0.45)] ring-1 ring-graphite/10"
          style={{ aspectRatio: `${W} / ${H}` }}
          role="img"
          aria-label={`An ${sheet.sheetName} sublimation sheet holding a mug wrap, two round coasters and a fridge magnet, each at its real print size`}
        >
          <div
            aria-hidden
            className="absolute border border-dashed border-graphite/20"
            style={{ left: pct(sheet.printable.x, W), top: pct(sheet.printable.y, H), width: pct(sheet.printable.width, W), height: pct(sheet.printable.height, H) }}
          />
          {sheet.items.map((item, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL, nothing to optimise
            <img
              key={item.id}
              src={demoArt(item)}
              alt=""
              className={`studio-settle absolute object-cover ${item.shape === "circle" ? "rounded-full" : ""}`}
              style={{ ...delay(250 + i * 140), left: pct(item.x, W), top: pct(item.y, H), width: pct(item.width, W), height: pct(item.height, H) }}
            />
          ))}
          {gap && (
            <div aria-hidden className="studio-fade absolute" style={{ ...delay(1500), left: pct(gap.from, W), width: pct(gap.value, W), top: pct(gap.at, H) }}>
              <span className="block h-px bg-guide" />
            </div>
          )}
        </div>

        {/* Selection on the mug wrap, drawn over the sheet like the editor's handles. */}
        <div
          aria-hidden
          className="studio-fade pointer-events-none absolute"
          style={{ ...delay(1350), left: pct(mug.x, W), top: pct(mug.y, H), width: pct(mug.width, W), height: pct(mug.height, H) }}
        >
          <span className="absolute -inset-[3px] rounded-[2px] ring-2 ring-graphite" />
          {["-top-[6px] -left-[6px]", "-top-[6px] -right-[6px]", "-bottom-[6px] -left-[6px]", "-right-[6px] -bottom-[6px]"].map((c) => (
            <span key={c} className={`absolute size-[9px] rounded-full border-2 border-graphite bg-white ${c}`} />
          ))}
        </div>
        <div className="studio-fade absolute" style={{ ...delay(1450), left: pct(mug.x + mug.width / 2, W), top: pct(mug.y + mug.height, H) }}>
          <span className="studio-float tnum absolute top-2.5 -translate-x-1/2 rounded-full bg-lime px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap text-graphite shadow-sm sm:text-[12.5px]">
            {mm(mug.width, mug.height)}
          </span>
        </div>
        {gap && (
          <div className="studio-fade absolute" style={{ ...delay(1550), left: pct(gap.from + gap.value / 2, W), top: pct(gap.at, H) }}>
            <span className="tnum absolute -top-7 -translate-x-1/2 rounded-md bg-guide px-1.5 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-white">{+gap.value.toFixed(1)} mm</span>
          </div>
        )}
      </div>

      <p
        className="studio-fade studio-float absolute bottom-[7%] left-[1%] z-20 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[12px] font-semibold shadow-[0_12px_30px_-12px_rgb(34_35_31/0.45)] sm:text-[13px]"
        style={delay(1700)}
      >
        <span className="size-2 rounded-full bg-coral" />
        Mirrored on export for sublimation
      </p>
    </div>
  );
}
