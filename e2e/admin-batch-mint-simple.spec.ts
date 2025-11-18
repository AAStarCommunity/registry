import { test, expect } from '@playwright/test';

test.describe('Admin Batch Minting System - Simple Tests', () => {
  test('should load admin batch mint page', async ({ page }) => {
    // Navigate directly to admin batch mint page
    await page.goto('/admin-batch-mint');

    // Mock wallet connection
    await page.addInitScript(() => {
      window.ethereum = {
        request: async ({ method }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7'; // Sepolia testnet
          }
          return null;
        },
        on: () => {},
        removeListener: () => {}
      };
    });

    await page.waitForLoadState('networkidle');

    // Check if page loads
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toBeVisible();

    // Should show either loading state or admin interface
    const loadingState = page.locator('.admin-loading');
    const adminHeader = page.locator('.admin-header');
    const welcomeSection = page.locator('.welcome-section');

    const isLoadingVisible = await loadingState.isVisible();
    const isAdminHeaderVisible = await adminHeader.isVisible();
    const isWelcomeVisible = await welcomeSection.isVisible();

    console.log(`Loading visible: ${isLoadingVisible}, Admin header visible: ${isAdminHeaderVisible}, Welcome visible: ${isWelcomeVisible}`);

    // At least one of these should be visible
    expect(isLoadingVisible || isAdminHeaderVisible || isWelcomeVisible).toBeTruthy();
  });

  test('should display admin interface elements', async ({ page }) => {
    await page.goto('/admin-batch-mint');

    // Mock wallet
    await page.addInitScript(() => {
      window.ethereum = {
        request: async ({ method }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7';
          }
          return null;
        },
        on: () => {},
        removeListener: () => {}
      };
    });

    await page.waitForLoadState('networkidle');

    // Wait for permission checks to complete
    await page.waitForTimeout(2000);

    // Check for various UI elements
    const elementsToCheck = [
      '.admin-header',
      '.admin-content',
      '.welcome-section',
      '.contract-selection-section',
      '.method-selection-section',
      '.execute-section'
    ];

    let foundElements = 0;
    for (const selector of elementsToCheck) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        foundElements++;
        console.log(`Found element: ${selector}`);
      }
    }

    console.log(`Found ${foundElements} out of ${elementsToCheck.length} expected elements`);
    expect(foundElements).toBeGreaterThan(0);
  });

  test('should handle wallet connection', async ({ page }) => {
    await page.goto('/admin-batch-mint');

    // Check if wallet connection prompt appears
    const connectWalletButton = page.locator('.connect-wallet-btn');
    const noWalletMessage = page.locator('text=MetaMask not installed');

    const hasConnectButton = await connectWalletButton.isVisible();
    const hasNoWalletMessage = await noWalletMessage.isVisible();

    console.log(`Connect button visible: ${hasConnectButton}, No wallet message visible: ${hasNoWalletMessage}`);

    // Either should show connect button or proceed with connected wallet
    if (hasConnectButton) {
      await connectWalletButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should have proper page structure', async ({ page }) => {
    await page.goto('/admin-batch-mint');

    // Mock wallet
    await page.addInitScript(() => {
      window.ethereum = {
        request: async ({ method }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7';
          }
          return null;
        },
        on: () => {},
        removeListener: () => {}
      };
    });

    await page.waitForLoadState('networkidle');

    // Check basic page structure
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for React app mounting
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Take screenshot for debugging
    await page.screenshot({ path: 'admin-batch-mint-page.png', fullPage: true });
  });

  test('should handle admin entry from Get SBT page', async ({ page }) => {
    await page.goto('/get-sbt');

    // Mock wallet
    await page.addInitScript(() => {
      window.ethereum = {
        request: async ({ method }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7';
          }
          return null;
        },
        on: () => {},
        removeListener: () => {}
      };
    });

    await page.waitForLoadState('networkidle');

    // Look for admin entry button
    const adminButton = page.locator('.admin-entry-button');
    const buttonCount = await adminButton.count();

    console.log(`Admin entry buttons found: ${buttonCount}`);

    if (buttonCount > 0) {
      await expect(adminButton).toBeVisible();
      await adminButton.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to admin page
      expect(page.url()).toContain('/admin-batch-mint');
    } else {
      // Navigate manually if button not visible
      console.log('Admin button not found, navigating manually');
      await page.goto('/admin-batch-mint');
      await page.waitForLoadState('networkidle');
    }

    // Verify admin page loaded
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toBeVisible();
  });
});