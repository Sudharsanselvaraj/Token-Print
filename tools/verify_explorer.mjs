// NOTE: For automated CI visual regression testing, see frontend/tests/visual/ (Playwright).
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const QWEN3 = "/Users/sudharsan/.ollama/models/blobs/sha256-a3de86cd1c132c822487ededd47a324c50491393e6565cd14bafa40d0b8e686f";
const LLAMA = "/Users/sudharsan/.ollama/models/blobs/sha256-dde5aa3fc5ffc17176b5e8bdc82f587b24b2678c6c66101bf7da77af9f7ccdff";

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, userDataDir: "/tmp/ns-chrome-profile2",
  args: ["--window-size=1500,940","--no-first-run","--no-default-browser-check","--disable-session-crashed-bubble"],
});
const meta = (page) => page.evaluate(() => {
  const out = {};
  document.querySelectorAll(".astat").forEach(a => {
    const l = a.querySelector(".astat-label")?.textContent?.trim();
    const v = a.querySelector(".astat-value")?.textContent?.trim();
    if (l) out[l] = v;
  });
  out.__top = document.querySelector(".topstats")?.textContent?.replace(/\s+/g," ").trim();
  return out;
});
try {
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1500, height: 920 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector(".astat-value", { timeout: 30000 });
  await sleep(3500);
  console.log("QWEN MODEL source:", JSON.stringify(await meta(page)));
  await page.screenshot({ path: "/tmp/pa_explorer_qwen.png" });

  const input = await page.$('input[type=file]');
  async function loadGguf(path, tag, wantArch){
    await input.uploadFile(path);
    // wait until Architecture value becomes the gguf arch
    for (let i=0;i<40;i++){ const m=await meta(page); if((m.Architecture||"").toLowerCase().includes(wantArch)) break; await sleep(400); }
    await sleep(1200);
    const m = await meta(page);
    console.log(`GGUF ${tag}:`, JSON.stringify(m));
    await page.screenshot({ path: `/tmp/pa_explorer_${tag}.png` });
    return m;
  }
  const q = await loadGguf(QWEN3, "gguf_qwen3", "qwen3");
  const l = await loadGguf(LLAMA, "gguf_llama", "llama");

  const ok = (q.Architecture||"").includes("qwen3") && (l.Architecture||"").includes("llama")
    && /399/.test(q.__top||"") && /255/.test(l.__top||"");
  console.log(ok ? "\nEXPLORER PASS: model + 2 GGUF archs parsed with real metadata." : "\nCHECK values above.");
} finally { await browser.close(); }
