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
  await page.waitForSelector(".tensor-row", { timeout: 30000 });
  await sleep(3000);
  async function clickTensor(sub, tag){
    // type into filter then click first row
    await page.click(".tensor-search",{clickCount:3});
    await page.type(".tensor-search", sub);
    await sleep(400);
    await page.evaluate(()=>{ document.querySelector(".tensor-row")?.click(); });
    await sleep(700);
    const info = await page.evaluate(()=>({
      role: document.querySelector(".td-role")?.textContent?.trim(),
      formulas: [...document.querySelectorAll(".formula-title")].map(x=>x.textContent.trim()),
      katex: [...document.querySelectorAll(".formula .katex")].length,
    }));
    console.log(tag, JSON.stringify(info));
    await page.screenshot({ path: `/tmp/pb_${tag}.png` });
    return info;
  }
  const n = await clickTensor("input_layernorm", "norm");
  const q = await clickTensor("q_proj.weight", "attn");
  const g = await clickTensor("gate_proj", "mlp");
  const ok = n.formulas.includes("RMS Normalization") && q.formulas.includes("Grouped-Query Attention") && g.formulas.includes("SwiGLU MLP") && n.katex>0;
  console.log(ok ? "\nFORMULAS PASS: architecture-correct (RMSNorm/GQA/SwiGLU) rendered via KaTeX." : "\nCHECK above.");
} finally { await browser.close(); }
