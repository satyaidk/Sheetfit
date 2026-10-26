/**
 * Browser printing at exact physical size.
 *
 * Printing the live editor DOM is unreliable: zoom, scroll and canvas
 * resolution all leak into the output. Instead we rasterise the sheet from the
 * render plan (the same one PDF and PNG use), place that image in a print-only
 * container sized in CSS millimetres, and set `@page` to A4 with zero margins.
 * Browsers still let users choose "Fit to page" in the dialog, which breaks
 * exact sizing, so the UI tells them to print at 100% / actual size.
 */

import type { Orientation } from "@/types/editor";
import type { RenderPlan } from "@/lib/render/render-plan";
import { renderPageCanvas, type AssetLookup } from "./export-raster";

const ROOT_ID = "print-root";
const STYLE_ID = "print-page-style";

export function pageCss(orientation: Orientation): string {
  return `@page { size: A4 ${orientation}; margin: 0; }`;
}

export async function printSheet(
  plan: RenderPlan,
  assets: AssetLookup,
  orientation: Orientation,
  dpi: number,
): Promise<void> {
  // 300 DPI is plenty for office printers and keeps memory use reasonable.
  const canvas = renderPageCanvas(plan, assets, Math.min(dpi, 300), plan.background ?? "#ffffff");
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not prepare the print image."))), "image/png"),
  );
  const url = URL.createObjectURL(blob);

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = pageCss(orientation);

  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  root.innerHTML = "";
  const img = document.createElement("img");
  img.alt = "";
  img.style.width = `${plan.page.width}mm`;
  img.style.height = `${plan.page.height}mm`;
  img.src = url;
  root.appendChild(img);
  await img.decode();

  const cleanup = () => {
    root?.replaceChildren();
    URL.revokeObjectURL(url);
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}
