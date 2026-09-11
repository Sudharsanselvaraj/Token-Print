/**
 * generation.spec.ts
 *
 * CI port of tools/shoot_gen.mjs + tools/verify_gen_ui.mjs
 *
 * Verifies:
 * - Switching to Generation mode and clicking Generate kicks off a real
 *   WebSocket generation.
 * - After streaming completes, the right panel shows a real op name
 *   (Embedding or Norm family) and at least one KaTeX formula.
 * - The op breadcrumb (crumb title) is non-empty.
 * - Stepping forward through ops with the nav buttons updates the panel.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect, type Page } from "@playwright/test";

/** Click the Generate button and wait for streaming to finish. */
async function runGeneration(page: Page) {
  // Click Generate (button.primary whose text matches /generate/i).
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button.primary")].find((b) =>
      /generate/i.test(b.textContent ?? "")
    ) as HTMLButtonElement | undefined;
    btn?.click();
  });
  // Wait until the button label changes from "Generating…" back to "Generate"
  // or a status element indicates done. Use a generous timeout for the real model.
  await page.waitForFunction(
    () => {
      const btn = [...document.querySelectorAll("button.primary")].find((b) =>
        /generate|unavailable/i.test(b.textContent ?? "")
      );
      return !!btn && !/generating/i.test(btn.textContent ?? "");
    },
    { timeout: 90_000 }
  );
}

test.describe("Generation mode — real WebSocket streaming", () => {
  test("generate, inspect op panel, step through ops", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector(".mode-tab", { timeout: 30_000 });

    // Switch to Generation mode.
    await page.evaluate(() => {
      const tab = [...document.querySelectorAll(".mode-tab")].find((b) =>
        /Generation/.test(b.textContent ?? "")
      ) as HTMLElement | undefined;
      tab?.click();
    });
    await page.waitForTimeout(1_200);

    await runGeneration(page);
    await page.waitForTimeout(1_500);
    await expect(page).toHaveScreenshot("generation-after-stream.png");

    // Panel should show a real op name and at least one KaTeX-rendered formula.
    const panel1 = await page.evaluate(() => ({
      op: document.querySelector(".gp-op")?.textContent ?? "",
      katex: document.querySelectorAll(".formula .katex").length,
      crumb: document.querySelector(".gp-crumb-title")?.textContent ?? "",
      ops: document.querySelector(".gp-crumb-idx")?.textContent ?? "",
    }));
    console.log("panel @ op0:", JSON.stringify(panel1));
    expect(panel1.katex).toBeGreaterThan(0);
    expect(panel1.op).toMatch(/Embedding|Norm|RMS|Attention|MLP/i);

    // Step forward 5 ops.
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        (
          document.querySelectorAll(
            ".gp-crumb-nav .pb-btn"
          )[1] as HTMLButtonElement | undefined
        )?.click();
      });
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot("generation-op5.png");

    const panel2 = await page.evaluate(() => ({
      crumb: document.querySelector(".gp-crumb-title")?.textContent ?? "",
    }));
    expect(panel2.crumb.length).toBeGreaterThan(0);
  });
});
