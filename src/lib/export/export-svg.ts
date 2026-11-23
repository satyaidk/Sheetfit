/**
 * SVG export for print-and-cut.
 *
 * Cutting software (Cricut Design Space, Silhouette Studio, Inkscape, vinyl
 * cutter RIPs) imports SVG, so the cut file is an SVG in real millimetres
 * (`width="210mm"`, `viewBox="0 0 210 297"`): one user unit is one
 * millimetre. Cut paths are true vectors, never rasterised, in named groups:
 *
 *   ARTWORK       the placed images (optional; omitted in a cut-only file)
 *   CUTLINE       one closed path per sticker/card (`data-cut="kiss|die"`)
 *   SHEET_CUT     the outline of a kiss-cut sheet
 *   REGISTRATION  generic corner squares, when switched on
 *
 * The whole-sheet mirror is applied exactly as in every other output, so the
 * cut lines always match the printed sheet. Sheetfit does not drive any cutter
 * directly; this is a generic file for the user's own cutting software.
 */

import type { RenderPlan, PlanItem } from "@/lib/render/render-plan";
import { CUTLINE_COLORS, planCutPaths } from "@/lib/render/render-plan";
import { pathToSvgD } from "@/lib/cut/cut-path";

const n = (v: number) => +v.toFixed(4);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface SvgOptions {
  /** Data URLs per asset id. When omitted, the file holds cut lines only. */
  images?: Map<string, string>;
  title?: string;
}

function artworkItem(item: PlanItem, href: string): string {
  const { image: dst, sourceRect: src, naturalSize } = item;
  if (dst.width <= 0 || dst.height <= 0) return "";
  const sx = item.flipX ? -1 : 1;
  const sy = item.flipY ? -1 : 1;
  const cx = dst.x + dst.width / 2;
  const cy = dst.y + dst.height / 2;
  const flip = item.flipX || item.flipY ? ` transform="translate(${n(cx)} ${n(cy)}) scale(${sx} ${sy}) translate(${n(-cx)} ${n(-cy)})"` : "";
  // A nested viewport shows exactly the source window (crop and cover) at the image rectangle.
  return (
    `<g transform="translate(${n(item.center.x)} ${n(item.center.y)}) rotate(${n(item.rotation)})">` +
    `<g${flip}><svg x="${n(dst.x)}" y="${n(dst.y)}" width="${n(dst.width)}" height="${n(dst.height)}" ` +
    `viewBox="${n(src.x)} ${n(src.y)} ${n(src.width)} ${n(src.height)}" preserveAspectRatio="none" overflow="hidden">` +
    `<image width="${naturalSize.width}" height="${naturalSize.height}" href="${esc(href)}"/></svg></g></g>`
  );
}

/** Build the SVG document text for one page. */
export function buildSvg(plan: RenderPlan, options: SvgOptions = {}): string {
  const { width: W, height: H } = plan.page;
  const parts: string[] = [];
  if (options.images) {
    const art = plan.items.map((item) => {
      const href = options.images!.get(item.assetId);
      return href ? artworkItem(item, href) : "";
    });
    parts.push(`<g id="ARTWORK">${art.join("")}</g>`);
  }
  const cuts = planCutPaths(plan, false)
    .map(
      (c, i) =>
        `<path id="cut-${i + 1}" data-cut="${c.through}" d="${pathToSvgD(c.path)}" fill="none" stroke="${CUTLINE_COLORS[c.through]}" stroke-width="${plan.cutlineWidth}"/>`,
    )
    .join("");
  parts.push(`<g id="CUTLINE">${cuts}</g>`);
  if (plan.sheetCut) {
    parts.push(
      `<g id="SHEET_CUT"><path data-cut="die" d="${pathToSvgD(plan.sheetCut)}" fill="none" stroke="${CUTLINE_COLORS.die}" stroke-width="${plan.cutlineWidth}"/></g>`,
    );
  }
  if (plan.registration.length > 0) {
    parts.push(
      `<g id="REGISTRATION">${plan.registration.map((r) => `<rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.width)}" height="${n(r.height)}" fill="#000"/>`).join("")}</g>`,
    );
  }
  const body = parts.join("");
  const content = plan.mirror ? `<g id="MIRROR" transform="translate(${n(W)} 0) scale(-1 1)">${body}</g>` : body;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${n(W)}mm" height="${n(H)}mm" viewBox="0 0 ${n(W)} ${n(H)}">` +
    (options.title ? `<title>${esc(options.title)}</title>` : "") +
    content +
    `</svg>\n`
  );
}
