/**
 * v0.9 browser checks against a production build.
 *
 *   npm run build && npx next start -p 3200
 *   npm i --no-save puppeteer-core
 *   python scripts/e2e/make-images.py        (calibration images, once)
 *   node scripts/e2e/v9func.mjs
 *
 * Covers: two-sided cards (one and two uploads), the mirror in real PDF files
 * (Auto, Off, On), crop mode (double-click, wheel, drag, Apply, undo), touch
 * long-press on a 390 px phone, Auto Arrange of 11 mixed images, sticker
 * contour and SVG cut file, and the lanyard roll layout. Prints PASS/FAIL per
 * check and exits non-zero on failure. Output goes to scripts/e2e/.out.
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
const { PDFDocument } = require("pdf-lib");

const IMG = path.join(here, ".out", "img");
const DL = path.join(here, ".out", "downloads");
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

async function openPage(viewport = { width: 1440, height: 900 }) {
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

const textOf = (page, sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);

async function waitDownload(ext, before) {
  for (let i = 0; i < 80; i++) {
    const files = fs.readdirSync(DL).filter((f) => f.endsWith(ext) && !before.includes(f));
    if (files.length) {
      await wait(300);
      return path.join(DL, files[0]);
    }
    await wait(250);
  }
  throw new Error("download timed out: " + ext);
}

/** Count whole-sheet mirror operators (-1 0 0 1 W 0 cm) in a PDF's content streams. */
function pdfMirrors(bytes) {
  const text = Buffer.from(bytes).toString("latin1");
  let n = 0;
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length;
    const end = text.indexOf("endstream", start);
    try {
      const s = zlib.inflateSync(Buffer.from(bytes).subarray(start, end)).toString("latin1");
      n += (s.match(/(^|\s)-1 0 0 1 [\d.]+ 0 cm/g) ?? []).length;
    } catch {}
  }
  return n;
}

async function exportFile(page, format, ext) {
  await clickText(page, "header button", "Download");
  await page.waitForSelector('[role="radiogroup"][aria-label="File format"]');
  await clickText(page, '[aria-label="File format"] [role="radio"]', format);
  await wait(300);
  const before = fs.readdirSync(DL);
  await clickText(page, '[role="dialog"] button', "Export");
  return waitDownload(ext, before);
}

try {
  /* ---------------- 1. PVC card front + back ---------------- */
  {
    const page = await openPage();
    await page.goto(`${BASE}/editor?product=card-cr80`, { waitUntil: "load" });
    await page.waitForSelector(".canvas-surface canvas");
    await wait(1200);
    const input = await page.$(".canvas-surface input[type=file]");
    await input.uploadFile(path.join(IMG, "card-front.png"));
    await wait(1200);
    check("one upload makes a one-sided card (no back invented)", (await page.$('[data-testid="side-label-back"]')) === null && (await page.$('[data-testid="side-label-front"]')) !== null);
    // Second file into the front: becomes the back, side by side.
    await page.goto(`${BASE}/editor?product=card-cr80`, { waitUntil: "load" });
    await page.waitForSelector(".canvas-surface canvas");
    await wait(1200);
    const input2 = await page.$(".canvas-surface input[type=file]");
    await input2.uploadFile(path.join(IMG, "card-front.png"), path.join(IMG, "card-back.png"));
    await wait(2000);
    const labels = await page.$$eval('[data-testid^="side-label-"]', (els) => els.map((e) => [e.textContent.trim(), e.getBoundingClientRect().left]));
    check("two uploads show FRONT and BACK side by side", labels.length === 2 && labels.some((l) => l[0] === "FRONT") && labels.some((l) => l[0] === "BACK") && labels.find((l) => l[0] === "BACK")[1] > labels.find((l) => l[0] === "FRONT")[1], JSON.stringify(labels));
    const gap = await textOf(page, '[data-testid="pair-gap"]');
    check("pair gap shown between cut paths", gap === "5 mm", String(gap));
    await page.screenshot({ path: path.join(SHOTS, "card-pair.png") });

    /* Mirror: Auto (sublimation) / Off / On in the export dialog, verified in the PDF file. */
    await clickText(page, "header button", "Download");
    await page.waitForSelector('[aria-label="Mirror output"]');
    const eff = await textOf(page, '[data-testid="mirror-effective"]');
    check("export dialog shows the effective mirror before output", eff === "Mirrored", String(eff));
    await page.keyboard.press("Escape");
    await wait(400);
    const pdfAuto = await exportFile(page, "PDF", ".pdf");
    const autoBytes = fs.readFileSync(pdfAuto);
    const doc = await PDFDocument.load(autoBytes);
    const { width, height } = doc.getPage(0).getSize();
    check("PDF page is exact A4", Math.abs((width / 72) * 25.4 - 210) < 0.01 && Math.abs((height / 72) * 25.4 - 297) < 0.01, `${width} × ${height} pt`);
    check("Auto (sublimation) PDF is mirrored exactly once", pdfMirrors(autoBytes) === 1, `mirrors=${pdfMirrors(autoBytes)}`);
    fs.unlinkSync(pdfAuto);

    await clickText(page, "header button", "Download");
    await page.waitForSelector('[aria-label="Mirror output"]');
    await clickText(page, '[aria-label="Mirror output"] [role="radio"]', "Off");
    await wait(300);
    check("choosing Off updates the effective mirror", (await textOf(page, '[data-testid="mirror-effective"]')) === "Not mirrored");
    check("badge says not mirrored", ((await textOf(page, '[data-testid="export-mirror-badge"]')) ?? "").startsWith("Not mirrored"));
    await page.keyboard.press("Escape");
    await wait(400);
    const pdfOff = await exportFile(page, "PDF", ".pdf");
    const offBytes = fs.readFileSync(pdfOff);
    check("Mirror Off overrides the sublimation default in the PDF", pdfMirrors(offBytes) === 0, `mirrors=${pdfMirrors(offBytes)}`);
    fs.unlinkSync(pdfOff);
    await clickText(page, "header button", "Download");
    await page.waitForSelector('[aria-label="Mirror output"]');
    await clickText(page, '[aria-label="Mirror output"] [role="radio"]', "On");
    await page.keyboard.press("Escape");
    await wait(400);
    const pdfOn = await exportFile(page, "PDF", ".pdf");
    check("Mirror On gives exactly one flip (never two)", pdfMirrors(fs.readFileSync(pdfOn)) === 1);
    fs.unlinkSync(pdfOn);

    /* Crop: double-click the front (selects that side alone and opens crop mode). */
    const front = await page.$eval('[data-testid="side-label-front"]', (e) => {
      const r = e.getBoundingClientRect();
      return { x: r.left + 30, y: r.bottom + 30 };
    });
    // Two real clicks (Puppeteer's clickCount alone sends one click with detail = 2).
    await page.mouse.click(front.x, front.y, { clickCount: 1 });
    await page.mouse.click(front.x, front.y, { clickCount: 2 });
    await page.waitForSelector('[data-testid="crop-surface"]', { timeout: 4000 }).catch(() => null);
    check("double-click opens crop mode", (await page.$('[data-testid="crop-surface"]')) !== null);
    const box = await page.$eval('[data-testid="crop-surface"]', (e) => {
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    // Zoom in with the wheel, then drag.
    await page.mouse.move(box.x, box.y);
    await page.mouse.wheel({ deltaY: -400 });
    await page.mouse.down();
    await page.mouse.move(box.x + 25, box.y + 10, { steps: 6 });
    await page.mouse.up();
    await page.screenshot({ path: path.join(SHOTS, "crop-mode.png") });
    await clickText(page, '[role="dialog"][aria-label="Crop and adjust image"] button', "Apply");
    await wait(600);
    const fill = await page.$eval('[aria-label="How the image fills the box"] [aria-checked="true"]', (e) => e.textContent.trim()).catch(() => null);
    check("Apply switches the side to Fill (crop) with a custom crop", fill === "Fill box (crop)", String(fill));
    const note = await page.evaluate(() => document.body.innerText.includes("(custom crop)"));
    check("inspector shows that part of the image is cropped away", note);
    const backStill = await page.$('[data-testid="side-label-back"]');
    check("editing one side keeps the pair", backStill !== null);
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");
    await wait(400);
    const afterUndo = await page.$eval('[aria-label="How the image fills the box"] [aria-checked="true"]', (e) => e.textContent.trim()).catch(() => null);
    check("one undo restores the previous fit", afterUndo === "Fit whole image", String(afterUndo));
    await page.close();
  }

  /* ---------------- 2. Touch long-press on a phone ---------------- */
  {
    const page = await openPage({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/editor?product=coaster-square`, { waitUntil: "load" });
    await page.waitForSelector(".canvas-surface canvas");
    await wait(1500);
    const input = await page.$(".canvas-surface input[type=file]");
    await input.uploadFile(path.join(IMG, "portrait.jpg"));
    await wait(1500);
    // The product box sits at the top centre of the sheet; touch the image itself
    // (the canvas centre is covered by the floating pill of the selection).
    const c = await page.$eval(".canvas-surface", (e) => {
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + 200 };
    });
    const target = await page.evaluate((x, y) => document.elementFromPoint(x, y)?.tagName, c.x, c.y);
    check("touch point is on the canvas image", target === "CANVAS", String(target));
    // A short tap must not open crop mode.
    await page.touchscreen.touchStart(c.x, c.y);
    await wait(150);
    await page.touchscreen.touchEnd();
    await wait(800);
    check("a short tap does not open crop mode", (await page.$('[data-testid="crop-surface"]')) === null);
    await page.touchscreen.touchStart(c.x, c.y);
    await wait(800);
    await page.touchscreen.touchEnd();
    await wait(500);
    check("press and hold (550 ms) opens crop mode on touch", (await page.$('[data-testid="crop-surface"]')) !== null);
    await page.screenshot({ path: path.join(SHOTS, "crop-touch.png") });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check("no horizontal overflow at 390 px in crop mode", !overflow);
    await clickText(page, '[role="dialog"][aria-label="Crop and adjust image"] button', "Cancel");
    await page.close();
  }

  /* ---------------- 3. Auto Arrange of 11 mixed designs ---------------- */
  {
    const page = await openPage();
    await page.goto(`${BASE}/editor`, { waitUntil: "load" });
    await page.waitForSelector(".canvas-surface canvas");
    await wait(1000);
    const files = fs.readdirSync(IMG).filter((f) => f.startsWith("mix-")).map((f) => path.join(IMG, f));
    const input = await page.$(".canvas-surface input[type=file]");
    await input.uploadFile(...files);
    // Uploads are placed one after another; under software WebGL the 3D dock slows each one down.
    await page.waitForFunction(
      (n) => [...document.querySelectorAll("button, a, span")].some((e) => e.textContent.trim() === String(n) && /Layers/.test(e.closest("button,a")?.textContent ?? "")),
      { timeout: 180000 },
      files.length,
    );
    await wait(1500);
    await page.screenshot({ path: path.join(SHOTS, "before-arrange.png") });
    // Click empty canvas to clear the selection, then use the sheet's Auto Arrange.
    await page.mouse.click(1000, 820);
    await wait(500);
    await clickText(page, '[aria-label="Quick actions"] button', "Auto Arrange");
    await page.waitForSelector('[data-testid="arrange-summary"]');
    const summary = await textOf(page, '[data-testid="arrange-summary"]');
    check("Auto Arrange previews pages and usage before applying", /fit|Needs|would stay/.test(summary ?? ""), String(summary));
    await page.evaluate(() => {
      const sw = document.querySelector("#arr-pages");
      if (sw && sw.getAttribute("aria-checked") !== "true") sw.click();
    });
    await wait(300);
    await clickText(page, '[role="dialog"] button', "Arrange");
    await wait(1500);
    await page.screenshot({ path: path.join(SHOTS, "arranged.png") });
    await page.mouse.click(30, 300);
    await clickText(page, "header button", "Download");
    await page.waitForSelector('[aria-label="File format"]');
    await wait(500);
    const ok = await page.evaluate(() => document.body.innerText.includes("No overlaps, nothing outside the margins"));
    check("after Auto Arrange the pre-print check finds no overlaps or margin problems", ok);
    await page.keyboard.press("Escape");
    await page.close();
  }

  /* ---------------- 4. Sticker contour and SVG cut file ---------------- */
  {
    const page = await openPage();
    await page.goto(`${BASE}/editor?product=sticker-die-3`, { waitUntil: "load" });
    await page.waitForSelector(".canvas-surface canvas");
    await wait(1200);
    const input = await page.$(".canvas-surface input[type=file]");
    await input.uploadFile(path.join(IMG, "sticker.png"));
    // v0.10: the outline is traced automatically after the upload (no button); allow for software WebGL.
    let traced = false;
    for (let t = 0; t < 10000 && !traced; t += 250) {
      traced = await page.evaluate(() => document.body.innerText.includes("Sticker outline added"));
      if (!traced) await wait(250);
    }
    check("contour traced from the PNG's transparency", traced);
    await page.screenshot({ path: path.join(SHOTS, "sticker-contour.png") });
    const svgPath = await exportFile(page, "Cut file (SVG)", ".svg");
    const svg = fs.readFileSync(svgPath, "utf8");
    const cut = svg.match(/<path id="cut-1" data-cut="die" d="([^"]+)"/);
    check("SVG cut file is in millimetres with a CUTLINE group", /width="[\d.]+mm"/.test(svg) && svg.includes('<g id="CUTLINE">'), svg.slice(0, 160));
    check("contour exported as a closed vector path", !!cut && cut[1].trim().endsWith("Z") && (cut[1].match(/L/g) ?? []).length > 20, cut ? `${(cut[1].match(/L/g) ?? []).length} segments` : "none");
    check("sticker sheets are not mirrored by default", !svg.includes('id="MIRROR"'));
    await page.close();
  }

  /* ---------------- 5. Lanyard ribbon roll layout ---------------- */
  {
    const page = await openPage();
    await page.goto(`${BASE}/editor`, { waitUntil: "load" });
    await page.waitForSelector(".canvas-surface canvas");
    await wait(800);
    // v0.10: the straps dialog opens on transfer sheets; the ribbon-roll layout is its second tab.
    await clickText(page, "button", "Lanyard and keychain straps");
    await page.waitForSelector('[role="dialog"]');
    await clickText(page, '[role="dialog"] button', "Along a ribbon roll");
    await page.waitForSelector('[aria-label="Ribbon width (mm)"]');
    const type = async (label, v) => {
      await page.click(`[aria-label="${label}"]`);
      await page.keyboard.down("Control");
      await page.keyboard.press("a");
      await page.keyboard.up("Control");
      await page.keyboard.press("Backspace");
      await page.type(`[aria-label="${label}"]`, v);
    };
    await type("Ribbon width (mm)", "25");
    await type("Printable width (mm)", "20");
    await type("Strap cut length (mm)", "450");
    await type("Number of straps", "5");
    await type("Longest section per page", "1000");
    await wait(300);
    const note = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] *')].map((e) => e.textContent).filter((t) => /^\d+ straps, [\d.]+ mm of ribbon/.test(t ?? "")).sort((a, b) => a.length - b.length)[0]);
    check("strip layout summarises length and pages from user values", !!note && /on 3 pages/.test(note), String(note).slice(0, 120));
    await clickText(page, '[role="dialog"] button', "Lay out straps");
    await wait(1200);
    const toast = await page.evaluate(() => document.body.innerText.includes("5 straps laid out on 3 pages"));
    check("straps laid out on 3 ribbon pages", toast);
    await page.screenshot({ path: path.join(SHOTS, "lanyard.png") });
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
