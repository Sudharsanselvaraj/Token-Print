/**
 * explorer.spec.ts
 *
 * CI port of tools/verify_explorer.mjs + tools/verify_formulas.mjs
 *
 * Verifies the v2 UI:
 * - The Architecture (explorer) mode loads model stats from the live backend.
 * - Clicking a tensor row selects it (inspection highlight) without errors.
 * - File upload with a minimal GGUF fixture reaches the parser without crashing.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

const TINY_GGUF = path.resolve(__dirname, "../../../fixtures/models/tiny.gguf");

async function selectTensor(page: Page, filter: string) {
  const searchBox = page.locator(".tensor-search");
  await searchBox.fill(filter);
  await page.waitForTimeout(300);
  await page.locator(".tensor-row").first().click();
  await page.waitForTimeout(500);
  return page.locator(".tensor-row.selected").count();
}

test.describe("Explorer — real backend data", () => {
  test("model loads, tensor rows are selectable", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/", { waitUntil: "load" });
    // Wait for the tensor list to populate (real /architecture call).
    await page.waitForSelector(".tensor-row", { timeout: 60_000 });
    // Model name in the top bar reflects the live backend's metadata.
    await page.waitForSelector(".tstat.name", { timeout: 10_000 });

    await expect(page.locator(".mode-tab.active")).toHaveText("Architecture");
    expect(await page.locator(".tensor-row").count()).toBeGreaterThan(0);

    // Screenshot of initial explorer state.
    await expect(page).toHaveScreenshot("explorer-default.png");

    // Clicking a row highlights it as the inspected tensor.
    const selected = await selectTensor(page, "layernorm");
    expect(selected).toBeGreaterThan(0);

    await expect(page).toHaveScreenshot("explorer-selected.png");
    expect(errors).toHaveLength(0);
  });

  test("GGUF file upload does not crash (tiny fixture)", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.waitForSelector(".tensor-row", { timeout: 60_000 });

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    const input = page.locator('input[type="file"][accept=".gguf"]');
    await input.setInputFiles(TINY_GGUF);
    await page.waitForTimeout(2_000);

    // The tiny fixture has 0 tensors; we just assert no uncaught exception.
    expect(errors).toHaveLength(0);
  });
});