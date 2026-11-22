const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '../public/docs/raw');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
  console.log('Launching browser for screenshot capture...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });

  const targets = [
    {
      name: 'raw-explorer.png',
      url: 'http://127.0.0.1:3000/app?mode=explorer',
      waitSelector: '.app',
      delay: 4000,
    },
    {
      name: 'raw-walkthrough.png',
      url: 'http://127.0.0.1:3000/app?mode=walkthrough',
      waitSelector: '.app',
      delay: 4000,
    },
    {
      name: 'raw-generation.png',
      url: 'http://127.0.0.1:3000/app?mode=generation',
      waitSelector: '.app',
      delay: 4000,
    },
    {
      name: 'raw-debugger.png',
      url: 'http://127.0.0.1:3000/app?mode=debugger',
      waitSelector: '.app',
      delay: 4000,
    },
    {
      name: 'raw-matrix.png',
      url: 'http://127.0.0.1:3000/docs/compatibility-matrix',
      waitSelector: 'table',
      delay: 2000,
    },
    {
      name: 'raw-api.png',
      url: 'http://127.0.0.1:3000/docs/developers',
      waitSelector: 'section',
      delay: 2000,
    },
    {
      name: 'raw-docs-home.png',
      url: 'http://127.0.0.1:3000/docs',
      waitSelector: 'h1',
      delay: 2000,
    },
  ];

  for (const t of targets) {
    const page = await context.newPage();
    try {
      console.log(`Navigating to ${t.url} ...`);
      await page.goto(t.url, { waitUntil: 'networkidle', timeout: 15000 });
      if (t.waitSelector) {
        await page.waitForSelector(t.waitSelector, { timeout: 10000 }).catch(() => {});
      }
      if (t.delay) {
        await page.waitForTimeout(t.delay);
      }
      const outPath = path.join(OUT_DIR, t.name);
      await page.screenshot({ path: outPath });
      console.log(`Saved: ${outPath}`);
    } catch (err) {
      console.error(`Error capturing ${t.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('Capture completed.');
}

capture().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
