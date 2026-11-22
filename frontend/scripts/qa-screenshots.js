const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT_DIR = path.resolve(__dirname, "../../docs/validation/qa");

const ROUTES = [
  { path: "/docs", name: "01_docs_home" },
  { path: "/docs/introduction", name: "02_introduction" },
  { path: "/docs/concepts/tokens", name: "03_concepts_tokens" },
  { path: "/docs/concepts/qkv", name: "04_concepts_qkv" },
  { path: "/docs/concepts/attention", name: "05_concepts_attention" },
  { path: "/docs/using/model-explorer", name: "06_model_explorer" },
  { path: "/docs/loading-a-model", name: "07_loading_a_model" },
  { path: "/docs/architecture", name: "08_architecture" },
  { path: "/docs/api-reference", name: "09_api_reference" },
  { path: "/docs/developers", name: "10_developers" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: "dark",
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      console.log(`[QA] Testing ${route.name} (${vp.name}) -> ${url}`);

      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const status = response ? response.status() : "null";

      // Allow animations and fonts to settle
      await page.waitForTimeout(500);

      // Perform QA assertions
      const qaReport = await page.evaluate(() => {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const htmlTheme = document.documentElement.getAttribute("data-theme");
        const bodyTheme = document.body.getAttribute("data-theme");

        // Check for permanent underlines on navigation and cards
        const navLinks = Array.from(document.querySelectorAll(".docs-nav a, .doc-card, nav a"));
        const underlinedNavLinks = navLinks.filter(el => {
          const textDec = window.getComputedStyle(el).textDecorationLine;
          return textDec && textDec.includes("underline");
        }).length;

        // Check H1 styling
        const h1 = document.querySelector("h1");
        const h1Size = h1 ? window.getComputedStyle(h1).fontSize : null;
        const h1Weight = h1 ? window.getComputedStyle(h1).fontWeight : null;

        // Check theme toggle existence
        const themeToggle = document.querySelector("[data-testid='theme-toggle'], button[aria-label*='theme' i], button[aria-label*='dark' i]");

        return {
          bodyBg,
          htmlTheme,
          bodyTheme,
          underlinedNavLinks,
          h1Size,
          h1Weight,
          hasThemeToggle: !!themeToggle,
        };
      });

      // Save screenshot
      const filename = `${route.name}_${vp.name}.png`;
      const filepath = path.join(OUT_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: false });

      results.push({
        route: route.path,
        name: route.name,
        viewport: vp.name,
        status,
        screenshot: filename,
        ...qaReport,
      });
    }

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(OUT_DIR, "qa-results.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`[QA] Completed! Screenshots and report written to ${OUT_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
