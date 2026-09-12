/**
 * generation.spec.ts
 *
 * v2 generation-mode smoke test. The current v2 UI has no inline prompt
 * submit control reachable in the DOM (the live WebSocket path can only be
 * started via the store), so this test drives the reachable path: uploading a
 * recorded .tokenprint trace, which switches the app to Generation mode and
 * mounts the generation bottom bar with frame controls.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect } from "@playwright/test";
import * as path from "path";

const DEMO_TRACE = path.resolve(
  __dirname,
  "../../public/demo/hello-world.json"
);

test.describe("Generation mode — trace replay drives the UI", () => {
  test("uploading a trace switches to Generation and mounts controls", async ({
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

    await page.goto("/", { waitUntil: "load" });
    await page.waitForSelector(".tensor-row", { timeout: 60_000 });

    // Upload a recorded forward pass through ModelLoader's trace input.
    const traceInput = page.locator('input[type="file"][accept=".json"]');
    await traceInput.setInputFiles(DEMO_TRACE);

    // loadTrace switches the active mode to Generation automatically.
    await page.waitForSelector(".app.mode-generation", { timeout: 15_000 });
    await expect(page.locator(".mode-tab.active")).toHaveText("Generation");

    // Generation bottom bar with frame controls appears once data is loaded.
    await expect(
      page.getByRole("button", { name: /Next Token/i })
    ).toBeVisible({ timeout: 15_000 });

    // 3D generation scene mounts (or gracefully falls back to the WebGL notice).
    const canvasCount = await page.locator(".canvas-area canvas").count();
    const fallbackCount = await page.locator(".webgl-fallback").count();
    expect(canvasCount + fallbackCount).toBeGreaterThan(0);

    await expect(page).toHaveScreenshot("generation-trace.png");
    expect(errors).toHaveLength(0);
  });
});