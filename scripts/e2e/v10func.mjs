/**
 * v0.10 browser checks against a production build.
 *
 *   npm run build && npx next start -p 3200
 *   npm i --no-save puppeteer-core
 *   python scripts/e2e/make-images.py        (test images, once)
 *   node scripts/e2e/v10func.mjs
 *
 * Covers: automatic sticker outlines (transparent PNG and a JPEG on plain
 * white), the printed cutting line and white border in a real PDF, Fill
 * sheet (and filling twice), the Cricut cutter PNG (transparent, exact
 * size), lanyard and keychain straps on A4, the tabbed inspector, one side
 * panel at a time on a 1024 px screen, Remove background and Trim empty
 * edges, and the 600 DPI print option. Prints PASS/FAIL per check and exits
 * non-zero on failure. Output goes to scripts/e2e/.out.
 * Env: SHEETFIT_URL (default http://localhost:3200), CHROME (path to chrome).
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "..", "..", "package.json"));
const puppeteer = require("puppeteer-core");

const IMG = path.join(here, ".out", "img");
const DL = path.join(here, ".out", "downloads-v10");
const SHOTS = path.join(here, ".out", "shots");
fs.rmSync(DL, { recursive: true, force: true });
fs.mkdirSync(DL, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.SHEETFIT_URL ?? "http://localhost:3200";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const errors = [];

async function openPage(url = "/editor", viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL, eventsEnabled: true });
  await page.goto(`${BASE}/editor`, { waitUntil: "load" });
  await page.evaluate(() => localStorage.setItem("sheetfit:onboarded", "1"));
  await page.goto(`${BASE}${url}`, { waitUntil: "load" });
  await page.waitForSelector(".canvas-surface canvas");
  await wait(1200);
  return page;
}

async function clickText(page, selector, text) {
  const ok = await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(t) && !e.disabled);
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    text,
  );
  if (!ok) throw new Error(`No ${selector} with text "${text}"`);
}

/** Radix tabs activate on pointer down, so use a real mouse click. */
async function clickTab(page, name) {
  const handle = await page.evaluateHandle((n) => [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.trim() === n), name);
  const el = handle.asElement();
  if (!el) throw new Error(`No tab "${name}"`);
  await el.click();
  await wait(400);
}

const bodyHas = (page, text) => page.evaluate((t) => document.body.innerText.includes(t), text);
/** Wait up to `ms` for text to appear (software WebGL in the 3D dock slows everything down). */
async function waitText(page, text, ms = 10000) {
  for (let t = 0; t < ms; t += 250) {
    if (await bodyHas(page, text)) return true;
    await wait(250);
  }
  return false;
}
const layerCount = (page) =>
  page.evaluate(() => Number([...document.querySelectorAll('nav[aria-label="Editor panels"] button')].find((b) => b.textContent.includes("Layers"))?.querySelector("span.tnum")?.textContent ?? 0));

async function waitDownload(ext, before) {
  for (let i = 0; i < 120; i++) {
    const files = fs.readdirSync(DL).filter((f) => f.endsWith(ext) && !before.includes(f));
    if (files.length) {
      await wait(400);
      return path.join(DL, files[0]);
    }
    await wait(250);
  }
  throw new Error("download timed out: " + ext);
}

function pdfOps(bytes) {
  const text = Buffer.from(bytes).toString("latin1");
  const out = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length;
    const end = text.indexOf("endstream", start);
    try {
      out.push(zlib.inflateSync(Buffer.from(bytes).subarray(start, end)).toString("latin1"));
    } catch {}
  }
  return out.join("\n");
}

async function uploadToCanvas(page, file) {
  const input = await page.$(".canvas-surface input[type=file]");
  await input.uploadFile(path.join(IMG, file));
}

try {
  /* ---------------- 1. Automatic sticker outline, printed line, white border ---------------- */
  {
    const page = await openPage("/editor?product=sticker-die-3");
    await uploadToCanvas(page, "sticker.png");
    check("a sticker gets its outline automatically after upload", await waitText(page, "Sticker outline added"));
    await wait(800);
    const tabs = await page.$$eval('aside[aria-label="Properties"] [role="tab"]', (t) => t.map((x) => x.textContent.trim()));
    check("the inspector has Design, Arrange and Cut tabs", JSON.stringify(tabs) === JSON.stringify(["Design", "Arrange", "Cut"]), JSON.stringify(tabs));
    const tall = await page.$eval('aside[aria-label="Properties"]', (a) => a.scrollHeight);
    check("the Design tab is far shorter than the v0.9 inspector (2853 px)", tall < 2300, `${tall} px`);
    await clickTab(page, "Cut");
    check(
      "the Cut tab offers the cut methods, hand cutting chosen",
      await page.evaluate(() => document.querySelector('[aria-label="How the stickers are cut"] [role="radio"][aria-checked="true"]')?.textContent?.includes("By hand") ?? false),
    );
    check("the outline is one closed path", await bodyHas(page, "One closed outline."));
    await page.screenshot({ path: path.join(SHOTS, "v10-sticker-cut.png") });
    // PDF: border fill (f*) before the image, clipped cutting line (W* n, 0.5 wide for a 0.25 mm inside line) after it.
    await clickText(page, "header button", "Download");
    await page.waitForSelector('[aria-label="File format"]');
    await wait(400);
    await clickText(page, '[aria-label="File format"] [role="radio"]', "PDF");
    const before = fs.readdirSync(DL);
    await clickText(page, '[role="dialog"] button', "Export PDF");
    const pdf = fs.readFileSync(await waitDownload(".pdf", before));
    const ops = pdfOps(pdf);
    check("the PDF paints the white sticker border under the artwork", /\bf\*/.test(ops) && ops.search(/\bf\*/) < ops.search(/\bDo\b/));
    check("the PDF prints a thin black cutting line inside the cut", /\bW\*\s+n\b/.test(ops) && /\b0\.5 w\b/.test(ops) && /\b0 0 0 RG\b/.test(ops));

    /* ---- 2. Fill sheet ---- */
    await clickTab(page, "Design");
    await clickText(page, '[aria-label="Quick actions"] button', "Fill sheet");
    await wait(1500);
    const filled = await layerCount(page);
    check("Fill sheet fills A4 with 76 mm stickers (6, at 5 mm between cut lines)", filled === 6, `${filled} layers`);
    const barDisabled = await page.evaluate(() => [...document.querySelectorAll('[aria-label="Quick actions"] button')].find((b) => b.textContent.includes("Fill sheet"))?.disabled);
    check("the quick bar's Fill sheet turns off when the sheet is full", barDisabled === true);
    // The inspector's Fill stays available: filling again must give the same sheet, not more copies.
    await clickTab(page, "Arrange");
    await clickText(page, 'aside[aria-label="Properties"] button', "Fill sheet");
    await wait(1200);
    check("filling again keeps the same sheet (copies are replaced, not added)", (await layerCount(page)) === 6, `${await layerCount(page)} layers`);
    await page.screenshot({ path: path.join(SHOTS, "v10-filled.png") });

    /* ---- 3. Cricut: cutter PNG ---- */
    await clickTab(page, "Cut");
    await clickText(page, '[role="radiogroup"][aria-label="How the stickers are cut"] [role="radio"]', "Cricut");
    await wait(300);
    check("Cricut shows the Print Then Cut area for A4 (7.2 × 10.62 in)", await bodyHas(page, "7.2 × 10.62 in"));
    await clickText(page, "header button", "Download");
    await page.waitForSelector('[aria-label="File format"]');
    await wait(500);
    const chosen = await page.$eval('[aria-label="File format"] [role="radio"][aria-checked="true"]', (e) => e.textContent);
    check("the download opens on the cutter PNG for a Cricut page", /Cutter PNG/.test(chosen), chosen);
    const before2 = fs.readdirSync(DL);
    await clickText(page, '[role="dialog"] button', "Export PNG for Cricut");
    const png = fs.readFileSync(await waitDownload(".png", before2));
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    const colorType = png[25];
    // Cropped to the stickers, and within Cricut's 7.2 × 10.62 in Print Then Cut limit at 300 DPI (2160 × 3186 px).
    check("the cutter PNG holds just the stickers, inside Cricut's A4 limit, with an alpha channel", w <= 2160 && h <= 3186 && w > 1500 && h > 2500 && colorType === 6, `${w} × ${h}, colour type ${colorType}`);
    const alpha = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const corner = ctx.getImageData(2, 2, 1, 1).data[3];
      // Somewhere inside the sticker grid there is opaque white border or artwork.
      let solid = 0;
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 200) solid++;
      return { corner, solid };
    }, png.toString("base64"));
    check("the cutter PNG is transparent around the stickers and opaque on them", alpha.corner === 0 && alpha.solid > 1000, JSON.stringify(alpha));
    await page.keyboard.press("Escape");
    await page.close();
  }

  /* ---------------- 4. A JPEG sticker on plain white ---------------- */
  {
    const page = await openPage();
    await clickText(page, 'header [role="radiogroup"][aria-label="Print process"] button', "Stickers");
    await wait(400);
    await uploadToCanvas(page, "badge-white.jpg");
    const shaped = await waitText(page, "Sticker outline added");
    const rect = await bodyHas(page, "no transparent or plain background");
    check("a JPEG on plain white gets a shaped outline (background found, not a box)", shaped && !rect);
    await page.screenshot({ path: path.join(SHOTS, "v10-jpeg-sticker.png") });
    await page.close();
  }

  /* ---------------- 5. Lanyard and keychain straps on A4 ---------------- */
  {
    const page = await openPage();
    await clickText(page, "button", "Lanyard and keychain straps");
    await page.waitForSelector('[aria-label="Strap length in millimetres"]');
    await clickText(page, '[role="dialog"] [role="radio"]', "16 mm");
    await page.type('[aria-label="Strap length in millimetres"]', "130");
    const file = await page.$('[role="dialog"] input[type=file]');
    await file.uploadFile(path.join(IMG, "lanyard-art.png"));
    await wait(1200);
    const fits = await page.evaluate(() => Number((document.querySelector('[role="dialog"]').innerText.match(/(\d+) straps fit on A4/) ?? [])[1] ?? 0));
    check("16 × 130 mm straps: at least 20 fit on A4", fits >= 20, `${fits}`);
    await page.screenshot({ path: path.join(SHOTS, "v10-strap-dialog.png") });
    await clickText(page, '[role="dialog"] button', "Lay out");
    await wait(4000);
    const placed = await layerCount(page);
    check("the sheet is filled with that many straps", placed === fits, `${placed} layers`);
    check("the strap sheet is mirrored for sublimation", await bodyHas(page, "Mirrored output"));
    await page.screenshot({ path: path.join(SHOTS, "v10-strap-sheet.png") });
    await page.close();
  }

  /* ---------------- 6. One side panel at a time at 1024 px ---------------- */
  {
    const page = await openPage("/editor?sample", { width: 1024, height: 768 });
    await wait(1500);
    const sidePanel = await page.$('aside[aria-label="Side panel"]');
    const props = await page.$('aside[aria-label="Properties"]');
    check("at 1024 px a selection shows the inspector and folds the side panel", sidePanel === null && props !== null);
    await page.screenshot({ path: path.join(SHOTS, "v10-1024.png") });
    await page.close();
  }

  /* ---------------- 7. Remove background (DTF) and trim empty edges ---------------- */
  {
    const page = await openPage();
    await clickText(page, 'header [role="radiogroup"][aria-label="Print process"] button', "DTF");
    await wait(400);
    await uploadToCanvas(page, "badge-white.jpg");
    await wait(1500);
    check("DTF warns that an opaque background prints as a box", await bodyHas(page, "background prints as a box"));
    await clickText(page, 'aside[aria-label="Properties"] button', "Remove plain background");
    await wait(3500);
    check("Remove background makes a transparent copy and the warning goes", (await bodyHas(page, "Background removed")) && !(await bodyHas(page, "background prints as a box")));
    await page.keyboard.press("Delete");
    await wait(500);
    await uploadToCanvas(page, "margins.png");
    await wait(1500);
    const sizeOf = () => page.$eval('[data-testid="design-size"]', (e) => e.textContent);
    const s0 = await sizeOf();
    await clickText(page, 'aside[aria-label="Properties"] button', "Trim empty edges");
    await wait(800);
    const s1 = await sizeOf();
    const area = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 2).reduce((a, b) => a * Number(b), 1);
    check("Trim empty edges shrinks the box to the artwork", area(s1) < area(s0) * 0.2, `${s0} → ${s1}`);
    await page.close();
  }

  /* ---------------- 8. 600 DPI print option ---------------- */
  {
    const page = await openPage("/editor?sample");
    await clickText(page, "header button", "Print");
    await page.waitForSelector('[aria-label="Print resolution"]');
    check("print offers a high-quality 600 DPI option", await bodyHas(page, "High, 600 DPI"));
    await page.keyboard.press("Escape");
    await page.close();
  }
} catch (e) {
  check("script ran to the end", false, String(e));
}

check("no console or page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
