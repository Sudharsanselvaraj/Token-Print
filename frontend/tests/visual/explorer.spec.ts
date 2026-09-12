/**
 * explorer.spec.ts
 *
 * CI port of tools/verify_explorer.mjs + tools/verify_formulas.mjs
 *
 * Verifies:
 * - The Architecture (explorer) mode loads model stats from the live backend.
 * - Clicking a tensor row selects it (inspection highlight) without errors.
 * - File upload with a minimal GGUF fixture reaches the parser without crashing.
 *   (The fixture has 0 tensors + 1 kv entry; we only assert no crash, not arch display.)
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

const TINY_GGUF = path.resolve(__dirname, "../../../fixtures/models/tiny.gguf");

async function selectTensor(page: Page, filter: string) {
  const searchBox = page.locator(".tensor-search");
  await searchBox.click({ clickCount: 3 });
  await searchBox.type(filter);
  await page.waitForTimeout(400);
  await page.locator(".tensor-row").first().click();
  await page.waitForTimeout(700);
  return await page
    .locator(".tensor-row.selected")
    .count();
}

test.describe("Explorer — real backend data", () => {
  test("model loads, tensor rows are selectable", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Wait for the tensor list to populate (real backend call).
    await page.waitForSelector(".tensor-row", { timeout: 30_000 });
    await page.waitForTimeout(3_000);

    // Screenshot of initial explorer state.
    await expect(page).toHaveScreenshot("explorer-default.png");

    // Clicking a row highlights it as the inspected tensor.
    const selected = await selectTensor(page, "input_layernorm");
    expect(selected).toBeGreaterThan(0);

    await expect(page).toHaveScreenshot("explorer-selected.png");
  });

  test("GGUF file upload does not crash (tiny fixture)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // The file input is hidden (native <input type=file>); wait for the node,
    // not for it to be "visible".
    await page.waitForSelector('input[type="file"]', {
      state: "attached",
      timeout: 30_000,
    });

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(TINY_GGUF);
    await page.waitForTimeout(2_000);

    // The tiny fixture has 0 tensors; we just assert no uncaught exception.
    expect(errors).toHaveLength(0);
  });
});
