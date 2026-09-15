/**
 * generation.spec.ts
 *
 * v2 generation-mode smoke test. The current v2 UI has no inline prompt
 * submit control reachable in the DOM (the live WebSocket path can only be
 * started via the store), so this test drives the reachable path: uploading a
 * recorded .tokenprint trace.
 *
 * Route-isolation rule: loading model/trace data is workspace state and must
 * NOT hijack the URL — the mode you navigated to stays the rendered mode.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect } from "@playwright/test";
import * as path from "path";

const DEMO_TRACE = path.resolve(
  __dirname,
  "../../public/demo/hello-world.json"
);

test.describe("Generation mode — loading a trace does not hijack the route", () => {
  test("uploading a trace in generation mode stays in generation; explorer stays explorer", async ({
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

    // Uploading a trace must NOT collapse the route into another workspace.
    const traceInput = page.locator('input[type="file"][accept=".json"]');
    await traceInput.setInputFiles(DEMO_TRACE);
    await expect(page.locator(".app.mode-generation")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".app.mode-explorer")).toHaveCount(0);

    // And opening Architecture while a trace is loaded stays on Architecture.
    await page.locator(".landing-nav-item", { hasText: "Architecture" }).first().click();
    await expect(page.locator(".app.mode-explorer")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".app.mode-generation")).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });
});