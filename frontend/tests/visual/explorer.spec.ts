/**
 * explorer.spec.ts
 *
 * CI port of tools/verify_explorer.mjs + tools/verify_formulas.mjs
 *
 * Verifies:
 * - The Architecture (explorer) mode loads model stats from the live backend.
 * - Clicking a tensor row (q_proj, input_layernorm, gate_proj) shows the
 *   correct architecture-aware formula titles (GQA, RMSNorm, SwiGLU).
 * - KaTeX formulas are rendered (at least one .katex element present).
 * - File upload with a minimal GGUF fixture reaches the parser without crashing.
 *   (The fixture has 0 tensors + 1 kv entry; we only assert no crash, not arch display.)
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const TINY_GGUF = path.resolve(__dirname, "../../../fixtures/models/tiny.gguf");

async function clickTensor(page: Page, filter: string) {
  const searchBox = page.locator(".tensor-search");
  await searchBox.click({ clickCount: 3 });
  await searchBox.type(filter);
  await page.waitForTimeout(400);
  await page.locator(".tensor-row").first().click();
  await page.waitForTimeout(700);
  return {
    formulas: await page
      .locator(".formula-title")
      .allTextContents()
      .then((ts) => ts.map((t) => t.trim())),
    katex: await page.locator(".formula .katex").count(),
  };
}

test.describe("Explorer & formulas — real backend data", () => {
  test("model loads, tensor inspection shows correct formulas", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Wait for the tensor list to populate (real backend call).
    await page.waitForSelector(".tensor-row", { timeout: 30_000 });
    await page.waitForTimeout(3_000);

    // Screenshot of initial explorer state.
    await expect(page).toHaveScreenshot("explorer-default.png");

    // Check architecture-aware formula rendering.
    const norm = await clickTensor(page, "input_layernorm");
    expect(norm.formulas).toContain("RMS Normalization");
    expect(norm.katex).toBeGreaterThan(0);

    const attn = await clickTensor(page, "q_proj.weight");
    expect(attn.formulas).toContain("Grouped-Query Attention");

    const mlp = await clickTensor(page, "gate_proj");
    expect(mlp.formulas).toContain("SwiGLU MLP");

    await expect(page).toHaveScreenshot("explorer-gate-proj.png");
  });

  test("GGUF file upload does not crash (tiny fixture)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector('input[type="file"]', { timeout: 30_000 });

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    const input = page.locator('input[type="file"]');
    await input.setInputFiles(TINY_GGUF);
    await page.waitForTimeout(2_000);

    // The tiny fixture has 0 tensors; we just assert no uncaught exception.
    expect(errors).toHaveLength(0);
  });
});
