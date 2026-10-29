const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const r = []; process.on("exit", () => console.log(r.join("\n")));
  await p.addInitScript(() => localStorage.setItem("sheetfit:onboarded", "1"));
  await p.goto("http://localhost:3200/editor?sample", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  const names = await p.evaluate(() => [...document.querySelectorAll("header button")].map(b => { const s = getComputedStyle(b); return `${b.getAttribute("aria-label") ?? "(no aria)"}:${b.innerText.trim() || "(no visible text)"}:${s.display}`; }));
  r.push("header buttons: " + names.join(" | "));
  await p.locator("header button").last().tap(); await p.waitForTimeout(1200);
  await p.screenshot({ path: (process.env.OUT || __dirname) + "/m-10-export.png" }); r.push("download dialog visible: " + await p.getByText(/Pre-print check|Export PDF/).first().isVisible().catch(() => false));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  const prev = p.getByText('Preview', { exact: true }).first();
  await prev.tap(); await p.waitForTimeout(6000); await p.screenshot({ path: (process.env.OUT || __dirname) + "/m-12-preview.png" }); r.push("preview tapped");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  // touch drag a design
  const x = 100, y = 475;
  await p.touchscreen.tap(x, y); await p.waitForTimeout(700); await p.screenshot({ path: (process.env.OUT || __dirname) + "/m-14-before-drag.png" }); r.push("selected after tap: " + await p.evaluate(() => /Replace|Fill/.test(document.body.innerText)));
  const cdp = await ctx.newCDPSession(p);
  const tp = (type, xx, yy) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: xx, y: yy }] });
  await tp("touchStart", x, y); for (let i = 1; i <= 10; i++) { await tp("touchMove", x + 4 * i, y + 3 * i); await p.waitForTimeout(30); } await tp("touchEnd");
  await p.waitForTimeout(600); await p.screenshot({ path: (process.env.OUT || __dirname) + "/m-15-after-drag.png" }); r.push("drag done");
  // pinch zoom
  const z0 = await p.evaluate(() => document.body.innerText.match(/\d+%/)?.[0]); r.push("zoom label: " + z0);
})().then(() => process.exit(0)).catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1); });
