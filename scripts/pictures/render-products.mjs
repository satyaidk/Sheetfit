/**
 * Render product pictures from the 3D models (ADR 0011), step 1 of 2.
 *
 * Opens each product's 3D view in the running app, turns to the Front view
 * (the side with the print) and saves the transparent WebGL canvas as
 * `scripts/pictures/.renders/<id>.png`. `Math.random` is seeded, so the
 * sample designs are the same on every run. Step 2 is `finish-pictures.py`.
 *
 * Needs a production server and Chrome:
 *   npm run build && npx next start -p 3200
 *   npm i --no-save puppeteer-core
 *   node scripts/pictures/render-products.mjs [filter...]
 *
 * Filters match product ids by prefix (e.g. `tee- mug- tumbler-`); none renders all.
 * `--open` keeps the opening (three-quarter) view instead of turning to Front:
 * clearer for sleeve prints, which Front shows edge-on.
 * Software WebGL (SwiftShader) takes about 15 s a product.
 * Env: SHEETFIT_URL (default http://localhost:3200), CHROME (path to chrome).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let puppeteer;
try {
  puppeteer = (await import("puppeteer-core")).default;
} catch {
  console.error("puppeteer-core is not installed. Run: npm i --no-save puppeteer-core");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, ".renders");
const BASE = process.env.SHEETFIT_URL ?? "http://localhost:3200";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OPENING = process.argv.includes("--open");
const FILTERS = process.argv.slice(2).filter((a) => a !== "--open");
fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.evaluateOnNewDocument(() => {
  let s = 20261028;
  Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
});
await page.goto(`${BASE}/editor`, { waitUntil: "load" });
await page.evaluate(() => localStorage.setItem("sheetfit:onboarded", "1"));
await page.goto(`${BASE}/editor`, { waitUntil: "load" });
await page.waitForSelector('aside [role="radio"]');
await wait(1500);
// The products panel shows the page's process only; "All" lists every product.
await page.click('aside [role="radio"]:first-child');
await wait(300);
// Map each card's "View … in 3D" button to its product id through the card's picture.
const cards = await page.evaluate(() =>
  [...document.querySelectorAll("button[aria-label^='View '][aria-label$=' in 3D']")].map((btn) => {
    const src = btn.closest(".group")?.querySelector("img")?.getAttribute("src") ?? "";
    const m = src.match(/products%2F([^.%]+)\.webp|products\/([^.]+)\.webp/);
    return { label: btn.getAttribute("aria-label"), id: m ? (m[1] ?? m[2]) : null };
  }),
);
const view = '[role="dialog"] [data-testid="product-3d-view"]';
let done = 0;
for (const { label, id } of cards) {
  if (!id || (FILTERS.length && !FILTERS.some((f) => id.startsWith(f)))) continue;
  await page.evaluate((l) => [...document.querySelectorAll("button")].find((x) => x.getAttribute("aria-label") === l).click(), label);
  await page.waitForFunction((v) => document.querySelector(v)?.getAttribute("data-loading") === "false", { timeout: 120000 }, view);
  await page.evaluate(() => document.querySelector('[role="dialog"] button[aria-label="Stop turning"]')?.click());
  await wait(2000);
  if (!OPENING) await page.evaluate(() => document.querySelector('[role="dialog"] button[aria-label="Front view"]')?.click());
  // Software WebGL renders a few frames a second; give the camera move time to finish.
  await wait(5000);
  const data = await page.evaluate((v) => document.querySelector(`${v} canvas`).toDataURL("image/png"), view);
  fs.writeFileSync(path.join(OUT, `${id}.png`), Buffer.from(data.split(",")[1], "base64"));
  done++;
  console.log("rendered", id);
  await page.keyboard.press("Escape");
  await wait(500);
}
console.log(`${done} pictures rendered to ${path.relative(process.cwd(), OUT)}`);
if (errors.length) console.log("page errors:", errors.slice(0, 5));
await browser.close();
