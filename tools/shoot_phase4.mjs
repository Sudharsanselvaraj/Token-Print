// NOTE: For automated CI visual regression testing, see frontend/tests/visual/ (Playwright).
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, userDataDir: "/tmp/ns-chrome-profile2",
  args: ["--window-size=1440,960","--no-first-run","--no-default-browser-check","--disable-session-crashed-bubble"],
});
try {
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1600);
  await page.screenshot({ path: "/tmp/p4_intro.png" });        // one-time intro

  // dismiss intro if present (Enter button), then let attention district settle
  await page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/Enter/.test(x.textContent||"")); if(b)b.click(); });
  await sleep(4500);
  await page.screenshot({ path: "/tmp/p4_attention_bloom.png" }); // bloom on

  // open the educational overlay
  await page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/What am I looking at/.test(x.textContent||"")); if(b)b.click(); });
  await sleep(700);
  await page.screenshot({ path: "/tmp/p4_info.png" });

  // toggle Performance (bloom off)
  await page.evaluate(()=>{ const b=[...document.querySelectorAll('button.chip-btn')].find(x=>/Cinematic|Performance/.test(x.textContent||"")); if(b)b.click(); });
  await sleep(1200);
  const q = await page.evaluate(()=>{ const b=[...document.querySelectorAll('button.chip-btn')].find(x=>/Cinematic|Performance/.test(x.textContent||"")); return b?.textContent?.trim(); });
  console.log("quality toggle now:", q);
  await page.screenshot({ path: "/tmp/p4_performance.png" });
} finally { await browser.close(); }
console.log("done");
