#!/usr/bin/env node
// verify-hf-explorer.cjs — acceptance probe for the Hugging Face Model Explorer overlay.
// Uses the local static server on http://localhost:3000 and intercepts
// /api/hf/* routes with deterministic fixtures so the happy-path covers:
//   • opening from sidebar button
//   • app shell remains visible behind a full-viewport fixed overlay
//   • curated model list, model detail panel, capability grid
//   • search hub with live query input
//   • close via X, close via Escape
//   • overlay is NOT mounted inside the left sidebar
// ───────────────────────────────────────────────────────────────────────────────

const { chromium } = require("playwright");

const BASE = "http://localhost:3000";

// ─── fixtures ─────────────────────────────────────────────────────────────────

const curatedFixture = {
  models: [
    {
      id: "Qwen/Qwen2.5-0.5B-Instruct",
      family: "qwen2",
      recommended: true,
      minimum_memory_gb: 1.2,
      description: "Small instruction-tuned Qwen model for chat.",
    },
    {
      id: "Qwen/Qwen2.5-7B-Instruct",
      family: "qwen2",
      recommended: true,
      minimum_memory_gb: 14.0,
      description: "7B instruction model with long context.",
    },
    {
      id: "HuggingFaceTB/SmolLM-135M-Instruct",
      family: "smollm",
      recommended: false,
      minimum_memory_gb: 0.3,
      description: "135M tiny model for quick tests.",
    },
  ],
};

const inspectQwen05 = {
  model_id: "Qwen/Qwen2.5-0.5B-Instruct",
  revision: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  architecture: "Qwen2ForCausalLM",
  model_type: "qwen2",
  parameter_count: 494030000,
  max_context_length: 32768,
  estimated_vram_gb: 1.1,
  estimation_basis: "params × fp16 dtype + overhead",
  compatibility_level: "High",
  compatibility_reason: "Full native instrumentation available (Attention, Hidden States, Logit Lens, Ablation).",
  capabilities: {
    supports_attention:   { supported: true,  confidence: "high",     reason: "Attention layer outputs captured directly from the model." },
    supports_hidden_states:{ supported: true, confidence: "high",     reason: "Hidden states accessible via model hooks." },
    supports_logit_lens:  { supported: true,  confidence: "high",     reason: "Logit lens available from hidden states + head projection." },
    supports_head_ablation:{ supported: true, confidence: "medium",   reason: "Ablatable per-head via weight masking." },
    supports_layer_ablation:{ supported: true, confidence: "medium",  reason: "Layer output substitution supported." },
    supports_activation_patch:{ supported: false, confidence: "medium", reason: "Activation patching requires bidirectional hooks; causal-only." },
    vram_estimate:        { supported: true,  confidence: "high",     reason: "Estimated from parameter count and dtype." },
  },
};

const inspectQwen7B = {
  ...inspectQwen05,
  model_id: "Qwen/Qwen2.5-7B-Instruct",
  revision: "deadbeef0123456789abcdef",
  parameter_count: 7600000000,
  max_context_length: 131072,
  estimated_vram_gb: 14.2,
  compatibility_reason: "Full native instrumentation available (Attention, Hidden States, Logit Lens, Ablation).",
  capabilities: {
    ...inspectQwen05.capabilities,
    supports_head_ablation: { supported: false, confidence: "low", reason: "Ablation not supported for grouped-query attention." },
  },
};

const inspectMap = {
  "Qwen/Qwen2.5-0.5B-Instruct": inspectQwen05,
  "Qwen/Qwen2.5-7B-Instruct": inspectQwen7B,
  "HuggingFaceTB/SmolLM-135M-Instruct": {
    ...inspectQwen05,
    model_id: "HuggingFaceTB/SmolLM-135M-Instruct",
    revision: "abcdef1234567890abcdef1234567890",
    architecture: "GPT2LMHeadModel",
    model_type: "llama",
    parameter_count: 135000000,
    max_context_length: 2048,
    estimated_vram_gb: 0.3,
    compatibility_level: "Partial",
    compatibility_reason: "Basic inference / limited activation extraction.",
    capabilities: {
      ...inspectQwen05.capabilities,
      supports_hidden_states:  { supported: false, confidence: "low", reason: "Internal hooks not exposed by this architecture." },
      supports_logit_lens:     { supported: false, confidence: "low", reason: "Hidden states unavailable." },
      supports_head_ablation:  { supported: false, confidence: "low", reason: "Head masking not supported." },
      supports_layer_ablation: { supported: false, confidence: "low", reason: "Layer substitution not supported." },
      supports_activation_patch:{ supported: false, confidence: "low", reason: "Activation patching not supported." },
    },
  },
};

const searchFixture = {
  query: "qwen",
  limit: 12,
  models: [
    { id: "Qwen/Qwen2.5-0.5B-Instruct", author: "Qwen",  downloads: 15000000, likes: 3200, tags: ["qwen2","text-generation"], pipeline_tag: "text-generation", last_modified: "2025-01-01T00:00:00Z", private: false },
    { id: "Qwen/Qwen2.5-7B-Instruct",   author: "Qwen",  downloads: 8000000,  likes: 2100, tags: ["qwen2","text-generation"], pipeline_tag: "text-generation", last_modified: "2025-01-01T00:00:00Z", private: false },
  ],
};

// ─── helpers ──────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${label}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${label}`);
  }
}

function assertEq(actual, expected, label) {
  const ok = actual === expected;
  if (!ok) {
    failed++;
    console.error(`  [FAIL] ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else {
    passed++;
    console.log(`  [PASS] ${label}`);
  }
}

async function visible(page, selector, timeout = 8000) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // ─── route interception (register catch-all FIRST; specific routes LAST) ──
  await page.route("**/api/**", (r) => r.fulfill({ status: 200, json: {} }));
  await page.route("**/api/hf/curated", (r) => r.fulfill({ json: curatedFixture }));
  await page.route("**/api/hf/search*", (r) => {
    const url = new URL(r.request().url());
    const q = (url.searchParams.get("query") || "").toLowerCase();
    const models = q ? searchFixture.models.filter((m) => m.id.toLowerCase().includes(q)) : [];
    return r.fulfill({ json: { ...searchFixture, models } });
  });
  await page.route("**/api/hf/inspect*", (r) => {
    const url = new URL(r.request().url());
    const modelId = url.searchParams.get("model_id") || "Qwen/Qwen2.5-0.5B-Instruct";
    const data = inspectMap[modelId] || inspectQwen05;
    return r.fulfill({ json: data });
  });

  console.log("[hf-explorer] loading /app/?mode=explorer …");
  await page.goto(`${BASE}/app/?mode=explorer`, { waitUntil: "networkidle", timeout: 30000 });
  console.log("[hf-explorer] page loaded");

  // ─── open explorer from HF Models button ──────────────────────────────
  await visible(page, ".left-sidebar");
  await visible(page, 'button:has-text("HF Models")');
  await page.locator('button:has-text("HF Models")').click();

  try {
    await visible(page, ".hf-explorer-backdrop", 8000);
  } catch (err) {
    console.error("[hf-explorer] modal never appeared — aborting");
    await browser.close();
    process.exit(1);
  }

  await visible(page, ".hf-explorer-panel");

  // 1. overlay sits at app level, NOT inside .left-sidebar
  const sidebarContainsModal = await page.evaluate(
    () => !!document.querySelector(".left-sidebar")?.contains(document.querySelector(".hf-explorer-panel"))
  );
  assert(!sidebarContainsModal, "HF explorer renders OUTSIDE the left sidebar (app level)");

  // 2. modal covers viewport, is centered, sized ~65-75% vw and ~65-70% vh
  const vp = page.viewportSize();
  const box = await page.locator(".hf-explorer-panel").boundingBox();
  const wPct = box.width / vp.width;
  const hPct = box.height / vp.height;
  assert(wPct >= 0.60 && wPct <= 0.80, `panel width ~${(wPct * 100).toFixed(1)}% of viewport (expect 60-80%)`);
  assert(hPct >= 0.58 && hPct <= 0.82, `panel height ~${(hPct * 100).toFixed(1)}% of viewport (expect 58-82%)`);
  const centered = Math.abs((box.x + box.width / 2) - vp.width / 2) < 60;
  assert(centered, "panel is horizontally centered");

  // 3. backdrop dims + blurs the background
  const backdropBg = await page.locator(".hf-explorer-backdrop").evaluate((el) =>
    getComputedStyle(el).backgroundColor
  );
  assert(backdropBg !== "rgba(0, 0, 0, 0)" && backdropBg !== "transparent", `backdrop has translucent background: ${backdropBg}`);
  const backdropBlur = await page.locator(".hf-explorer-backdrop").evaluate((el) =>
    getComputedStyle(el).backdropFilter
  );
  assert(backdropBlur.includes("blur"), `backdrop has blur: ${backdropBlur}`);

  // 4. app shell still mounted behind the overlay
  assert(await page.locator(".left-sidebar").count() > 0, "left sidebar still exists behind the modal");

  // ─── curated model list ───────────────────────────────────────────────
  await visible(page, 'text=RECOMMENDED COMPATIBLE MODELS');
  await visible(page, 'text=Qwen/Qwen2.5-0.5B-Instruct');
  await visible(page, 'text=Qwen/Qwen2.5-7B-Instruct');

  // ─── default model detail ─────────────────────────────────────────────
  await visible(page, 'text=Qwen2ForCausalLM');          // architecture
  await visible(page, 'text=TokenPrint Compatibility:');
  await visible(page, 'text=Full native instrumentation');
  await visible(page, 'text=PARAMS');
  await visible(page, 'text=MAX CONTEXT');
  await visible(page, 'text=EST. VRAM');

  const caps = [
    "ATTENTION", "HIDDEN STATES", "LOGIT LENS", "HEAD ABLATION",
    "LAYER ABLATION", "ACTIVATION PATCH", "VRAM ESTIMATE",
  ];
  for (const cap of caps) {
    await visible(page, `text=${cap}`, 4000);
  }

  // 5. select second model via curated list → right panel updates
  await page.locator('div[role="button"]:has-text("Qwen/Qwen2.5-7B-Instruct")').click();
  await page.waitForTimeout(600);
  assert(
    await page.locator('text=deadbe…cdef').count() > 0,
    "clicking second model updates detail (shows revision SHA fragment)"
  );
  assert(
    await page.locator('text=131,072 tokens').count() > 0,
    "second model shows updated context length"
  );

  // 6. search hub
  await page.locator('button:has-text("Search Hub")').click();
  await visible(page, 'input[placeholder*="Search Hugging Face"]');
  await page.locator('input[placeholder*="Search Hugging Face"]').fill("qwen");
  await page.waitForTimeout(800);
  await visible(page, 'div[role="button"]:has-text("Qwen/Qwen2.5-0.5B-Instruct")');

  // select a search result
  await page.locator('div[role="button"]:has-text("Qwen/Qwen2.5-7B-Instruct")').click();
  await page.waitForTimeout(600);
  assert(
    await page.locator('text=Qwen2ForCausalLM').count() > 0,
    "search result click loads model details"
  );

  // 7. footer actions present
  await visible(page, 'button:has-text("Run in Cloud")');
  assert(
    (await page.locator('button:has-text("Run in Cloud")').count()) > 0,
    "Run in Cloud button present"
  );
  assert(
    (await page.locator('button:has-text("Use Locally")').count()) > 0,
    "Use Locally button present"
  );

  // ─── close via X ──────────────────────────────────────────────────────
  await page.locator('button[aria-label="Close"]').click();
  await page.locator(".hf-explorer-backdrop").waitFor({ state: "detached", timeout: 5000 });
  assert(
    (await page.locator(".hf-explorer-backdrop").count()) === 0,
    "clicking X closes the modal"
  );
  assert(
    (await page.locator(".left-sidebar").count()) > 0,
    "sidebar remains after modal close"
  );

  // ─── close via Escape ─────────────────────────────────────────────────
  await page.locator('button:has-text("HF Models")').click();
  await visible(page, ".hf-explorer-backdrop", 8000);
  await page.keyboard.press("Escape");
  await page.locator(".hf-explorer-backdrop").waitFor({ state: "detached", timeout: 5000 });
  assert(
    (await page.locator(".hf-explorer-backdrop").count()) === 0,
    "Escape key closes the modal"
  );

  // ─── closing restores exact previous app state ────────────────────────
  assert(
    (await page.locator(".left-sidebar").count()) > 0,
    "sidebar undisturbed after Escape close"
  );

  // 8. panel border + radius + monochrome
  const panelStyles = await page.locator('button:has-text("HF Models")').click().then(() => visible(page, ".hf-explorer-panel")).then(() =>
    page.locator(".hf-explorer-panel").evaluate((el) => ({
      borderColor: getComputedStyle(el).borderColor,
      borderRadius: getComputedStyle(el).borderRadius,
    }))
  );
  assert(panelStyles.borderRadius === "8px", `panel border-radius is 8px (got ${panelStyles.borderRadius})`);
  assert(panelStyles.borderColor !== "rgba(0, 0, 0, 0)", "panel has visible border");

  // close final modal
  await page.keyboard.press("Escape");
  await page.locator(".hf-explorer-backdrop").waitFor({ state: "detached", timeout: 5000 });

  console.log(`\n[hf-explorer] ${passed} passed, ${failed} failed\n`);
  await browser.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error("[hf-explorer] UNEXPECTED:", err);
  process.exit(1);
});
