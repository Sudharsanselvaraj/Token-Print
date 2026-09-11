import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for visual regression tests.
 * Specs live in frontend/tests/visual/.
 * Screenshot baselines are stored in frontend/tests/visual/__screenshots__/.
 *
 * Run locally (with backend + frontend already running):
 *   npx playwright test
 *
 * Update baselines after intentional UI changes:
 *   npx playwright test --update-snapshots
 */
export default defineConfig({
  testDir: "./tests/visual",
  // Each test has its own generous timeout because generation streaming takes ~30s.
  timeout: 120_000,
  expect: {
    timeout: 10_000,
    // Allow up to 2% pixel difference for WebGL/antialiasing variation.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  // Run tests sequentially so the shared backend isn't overwhelmed.
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    // Bundled Chromium — no local Chrome path needed.
    ...devices["Desktop Chrome"],
    viewport: { width: 1500, height: 920 },
    // Screenshot baselines land here; check them in alongside the spec files.
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Pure-logic unit tests in tests/unit/ — no browser, backend or dev
      // server needed:  npx playwright test --project=unit
      name: "unit",
      testDir: "./tests/unit",
    },
  ],
});
