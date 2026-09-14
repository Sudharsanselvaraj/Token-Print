// Walkthrough 3D camera acceptance probe.
//
// Intercepts /architecture + /analyze with a small architecture fixture so the
// real store flow (fetchArchitecture -> analyze -> WalkthroughScene mounts the
// TransformerStack + camera controller) runs end-to-end in a static export.
// Then drives all 7 chapters and asserts:
//   - camera mode is authoritative CINEMATIC across chapter transitions
//   - the ANCHOR goal re-frames each chapter (changes every transition)
//   - the CAM pos visibly moves on every transition (continuous journey)
//   - the camera never sits inside the geometry (cam->look distance > 3)
//   - overview framing resolves from real world anchor bounds (anchors exist)
//
// Run with:  node verify-wt-camera.cjs   (requires static server on :3000)

const { chromium } = require("playwright");

const URL = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHAPTER_IDS = ["overview", "tokenizer", "embedding", "norm", "attention", "mlp", "softmax"];

const ARCH = {
  source: "model",
  model: "Qwen2.5-0.5B-Instruct (fixture)",
  device: "cpu",
  tensor_count: 1,
  tensors: [{ name: "model.embed_tokens.weight", shape: [32000, 64], dtype: "F32", role: "weight", dims: 2 }],
  metadata: {
    architecture: "Qwen2ForCausalLM",
    name: "Qwen2.5-0.5B-Instruct",
    total_params: 494032768,
    num_layers: 6,
    hidden_size: 64,
    num_heads: 4,
    num_kv_heads: 2,
    head_dim: 16,
    ffn_size: 128,
    vocab_size: 32000,
    context_length: 32768,
    rope_theta: 1000000,
  },
};

function analyzeFixture() {
  const words = ["The", " cat", " sat", " on", " the", " mat", "."];
  const tokens = words.map((w, i) => ({ index: i, text: w.trim(), piece: w, id: 100 + i, is_special: false }));
  const n = words.length;
  const attention = [];
  for (let L = 0; L < 6; L++) {
    const heads = [];
    for (let h = 0; h < 4; h++) {
      const rows = [];
      for (let f = 0; f < n; f++) {
        const row = [];
        let acc = 0;
        for (let t = 0; t < n; t++) {
          const v = Math.exp((t <= f ? 0.5 : 0.1) * (1 + (h % 2) * 0.2));
          row.push(v);
          acc += v;
        }
        rows.push(row.map((v) => +(v / acc).toFixed(4)));
      }
      heads.push(rows);
    }
    attention.push(heads);
  }
  const logitLens = [];
  const top = [
    { text: "mat", token_id: 105, prob: 0.21 },
    { text: "the", token_id: 101, prob: 0.16 },
    { text: " sat", token_id: 102, prob: 0.12 },
    { text: " on", token_id: 103, prob: 0.09 },
    { text: ".", token_id: 106, prob: 0.07 },
  ];
  for (let L = 0; L <= 6; L++) {
    const layer = [];
    for (let p = 0; p < n; p++) layer.push(top.map((t) => ({ ...t })));
    logitLens.push(layer);
  }
  return {
    sentence: "The cat sat on the mat.",
    model: "Qwen2.5-0.5B-Instruct (fixture)",
    device: "cpu",
    mode: "causal_lm",
    model_type: "qwen2",
    num_layers: 6,
    num_heads: 4,
    hidden_size: 64,
    tokens,
    attention,
    embeddings_3d: tokens.map((_, i) => [i * 1.4 - 4.2, Math.sin(i), 0]),
    hidden_states_3d: { "0": tokens.map((_, i) => [i * 1.4 - 4.2, Math.cos(i), 0]) },
    embedding_norms: tokens.map(() => 1.0),
    projection: { method: "pca", note: "fixture", embedding_explained_variance: [] },
    logit_lens: logitLens,
  };
}

function parseDebug(text) {
  const g = (re) => {
    const m = text.match(re);
    return m ? m[1] : null;
  };
  const arr = (s) => (s ? s.split(",").map((v) => parseFloat(v)) : null);
  return {
    ch: g(/^CH\s+(\S+)/),
    anchor: arr(g(/ANCHOR goal\s+\[([^\]]+)\]/)),
    cam: arr(g(/CAM pos\s+\[([^\]]+)\]/)),
    tgt: arr(g(/TGT look\s+\[([^\]]+)\]/)),
    mode: g(/MODE\s+(\w+)/),
  };
}

const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const distToTgt = (cam, tgt) => (cam && tgt ? dist(cam, tgt) : NaN);

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1672, height: 941 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200));
  });

  await page.route("**/architecture", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ARCH) }));
  await page.route("**/analyze", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(analyzeFixture()) }));

  await page.goto(`${URL}/app/?mode=walkthrough`, { waitUntil: "domcontentloaded" });
  await sleep(4000);

  // Debug overlay on via the D shortcut (window keydown, ignores inputs).
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true })));
  await sleep(300);

  const debugDiv = () => page.locator("#wt-debug");
  const visible = await debugDiv().isVisible().catch(() => false);
  if (!visible) {
    throw new Error("Debug overlay (#wt-debug) did not become visible after pressing D");
  }

  const initial = parseDebug(await debugDiv().innerText());
  const overview = {
    ok: initial.ch === "OVERVIEW" && initial.mode === "CINEMATIC",
    ch: initial.ch,
    mode: initial.mode,
    anchor: initial.anchor,
    cam: initial.cam,
  };
  const steps = [];
  let prev = initial;
  for (let i = 0; i < CHAPTER_IDS.length - 1; i++) {
    await page.locator('button[title="Next chapter (→)"]').first().click();
    await sleep(650);
    const cur = parseDebug(await debugDiv().innerText());
    const moved = prev.cam && cur.cam ? dist(prev.cam, cur.cam) : -1;
    const reframed = prev.anchor && cur.anchor ? dist(prev.anchor, cur.anchor) > 0.01 : false;
    steps.push({
      idx: i + 1,
      mode: cur.mode,
      moved: +moved.toFixed(2),
      reframed,
      camToTgt: +(distToTgt(cur.cam, cur.tgt) || -1).toFixed(2),
      anchorGone: !cur.anchor || (cur.anchor.every((v) => v === 0)),
    });
    prev = cur;
  }

  const final = parseDebug(await debugDiv().innerText());

  // ── Autoplay: crank speed to 4×, start play, watch camera move across transitions
  // Reset to chapter 0 via the sidebar chapter list (more reliable than keyboard).
  await page.locator("button", { hasText: "Overview" }).first().click();
  await sleep(400);
  // Cycle speed button 3 times: 0.5× → 1× → 2× → 4×
  const speedBtn = page.locator('button[title="Playback speed"]').first();
  for (let i = 0; i < 3; i++) await speedBtn.click();
  await sleep(200);
  await page.locator('button[title="Play / Pause (Space)"]').first().click();
  const autoplay = { samples: [], movedTransitions: 0, started: Date.now() };
  let lastCam = null;
  for (let i = 0; i < 14; i++) {
    await sleep(900);
    const cur = parseDebug(await debugDiv().innerText());
    if (cur.cam) {
      if (lastCam && dist(lastCam, cur.cam) > 0.5) autoplay.movedTransitions++;
      lastCam = cur.cam;
      autoplay.samples.push({ i, mode: cur.mode, ch: cur.ch, cam: cur.cam.slice(0, 3) });
    }
  }
  autoplay.lastCh = autoplay.samples.length ? autoplay.samples[autoplay.samples.length - 1].ch : null;
  autoplay.totalSpan = ((Date.now() - autoplay.started) / 1000).toFixed(1);

  // ── MANUAL override: user orbit → MANUAL; next chapter → back to CINEMATIC
  const canvas = page.locator(".canvas-area").first();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2 + 120, { steps: 6 });
  await page.mouse.up();
  await sleep(400);
  const manualMode = parseDebug(await debugDiv().innerText()).mode;
  await page.locator('button[title="Next chapter (→)"]').first().click().catch(() => {});
  await sleep(500);
  const afterChapter = parseDebug(await debugDiv().innerText());
  const manualOk = manualMode === "MANUAL" && afterChapter.mode === "CINEMATIC";

  await browser.close();

  const steppedOk =
    steps.length === 6 &&
    steps.every((s) => s.mode === "CINEMATIC" && s.moved > 0.5 && s.reframed && s.camToTgt > 3 && !s.anchorGone);
  const autoplayOk = autoplay.movedTransitions >= 2;
  const errorsOk = errors.length === 0;

  const ok = overview.ok && steppedOk && autoplayOk && errorsOk;
  console.log("[%s] walkthrough-camera", ok ? "PASS" : "FAIL");
  console.log("  overview :", JSON.stringify(overview));
  console.log("  steps    :", JSON.stringify(steps, null, 2));
  console.log("  autoplay :", JSON.stringify({ movedTransitions: autoplay.movedTransitions, lastCh: autoplay.lastCh, span: autoplay.totalSpan }));
  console.log("  errors   :", errors.length ? errors.slice(0, 4) : "none");
  if (!autoplayOk) console.log("  NOTE: autoplay reached chapter", autoplay.lastCh, "— if it stayed on the first chapter, the 4.2s/chapter timer did not advance within the sampling window.");

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});