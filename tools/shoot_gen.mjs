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
  await page.waitForSelector(".nav-btn", { timeout: 30000 });
  await sleep(4000);

  // Navigate to Generation district (4th nav button, index 3)
  await page.evaluate(()=>document.querySelectorAll('.nav-btn')[3].click());
  await sleep(3200); // camera flight

  // Click the Generate button (by text)
  await page.evaluate(()=>{
    const b=[...document.querySelectorAll('button.primary')].find(x=>/generate/i.test(x.textContent||""));
    if(b) b.click();
  });
  // Wait for streaming to finish
  await sleep(9000);
  const status = await page.evaluate(()=>document.querySelector('.status')?.textContent?.trim());
  console.log("gen status:", status);
  await page.screenshot({ path: "/tmp/p3_generation.png" });

  // Step back to the first generated token to show that step's skyline
  await page.evaluate(()=>{ const b=document.querySelectorAll('.pb-btn'); for(let k=0;k<8;k++) b[0]?.click(); });
  await sleep(1500);
  await page.screenshot({ path: "/tmp/p3_generation_step0.png" });
} finally { await browser.close(); }
console.log("done");
