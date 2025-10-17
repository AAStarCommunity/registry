import { chromium } from '@playwright/test';
import { getEthereumMockScript } from '../tests/mocks/ethereum';

async function captureManageTabs() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Inject MetaMask mock with proper data
  await page.addInitScript(getEthereumMockScript());

  console.log('Starting management page screenshots...');

  const paymasterAddress = '0x1234567890123456789012345678901234567890';
  await page.goto(`http://localhost:5173/operator/manage?address=${paymasterAddress}`);
  await page.waitForTimeout(3000);

  // Configuration Tab (active by default)
  await page.screenshot({
    path: 'docs/screenshots/07-manage-config-tab.png',
    fullPage: true
  });
  console.log('✓ Captured: Configuration Tab');

  // EntryPoint Tab
  await page.click('.tab-button:has-text("EntryPoint")');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'docs/screenshots/08-manage-entrypoint-tab.png',
    fullPage: true
  });
  console.log('✓ Captured: EntryPoint Tab');

  // Registry Tab
  await page.click('.tab-button:has-text("Registry")');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'docs/screenshots/09-manage-registry-tab.png',
    fullPage: true
  });
  console.log('✓ Captured: Registry Tab');

  // Token Management Tab
  await page.click('.tab-button:has-text("Token Management")');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'docs/screenshots/10-manage-tokens-tab.png',
    fullPage: true
  });
  console.log('✓ Captured: Token Management Tab');

  await browser.close();
  console.log('\n✅ All management screenshots captured!');
}

captureManageTabs().catch(console.error);
