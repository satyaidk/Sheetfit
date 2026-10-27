/**
 * Browser printing at exact physical size.
 *
 * Printing the live editor DOM is unreliable: zoom, scroll and canvas
 * resolution all leak into the output. Instead we rasterise each page from the
 * render plan (the same one PDF and PNG use), place the images in a
 * print-only container sized in CSS millimetres, and give every page an
 * `@page` rule with its exact size and zero margins. Pages of different sizes
 * use CSS named pages, so an A4 page and an A3 page print at their own sizes.
 * Browsers still let users choose "Fit to page" in the dialog, which breaks
 * exact sizing, so the UI tells them to print at 100% / actual size.
 */

import type { RenderPlan } from "@/lib/render/render-plan";
import { renderPageCanvas, type AssetLookup } from "./export-raster";

const ROOT_ID = "print-root";
const STYLE_ID = "print-page-style";

const mm = (v: number) => `${+v.toFixed(3)}mm`;

/** `@page` rules for a list of page sizes: one named page per distinct size. */
export function pageCss(sizes: { width: number; height: number }[]): string {
  const names = new Map<string, string>();
  const rules: string[] = [];
  for (const s of sizes) {
    const key = `${mm(s.width)} ${mm(s.height)}`;
    if (names.has(key)) continue;
    const name = `sheet${names.size + 1}`;
    names.set(key, name);
    rules.push(`@page ${name} { size: ${key}; margin: 0; }`, `#${ROOT_ID} .${name} { page: ${name}; }`);
  }
  const first = sizes[0];
  // The unnamed rule covers browsers without named-page support (first page size).
  if (first) rules.unshift(`@page { size: ${mm(first.width)} ${mm(first.height)}; margin: 0; }`);
  return rules.join("\n");
}

/** The named page class for each size, matching `pageCss`. */
export function pageClasses(sizes: { width: number; height: number }[]): string[] {
  const names = new Map<string, string>();
  return sizes.map((s) => {
    const key = `${mm(s.width)} ${mm(s.height)}`;
    if (!names.has(key)) names.set(key, `sheet${names.size + 1}`);
    return names.get(key)!;
  });
}

export async function printSheet(plans: RenderPlan | RenderPlan[], assets: AssetLookup, dpi: number): Promise<void> {
  const list = Array.isArray(plans) ? plans : [plans];
  const urls: string[] = [];
  for (const plan of list) {
    // 300 DPI is plenty for office printers and keeps memory use reasonable.
    const canvas = renderPageCanvas(plan, assets, Math.min(dpi, 300), plan.background ?? "#ffffff");
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not prepare the print image."))), "image/png"),
    );
    urls.push(URL.createObjectURL(blob));
  }

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  const sizes = list.map((p) => p.page);
  style.textContent = pageCss(sizes);

  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  root.innerHTML = "";
  const classes = pageClasses(sizes);
  const images = list.map((plan, i) => {
    const img = document.createElement("img");
    img.alt = "";
    img.className = classes[i];
    img.style.width = mm(plan.page.width);
    img.style.height = mm(plan.page.height);
    img.src = urls[i];
    root!.appendChild(img);
    return img;
  });
  await Promise.all(images.map((img) => img.decode()));

  const cleanup = () => {
    root?.replaceChildren();
    urls.forEach((u) => URL.revokeObjectURL(u));
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}
