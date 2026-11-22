const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VAL_DIR = path.resolve(__dirname, '../../docs/validation');
if (!fs.existsSync(VAL_DIR)) {
  fs.mkdirSync(VAL_DIR, { recursive: true });
}

async function runValidation() {
  console.log('Starting Linear docs validation test...');
  const browser = await chromium.launch();

  // Test 1: Desktop 1440px Dark & Light
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });

  const routes = [
    { name: 'docs-home', url: 'http://127.0.0.1:3000/docs' },
    { name: 'developers-home', url: 'http://127.0.0.1:3000/docs/developers' },
    { name: 'inspect-attention', url: 'http://127.0.0.1:3000/docs/concepts/attention' },
    { name: 'models-loading', url: 'http://127.0.0.1:3000/docs/loading-a-model' },
    { name: 'deploy-architecture', url: 'http://127.0.0.1:3000/docs/architecture' },
  ];

  for (const r of routes) {
    const page = await desktopContext.newPage();
    console.log(`Validating desktop 1440px: ${r.name}...`);
    await page.goto(r.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Dark screenshot
    await page.screenshot({ path: path.join(VAL_DIR, `${r.name}-1440-dark.png`) });

    // Switch to Light Mode via theme toggle button or html attribute
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(500);

    // Light screenshot
    await page.screenshot({ path: path.join(VAL_DIR, `${r.name}-1440-light.png`) });
    await page.close();
  }
  await desktopContext.close();

  // Test 2: Mobile 390px Dark & Light
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const mobileRoutes = [
    { name: 'docs-home', url: 'http://127.0.0.1:3000/docs' },
    { name: 'inspect-attention', url: 'http://127.0.0.1:3000/docs/concepts/attention' },
  ];

  for (const r of mobileRoutes) {
    const page = await mobileContext.newPage();
    console.log(`Validating mobile 390px: ${r.name}...`);
    await page.goto(r.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Dark mobile screenshot
    await page.screenshot({ path: path.join(VAL_DIR, `${r.name}-390-dark.png`) });

    // Light mobile screenshot
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(VAL_DIR, `${r.name}-390-light.png`) });
    await page.close();
  }
  await mobileContext.close();

  // Test 3: Keyboard Shortcuts & Search Modal (Desktop)
  const keyboardContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await keyboardContext.newPage();
  await page.goto('http://127.0.0.1:3000/docs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('Testing keyboard shortcuts: ⌘K / Ctrl+K ...');
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(500);

  const searchInputVisible = await page.isVisible('input[placeholder="Search docs and APIs..."]');
  console.log('Search modal visible after Meta+K:', searchInputVisible);
  if (!searchInputVisible) {
    // Try Control+K as well
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(VAL_DIR, 'search-modal-open.png') });

  // Test Escape closes modal
  console.log('Testing Escape key to close modal...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const searchInputClosed = !(await page.isVisible('input[placeholder="Search docs and APIs..."]'));
  console.log('Search modal closed after Escape:', searchInputClosed);

  await page.close();
  await keyboardContext.close();
  await browser.close();

  console.log('Validation test completed successfully! Screenshots saved to docs/validation/');
}

runValidation().catch((err) => {
  console.error('Validation test failed:', err);
  process.exit(1);
});
