/**
 * walkthrough.spec.ts
 *
 * v2 walkthrough-mode smoke test: switching to Walkthrough mounts the
 * 3D walkthrough scene, the bottom bar shows "CHAPTER 01/07", and the
 * chapter nav buttons advance the chapter index without JS errors.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect } from "@playwright/test";

const CHAPTER_COUNT = 7;

function chapterLabel(idx: number) {
  const padded = String(idx).padStart(2, "0");
  return `CHAPTER ${padded}/${String(CHAPTER_COUNT).padStart(2, "0")}`;
}

test.describe("Walkthrough — mode mounts and chapter nav works", () => {
  test("switching to Walkthrough loads the scene and advances chapters", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.stack ?? String(e)));

    await page.goto("/app", { waitUntil: "load" });
    await page.waitForSelector(".landing-nav-item", { timeout: 30_000 });

    await page.locator(".landing-nav-item", { hasText: "Walkthrough" }).first().click();
    await page.waitForSelector(".app.mode-walkthrough", { timeout: 10_000 });
    await expect(
      page.locator(".landing-nav-item.active", { hasText: "Walkthrough" })
    ).toBeVisible();

    // 3D scene mounts (or gracefully falls back to the WebGL notice).
    const canvasCount = await page.locator(".canvas-area canvas").count();
    const fallbackCount = await page.locator(".webgl-fallback").count();
    expect(canvasCount + fallbackCount).toBeGreaterThan(0);

    // Bottom chapter bar present at chapter 1.
    await expect(page.getByText(chapterLabel(1))).toBeVisible();
    await expect(page).toHaveScreenshot("walkthrough-ch1.png");

    // Advance to chapter 2 and back.
    await page.locator('[title="Next chapter (→)"]').first().click();
    await expect(page.getByText(chapterLabel(2))).toBeVisible();
    await expect(page).toHaveScreenshot("walkthrough-ch2.png");

    await page.locator('[title="Previous chapter (←)"]').first().click();
    await expect(page.getByText(chapterLabel(1))).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});

test("slow lighting does not suspend canvas event initialization", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? String(error)));
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  let releaseLighting!: () => void;
  const lightingGate = new Promise<void>((resolve) => { releaseLighting = resolve; });
  await page.route("**/*.hdr", async (route) => {
    await lightingGate;
    await route.continue();
  });
  try {
    await page.goto("/app");
    await page.locator(".landing-nav-item", { hasText: "Walkthrough" }).first().click();
    // The canvas must render before the optional lighting download finishes.
    await page.waitForFunction(() => !!(window as unknown as { __ns?: unknown }).__ns);
    await page.locator('[title="Next chapter (→)"]').first().click();
    await expect(page.getByText(chapterLabel(2))).toBeVisible();
    releaseLighting();
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  } finally {
    releaseLighting();
    await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
});
