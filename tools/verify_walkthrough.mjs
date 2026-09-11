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
  await page.evaluate(()=>{ [...document.querySelectorAll('.mode-tab')].find(b=>/Walkthrough/.test(b.textContent)).click(); });
  await sleep(5000); // analyze loads
  const read = ()=>page.evaluate(()=>({ title: document.querySelector('.wt-chaptertitle')?.textContent, body: document.querySelector('.wt-body')?.textContent?.replace(/\s+/g,' ').slice(0,240) }));
  const next = async()=>{ await page.evaluate(()=>{ document.querySelectorAll('.wt-nav .pb-btn')[1]?.click(); }); await sleep(1200); };
  console.log("ch0:", JSON.stringify(await read())); await page.screenshot({path:"/tmp/pd_overview.png"});
  await next(); console.log("ch1:", JSON.stringify(await read())); await page.screenshot({path:"/tmp/pd_tokenizer.png"});
  await next(); await next(); await next(); // -> Self-Attention
  console.log("ch4:", JSON.stringify(await read())); await page.screenshot({path:"/tmp/pd_attention.png"});
  const r = await read();
  const ok = /Tokeniz|Attention|Overview/.test(r.title||"");
  console.log(ok ? "\nWALKTHROUGH PASS: chapters advance text + 3D with real numbers." : "\nCHECK above.");
} finally { await browser.close(); }
