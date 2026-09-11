// NOTE: For automated CI visual regression testing, see frontend/tests/visual/ (Playwright).
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, userDataDir: "/tmp/ns-chrome-profile2",
  args: ["--window-size=1500,940","--no-first-run","--no-default-browser-check","--disable-session-crashed-bubble"],
});
try {
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1500, height: 920 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });
  await page.waitForSelector(".mode-tab", { timeout: 30000 });
  await sleep(2500);
  // switch to Generation
  await page.evaluate(()=>{ [...document.querySelectorAll('.mode-tab')].find(b=>/Generation/.test(b.textContent)).click(); });
  await sleep(1200);
  // click Generate (button.primary in sidebar)
  await page.evaluate(()=>{ [...document.querySelectorAll('button.primary')].find(b=>/Generate/i.test(b.textContent))?.click(); });
  await sleep(9000); // stream
  const panel1 = await page.evaluate(()=>({
    op: document.querySelector('.gp-op')?.textContent,
    used: document.querySelector('.gp-params b')?.textContent,
    crumb: document.querySelector('.gp-crumb-title')?.textContent,
    katex: [...document.querySelectorAll('.formula .katex')].length,
    tokens: document.querySelector('.token-strip')?.textContent?.slice(0,80),
    ops: document.querySelector('.gp-crumb-idx')?.textContent,
  }));
  console.log("op0:", JSON.stringify(panel1));
  await page.screenshot({ path: "/tmp/pc_gen_op0.png" });
  // step forward to op ~5 (attention L0)
  for (let i=0;i<5;i++){ await page.evaluate(()=>{ document.querySelectorAll('.gp-crumb-nav .pb-btn')[1]?.click(); }); await sleep(150); }
  await sleep(600);
  const panel2 = await page.evaluate(()=>({
    op: document.querySelector('.gp-op')?.textContent,
    used: document.querySelector('.gp-params b')?.textContent,
    crumb: document.querySelector('.gp-crumb-title')?.textContent,
    nparams: document.querySelector('.gp-nparams b')?.textContent,
    ops: document.querySelector('.gp-crumb-idx')?.textContent,
  }));
  console.log("op5:", JSON.stringify(panel2));
  await page.screenshot({ path: "/tmp/pc_gen_op5.png" });
  const ok = panel1.katex>0 && /Embedding|Norm/.test(panel1.op||"") && (panel2.crumb||"").length>0;
  console.log(ok ? "\nGEN UI PASS: op catalog + formula + weight panel render from real trace." : "\nCHECK above.");
} finally { await browser.close(); }
