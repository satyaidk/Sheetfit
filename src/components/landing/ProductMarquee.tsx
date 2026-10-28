/**
 * The whole catalogue in two slow, opposite-moving rows of product renders.
 * Each item opens its template in the editor. The rows pause on hover or
 * keyboard focus; with reduced motion they stop and scroll sideways by hand.
 * Two copies of each row make the loop seamless (the second is hidden from
 * assistive technology and not focusable). Server-rendered.
 */

import Link from "next/link";
import { PRODUCTS, type ProductPreset } from "@/lib/catalogue/products";
import { productHref } from "@/lib/editor-link";
import { ProductArt } from "@/components/products/ProductArt";

const inches = (v: number) => +(v / 25.4).toFixed(2);

function Item({ p, copy }: { p: ProductPreset; copy: boolean }) {
  return (
    <li aria-hidden={copy || undefined} className={`w-[200px] shrink-0 ${copy ? "motion-reduce:hidden" : ""}`}>
      <Link
        href={productHref(p.id)}
        tabIndex={copy ? -1 : undefined}
        className="group block rounded-2xl bg-white p-3 ring-1 ring-hairline transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgb(13_12_34/0.35)]"
      >
        <span className="flex aspect-square items-center justify-center rounded-xl bg-[radial-gradient(circle_at_50%_40%,#fff,var(--home-mist-2))]">
          <ProductArt product={p} sizes="180px" className="size-[92%] transition-transform duration-500 group-hover:scale-[1.06]" />
        </span>
        <span className="mt-2.5 block truncate px-1 text-[14px] font-semibold">{p.name}</span>
        <span className="tnum block truncate px-1 text-[12.5px] text-muted">
          {p.detail.match(/\d/) ? p.detail : `${p.detail}, ${inches(p.width)} × ${inches(p.height)} in`}
        </span>
      </Link>
    </li>
  );
}

function Row({ items, duration, reverse }: { items: ProductPreset[]; duration: number; reverse?: boolean }) {
  return (
    <div className="home-marquee-host overflow-x-auto [scrollbar-width:none] motion-safe:overflow-hidden">
      <ul
        className="home-marquee flex w-max gap-4 px-2 py-3"
        style={{ "--duration": `${duration}s`, "--direction": reverse ? "reverse" : "normal" } as React.CSSProperties}
      >
        {items.map((p) => (
          <Item key={p.id} p={p} copy={false} />
        ))}
        {items.map((p) => (
          <Item key={`copy-${p.id}`} p={p} copy />
        ))}
      </ul>
    </div>
  );
}

export function ProductMarquee() {
  const half = Math.ceil(PRODUCTS.length / 2);
  return (
    <div className="flex flex-col gap-2 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
      <Row items={PRODUCTS.slice(0, half)} duration={90} />
      <Row items={PRODUCTS.slice(half)} duration={100} reverse />
    </div>
  );
}
