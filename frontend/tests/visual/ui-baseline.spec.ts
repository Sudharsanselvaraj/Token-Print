/**
 * ui-baseline.spec.ts
 *
 * CI port of frontend/scripts/verify_ui.mjs
 *
 * Verifies:
 * - The default (explorer) view loads and the .status line reflects real data
 *   from the backend (/analyze endpoint).
 * - The layer and head sliders update the status line when changed.
 * - No fatal JS console errors occur during the page load.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect, type Page } from "@playwright/test";

const API = "http://localhost:8000/analyze";
const MIN_WEIGHT = 0.05;

/** Set a range input the React-friendly way (fires synthetic input event). */
async function setRange(page: Page, index: number, value: number) {
  await page.evaluate(
    ({ idx, val }: { idx: number; val: number }) => {
      const el = document.querySelectorAll(
        'input[type="range"]'
      )[idx] as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(el),
        "value"
      )!.set!;
      setter.call(el, String(val));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    { idx: index, val: value }
  );
}

test.describe("UI baseline — real data from backend", () => {
  test("status line reflects real token count, layer/head sliders work", async ({
    page,
  }) => {
    // Pull real data from the backend first so we can cross-check.
    const analyze = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: "The cat sat on the mat." }),
    }).then((r) => r.json());

    const nLayers: number = analyze.num_layers;
    const nHeads: number = analyze.num_heads;
    const tokenCount: number = analyze.tokens.length;
    console.log(
      `backend: ${analyze.model} · ${tokenCount} tokens · ${nLayers}×${nHeads}`
    );

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/favicon|Failed to load resource/i.test(m.text())
      ) {
        errors.push(m.text());
      }
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector(".status", { timeout: 30_000 });
    await page.waitForTimeout(2_500);

    const s0 = await page.$eval(".status", (el) => el.textContent!.trim());
    console.log("status @ load:", s0);

    // Status must mention the real token count and start at layer 0 / head 0.
    expect(s0).toContain(`${tokenCount} tokens`);
    expect(s0).toContain("layer 0");
    expect(s0).toContain("head 0");

    // Drive sliders to last layer + a different head.
    const targetLayer = nLayers - 1;
    const targetHead = Math.min(13, nHeads - 1);
    await setRange(page, 0, targetLayer);
    await setRange(page, 1, targetHead);
    await page.waitForTimeout(1_800);

    const s1 = await page.$eval(".status", (el) => el.textContent!.trim());
    console.log("status @ switched:", s1);
    expect(s1).toContain(`layer ${targetLayer}`);
    expect(s1).toContain(`head ${targetHead}`);

    expect(errors).toHaveLength(0);

    // Screenshot for visual diff baseline.
    await expect(page).toHaveScreenshot("ui-baseline.png");
  });
});
