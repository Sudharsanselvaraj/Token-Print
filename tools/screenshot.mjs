// NOTE: For automated CI visual regression testing, see frontend/tests/visual/ (Playwright).
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, userDataDir: "/tmp/ns-chrome-profile2",
  args: ["--window-size=1440,960","--no-first-run","--no-default-browser-check","--disable-session-crashed-bubble"],
});
const page = (await browser.pages())[0];
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector(".status", { timeout: 30000 });
await sleep(4500);
async function setRange(i,v){ await page.evaluate((idx,val)=>{const el=document.querySelectorAll('input[type=range]')[idx];const s=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set;s.call(el,String(val));el.dispatchEvent(new Event('input',{bubbles:true}));}, i, v); }
const st = async()=> page.evaluate(()=>document.querySelector(".status")?.textContent?.trim());
console.log("status:", await st());
await page.screenshot({ path: "/tmp/prod_l0h0.png" });
await setRange(0,23); await setRange(1,13); await sleep(1800);
console.log("status:", await st());
await page.screenshot({ path: "/tmp/prod_l23h13.png" });
await setRange(0,5); await setRange(1,3); await setRange(2,0.0); await sleep(1800);
console.log("status:", await st());
await page.screenshot({ path: "/tmp/prod_l5h3.png" });
await browser.close();
console.log("done");
