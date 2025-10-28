import { test, expect } from '@playwright/test';

test.describe('MySBT v2.3 Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/my-sbt');
  });

  test('should display page title and header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('My SBT');
    await expect(page.locator('.subtitle')).toContainText('MySBT v2.3');
    await expect(page.locator('.subtitle')).toContainText('Permissionless');
  });

  test('should display "What is MySBT v2.3" section', async ({ page }) => {
    const whatIsSection = page.locator('.info-section').first();
    await expect(whatIsSection.locator('h2')).toContainText('What is MySBT v2.3');

    // Check feature list
    await expect(whatIsSection).toContainText('Permissionless Access');
    await expect(whatIsSection).toContainText('Multi-Community Support');
    await expect(whatIsSection).toContainText('Security Enhanced');
    await expect(whatIsSection).toContainText('NFT Binding');
    await expect(whatIsSection).toContainText('Activity Tracking');
    await expect(whatIsSection).toContainText('Gas Optimized');
  });

  test('should display contract information', async ({ page }) => {
    const contractSection = page.locator('.info-section').nth(1);
    await expect(contractSection.locator('h2')).toContainText('Contract Information');

    // Check contract address
    await expect(contractSection).toContainText('0xc1085841307d85d4a8dC973321Df2dF7c01cE5C8');

    // Check version
    await expect(contractSection).toContainText('Version');

    // Check network
    await expect(contractSection).toContainText('Sepolia Testnet');

    // Check mint fee
    await expect(contractSection).toContainText('Mint Fee');
    await expect(contractSection).toContainText('GT (burned)');

    // Check rate limit
    await expect(contractSection).toContainText('Rate Limit');
    await expect(contractSection).toContainText('5 minutes');

    // Check subgraph link
    const subgraphLink = contractSection.locator('a[href*="thegraph.com"]');
    await expect(subgraphLink).toBeVisible();
  });

  test('should display connect wallet prompt when not connected', async ({ page }) => {
    await expect(page.locator('.wallet-connect-section')).toBeVisible();
    await expect(page.locator('.connect-prompt h2')).toContainText('Connect Wallet');

    const connectButton = page.locator('.action-button.primary', { hasText: 'Connect Wallet' });
    await expect(connectButton).toBeVisible();
  });

  test('should have back button', async ({ page }) => {
    const backButton = page.locator('.back-button');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back');
  });

  test('should display action footer links', async ({ page }) => {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check for action footer section
    const actionFooter = page.locator('.action-footer');
    await expect(actionFooter).toBeVisible();

    // Check for "Get GToken First" link in action footer
    const gtokenLink = actionFooter.locator('a[href="/get-gtoken"]');
    await expect(gtokenLink).toBeVisible();
    await expect(gtokenLink).toContainText('Get GToken First');

    // Check for subgraph link in action footer
    const subgraphLink = actionFooter.locator('a[href*="thegraph.com"]');
    await expect(subgraphLink).toBeVisible();
    await expect(subgraphLink).toContainText('View Subgraph');

    // Check for back button in action footer
    const backButton = actionFooter.locator('button');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back to Home');
  });

  test('should have proper styling (cyan theme)', async ({ page }) => {
    const header = page.locator('.mysbt-header');

    // Check if header has gradient background
    const headerBg = await header.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });

    expect(headerBg).toContain('gradient');
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.mysbt-container')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.mysbt-container')).toBeVisible();
  });

  test('should have correct meta information', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Registry/);
  });
});

test.describe('MySBT v2.3 Page - User Actions (requires wallet)', () => {
  test.skip('should show user info when wallet connected', async ({ page }) => {
    // This test requires MetaMask to be connected
    // Skip for now as it needs manual wallet connection

    await page.goto('http://localhost:5173/my-sbt');

    // Check if user section appears after wallet connection
    const userSection = page.locator('.user-section');
    // await expect(userSection).toBeVisible();
  });

  test.skip('should allow minting membership', async ({ page }) => {
    // This test requires wallet connection and GToken approval
    // Skip for automated testing
  });

  test.skip('should allow querying reputation', async ({ page }) => {
    // This test requires wallet connection
    // Skip for automated testing
  });
});
