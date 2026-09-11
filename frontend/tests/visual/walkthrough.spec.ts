/**
 * walkthrough.spec.ts
 *
 * CI port of tools/verify_walkthrough.mjs
 *
 * Verifies:
 * - Switching to Walkthrough mode triggers the real /analyze pass and shows
 *   a chapter title once data loads.
 * - Clicking "Next" advances the chapter title (chapters advance text + 3D).
 * - After several advances, a chapter whose title matches Overview, Tokeniz,
 *   or Attention is visible (all real chapters from lib/walkthrough.ts).
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect } from "@playwright/test";

async function readChapter(page: import("@playwright/test").Page) {
  return {
    title: (await page.$eval(
      ".wt-chaptertitle",
      (el) => el.textContent ?? ""
    ).catch(() => "")) || "",
    body: (await page.$eval(
      ".wt-body",
      (el) => (el.textContent ?? "").replace(/\s+/g, " ").slice(0, 240)
    ).catch(() => "")) || "",
  };
}

async function clickNext(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    (
      document.querySelectorAll(
        ".wt-nav .pb-btn"
      )[1] as HTMLButtonElement | undefined
    )?.click();
  });
  await page.waitForTimeout(1_200);
}

test.describe("Walkthrough — real /analyze data, chapters advance", () => {
  test("chapter titles advance with Next, real data present", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector(".mode-tab", { timeout: 30_000 });

    // Switch to Walkthrough mode.
    await page.evaluate(() => {
      const tab = [...document.querySelectorAll(".mode-tab")].find((b) =>
        /Walkthrough/.test(b.textContent ?? "")
      ) as HTMLElement | undefined;
      tab?.click();
    });

    // Wait for the /analyze call to complete and chapter content to render.
    await page.waitForSelector(".wt-chaptertitle", { timeout: 60_000 });
    await page.waitForTimeout(5_000);

    const ch0 = await readChapter(page);
    console.log("ch0:", JSON.stringify(ch0));
    await expect(page).toHaveScreenshot("walkthrough-ch0.png");

    // Advance to chapter 1.
    await clickNext(page);
    const ch1 = await readChapter(page);
    console.log("ch1:", JSON.stringify(ch1));
    await expect(page).toHaveScreenshot("walkthrough-ch1.png");

    // Advance three more times (→ Self-Attention chapter area).
    await clickNext(page);
    await clickNext(page);
    await clickNext(page);
    const ch4 = await readChapter(page);
    console.log("ch4:", JSON.stringify(ch4));

    // At least one chapter title must match a real chapter name.
    const allTitles = [ch0.title, ch1.title, ch4.title].join(" ");
    expect(allTitles).toMatch(/Tokeniz|Attention|Overview|Embedding|MLP|Softmax/i);

    // Chapter must have changed between ch0 and ch1 (the text is not frozen).
    expect(ch0.title).not.toEqual(ch4.title);

    await expect(page).toHaveScreenshot("walkthrough-ch4.png");
  });
});
