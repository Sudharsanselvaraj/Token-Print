/**
 * generation.spec.ts
 *
 * v2 generation-mode smoke test. The current v2 UI has an inline prompt
 * + GENERATE button for live WebSocket generation. This test verifies:
 *   - Generation mode mounts with its controls (prompt textarea, generate button).
 *   - Loading a trace in explorer mode does NOT hijack the route into generation.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect } from "@playwright/test";
import * as path from "path";

const DEMO_TRACE = path.resolve(
  __dirname,
  "../../public/demo/hello-world.json"
);

test.describe("Generation mode — workspace renders and route isolation", () => {
  test("generation mode mounts with controls; loading a trace stays on the current route", async ({
    page,
  }) => {
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

    // Direct open of the Generation route mounts the generation workspace.
    await page.goto("/app?mode=generation", { waitUntil: "load" });
    await expect(page.locator(".app.mode-generation")).toBeVisible({ timeout: 60_000 });

    // Generation controls are present.
    await expect(page.locator("textarea")).toBeVisible();
    await expect(page.locator("button", { hasText: "GENERATE" })).toBeVisible();

    // Navigate to Architecture — must switch cleanly.
    await page.locator(".landing-nav-item", { hasText: "Architecture" }).first().click();
    await expect(page.locator(".app.mode-explorer")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".app.mode-generation")).toHaveCount(0);

    // Upload a trace from the explorer sidebar. loadTrace must NOT hijack the
    // route into generation mode (the original v2 regression).
    const traceInput = page.locator('input[type="file"][accept=".json"]').first();
    await traceInput.setInputFiles(DEMO_TRACE);
    await page.waitForTimeout(2_000);
    await expect(page.locator(".app.mode-explorer")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".app.mode-generation")).toHaveCount(0);

    // Navigate back to Generation — still works.
    await page.locator(".landing-nav-item", { hasText: "Generation" }).first().click();
    await expect(page.locator(".app.mode-generation")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".app.mode-explorer")).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });
});
