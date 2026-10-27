/**
 * Product mockups: a product illustration in a chosen blank colour with a
 * design laid onto its print area.
 *
 * Everything is drawn as original SVG in a 100 × 100 box (no third-party
 * product photos). Layers, back to front: parts behind the product (handles,
 * straws), the product body in its colour, the design clipped to the print
 * area, a lighting overlay that also falls on the design, then parts in front
 * (lids, rims, collars, seams) and optionally the dashed print area.
 *
 * - Wraps (mugs, tumblers, cans) show the front half of the wrap with a
 *   cylindrical projection: the design is cut into vertical strips whose
 *   widths follow sin(θ), so it curves around the product like the real one.
 * - Flat goods take the product's real aspect ratio, so a 5 × 7 in panel and
 *   an 8 × 10 in panel are drawn differently, and the design covers the face.
 * - Sublimation dye is transparent, so in `multiply` blend the blank colour
 *   shows through the design, which is what happens on a coloured shirt.
 */

import { useId } from "react";
import { WRAP_SEAM_MM, type ProductArt as ArtKind, type ProductPreset } from "@/lib/catalogue/products";
import { luminance, shade } from "@/lib/catalogue/colors";

type Box = { x: number; y: number; w: number; h: number };
type Light = "cylinder" | "flat" | "garment";

interface Tone {
  body: string;
  edge: string;
  deep: string;
}

interface ShapeSpec {
  /** Product silhouette, drawn in the blank colour and used to clip lighting. */
  sil: React.ReactNode;
  /** Drawn before the silhouette (handles, straws, strings). */
  under?: React.ReactNode;
  /** Drawn on top of the design (lids, rims, collars, seams). */
  over?: React.ReactNode;
  /** Printable face for flat goods: the design is clipped to it. */
  face?: React.ReactNode;
  faceBox?: Box;
  light: Light;
  /** Horizontal extent of a cylinder, for its lighting. */
  cyl?: { x: number; w: number };
}

export type MockupProduct = Pick<ProductPreset, "art" | "artArea" | "wrap" | "width" | "height" | "bleed" | "group" | "shape">;

const METAL = "#8e979f";
const LID = "#3f464e";
const GOLD = "#c8a74a";

/** Largest box of `aspect` (w / h) centred in `max`. */
function fitBox(max: Box, aspect: number): Box {
  const a = Math.max(0.05, aspect);
  const w = Math.min(max.w, max.h * a);
  const h = w / a;
  return { x: max.x + (max.w - w) / 2, y: max.y + (max.h - h) / 2, w, h };
}

function rectFace(max: Box, aspect: number, radius: number): { face: React.ReactNode; box: Box } {
  const b = fitBox(max, aspect);
  const r = Math.min(radius, b.w / 2, b.h / 2);
  return { face: <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={r} />, box: b };
}

function shapes(kind: ArtKind, t: Tone, p: MockupProduct): ShapeSpec {
  const aspect = p.width / p.height;
  const stroke = { stroke: t.edge, strokeWidth: 1.2, strokeLinejoin: "round" as const };
  const handle = (d: string, w: number) => (
    <>
      <path d={d} fill="none" stroke={t.edge} strokeWidth={w + 2.4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={t.body} strokeWidth={w} strokeLinecap="round" />
    </>
  );
  const flat = (max: Box, radius: number, extra?: Partial<ShapeSpec>): ShapeSpec => {
    const { face, box } = rectFace(max, aspect, radius);
    return { sil: face, face, faceBox: box, light: "flat", ...extra };
  };

  switch (kind) {
    case "mug":
      return {
        under: handle("M70 36 h5 a13 13 0 0 1 0 26 h-5", 5),
        sil: <rect x="16" y="22" width="56" height="60" rx="5" />,
        over: <ellipse cx="44" cy="22.5" rx="28" ry="3.4" fill={t.deep} {...stroke} />,
        light: "cylinder",
        cyl: { x: 16, w: 56 },
      };
    case "enamel-mug":
      return {
        under: handle("M68 41 h5 a9.5 9.5 0 0 1 0 19 h-5", 4.5),
        sil: <rect x="18" y="34" width="52" height="40" rx="4" />,
        over: (
          <>
            <rect x="17" y="32" width="54" height="4" rx="2" fill={METAL} />
            <rect x="18" y="72.5" width="52" height="2" rx="1" fill={METAL} />
          </>
        ),
        light: "cylinder",
        cyl: { x: 18, w: 52 },
      };
    case "espresso":
      return {
        under: (
          <>
            <ellipse cx="45" cy="80" rx="34" ry="5.5" fill={t.body} {...stroke} />
            {handle("M63 45 h5 a8.5 8.5 0 0 1 0 17 h-5", 4)}
          </>
        ),
        sil: <path d="M20 36 h48 l-4 38 a4 4 0 0 1 -4 3 h-32 a4 4 0 0 1 -4 -3z" />,
        over: <ellipse cx="44" cy="36.4" rx="24" ry="2.6" fill={t.deep} {...stroke} />,
        light: "cylinder",
        cyl: { x: 20, w: 48 },
      };
    case "glass-can":
      return {
        under: <rect x="56" y="5" width="4" height="16" rx="1.5" fill={METAL} />,
        sil: <rect x="26" y="18" width="48" height="66" rx="8" />,
        over: <rect x="26.5" y="16.5" width="47" height="5" rx="2" fill={METAL} />,
        light: "cylinder",
        cyl: { x: 26, w: 48 },
      };
    case "tumbler":
      return {
        under: <rect x="53.5" y="1.5" width="4" height="12" rx="1.5" fill={METAL} />,
        sil: <rect x="31" y="15" width="38" height="78" rx="4" />,
        over: <rect x="30" y="10" width="40" height="6.5" rx="2" fill={LID} />,
        light: "cylinder",
        cyl: { x: 31, w: 38 },
      };
    case "tumbler-handle":
      return {
        under: (
          <>
            <rect x="49.5" y="1.5" width="4" height="12" rx="1.5" fill={METAL} />
            {handle("M70 22 h8 a6 6 0 0 1 6 6 v24 a6 6 0 0 1 -6 6 h-8", 5.5)}
          </>
        ),
        sil: <path d="M21 17 h50 v40 l-6 32 a4 4 0 0 1 -4 3 h-30 a4 4 0 0 1 -4 -3 l-6 -32z" />,
        over: <rect x="20" y="10" width="52" height="7.5" rx="2" fill={LID} />,
        light: "cylinder",
        cyl: { x: 21, w: 50 },
      };
    case "travel-tumbler":
      return {
        sil: <path d="M28 26 h44 l-4 62 a4 4 0 0 1 -4 4 h-28 a4 4 0 0 1 -4 -4z" />,
        over: (
          <>
            <rect x="27" y="14" width="46" height="12.5" rx="3" fill={LID} />
            <rect x="44" y="12" width="12" height="3" rx="1.5" fill={LID} />
          </>
        ),
        light: "cylinder",
        cyl: { x: 28, w: 44 },
      };
    case "wine-tumbler":
      return {
        sil: <path d="M24 28 h52 c2 30 2 46 -6 54 a12 12 0 0 1 -9 4 h-22 a12 12 0 0 1 -9 -4 c-8 -8 -8 -24 -6 -54z" />,
        over: <ellipse cx="50" cy="28.4" rx="26" ry="2.6" fill={t.deep} {...stroke} />,
        light: "cylinder",
        cyl: { x: 22, w: 56 },
      };
    case "can-cooler":
      return {
        sil: <rect x="28" y="12" width="44" height="80" rx="6" />,
        over: <rect x="29.5" y="9.5" width="41" height="6" rx="2" fill={METAL} />,
        light: "cylinder",
        cyl: { x: 28, w: 44 },
      };
    case "bottle":
      return {
        sil: <path d="M42 16 h16 v8 c10 4 12 8 12 14 v50 a6 6 0 0 1 -6 6 h-28 a6 6 0 0 1 -6 -6 v-50 c0 -6 2 -10 12 -14z" />,
        over: <rect x="41" y="5" width="18" height="11" rx="2.5" fill={LID} />,
        light: "cylinder",
        cyl: { x: 30, w: 40 },
      };

    case "mousepad":
      return flat({ x: 6, y: 14, w: 88, h: 72 }, 7);
    case "coaster-square":
      return flat({ x: 16, y: 16, w: 68, h: 68 }, 8);
    case "tile":
      return flat({ x: 14, y: 14, w: 72, h: 72 }, 1.5);
    case "magnet":
      return flat({ x: 22, y: 12, w: 56, h: 76 }, 5);
    case "card":
      return flat({ x: 8, y: 20, w: 84, h: 60 }, 4.5);
    case "photo-panel": {
      const spec = flat({ x: 18, y: 6, w: 64, h: 82 }, 1.5);
      const b = spec.faceBox!;
      return { ...spec, under: <path d={`M${b.x + b.w * 0.62} ${b.y + b.h - 4} l12 ${100 - b.y - b.h}`} stroke={t.edge} strokeWidth={4} /> };
    }
    case "puzzle": {
      const spec = flat({ x: 8, y: 16, w: 84, h: 68 }, 2.5);
      const b = spec.faceBox!;
      const cx = (f: number) => b.x + b.w * f;
      const cy = (f: number) => b.y + b.h * f;
      const r = Math.min(b.w, b.h) * 0.05;
      const lines = `M${cx(1 / 3)} ${b.y} V${cy(0.4)} c${-r * 1.6} 0 ${-r * 1.6} ${r * 2} 0 ${r * 2} V${b.y + b.h} M${cx(2 / 3)} ${b.y} V${cy(0.55)} c${r * 1.6} 0 ${r * 1.6} ${r * 2} 0 ${r * 2} V${b.y + b.h} M${b.x} ${cy(0.5)} H${cx(0.15)} c0 ${-r * 1.6} ${r * 2} ${-r * 1.6} ${r * 2} 0 H${b.x + b.w}`;
      return { ...spec, over: <path d={lines} fill="none" stroke="#000" strokeOpacity={0.28} strokeWidth={0.7} /> };
    }
    case "plate": {
      const spec = flat({ x: 4, y: 24, w: 92, h: 52 }, 4);
      const b = spec.faceBox!;
      const holes = [0.06, 0.94].flatMap((fx) => [0.2, 0.8].map((fy) => [b.x + b.w * fx, b.y + b.h * fy]));
      return { ...spec, over: holes.map(([x, y]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={2.2} ry={1.4} fill="#fff" stroke={t.edge} strokeWidth={0.6} />) };
    }
    case "bookmark": {
      const spec = flat({ x: 32, y: 6, w: 36, h: 88 }, 3);
      const b = spec.faceBox!;
      return {
        ...spec,
        under: <path d={`M${b.x + b.w / 2} ${b.y + 4} c-6 -8 -12 -4 -14 6`} fill="none" stroke="#c0185a" strokeWidth={2} />,
        over: <circle cx={b.x + b.w / 2} cy={b.y + 4.5} r={1.6} fill="#fff" stroke={t.edge} strokeWidth={0.6} />,
      };
    }
    case "flag": {
      const spec = flat({ x: 16, y: 6, w: 64, h: 84 }, 1.5);
      const b = spec.faceBox!;
      return { ...spec, under: <path d={`M${b.x - 2} 3 V97`} stroke={LID} strokeWidth={3} strokeLinecap="round" /> };
    }
    case "mousepad-round": {
      const face = <circle cx="50" cy="50" r="41" />;
      return { sil: face, face, faceBox: { x: 9, y: 9, w: 82, h: 82 }, light: "flat" };
    }
    case "coaster-round": {
      const face = <circle cx="50" cy="50" r="35" />;
      return { sil: face, face, faceBox: { x: 15, y: 15, w: 70, h: 70 }, light: "flat" };
    }
    case "ornament": {
      const face = <circle cx="50" cy="56" r="36" />;
      return {
        under: <path d="M50 2 v12" stroke={t.edge} strokeWidth={1.2} />,
        sil: face,
        face,
        faceBox: { x: 14, y: 20, w: 72, h: 72 },
        over: <rect x="44" y="13" width="12" height="8" rx="2" fill={GOLD} />,
        light: "flat",
      };
    }
    case "keychain": {
      const ring = <circle cx="50" cy="15" r="9" fill="none" stroke={METAL} strokeWidth={3} />;
      if (p.shape === "rect") {
        const spec = flat({ x: 26, y: 26, w: 48, h: 66 }, 4);
        return { ...spec, under: ring, over: <circle cx="50" cy={spec.faceBox!.y + 4} r={2} fill="#fff" stroke={t.edge} strokeWidth={0.6} /> };
      }
      const face = <circle cx="50" cy="58" r="32" />;
      return { under: ring, sil: face, face, faceBox: { x: 18, y: 26, w: 64, h: 64 }, light: "flat", over: <circle cx="50" cy="30" r="2" fill="#fff" stroke={t.edge} strokeWidth={0.6} /> };
    }
    case "pet-tag": {
      const face = <rect x="26" y="24" width="48" height="60" rx="24" />;
      return {
        under: <circle cx="50" cy="15" r="7" fill="none" stroke={METAL} strokeWidth={3} />,
        sil: face,
        face,
        faceBox: { x: 26, y: 24, w: 48, h: 60 },
        over: <circle cx="50" cy="29" r="2" fill="#fff" stroke={t.edge} strokeWidth={0.6} />,
        light: "flat",
      };
    }
    case "luggage-tag": {
      const d = "M28 30 l12 -10 h20 l12 10 v58 a4 4 0 0 1 -4 4 h-36 a4 4 0 0 1 -4 -4z";
      return {
        under: <path d="M50 4 c-7 0 -9 12 0 20" fill="none" stroke={LID} strokeWidth={3} />,
        sil: <path d={d} />,
        face: <path d={d} />,
        faceBox: { x: 28, y: 20, w: 44, h: 72 },
        over: <rect x="44" y="24" width="12" height="4" rx="2" fill="#fff" stroke={t.edge} strokeWidth={0.6} />,
        light: "flat",
      };
    }

    case "tshirt":
    case "kids-tee": {
      const kid = kind === "kids-tee";
      const d = kid
        ? "M36 20 l-14 8 -10 16 10 6 6 -6 v40 h44 v-40 l6 6 10 -6 -10 -16 -14 -8 c-2 6 -8 9 -14 9 s-12 -3 -14 -9z"
        : "M34 14 l-18 8 -12 18 12 8 8 -8 v48 h52 v-48 l8 8 12 -8 -12 -18 -18 -8 c-2 7 -9 11 -16 11 s-14 -4 -16 -11z";
      const collar = kid ? "M36 20 c2 6 8 9 14 9 s12 -3 14 -9" : "M34 14 c2 7 9 11 16 11 s14 -4 16 -11";
      return {
        sil: <path d={d} />,
        over: (
          <>
            <path d={collar} fill="none" stroke={t.deep} strokeWidth={2.4} strokeLinecap="round" />
            <path d={kid ? "M22 50 l6 -6 M78 50 l-6 -6" : "M16 48 l8 -8 M84 48 l-8 -8"} stroke={t.edge} strokeOpacity={0.5} strokeWidth={0.8} />
          </>
        ),
        light: "garment",
      };
    }
    case "longsleeve":
      return {
        sil: <path d="M34 14 l-18 8 -8 60 10 2 8 -46 v48 h48 v-48 l8 46 10 -2 -8 -60 -18 -8 c-2 7 -9 11 -16 11 s-14 -4 -16 -11z" />,
        over: (
          <>
            <path d="M34 14 c2 7 9 11 16 11 s14 -4 16 -11" fill="none" stroke={t.deep} strokeWidth={2.4} strokeLinecap="round" />
            <path d="M8.6 78 l10 2 M91.4 78 l-10 2" stroke={t.deep} strokeWidth={2.2} />
          </>
        ),
        light: "garment",
      };
    case "hoodie":
      return {
        sil: <path d="M32 18 l-16 8 -10 18 10 8 8 -8 v46 h52 v-46 l8 8 10 -8 -10 -18 -16 -8 c0 -12 -8 -16 -18 -16 s-18 4 -18 16z" />,
        over: (
          <>
            <path d="M32 18 c4 8 10 11 18 11 s14 -3 18 -11" fill="none" stroke={t.deep} strokeWidth={2} />
            <path d="M45 28 v10 M55 28 v10" stroke={t.deep} strokeWidth={1.1} strokeLinecap="round" />
            <path d="M36 70 h28 l4 13 h-36z" fill="none" stroke={t.edge} strokeOpacity={0.6} strokeWidth={0.9} />
            <rect x="24" y="90" width="52" height="4" fill={t.deep} />
          </>
        ),
        light: "garment",
      };
    case "onesie":
      return {
        sil: <path d="M38 14 l-14 8 -10 14 9 6 7 -6 v34 c0 8 10 14 20 18 c10 -4 20 -10 20 -18 v-34 l7 6 9 -6 -10 -14 -14 -8 c-2 5 -6 8 -12 8 s-10 -3 -12 -8z" />,
        over: (
          <>
            <path d="M38 14 c2 5 6 8 12 8 s10 -3 12 -8" fill="none" stroke={t.deep} strokeWidth={2.2} strokeLinecap="round" />
            {[44, 50, 56].map((x) => (
              <circle key={x} cx={x} cy={88} r={0.9} fill={t.edge} />
            ))}
          </>
        ),
        light: "garment",
      };
    case "cap":
      return {
        sil: <path d="M18 62 c0 -26 14 -40 32 -40 s32 14 32 40z" />,
        over: (
          <>
            <path d="M50 22 c-6 10 -8 26 -8 40 M50 22 c6 10 8 26 8 40" fill="none" stroke={t.edge} strokeOpacity={0.45} strokeWidth={0.8} />
            <path d="M10 62 h72 c8 0 10 8 2 10 h-70 c-6 0 -8 -8 -4 -10z" fill={t.deep} {...stroke} />
            <circle cx="50" cy="22" r="3" fill={t.deep} {...stroke} />
          </>
        ),
        light: "garment",
      };
    case "tote":
      return {
        under: <path d="M36 32 v-10 a14 14 0 0 1 28 0 v10" fill="none" stroke={t.deep} strokeWidth={4} />,
        sil: <rect x="20" y="30" width="60" height="62" rx="2" />,
        over: <path d="M20 34 h60" stroke={t.edge} strokeOpacity={0.4} strokeWidth={0.8} strokeDasharray="1.5 1.5" />,
        light: "garment",
      };
  }
}

function safeId(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

export interface ProductMockupProps {
  product: MockupProduct;
  /** Blank colour (hex). Default white. */
  color?: string;
  /** Image of the whole print box (slot), including bleed or seam overlap. */
  design?: string | null;
  /** `multiply` shows how transparent sublimation dye takes the blank colour. */
  blend?: "multiply" | "normal";
  /** Outline the print area. */
  showArea?: boolean;
  /** Wraps only: how far the product is turned (0–1 of a full turn); 0 shows the front. */
  turn?: number;
  className?: string;
  title?: string;
}

export function ProductMockup({
  product,
  color = "#ffffff",
  design,
  blend = "normal",
  showArea = false,
  turn = 0,
  className,
  title,
}: ProductMockupProps) {
  const uid = safeId(useId());
  const light = luminance(color) > 0.45;
  const tone: Tone = {
    body: color,
    edge: light ? shade(color, 0.32) : shade(color, -0.28),
    deep: light ? shade(color, 0.1) : shade(color, -0.12),
  };
  const spec = shapes(product.art, tone, product);
  const area: Box | undefined = product.artArea ?? spec.faceBox;
  const clipId = `${uid}-clip`;
  const silId = `${uid}-sil`;
  const lightId = `${uid}-light`;
  const imgId = `${uid}-img`;

  return (
    <svg viewBox="0 0 100 100" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <clipPath id={silId}>{spec.sil}</clipPath>
        {area && (
          <clipPath id={clipId}>
            {spec.face && !product.artArea ? spec.face : <rect x={area.x} y={area.y} width={area.w} height={area.h} rx={1} />}
          </clipPath>
        )}
        <LightGradient id={lightId} kind={spec.light} dark={!light} />
        {design && product.wrap && (
          // Defined once and reused by every strip, so a wrap costs one image, not 28.
          <image id={imgId} href={design} x={0} y={0} width={product.width + WRAP_SEAM_MM} height={product.height} preserveAspectRatio="none" />
        )}
      </defs>

      {spec.under}
      <g fill={tone.body} stroke={tone.edge} strokeWidth={1.2} strokeLinejoin="round">
        {spec.sil}
      </g>

      {design && area && (
        <g clipPath={`url(#${clipId})`} style={{ mixBlendMode: blend }}>
          {product.wrap ? <WrapStrips imageId={imgId} area={area} product={product} turn={turn} /> : <FlatImage href={design} area={area} product={product} />}
        </g>
      )}

      <g clipPath={`url(#${silId})`} pointerEvents="none">
        {spec.light === "cylinder" && spec.cyl ? (
          <rect x={spec.cyl.x} y={0} width={spec.cyl.w} height={100} fill={`url(#${lightId})`} />
        ) : (
          <rect x={0} y={0} width={100} height={100} fill={`url(#${lightId})`} />
        )}
      </g>
      {spec.over}

      {showArea && area && (
        <g fill="none" stroke="var(--accent, #077d89)" strokeWidth={0.9} strokeDasharray="2.4 1.6">
          {spec.face && !product.artArea ? spec.face : <rect x={area.x} y={area.y} width={area.w} height={area.h} rx={1} />}
        </g>
      )}
    </svg>
  );
}

function LightGradient({ id, kind, dark }: { id: string; kind: Light; dark: boolean }) {
  const hi = dark ? 0.16 : 0.5;
  if (kind === "cylinder") {
    return (
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity={0.22} />
        <stop offset="0.12" stopColor="#000" stopOpacity={0.04} />
        <stop offset="0.27" stopColor="#fff" stopOpacity={hi} />
        <stop offset="0.42" stopColor="#fff" stopOpacity={0} />
        <stop offset="0.78" stopColor="#000" stopOpacity={0.06} />
        <stop offset="1" stopColor="#000" stopOpacity={0.26} />
      </linearGradient>
    );
  }
  if (kind === "flat") {
    return (
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={hi * 0.7} />
        <stop offset="0.38" stopColor="#fff" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.1} />
      </linearGradient>
    );
  }
  return (
    <radialGradient id={id} cx="0.5" cy="0.42" r="0.62">
      <stop offset="0.55" stopColor="#000" stopOpacity={0} />
      <stop offset="1" stopColor="#000" stopOpacity={dark ? 0.3 : 0.14} />
    </radialGradient>
  );
}

/** Flat print: the slot image (with bleed) laid over the trim area. */
function FlatImage({ href, area, product }: { href: string; area: Box; product: MockupProduct }) {
  const sx = area.w / product.width;
  const sy = area.h / product.height;
  const b = product.bleed;
  const face = !product.artArea;
  return (
    <image
      href={href}
      x={area.x - b * sx}
      y={area.y - b * sy}
      width={area.w + 2 * b * sx}
      height={area.h + 2 * b * sy}
      // Faces are covered edge to edge; garment placements show the whole design.
      preserveAspectRatio={face ? "xMidYMid slice" : "xMidYMid meet"}
    />
  );
}

const STRIPS = 28;

/**
 * Front half of a wrap on a cylinder. Strip i covers screen x where
 * u = sin(θ) and samples the wrap at θ, so the middle of the design faces the
 * viewer and the edges curve away.
 */
function WrapStrips({ imageId, area, product, turn }: { imageId: string; area: Box; product: MockupProduct; turn: number }) {
  const slotW = product.width + WRAP_SEAM_MM;
  const slotH = product.height;
  const strips = [];
  for (let i = 0; i < STRIPS; i++) {
    const u0 = -1 + (2 * i) / STRIPS;
    const u1 = -1 + (2 * (i + 1)) / STRIPS;
    const t0 = Math.asin(u0);
    const t1 = Math.asin(u1);
    // θ in [-π/2, π/2] maps to the middle half of the circumference.
    const s0 = slotW / 2 + (t0 / (2 * Math.PI) + turn) * product.width;
    const s1 = slotW / 2 + (t1 / (2 * Math.PI) + turn) * product.width;
    const x0 = area.x + ((u0 + 1) / 2) * area.w;
    const x1 = area.x + ((u1 + 1) / 2) * area.w;
    strips.push(
      <svg key={i} x={x0} y={area.y} width={x1 - x0 + 0.15} height={area.h} viewBox={`${s0} 0 ${s1 - s0} ${slotH}`} preserveAspectRatio="none">
        {/* Copies one turn either side, so a turned product wraps around past the seam. */}
        <use href={`#${imageId}`} x={-product.width} />
        <use href={`#${imageId}`} />
        <use href={`#${imageId}`} x={product.width} />
      </svg>,
    );
  }
  return <>{strips}</>;
}
