const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT_DIR = path.resolve(__dirname, "../../docs/validation/qa");

const ROUTES = [
  { path: "/docs", name: "01_docs_home" },
  { path: "/docs/introduction", name: "02_introduction" },
  { path: "/docs/concepts/tokens", name: "03_concepts_tokens" },
  { path: "/docs/using/debugger", name: "04_using_debugger" },
  { path: "/docs/developers", name: "05_developers" },
  { path: "/docs/api-reference", name: "06_api_reference" },
];

const VIEWPORTS = [
  { name: "desktop_1440", width: 1440, height: 900 },
  { name: "laptop_1280", width: 1280, height: 800 },
  { name: "tablet_1024", width: 1024, height: 768 },
  { name: "mobile_390", width: 390, height: 844 },
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

      // Allow typography, layout, and hydration to settle
      await page.waitForTimeout(600);

      // Extract computed font sizes and layout properties
      const metrics = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const h2 = document.querySelector("article.docs-content h2");
        const h3 = document.querySelector("article.docs-content h3");
        const p = document.querySelector("article.docs-content p");
        const sidebarLink = document.querySelector("aside a");
        const breadcrumb = document.querySelector("nav[aria-label='Breadcrumb'] span");
        const topSearch = document.querySelector("header button span");
        const tocLink = document.querySelector("aside[aria-label='Table of contents'] a, nav[aria-label='Table of contents'] a");

        // Check for permanent underlines on navigation and cards
        const navLinks = Array.from(document.querySelectorAll("aside a, nav a, .doc-card"));
        const underlinedNavLinks = navLinks.filter(el => {
          const textDec = window.getComputedStyle(el).textDecorationLine;
          return textDec && textDec.includes("underline");
        }).length;

        const themeToggle = document.querySelector("[data-testid='theme-toggle'], button[aria-label*='theme' i], button[aria-label*='dark' i]");

        return {
          h1FontSize: h1 ? window.getComputedStyle(h1).fontSize : null,
          h2FontSize: h2 ? window.getComputedStyle(h2).fontSize : null,
          h3FontSize: h3 ? window.getComputedStyle(h3).fontSize : null,
          pFontSize: p ? window.getComputedStyle(p).fontSize : null,
          pLineHeight: p ? window.getComputedStyle(p).lineHeight : null,
          sidebarItemFontSize: sidebarLink ? window.getComputedStyle(sidebarLink).fontSize : null,
          breadcrumbFontSize: breadcrumb ? window.getComputedStyle(breadcrumb).fontSize : null,
          topSearchFontSize: topSearch ? window.getComputedStyle(topSearch).fontSize : null,
          tocFontSize: tocLink ? window.getComputedStyle(tocLink).fontSize : null,
          underlinedNavLinks,
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
        ...metrics,
      });
    }

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(OUT_DIR, "qa-typography-audit.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`[QA] Typography and layout audit saved to ${reportPath}`);
}

main().catch((err) => {
  console.error("[QA] Error during test:", err);
  process.exit(1);
});
