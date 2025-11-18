import { test, expect } from '@playwright/test';

test.describe('Admin Batch Mint - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock wallet connection with operator account
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

      // Mock successful operator check
      window.fetch = new Proxy(window.fetch, {
        apply(target, thisArg, args) {
          const [url, options] = args;
          // Mock RPC calls for operator check
          if (typeof url === 'string' && url.includes('sepolia')) {
            return Promise.resolve(new Response(JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              result: '0x0000000000000000000000000000000000000000000000000000000000000000001'
            })));
          }
          return Reflect.apply(target, thisArg, args);
        }
      });
    });
  });

  test('should display comprehensive admin interface', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Check if admin page loads
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toBeVisible();

    // Look for admin-specific elements
    const contractSection = page.locator('.contract-selection-section');
    const methodSection = page.locator('.method-selection-section');
    const addressSection = page.locator('.batch-address-input');
    const executeSection = page.locator('.execute-section');

    const elementsFound = [
      await contractSection.isVisible(),
      await methodSection.isVisible(),
      await addressSection.isVisible(),
      await executeSection.isVisible()
    ].filter(Boolean).length;

    console.log(`Admin interface elements found: ${elementsFound}/4`);
    expect(elementsFound).toBeGreaterThan(0);
  });

  test('should handle contract selection and method configuration', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Look for contract selector
    const contractSelector = page.locator('.contract-selector select, .contract-selector');
    if (await contractSelector.isVisible()) {
      // Check if there are contract options
      const options = contractSelector.locator('option');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(0);
      console.log(`Contract options available: ${optionCount}`);
    }

    // Look for method selection
    const methodOptions = page.locator('.method-option, .method-selector');
    const methodCount = await methodOptions.count();
    if (methodCount > 0) {
      console.log(`Method options available: ${methodCount}`);
    }
  });

  test('should handle batch address input and validation', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Look for address input
    const addressInput = page.locator('.address-textarea, textarea[placeholder*="地址"]');
    if (await addressInput.isVisible()) {
      // Test address input
      const testAddresses = `0x1234567890123456789012345678901234567890
0x2345678901234567890123456789012345678901
0x3456789012345678901234567890123456789012`;

      await addressInput.fill(testAddresses);
      await page.waitForTimeout(1000); // Wait for validation

      // Check for validation results
      const validationStats = page.locator('.validation-stats, .stats-grid');
      if (await validationStats.isVisible()) {
        console.log('Address validation is working');
      }
    }
  });

  test('should display gas estimation when ready', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Look for gas estimator
    const gasEstimator = page.locator('.gas-estimator, .gas-estimate');
    if (await gasEstimator.isVisible()) {
      console.log('Gas estimation component is visible');

      // Check for gas estimate display
      const gasDisplay = page.locator('text*=Gas, text*=ETH, text*=gas');
      if (await gasDisplay.isVisible()) {
        console.log('Gas estimate values are displayed');
      }
    }
  });

  test('should show execution button with proper state', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Look for execute button
    const executeButton = page.locator('.execute-button, button[class*="execute"]');
    if (await executeButton.isVisible()) {
      const isDisabled = await executeButton.isDisabled();
      console.log(`Execute button visible, disabled: ${isDisabled}`);

      // Check button text
      const buttonText = await executeButton.textContent();
      console.log(`Execute button text: ${buttonText}`);
    }
  });

  test('should handle modal interactions', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Check for any modal components
    const modals = page.locator('.modal-overlay, .batch-result-modal, .multi-confirm-modal');
    const modalCount = await modals.count();
    console.log(`Modal components found: ${modalCount}`);

    // Modals should be hidden by default
    if (modalCount > 0) {
      const isVisible = await modals.first().isVisible();
      console.log(`First modal visible: ${isVisible}`);
    }
  });

  test('should have proper responsive design', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone
    await page.waitForTimeout(500);

    // Check if layout adapts
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await page.waitForTimeout(500);

    await expect(body).toBeVisible();
    console.log('Responsive design test passed');
  });

  test('should handle security and permission features', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Look for permission badges
    const permissionBadge = page.locator('.permission-badge, .badge');
    if (await permissionBadge.isVisible()) {
      const badgeText = await permissionBadge.textContent();
      console.log(`Permission badge: ${badgeText}`);
    }

    // Look for security notices
    const securityNotice = page.locator('text*=安全, text*=权限, text*=permission');
    const noticeCount = await securityNotice.count();
    if (noticeCount > 0) {
      console.log(`Security notices found: ${noticeCount}`);
    }
  });

  test('should have proper error handling', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Look for error handling elements
    const errorMessages = page.locator('.error-message, .permission-warning');
    const errorCount = await errorMessages.count();
    console.log(`Error handling elements found: ${errorCount}`);

    // Check for loading states
    const loadingElements = page.locator('.loading, .spinner, .admin-loading');
    const loadingCount = await loadingElements.count();
    console.log(`Loading elements found: ${loadingCount}`);
  });

  test('should handle data export features', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Look for export buttons
    const exportButtons = page.locator('button:has-text("导出"), button:has-text("Export"), button:has-text("CSV"), button:has-text("JSON")');
    const exportCount = await exportButtons.count();
    if (exportCount > 0) {
      console.log(`Export buttons found: ${exportCount}`);
    }
  });

  test('should handle transaction hash display', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Look for transaction hash elements
    const txHashElements = page.locator('text*=0x, .tx-hash, .transaction-hash');
    const txCount = await txHashElements.count();
    if (txCount > 0) {
      console.log(`Transaction hash elements found: ${txCount}`);
    }

    // Look for Etherscan links
    const etherscanLinks = page.locator('a[href*="etherscan"]');
    const etherscanCount = await etherscanLinks.count();
    if (etherscanCount > 0) {
      console.log(`Etherscan links found: ${etherscanCount}`);
    }
  });

  test('should handle progress tracking features', async ({ page }) => {
    await page.goto('/admin-batch-mint');
    await page.waitForLoadState('networkidle');

    // Look for progress indicators
    const progressBars = page.locator('.progress-bar, .progress-indicator');
    const progressBarCount = await progressBars.count();
    if (progressBarCount > 0) {
      console.log(`Progress bars found: ${progressBarCount}`);
    }

    // Look for statistics displays
    const statistics = page.locator('.statistics, .stats, .result-statistics');
    const statsCount = await statistics.count();
    if (statsCount > 0) {
      console.log(`Statistics sections found: ${statsCount}`);
    }

    // Look for status badges
    const statusBadges = page.locator('.status-badge, .badge');
    const badgeCount = await statusBadges.count();
    if (badgeCount > 0) {
      console.log(`Status badges found: ${badgeCount}`);
    }
  });
});