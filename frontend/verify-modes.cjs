const { chromium } = require("playwright");

const URL = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MODE_CHECKS = {
  explorer: {
    left: ["VIEWS", "LAYERS", "TOKENS", "TENSOR CATALOG"],
    right: ["Input Embeddings"],
    leakHidden: [],
  },
  generation: {
    left: ["GENERATION", "GENERATION STATE", "TOKENS", "KV CACHE", "MODE", "TEMPERATURE", "TOP-K", "TOP-P", "MAX TOKENS", "GENERATE", "ADVANCED DECODES"],
    right: ["ready to run inference"],
    leakHidden: ["VIEWS"],
    bodyNeeded: ["INPUT", "EMBEDDING", "LAYERS", "LM HEAD", "LOGITS", "NEXT TOKEN"],
  },
  walkthrough: {
    left: ["chapters", "overview", "tokenization", "embedding", "self-attention", "playback"],
    right: ["WALKTHROUGH"],
    leakHidden: ["VIEWS", "TENSOR CATALOG"],
  },
  debugger: {
    left: ["DEBUGGER", "OVERVIEW", "ANALYSIS", "INTERVENTIONS", "TRACE", "MODEL"],
    right: [],
    rightHidden: true,
    leakHidden: [],
    bodyNeeded: ["Breakpoints", "Anomaly Sentinels", "Head × Head Similarity"],
  },
};

async function main() {
  const browser = await chromium.launch();
  const results = [];

  for (const [mode, checks] of Object.entries(MODE_CHECKS)) {
    for (const vp of [
      { w: 1672, h: 941 },
      { w: 1280, h: 800 },
    ]) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200));
      });

      await page.goto(`${URL}/app/?mode=${mode}`, { waitUntil: "domcontentloaded" });
      await sleep(3000);

      const left = page.locator(".left-sidebar").first();
      const right = page.locator(".rightpanel").first();
      const canvas = page.locator(".canvas-area").first();

      const leftVisible = await left.isVisible();
      const rightVisible = checks.rightHidden ? false : await right.isVisible();
      const rightCount = await page.locator(".rightpanel").count();
      const leftText = leftVisible ? (await left.innerText()).toLowerCase() : "";
      const rightText = rightVisible ? (await right.innerText()).toLowerCase() : "";
      const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();

      const missingLeft = checks.left.filter((s) => !leftText.includes(s.toLowerCase()));
      const missingRight = checks.right.filter((s) => !rightText.includes(s.toLowerCase()));
      const leaked = checks.leakHidden.filter((s) => leftText.includes(s.toLowerCase()));
      const hiddenInBody = (checks.bodyHidden || []).filter((s) => bodyText.includes(s.toLowerCase()));
      const neededInBody = (checks.bodyNeeded || []).filter((s) => !bodyText.includes(s.toLowerCase()));

      // geometry
      const side = leftVisible ? await left.boundingBox() : null;
      const rspanel = rightVisible ? await right.boundingBox() : null;
      const can = await canvas.boundingBox();
      let geoOk;
      if (checks.rightHidden) {
        geoOk =
          side && Math.abs(side.width - 300) < 2 &&
          rightCount === 0 &&
          can && Math.abs(can.x - 300) < 2 &&
          Math.abs(can.width - (vp.w - 300)) < 2;
      } else {
        const expectCanvas = vp.w - 300 - 360;
        geoOk =
          side && Math.abs(side.width - 300) < 2 &&
          rspanel && Math.abs(rspanel.width - 360) < 2 &&
          can && Math.abs(can.x - 300) < 2 &&
          Math.abs(can.width - expectCanvas) < 2;
      }

      const header = await page.locator(".global-nav").first().innerText().catch(() => "");
      const headerOk = header.toLowerCase().includes("generation");

      const rightOk = checks.rightHidden ? rightCount === 0 : rightVisible;
      results.push({
        mode,
        vp,
        ok: leftVisible && rightOk && missingLeft.length === 0 && missingRight.length === 0 && leaked.length === 0 && hiddenInBody.length === 0 && neededInBody.length === 0 && geoOk && headerOk,
        missingLeft,
        missingRight,
        leaked,
        hiddenInBody,
        neededInBody,
        geoOk,
        headerOk,
        leftVisible,
        rightVisible,
        errors: errors.slice(0, 3),
      });

      await ctx.close();
    }
  }

  // interaction: walkthrough next via bottom bar + global-header mode switch
  {
    const ctx = await browser.newContext({ viewport: { width: 1672, height: 941 } });
    const page = await ctx.newPage();
    await page.goto(`${URL}/app/?mode=walker`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.goto(`${URL}/app/?mode=walkthrough`, { waitUntil: "domcontentloaded" });
    await sleep(2500);
    const ch1 = await page.locator(".rightpanel").first().innerText();
    const bodyBefore = await page.evaluate(() => document.body.innerText);
    await page.locator('button[title="Next chapter (→)"]').first().click();
    await sleep(600);
    const ch2 = await page.locator(".rightpanel").first().innerText();
    const insertOk = /CH 2\/7/.test(ch2) && !/CH 1\/7/.test(ch2);

    // bottom bar chapter readout advances too
    const bodyAfter = await page.evaluate(() => document.body.innerText);
    const barOk = /CHAPTER 02\/07/.test(bodyAfter) && /CHAPTER 01\/07/.test(bodyBefore);

    // header switch explorer -> generation
    await page.goto(`${URL}/app/`, { waitUntil: "domcontentloaded" });
    await sleep(2500);
    const before = await page.locator(".left-sidebar").first().innerText();
    await page.locator(".global-nav a:has-text('Generation')").first().click();
    await sleep(2500);
    const after = await page.locator(".left-sidebar").first().innerText();
    const switchOk = !before.toLowerCase().includes("generation") && after.toLowerCase().includes("generation");
    results.push({ mode: "interaction", vp: { w: 1672, h: 941 }, ok: insertOk && barOk && switchOk, insertOk, barOk, switchOk, errors: [] });
    await ctx.close();
  }

  // generation: sampling mode enables sliders, GENERATE present, workspace overlay labels
  {
    const ctx = await browser.newContext({ viewport: { width: 1672, height: 941 } });
    const page = await ctx.newPage();
    await page.goto(`${URL}/app/?mode=generation`, { waitUntil: "domcontentloaded" });
    await sleep(3000);

    const idleRight = await page.locator(".rightpanel").first().innerText();
    const idleOk = /ready to run inference/i.test(idleRight);

    const tempSlider = page.locator('.left-sidebar input[type="range"]').nth(0);
    const sliderDisabledAtStart = await tempSlider.isDisabled();

    await page.locator(".left-sidebar button:has-text('Sampling')").first().click();
    await sleep(400);
    const sliderEnabledAfter = !(await tempSlider.isDisabled());

    const leftText = await page.locator(".left-sidebar").first().innerText();
    const generateBtn = /generate →/i.test(leftText) || /generate/i.test(leftText);
    const labelsOk = /temperature/i.test(leftText) && /max tokens/i.test(leftText);

    const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    const stepperOk =
      bodyText.includes("embedding") && bodyText.includes("lm head") &&
      bodyText.includes("logits") && bodyText.includes("next token");

    const genInteractOk = idleOk && sliderDisabledAtStart && sliderEnabledAfter && generateBtn && labelsOk && stepperOk;
    results.push({
      mode: "generation-interact",
      vp: { w: 1672, h: 941 },
      ok: genInteractOk,
      idleOk,
      sliderDisabledAtStart,
      sliderEnabledAfter,
      generateBtn,
      labelsOk,
      stepperOk,
      errors: [],
    });
    await ctx.close();
  }

  // debugger tool click focuses the dashboard tile, keeps canvas, no right panel
  {
    const ctx = await browser.newContext({ viewport: { width: 1672, height: 941 } });
    const page = await ctx.newPage();
    await page.goto(`${URL}/app/?mode=debugger`, { waitUntil: "domcontentloaded" });
    await sleep(3000);
    const canvasBefore = await page.locator(".canvas-area").first().boundingBox();
    const tile = page.locator('[data-dbg-tool="logit_lens"]').first();
    await page.locator(".left-sidebar button:has-text('Logit Lens')").first().click();
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-dbg-tool="logit_lens"]');
      return el && el.getBoundingClientRect().top >= 0 && el.getBoundingClientRect().bottom <= window.innerHeight;
    }, null, { timeout: 5000 });
    const hasFlash = (await tile.getAttribute("class") || "").includes("dbg-flash");
    const canvasAfter = await page.locator(".canvas-area").first().boundingBox();
    const rightCount = await page.locator(".rightpanel").count();
    const toolSwapOk =
      hasFlash && rightCount === 0 &&
      canvasBefore && canvasAfter &&
      Math.abs(canvasBefore.width - canvasAfter.width) < 2 &&
      Math.abs(canvasBefore.x - canvasAfter.x) < 2;
    results.push({ mode: "debugger-tool-swap", vp: { w: 1672, h: 941 }, ok: toolSwapOk, toolSwapOk, hasFlash, rightCount, errors: [] });
    await ctx.close();
  }

  await browser.close();

  let fails = 0;
  for (const r of results) {
    const tag = r.ok ? "PASS" : "FAIL";
    if (!r.ok) fails++;
    console.log(`[${tag}] ${r.mode} ${r.vp.w}x${r.vp.h}`);
    if (!r.ok) console.log("   ", JSON.stringify({ missingLeft: r.missingLeft, missingRight: r.missingRight, leaked: r.leaked, geoOk: r.geoOk, headerOk: r.headerOk, leftVisible: r.leftVisible, rightVisible: r.rightVisible, insertOk: r.insertOk, switchOk: r.switchOk, errors: r.errors }, null, 2));
  }
  console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILURES`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});