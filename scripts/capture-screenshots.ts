import { chromium } from '@playwright/test';

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Inject MetaMask mock
  await page.addInitScript(() => {
    (window as any).ethereum = {
      isMetaMask: true,
      request: async ({ method }: any) => {
        if (method === 'eth_requestAccounts') {
          return ['0x1234567890123456789012345678901234567890'];
        }
        if (method === 'eth_accounts') {
          return ['0x1234567890123456789012345678901234567890'];
        }
        if (method === 'eth_chainId') {
          return '0xaa36a7'; // Sepolia
        }
        return null;
      },
      selectedAddress: '0x1234567890123456789012345678901234567890',
    };
  });

  console.log('Starting screenshot capture...');

  // 1. Landing Page
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'docs/screenshots/01-landing-page.png',
    fullPage: true
  });
  console.log('✓ Captured: Landing Page');

  // 2. Operator Portal
  await page.goto('http://localhost:5173/operator');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'docs/screenshots/02-operator-portal.png',
    fullPage: true
  });
  console.log('✓ Captured: Operator Portal');

  // 3. Developer Portal
  await page.goto('http://localhost:5173/developer');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'docs/screenshots/03-developer-portal.png',
    fullPage: true
  });
  console.log('✓ Captured: Developer Portal');

  // 4. Explorer
  await page.goto('http://localhost:5173/explorer');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'docs/screenshots/04-explorer.png',
    fullPage: true
  });
  console.log('✓ Captured: Explorer');

  // 5. Manage Paymaster - Full Page
  const paymasterAddress = '0x1234567890123456789012345678901234567890';
  await page.goto(`http://localhost:5173/operator/manage?address=${paymasterAddress}`);
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: 'docs/screenshots/05-manage-overview.png',
    fullPage: true
  });
  console.log('✓ Captured: Manage Overview');

  // 6. Manage Paymaster - Configuration Tab
  await page.screenshot({
    path: 'docs/screenshots/06-manage-config-tab.png',
    fullPage: true
  });
  console.log('✓ Captured: Configuration Tab');

  // 7. Manage Paymaster - EntryPoint Tab
  await page.click('button:has-text("EntryPoint")');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'docs/screenshots/07-manage-entrypoint-tab.png',
    fullPage: true
  });
  console.log('✓ Captured: EntryPoint Tab');

  // 8. Manage Paymaster - Registry Tab
  await page.click('button:has-text("Registry")');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'docs/screenshots/08-manage-registry-tab.png',
    fullPage: true
  });
  console.log('✓ Captured: Registry Tab');

  // 9. Manage Paymaster - Token Management Tab
  await page.click('button:has-text("Token Management")');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'docs/screenshots/09-manage-tokens-tab.png',
    fullPage: true
  });
  console.log('✓ Captured: Token Management Tab');

  // 10. Configuration - Edit Mode
  await page.click('button:has-text("Configuration")');
  await page.waitForTimeout(500);
  const editButtons = await page.locator('.edit-button').all();
  if (editButtons.length > 0) {
    await editButtons[2].click(); // Click third edit button
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'docs/screenshots/10-config-edit-mode.png',
    });
    console.log('✓ Captured: Edit Mode');
  }

  await browser.close();
  console.log('\n✅ All screenshots captured successfully!');
  console.log('📁 Location: docs/screenshots/');
}

captureScreenshots().catch(console.error);
