/**
 * Sample designs, generated on the fly.
 *
 * Product cards and the Designs panel show artwork on the products so users
 * can picture the result, and every visit shows a different mix. The artwork
 * is generated here from a seed (vector SVG, no network, no third-party
 * images), so it is original and free to print. Pinterest or web images were
 * ruled out: they belong to their creators and Pinterest's terms forbid
 * scraping (see ADR 0008).
 *
 * A design is described by `{ family, palette, phrase }`; `renderSampleSvg`
 * draws it at any aspect ratio, so the same design fits a square coaster, a
 * long mug wrap or a tall bookmark.
 */

export interface Palette {
  name: string;
  bg: string;
  a: string;
  b: string;
  c: string;
  ink: string;
}

export const PALETTES: Palette[] = [
  { name: "Sunset", bg: "#ffe7b8", a: "#ff8a5b", b: "#e8505b", c: "#ffcf70", ink: "#2b1e3f" },
  { name: "Lagoon", bg: "#e3f4f2", a: "#4fb3bf", b: "#1f7a8c", c: "#f4d35e", ink: "#022b3a" },
  { name: "Meadow", bg: "#f1ead8", a: "#a3b18a", b: "#588157", c: "#dda15e", ink: "#2c3d33" },
  { name: "Candy", bg: "#fff0f5", a: "#ff8fab", b: "#fb6f92", c: "#ffd6e0", ink: "#3a1d2e" },
  { name: "Retro", bg: "#f4e9cd", a: "#e76f51", b: "#2a9d8f", c: "#f4a261", ink: "#264653" },
  { name: "Grape", bg: "#efe7ff", a: "#b79ced", b: "#7f5af0", c: "#2cb67d", ink: "#16161a" },
  { name: "Citrus", bg: "#fffbe6", a: "#ffd23f", b: "#ee4266", c: "#3bceac", ink: "#0e2e3b" },
  { name: "Ink", bg: "#f5f5f0", a: "#d9d9d9", b: "#222222", c: "#e63946", ink: "#111111" },
];

/** Families without a background suit garments and caps; the rest print edge to edge. */
export const EMBLEM_FAMILIES = ["sun-badge", "ring-badge", "wordmark", "smiley"] as const;
export const PATTERN_FAMILIES = ["daisies", "waves", "checker", "bauhaus", "landscape", "confetti"] as const;
export type SampleFamily = (typeof EMBLEM_FAMILIES)[number] | (typeof PATTERN_FAMILIES)[number];

const PHRASES = [
  ["GOOD", "VIBES"],
  ["STAY", "WILD"],
  ["COFFEE", "FIRST"],
  ["HELLO", "SUMMER"],
  ["BE", "KIND"],
  ["NO BAD", "DAYS"],
  ["MAMA", "BEAR"],
  ["PLANT", "LADY"],
  ["SUNNY", "SIDE UP"],
  ["TEAM", "BRIDE"],
  ["DREAM", "BIG"],
  ["CAMP", "CREW"],
];

const FAMILY_NAMES: Record<SampleFamily, string> = {
  "sun-badge": "Sunset badge",
  "ring-badge": "Round badge",
  wordmark: "Bold type",
  smiley: "Smiley",
  daisies: "Daisies",
  waves: "Waves",
  checker: "Checker",
  bauhaus: "Bauhaus",
  landscape: "Mountains",
  confetti: "Confetti",
};

export interface SampleDesign {
  id: string;
  name: string;
  family: SampleFamily;
  palette: Palette;
  phrase: [string, string];
  /** Seed for scattered elements (daisies, confetti). */
  seed: number;
  /** True when the design has its own background (prints edge to edge). */
  fullBleed: boolean;
}

/** Small deterministic PRNG (mulberry32); the same seed always gives the same art. */
export function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleDesign(seed: number, kind: "any" | "emblem" | "pattern" = "any"): SampleDesign {
  const r = rng(seed);
  const pool: readonly SampleFamily[] =
    kind === "emblem" ? EMBLEM_FAMILIES : kind === "pattern" ? PATTERN_FAMILIES : [...EMBLEM_FAMILIES, ...PATTERN_FAMILIES];
  const family = pool[Math.floor(r() * pool.length)];
  const palette = PALETTES[Math.floor(r() * PALETTES.length)];
  const phrase = PHRASES[Math.floor(r() * PHRASES.length)] as [string, string];
  return {
    id: `sample-${seed}`,
    name: `${FAMILY_NAMES[family]}, ${palette.name}`,
    family,
    palette,
    phrase,
    seed,
    fullBleed: (PATTERN_FAMILIES as readonly string[]).includes(family),
  };
}

/** `count` distinct designs starting from `seed`, mixing emblems and patterns. */
export function sampleSet(seed: number, count: number, kind: "any" | "emblem" | "pattern" = "any"): SampleDesign[] {
  const seen = new Set<string>();
  const out: SampleDesign[] = [];
  for (let i = 0; out.length < count && i < count * 8; i++) {
    const d = sampleDesign(seed + i * 7919, kind);
    const key = `${d.family}/${d.palette.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

const FONT = "'Arial Black','Segoe UI Black',Impact,'Helvetica Neue',Arial,sans-serif";

function text(x: number, y: number, size: number, width: number, fill: string, value: string, extra = "") {
  // textLength forces the word to an exact width, so layout never depends on installed fonts.
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-weight="900" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="central" textLength="${width}" lengthAdjust="spacingAndGlyphs" ${extra}>${value}</text>`;
}

/** An emblem drawn in a 1000 × 1000 box, centred on (500, 500). */
function emblem(d: SampleDesign): string {
  const { a, b, c, ink, bg } = d.palette;
  const [l1, l2] = d.phrase;
  switch (d.family) {
    case "sun-badge": {
      const bands = [0, 1, 2, 3].map((i) => `<rect x="180" y="${470 + i * 52}" width="640" height="${14 + i * 6}" fill="${bg}"/>`).join("");
      return `<defs><clipPath id="sun"><circle cx="500" cy="420" r="300"/></clipPath><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="0.55" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<g clip-path="url(#sun)"><rect x="200" y="120" width="600" height="600" fill="url(#sg)"/>${bands}<path d="M200 720 L360 520 L470 640 L560 540 L800 720 Z" fill="${ink}"/></g>
${text(500, 810, 120, 600, ink, l1 + " " + l2)}`;
    }
    case "ring-badge": {
      const ringText = `${l1} ${l2} • EST. 2026 • ${l1} ${l2} • EST. 2026 •`;
      return `<defs><path id="ring" d="M500 500 m-330 0 a330 330 0 1 1 660 0 a330 330 0 1 1 -660 0"/></defs>
<circle cx="500" cy="500" r="420" fill="${ink}"/><circle cx="500" cy="500" r="395" fill="none" stroke="${c}" stroke-width="10"/>
<circle cx="500" cy="500" r="270" fill="${a}"/>
<text font-family="${FONT}" font-weight="900" font-size="58" fill="${bg}" letter-spacing="6"><textPath href="#ring" textLength="2050">${ringText}</textPath></text>
${text(500, 455, 150, 400, ink, l1)}${text(500, 590, 110, 400, bg, l2)}
<path d="M500 230 l18 40 44 6 -32 30 8 44 -38 -22 -38 22 8 -44 -32 -30 44 -6z" fill="${c}"/>`;
    }
    case "wordmark":
      return `${text(512, 372, 250, 820, b, l1)}${text(500, 360, 250, 820, a, l1, `stroke="${ink}" stroke-width="10" paint-order="stroke"`)}
${text(512, 642, 250, 820, ink, l2)}${text(500, 630, 250, 820, c, l2, `stroke="${ink}" stroke-width="10" paint-order="stroke"`)}
<rect x="150" y="770" width="700" height="22" rx="11" fill="${b}"/>`;
    case "smiley":
    default:
      return `<circle cx="500" cy="430" r="300" fill="${c}" stroke="${ink}" stroke-width="22"/>
<ellipse cx="400" cy="370" rx="34" ry="62" fill="${ink}"/><ellipse cx="600" cy="370" rx="34" ry="62" fill="${ink}"/>
<path d="M330 480 Q500 660 670 480" fill="none" stroke="${ink}" stroke-width="30" stroke-linecap="round"/>
${text(500, 840, 120, 640, b, l1 + " " + l2, `stroke="${ink}" stroke-width="6" paint-order="stroke"`)}`;
  }
}

/** A full-bleed pattern for a `w` × `h` box. */
function pattern(d: SampleDesign, w: number, h: number): string {
  const { a, b, c, ink, bg } = d.palette;
  const r = rng(d.seed);
  const parts: string[] = [`<rect width="${w}" height="${h}" fill="${bg}"/>`];
  switch (d.family) {
    case "daisies": {
      const n = Math.round((w * h) / 26000);
      for (let i = 0; i < n; i++) {
        const x = r() * w;
        const y = r() * h;
        const s = 40 + r() * 50;
        const petal = i % 3 === 0 ? a : "#ffffff";
        const petals = [0, 45, 90, 135].map((deg) => `<ellipse cx="0" cy="0" rx="${s}" ry="${s * 0.36}" transform="rotate(${deg})" fill="${petal}"/>`).join("");
        parts.push(`<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${(r() * 90).toFixed(0)})">${petals}<circle r="${s * 0.34}" fill="${c}"/></g>`);
      }
      break;
    }
    case "waves": {
      const band = 90;
      for (let y = -band, i = 0; y < h + band; y += band, i++) {
        const col = [a, b, c, bg][i % 4];
        let dPath = `M0 ${y}`;
        for (let x = 0; x <= w; x += 240) dPath += ` Q${x + 60} ${y - 40} ${x + 120} ${y} T${x + 240} ${y}`;
        parts.push(`<path d="${dPath} V${h + band} H0 Z" fill="${col}"/>`);
      }
      break;
    }
    case "checker": {
      const s = 110;
      for (let y = 0, row = 0; y < h; y += s, row++)
        for (let x = 0, col = 0; x < w; x += s, col++) if ((row + col) % 2 === 0) parts.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${a}"/>`);
      const cx = w / 2;
      const cy = h / 2;
      const rad = Math.min(w, h) * 0.32;
      parts.push(
        `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${c}" stroke="${ink}" stroke-width="${rad * 0.07}"/><ellipse cx="${cx - rad * 0.33}" cy="${cy - rad * 0.2}" rx="${rad * 0.11}" ry="${rad * 0.2}" fill="${ink}"/><ellipse cx="${cx + rad * 0.33}" cy="${cy - rad * 0.2}" rx="${rad * 0.11}" ry="${rad * 0.2}" fill="${ink}"/><path d="M${cx - rad * 0.55} ${cy + rad * 0.15} Q${cx} ${cy + rad * 0.8} ${cx + rad * 0.55} ${cy + rad * 0.15}" fill="none" stroke="${ink}" stroke-width="${rad * 0.1}" stroke-linecap="round"/>`,
      );
      break;
    }
    case "bauhaus": {
      const s = 200;
      const cols = [a, b, c, ink];
      for (let y = 0; y < h; y += s)
        for (let x = 0; x < w; x += s) {
          const col = cols[Math.floor(r() * cols.length)];
          const k = Math.floor(r() * 4);
          const shapes = [
            `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 0.4}" fill="${col}"/>`,
            `<path d="M${x} ${y + s} A${s} ${s} 0 0 1 ${x + s} ${y} V${y + s} Z" fill="${col}"/>`,
            `<path d="M${x} ${y + s / 2} A${s / 2} ${s / 2} 0 0 1 ${x + s} ${y + s / 2} Z" fill="${col}"/><rect x="${x}" y="${y + s / 2}" width="${s}" height="${s * 0.18}" fill="${col}"/>`,
            `<rect x="${x + s * 0.15}" y="${y + s * 0.15}" width="${s * 0.7}" height="${s * 0.7}" fill="${col}" transform="rotate(45 ${x + s / 2} ${y + s / 2})"/>`,
          ];
          parts.push(shapes[k]);
        }
      break;
    }
    case "landscape": {
      parts.push(
        `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${bg}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`,
        `<circle cx="${w * 0.7}" cy="${h * 0.35}" r="${Math.min(w, h) * 0.16}" fill="${a}"/>`,
      );
      const layers = [b, ink];
      layers.forEach((col, li) => {
        let p = `M0 ${h}`;
        const base = h * (0.62 + li * 0.14);
        for (let x = 0; x <= w + 200; x += 200) p += ` L${x} ${base - (r() * 0.28 + 0.06) * h} L${x + 100} ${base}`;
        parts.push(`<path d="${p} L${w} ${h} Z" fill="${col}"/>`);
      });
      break;
    }
    case "confetti":
    default: {
      const n = Math.round((w * h) / 9000);
      const cols = [a, b, c, ink];
      for (let i = 0; i < n; i++) {
        const x = (r() * w).toFixed(0);
        const y = (r() * h).toFixed(0);
        const col = cols[i % cols.length];
        parts.push(
          i % 3 === 0
            ? `<circle cx="${x}" cy="${y}" r="${(10 + r() * 14).toFixed(0)}" fill="${col}"/>`
            : `<rect x="${x}" y="${y}" width="${(30 + r() * 30).toFixed(0)}" height="14" rx="7" fill="${col}" transform="rotate(${(r() * 180).toFixed(0)} ${x} ${y})"/>`,
        );
      }
    }
  }
  return parts.join("");
}

/**
 * SVG markup for a design at `aspect` (width / height). Emblems are centred
 * at their natural square size with a transparent background; patterns fill
 * the whole box.
 */
export function renderSampleSvg(d: SampleDesign, aspect = 1): string {
  const a = Math.min(8, Math.max(0.125, aspect));
  const w = Math.round(a >= 1 ? 1000 * a : 1000);
  const h = Math.round(a >= 1 ? 1000 : 1000 / a);
  let body: string;
  if (d.fullBleed) {
    body = pattern(d, w, h);
  } else {
    const s = Math.min(w, h);
    body = `<g transform="translate(${(w - s) / 2} ${(h - s) / 2}) scale(${s / 1000})">${emblem(d)}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** A fresh random seed (used when the panel opens or the user shuffles). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
