// Walks the editor at one viewport and screenshots each state. Usage: node walk.js <w> <h> <tag>
const { chromium } = require("playwright");
const [w, h, tag] = [+process.argv[2], +process.argv[3], process.argv[4]];
const out = (n) => `${process.env.OUT || __dirname}/${tag}-${n}.png`;
(async () => {
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const log = [];
  p.on("console", (m) => m.type() === "error" && log.push("console: " + m.text().slice(0, 200)));
  p.on("pageerror", (e) => log.push("pageerror: " + String(e).slice(0, 200)));
  p.on("dialog", (d) => d.accept());
  const step = async (name, fn) => { try { await fn(); await p.waitForTimeout(900); await p.screenshot({ path: out(name) }); log.push("ok " + name); } catch (e) { log.push("FAIL " + name + ": " + String(e).split("\n")[0].slice(0, 160)); } };
  const metrics = async (name) => {
    const m = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.opacity !== "0"; };
      const btns = [...document.querySelectorAll("button,a,[role=button],input,select")].filter(vis);
      const small = btns.filter((el) => { const r = el.getBoundingClientRect(); return r.width < 32 || r.height < 32; });
      const unnamed = btns.filter((el) => !(el.getAttribute("aria-label") || el.textContent.trim() || el.getAttribute("title") || el.labels?.length));
      const tiny = [...document.querySelectorAll("body *")].filter((el) => vis(el) && el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).length;
      return { overflowX: document.documentElement.scrollWidth > innerWidth, controls: btns.length, under32px: small.length, smallExamples: small.slice(0, 8).map(e => (e.getAttribute("aria-label") || e.textContent.trim()).slice(0, 30) + ` ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), unnamed: unnamed.length, textUnder12px: tiny };
    });
    log.push(`metrics ${name}: ` + JSON.stringify(m));
  };
  await step("01-first-run", async () => { await p.goto("http://localhost:3200/editor", { waitUntil: "networkidle" }); });
  await metrics("first-run");
  await step("02-start-dismissed", async () => { await p.keyboard.press("Escape"); });
  await metrics("empty-editor");
  await step("03-sample", async () => { await p.evaluate(() => localStorage.setItem("sheetfit:onboarded", "1")); await p.goto("http://localhost:3200/editor?sample", { waitUntil: "networkidle" }); await p.waitForTimeout(2500); });
  await metrics("sample");
  await step("04-select-design", async () => {
    const c = await p.locator("canvas").first().boundingBox();
    await p.mouse.click(c.x + c.width * 0.35, c.y + c.height * 0.4);
  });
  await metrics("selected");
  await step("05-products-panel", async () => { await p.getByRole("button", { name: /^Products$/ }).first().click(); });
  await metrics("products");
  await step("06-designs-panel", async () => { await p.getByRole("button", { name: /^Designs$/ }).first().click(); });
  await step("07-sheet-panel", async () => { await p.getByRole("button", { name: /^Sheet$/ }).first().click(); });
  await step("08-export", async () => { await p.keyboard.press("Escape"); await p.getByRole("button", { name: /Download/ }).first().click(); });
  await metrics("export");
  await step("09-product-link", async () => { await p.goto("http://localhost:3200/editor?product=tee-left-chest", { waitUntil: "networkidle" }); await p.waitForTimeout(2500); });
  await metrics("product-link");
  console.log(log.join("\n")); await b.close();
})();
