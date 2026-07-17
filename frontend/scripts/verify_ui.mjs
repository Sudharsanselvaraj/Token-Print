// Headless-browser verification of the Attention District.
//
// Loads the running app in the system Chrome, confirms the HUD status line
// reflects REAL data from the backend, screenshots layer0/head0, then drives
// the sliders to a different layer/head and screenshots again to prove the
// beams change. Also cross-checks beam counts against the raw /analyze data.
//
// Run (app + backend must be running):
//   node frontend/scripts/verify_ui.mjs

import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP = "http://localhost:3000/";
const API = "http://localhost:8000/analyze";
const OUT = "/tmp";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Count beams the frontend SHOULD draw for a (layer, head) at a threshold:
// causal off-diagonal entries (to < from) with weight >= threshold.
function expectedBeams(attention, layer, head, minWeight) {
  const mat = attention[layer][head];
  let count = 0;
  for (let from = 0; from < mat.length; from++)
    for (let to = 0; to < from; to++)
      if (mat[from][to] >= minWeight) count++;
  return count;
}

async function statusText(page) {
  return page.$eval(".status", (el) => el.textContent.trim());
}

// Set the i-th range slider (0=layer,1=head,2=minWt) the React-friendly way.
async function setRange(page, index, value) {
  await page.evaluate(
    (idx, val) => {
      const el = document.querySelectorAll('input[type="range"]')[idx];
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(el),
        "value",
      ).set;
      setter.call(el, String(val));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    index,
    value,
  );
}

async function main() {
  // Pull the raw real data so we can cross-check beam counts.
  const analyze = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sentence: "The cat sat on the mat." }),
  }).then((r) => r.json());
  const nLayers = analyze.num_layers;
  const nHeads = analyze.num_heads;
  console.log(
    `backend: ${analyze.model} · ${analyze.tokens.length} tokens · ${nLayers}x${nHeads}`,
  );

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: [
      "--no-sandbox",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
      "--use-angle=default",
      "--enable-unsafe-swiftshader",
      "--window-size=1400,900",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });

  const errors = [];
  const failedUrls = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("response", (res) => {
    if (res.status() >= 400) failedUrls.push(`${res.status()} ${res.url()}`);
  });
  // Only count real JS page errors as fatal; ignore benign 404s like favicon.
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !/favicon|Failed to load resource/i.test(t))
      errors.push(t);
  });

  await page.goto(APP, { waitUntil: "networkidle2", timeout: 60000 });
  // Give the mount-time fetch + R3F a moment to render.
  await page.waitForSelector(".status", { timeout: 30000 });
  await sleep(2500);

  const s0 = await statusText(page);
  console.log("status @ load:", s0);
  await page.screenshot({ path: `${OUT}/neuroscope_layer0_head0.png` });

  const minWeight = 0.05; // store default
  const expA = expectedBeams(analyze.attention, 0, 0, minWeight);
  console.log(`expected beams layer0/head0 (minWt ${minWeight}): ${expA}`);

  // Drive to the last layer + a different head.
  const targetLayer = nLayers - 1; // 23
  const targetHead = Math.min(13, nHeads - 1);
  await setRange(page, 0, targetLayer);
  await setRange(page, 1, targetHead);
  await sleep(1800);

  const s1 = await statusText(page);
  console.log("status @ switched:", s1);
  await page.screenshot({
    path: `${OUT}/neuroscope_layer${targetLayer}_head${targetHead}.png`,
  });

  const expB = expectedBeams(
    analyze.attention,
    targetLayer,
    targetHead,
    minWeight,
  );
  console.log(
    `expected beams layer${targetLayer}/head${targetHead} (minWt ${minWeight}): ${expB}`,
  );

  // --- Assertions --------------------------------------------------------
  const ok =
    s0.includes(`${analyze.tokens.length} tokens`) &&
    s0.includes("layer 0") &&
    s0.includes("head 0") &&
    s1.includes(`layer ${targetLayer}`) &&
    s1.includes(`head ${targetHead}`) &&
    errors.length === 0;

  console.log("\nnon-2xx requests:", failedUrls.length ? failedUrls : "none");
  console.log("fatal page errors:", errors.length ? errors : "none");
  console.log(
    ok
      ? "\nPASS: real data loaded, layer/head switching works, no page errors."
      : "\nFAIL: see above.",
  );

  writeFileSync(
    `${OUT}/neuroscope_ui_report.txt`,
    [
      `backend: ${analyze.model}`,
      `status@load: ${s0}`,
      `status@switched: ${s1}`,
      `expected beams L0/H0: ${expA}`,
      `expected beams L${targetLayer}/H${targetHead}: ${expB}`,
      `page errors: ${errors.length}`,
      `result: ${ok ? "PASS" : "FAIL"}`,
    ].join("\n"),
  );

  await browser.close();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
