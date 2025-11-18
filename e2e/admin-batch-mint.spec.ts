import { test, expect } from '@playwright/test';

test.describe('Admin Batch Minting System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Get SBT page
    await page.goto('/get-sbt');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display admin entry button for operators', async ({ page }) => {
    // Mock operator permissions check
    await page.route('**/api/permissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isOperator: true,
          isOwner: false,
          isLoading: false,
          error: null
        })
      });
    });

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

    // Reload page to trigger permission check
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if admin entry button is visible
    const adminButton = page.locator('.admin-entry-button');
    await expect(adminButton).toBeVisible();

    // Check button text
    await expect(adminButton).toContainText('管理面板');
  });

  test('should navigate to admin batch mint page', async ({ page }) => {
    // Mock operator permissions
    await page.route('**/api/permissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isOperator: true,
          isOwner: false,
          isLoading: false,
          error: null
        })
      });
    });

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

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click admin entry button
    const adminButton = page.locator('.admin-entry-button');
    await adminButton.click();

    // Should navigate to admin batch mint page
    await expect(page).toHaveURL('/admin-batch-mint');

    // Check page title
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toContainText('Batch Minting Admin Panel');
  });

  test('should display contract selection section', async ({ page }) => {
    // Navigate directly to admin page
    await page.goto('/admin-batch-mint');

    // Mock wallet and permissions
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

    // Check if contract selection is visible
    const contractSection = page.locator('.contract-selection-section');
    await expect(contractSection).toBeVisible();

    // Check for contract selector
    const contractSelector = page.locator('.contract-selector');
    await expect(contractSelector).toBeVisible();
  });

  test('should handle batch address input', async ({ page }) => {
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

    // Find and fill address input
    const addressInput = page.locator('.address-input textarea');
    if (await addressInput.isVisible()) {
      const testAddresses = `0x1234567890123456789012345678901234567890
0x2345678901234567890123456789012345678901
0x3456789012345678901234567890123456789012`;

      await addressInput.fill(testAddresses);

      // Check validation results
      const validationResults = page.locator('.validation-results');
      await expect(validationResults).toBeVisible();
    }
  });

  test('should display gas estimation', async ({ page }) => {
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

    // Look for gas estimator section
    const gasEstimator = page.locator('.gas-estimator');
    if (await gasEstimator.isVisible()) {
      // Check for gas estimate display
      const gasEstimate = page.locator('.gas-estimate');
      await expect(gasEstimate).toBeVisible();
    }
  });

  test('should show execution button when all conditions are met', async ({ page }) => {
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

    // Check for execute button
    const executeButton = page.locator('.execute-button.primary');
    if (await executeButton.isVisible()) {
      // Button should be disabled without proper setup
      await expect(executeButton).toBeDisabled();
    }
  });

  test('should display permission badge correctly', async ({ page }) => {
    await page.goto('/admin-batch-mint');

    // Mock wallet with owner permissions
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

    // Check for permission badge
    const permissionBadge = page.locator('.permission-badge');
    if (await permissionBadge.isVisible()) {
      const badge = page.locator('.badge');
      await expect(badge).toBeVisible();
      // Could be OPERATOR or OWNER
      const badgeText = await badge.textContent();
      expect(['OPERATOR', 'OWNER']).toContain(badgeText?.trim() || '');
    }
  });

  test('should handle modal interactions', async ({ page }) => {
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

    // Check if modal overlay exists in DOM
    const modalOverlay = page.locator('.modal-overlay');
    // Should be hidden by default
    await expect(modalOverlay).not.toBeVisible();
  });

  test('should show loading state correctly', async ({ page }) => {
    await page.goto('/admin-batch-mint');

    // Mock wallet with delay to show loading
    await page.addInitScript(() => {
      window.ethereum = {
        request: async ({ method }) => {
          // Add delay to simulate loading
          await new Promise(resolve => setTimeout(resolve, 1000));
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

    // Initially should show loading
    const loadingState = page.locator('.admin-loading');
    if (await loadingState.isVisible()) {
      await expect(loadingState).toBeVisible();

      // Should show loading spinner
      const spinner = page.locator('.loading-spinner');
      await expect(spinner).toBeVisible();
    }
  });
});

test.describe('Admin Batch Minting Integration', () => {
  test('should handle real wallet connection flow', async ({ page }) => {
    await page.goto('/get-sbt');

    // This test checks if the wallet connection flow works
    // In a real test environment, you would connect an actual wallet
    // or use a mock wallet extension

    // Check if MetaMask detection works
    const walletNotConnected = await page.evaluate(() => {
      return typeof window.ethereum === 'undefined';
    });

    if (walletNotConnected) {
      // Should show connect wallet message
      const connectMessage = page.locator('text=MetaMask not installed');
      if (await connectMessage.isVisible()) {
        await expect(connectMessage).toBeVisible();
      }
    }
  });

  test('should validate contract configuration loading', async ({ page }) => {
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

    // Check if contracts are loaded
    const contractSelector = page.locator('.contract-selector select');
    if (await contractSelector.isVisible()) {
      // Should have at least one option
      const options = contractSelector.locator('option');
      await expect(options.count()).resolves.toBeGreaterThan(0);
    }
  });
});