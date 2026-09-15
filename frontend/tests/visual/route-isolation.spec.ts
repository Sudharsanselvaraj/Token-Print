/**
 * route-isolation.spec.ts
 *
 * Regression test for route isolation: the URL must be the single source of
 * truth for which workspace is rendered. A stale/global "activeMode" store
 * value (e.g. one flipped by loading a trace or by a failed architecture load
 * falling back to the demo trace) must NEVER override the current route.
 *
 * Backend-independent: only asserts the mode class on the `.app` root, so it
 * runs in CI without the :8000 backend. Catches the original bug where
 * "?mode=explorer" rendered `mode-generation` (and any future re-introduction).
 */
import { test, expect, type Page } from "@playwright/test";

const ROUTES = [
  { mode: "explorer", href: "/app?mode=explorer", cls: "mode-explorer", label: "Architecture" },
  { mode: "generation", href: "/app?mode=generation", cls: "mode-generation", label: "Generation" },
  { mode: "walkthrough", href: "/app?mode=walkthrough", cls: "mode-walkthrough", label: "Walkthrough" },
  { mode: "debugger", href: "/app?mode=debugger", cls: "mode-debugger", label: "Debugger" },
];

/** Read the canonical workspace mode class currently on the `.app` root. */
async function activeModeClass(page: Page): Promise<string[]> {
  const el = page.locator(".app");
  await el.waitFor({ timeout: 60_000 });
  const cn = ((await el.getAttribute("class")) ?? "").split(/\s+/);
  return cn.filter((c) => c.startsWith("mode-"));
}

/** Assert only the given mode is mounted on the workspace root. */
async function expectOnlyMode(page: Page, cls: string) {
  await expect(page.locator(`.app.${cls}`)).toBeVisible({ timeout: 60_000 });
  for (const other of ROUTES) {
    if (other.cls !== cls) {
      await expect(page.locator(`.app.${other.cls}`)).toHaveCount(0);
    }
  }
}

test.describe("Route isolation: the URL decides the rendered workspace", () => {
  test("direct load of every route renders only its own workspace", async ({ page }) => {
    for (const r of ROUTES) {
      await page.goto(r.href, { waitUntil: "load" });
      await expectOnlyMode(page, r.cls);
    }
  });

  test("refresh preserves the directly loaded route", async ({ page }) => {
    for (const r of ROUTES) {
      await page.goto(r.href, { waitUntil: "load" });
      await page.reload({ waitUntil: "load" });
      await expectOnlyMode(page, r.cls);
    }
  });

  test("header navigation switches routes deterministically (no leakage)", async ({ page }) => {
    await page.goto("/app?mode=explorer", { waitUntil: "load" });
    await expectOnlyMode(page, "mode-explorer");

    for (const r of ROUTES) {
      await page.locator(`.landing-nav-item`, { hasText: r.label }).first().click();
      await expect(page).toHaveURL(new RegExp(`/app/?\\?mode=${r.mode}$`));
      await expectOnlyMode(page, r.cls);
    }

    // Cycle back through every route in reverse — repeated switching must
    // never leak the previous workspace.
    for (const r of [...ROUTES].reverse()) {
      await page.locator(`.landing-nav-item`, { hasText: r.label }).first().click();
      await expectOnlyMode(page, r.cls);
    }
  });

  test("browser Back/Forward restores the correct workspace", async ({ page }) => {
    await page.goto("/app?mode=explorer", { waitUntil: "load" });
    await page.locator(".landing-nav-item", { hasText: "Generation" }).first().click();
    await expectOnlyMode(page, "mode-generation");
    await page.locator(".landing-nav-item", { hasText: "Debugger" }).first().click();
    await expectOnlyMode(page, "mode-debugger");

    await page.goBack();
    await expectOnlyMode(page, "mode-generation");
    await page.goBack();
    await expectOnlyMode(page, "mode-explorer");
    await page.goForward();
    await expectOnlyMode(page, "mode-generation");
    await page.goForward();
    await expectOnlyMode(page, "mode-debugger");
  });

  test("each route opens directly in its own tab", async ({ browser }) => {
    for (const r of ROUTES) {
      const tab: Page = await browser.newPage();
      await tab.goto(r.href, { waitUntil: "load" });
      await expectOnlyMode(tab, r.cls);
      await tab.close();
    }
  });

  test("unknown or missing mode renders Architecture, never Generation", async ({ page }) => {
    // The exact regression: ?mode=explorer must never collapse into generation.
    await page.goto("/app?mode=explorer", { waitUntil: "load" });
    await expectOnlyMode(page, "mode-explorer");

    // Bare /app defaults to Architecture.
    await page.goto("/app", { waitUntil: "load" });
    await expectOnlyMode(page, "mode-explorer");

    // Invalid values normalize to Architecture — NOT the last-used mode.
    await page.goto("/app?mode=bogus", { waitUntil: "load" });
    await expectOnlyMode(page, "mode-explorer");
    await page.goto("/app?mode=walker", { waitUntil: "load" });
    await expectOnlyMode(page, "mode-explorer");
  });
});