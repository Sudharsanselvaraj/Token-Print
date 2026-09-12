/**
 * walkthrough.spec.ts
 *
 * v2 walkthrough-mode smoke test: switching to the Walkthrough tab mounts the
 * 3D walkthrough scene, the bottom chapter bar shows "Chapter 1", and the
 * chapter nav buttons advance the chapter index without JS errors.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect } from "@playwright/test";

async function clickTab(page: import("@playwright/test").Page, label: string) {
  const tab = page.locator(".mode-tab", { hasText: label });
  await tab.click();
}

test.describe("Walkthrough — mode mounts and chapter nav works", () => {
  test("switching to Walkthrough loads the scene and advances chapters", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/", { waitUntil: "load" });
    await page.waitForSelector(".mode-tab", { timeout: 30_000 });

    await clickTab(page, "Walkthrough");
    await page.waitForSelector(".app.mode-walkthrough", { timeout: 10_000 });
    await expect(page.locator(".mode-tab.active")).toHaveText("Walkthrough");

    // 3D scene mounts (or gracefully falls back to the WebGL notice).
    const canvasCount = await page.locator(".canvas-area canvas").count();
    const fallbackCount = await page.locator(".webgl-fallback").count();
    expect(canvasCount + fallbackCount).toBeGreaterThan(0);

    // Bottom chapter bar present at chapter 1.
    await expect(page.getByText("Chapter 1")).toHaveCount(1);
    await expect(page).toHaveScreenshot("walkthrough-ch1.png");

    // Advance to chapter 2 and back.
    await page.getByRole("button", { name: "Next ►" }).click();
    await expect(page.getByText("Chapter 2")).toHaveCount(1);
    await expect(page).toHaveScreenshot("walkthrough-ch2.png");

    await page.getByRole("button", { name: "◄ Prev" }).click();
    await expect(page.getByText("Chapter 1")).toHaveCount(1);

    expect(errors).toHaveLength(0);
  });
});