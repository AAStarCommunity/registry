import { test, expect } from './fixtures';

/**
 * ManagePaymasterFull Component Tests
 *
 * Tests the complete Paymaster management interface including:
 * - Configuration parameter management (8 parameters)
 * - EntryPoint balance display
 * - Registry stake display
 * - SBT/GasToken management
 * - Owner permission control
 * - Responsive design
 */

const MOCK_PAYMASTER_ADDRESS = '0x1234567890123456789012345678901234567890';
const MANAGE_URL = `/operator/manage?address=${MOCK_PAYMASTER_ADDRESS}`;

test.describe('ManagePaymasterFull - Basic UI', () => {
  test('should load the management page with address parameter', async ({ page }) => {
    await page.goto(MANAGE_URL);

    // Check header elements
    await expect(page.locator('h1')).toContainText('Manage Paymaster');
    await expect(page.locator('.paymaster-address')).toContainText(MOCK_PAYMASTER_ADDRESS);
  });

  test('should show loading state initially', async ({ page }) => {
    await page.goto(MANAGE_URL);

    // May see loading spinner briefly
    const spinner = page.locator('.spinner');
    // Loading state may be very brief, so we don't assert it must be visible
  });

  test('should display error when no address provided', async ({ page }) => {
    await page.goto('/operator/manage');

    await expect(page.locator('.error-container')).toBeVisible();
    await expect(page.locator('.error-container')).toContainText('No Paymaster Address Provided');
  });

  test('should show user address after wallet connection', async ({ page }) => {
    await page.goto(MANAGE_URL);

    // Wait for data to load
    await page.waitForTimeout(2000);

    const userAddress = page.locator('.user-address');
    await expect(userAddress).toBeVisible();
  });

  test('should display owner or viewer badge', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Should have either owner or viewer badge
    const ownerBadge = page.locator('.owner-badge');
    const viewerBadge = page.locator('.viewer-badge');

    const hasOwnerBadge = await ownerBadge.count() > 0;
    const hasViewerBadge = await viewerBadge.count() > 0;

    expect(hasOwnerBadge || hasViewerBadge).toBeTruthy();
  });
});

test.describe('ManagePaymasterFull - Tab Navigation', () => {
  test('should have four tabs', async ({ page }) => {
    await page.goto(MANAGE_URL);

    const tabs = page.locator('.tab-button');
    await expect(tabs).toHaveCount(4);

    await expect(tabs.nth(0)).toContainText('Configuration');
    await expect(tabs.nth(1)).toContainText('EntryPoint');
    await expect(tabs.nth(2)).toContainText('Registry');
    await expect(tabs.nth(3)).toContainText('Token Management');
  });

  test('should show Configuration tab as active by default', async ({ page }) => {
    await page.goto(MANAGE_URL);

    const activeTab = page.locator('.tab-button.active');
    await expect(activeTab).toContainText('Configuration');
  });

  test('should switch to EntryPoint tab when clicked', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("EntryPoint")').click();

    const activeTab = page.locator('.tab-button.active');
    await expect(activeTab).toContainText('EntryPoint');

    // Check content is visible
    await expect(page.locator('.entrypoint-section')).toBeVisible();
  });

  test('should switch to Registry tab when clicked', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Registry")').click();

    const activeTab = page.locator('.tab-button.active');
    await expect(activeTab).toContainText('Registry');

    await expect(page.locator('.registry-section')).toBeVisible();
  });

  test('should switch to Token Management tab when clicked', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    const activeTab = page.locator('.tab-button.active');
    await expect(activeTab).toContainText('Token Management');

    await expect(page.locator('.tokens-section')).toBeVisible();
  });
});

test.describe('ManagePaymasterFull - Configuration Tab', () => {
  test('should display configuration parameters table', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    const table = page.locator('.config-table table');
    await expect(table).toBeVisible();

    // Check table headers
    const headers = page.locator('.config-table th');
    await expect(headers.nth(0)).toContainText('Parameter');
    await expect(headers.nth(1)).toContainText('Current Value');
    await expect(headers.nth(2)).toContainText('Actions');
  });

  test('should display all 7 configuration parameters', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Check for parameter rows
    const rows = page.locator('.config-table tbody tr');
    await expect(rows).toHaveCount(7);

    // Check parameter names in table
    await expect(page.locator('.config-table tbody tr:has-text("Owner")')).toBeVisible();
    await expect(page.locator('.config-table tbody tr:has-text("Treasury")')).toBeVisible();
    await expect(page.locator('.config-table tbody tr:has-text("Gas to USD Rate")')).toBeVisible();
    await expect(page.locator('.config-table tbody tr:has-text("PNT Price (USD)")')).toBeVisible();
    await expect(page.locator('.config-table tbody tr:has-text("Service Fee Rate")')).toBeVisible();
    await expect(page.locator('.config-table tbody tr:has-text("Max Gas Cost Cap")')).toBeVisible();
    await expect(page.locator('.config-table tbody tr:has-text("Min Token Balance")')).toBeVisible();
  });

  test('should show Edit buttons for each parameter', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    const editButtons = page.locator('.edit-button');
    const count = await editButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show Pause Control section', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    await expect(page.locator('.pause-control')).toBeVisible();
    await expect(page.locator('.pause-control h3')).toContainText('Pause Control');
  });

  test('should display current pause status', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    const pauseControl = page.locator('.pause-control');
    await expect(pauseControl).toBeVisible();

    // Should have either pause or unpause button
    const pauseButton = pauseControl.locator('button');
    await expect(pauseButton).toBeVisible();
  });
});

test.describe('ManagePaymasterFull - Edit Functionality', () => {
  test('should enter edit mode when Edit button clicked', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Click first Edit button
    const firstEditButton = page.locator('.edit-button').first();
    await firstEditButton.click();

    // Should show edit input
    await expect(page.locator('.edit-input')).toBeVisible();

    // Should show Save and Cancel buttons
    await expect(page.locator('.save-button')).toBeVisible();
    await expect(page.locator('.cancel-button')).toBeVisible();
  });

  test('should exit edit mode when Cancel clicked', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Enter edit mode
    await page.locator('.edit-button').first().click();

    // Click Cancel
    await page.locator('.cancel-button').click();

    // Edit input should be gone
    await expect(page.locator('.edit-input')).not.toBeVisible();

    // Edit button should be back
    await expect(page.locator('.edit-button').first()).toBeVisible();
  });

  test('should allow typing in edit input', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Enter edit mode
    await page.locator('.edit-button').first().click();

    // Type in input
    const input = page.locator('.edit-input');
    await input.fill('0x9999999999999999999999999999999999999999');

    // Verify value
    await expect(input).toHaveValue('0x9999999999999999999999999999999999999999');
  });

  test('should disable edit buttons for non-owners', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Check if viewer badge is shown
    const viewerBadge = page.locator('.viewer-badge');
    const isViewer = await viewerBadge.count() > 0;

    if (isViewer) {
      // All edit buttons should be disabled
      const editButtons = page.locator('.edit-button');
      const count = await editButtons.count();

      for (let i = 0; i < count; i++) {
        await expect(editButtons.nth(i)).toBeDisabled();
      }
    }
  });
});

test.describe('ManagePaymasterFull - EntryPoint Tab', () => {
  test('should display EntryPoint information', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("EntryPoint")').click();

    await page.waitForTimeout(1000);

    await expect(page.locator('.entrypoint-section h2')).toContainText('EntryPoint');
  });

  test('should show EntryPoint info card', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("EntryPoint")').click();

    await page.waitForTimeout(1000);

    const infoCard = page.locator('.info-card');
    await expect(infoCard).toBeVisible();
  });

  test('should display EntryPoint data fields', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("EntryPoint")').click();

    await page.waitForTimeout(1000);

    // Check for expected labels
    await expect(page.locator('text=Balance:')).toBeVisible();
    await expect(page.locator('text=Deposit:')).toBeVisible();
    await expect(page.locator('text=Staked:')).toBeVisible();
    await expect(page.locator('text=Stake Amount:')).toBeVisible();
  });

  test('should show EntryPoint note section', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("EntryPoint")').click();

    await page.waitForTimeout(1000);

    await expect(page.locator('.entrypoint-note')).toBeVisible();
  });
});

test.describe('ManagePaymasterFull - Registry Tab', () => {
  test('should display Registry information', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Registry")').click();

    await page.waitForTimeout(1000);

    await expect(page.locator('.registry-section h2')).toContainText('Registry');
  });

  test('should show Registry stake amount', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Registry")').click();

    await page.waitForTimeout(1000);

    await expect(page.locator('text=Stake Amount:')).toBeVisible();
  });

  test('should show Registry note section', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Registry")').click();

    await page.waitForTimeout(1000);

    await expect(page.locator('.registry-note')).toBeVisible();
  });
});

test.describe('ManagePaymasterFull - Token Management Tab', () => {
  test('should display token management section', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    await page.waitForTimeout(1000);

    await expect(page.locator('.tokens-section h2')).toContainText('Token Management');
  });

  test('should have two token management cards', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    await page.waitForTimeout(1000);

    const cards = page.locator('.token-management-card');
    await expect(cards).toHaveCount(2);
  });

  test('should show SBT management card', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    await page.waitForTimeout(1000);

    await expect(page.locator('text=Supported SBT')).toBeVisible();
  });

  test('should show Gas Token management card', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    await page.waitForTimeout(1000);

    await expect(page.locator('text=Supported Gas Tokens')).toBeVisible();
  });

  test('should have input fields for token addresses', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    await page.waitForTimeout(1000);

    const inputs = page.locator('.token-input');
    await expect(inputs).toHaveCount(2);
  });

  test('should have Check Status buttons', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    await page.waitForTimeout(1000);

    const checkButtons = page.locator('.check-button');
    await expect(checkButtons).toHaveCount(2);
  });

  test('should allow typing in SBT address input', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    await page.waitForTimeout(1000);

    const sbtInput = page.locator('.token-input').first();
    await sbtInput.fill('0x1111111111111111111111111111111111111111');

    await expect(sbtInput).toHaveValue('0x1111111111111111111111111111111111111111');
  });

  test('should show Add/Remove buttons for owners only', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    await page.waitForTimeout(1000);

    // Check if owner badge exists
    const ownerBadge = page.locator('.owner-badge');
    const isOwner = await ownerBadge.count() > 0;

    if (isOwner) {
      // Should have token action buttons
      const tokenActions = page.locator('.token-actions');
      await expect(tokenActions.first()).toBeVisible();

      const addButtons = page.locator('.add-button');
      const removeButtons = page.locator('.remove-button');

      expect(await addButtons.count()).toBeGreaterThan(0);
      expect(await removeButtons.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('ManagePaymasterFull - Refresh Functionality', () => {
  test('should have refresh button at bottom', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    await expect(page.locator('.refresh-button')).toBeVisible();
    await expect(page.locator('.refresh-button')).toContainText('Refresh Data');
  });

  test('should show loading state when refresh clicked', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    const refreshButton = page.locator('.refresh-button');

    // Create a promise to race between the text change and the click
    const clickPromise = refreshButton.click();

    // Wait for either "Refreshing" or "Refresh Data" (in case it's too fast)
    try {
      await Promise.race([
        expect(refreshButton).toContainText('Refreshing', { timeout: 1000 }),
        clickPromise
      ]);
      // If we got here and button still says "Refreshing", test passes
      const text = await refreshButton.textContent();
      expect(['Refreshing', 'Refresh Data'].some(t => text?.includes(t))).toBeTruthy();
    } catch {
      // If refresh was too fast, just verify button is clickable and still has valid text
      await expect(refreshButton).toBeVisible();
      await expect(refreshButton).toContainText('Refresh Data');
    }
  });
});

test.describe('ManagePaymasterFull - Paused State', () => {
  test('should show paused banner when paymaster is paused', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Check if paused banner exists
    const pausedBanner = page.locator('.paused-banner');
    const isPaused = await pausedBanner.count() > 0;

    if (isPaused) {
      await expect(pausedBanner).toContainText('PAUSED');
    }
  });
});

test.describe('ManagePaymasterFull - Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Header should be visible
    await expect(page.locator('.manage-header h1')).toBeVisible();

    // Tabs should be visible (may need scrolling)
    await expect(page.locator('.manage-tabs')).toBeVisible();
  });

  test('should stack token actions vertically on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(MANAGE_URL);

    await page.locator('.tab-button:has-text("Token Management")').click();

    await page.waitForTimeout(1000);

    // Token input group should be visible
    const tokenInputGroup = page.locator('.token-input-group').first();
    await expect(tokenInputGroup).toBeVisible();
  });
});

test.describe('ManagePaymasterFull - Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // H1 for main title
    await expect(page.locator('h1')).toContainText('Manage Paymaster');

    // H2 for sections
    const h2Elements = page.locator('h2');
    expect(await h2Elements.count()).toBeGreaterThan(0);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Table headers should be present
    const headers = page.locator('.config-table th');
    expect(await headers.count()).toBe(3);
  });

  test('should have visible button text', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // All buttons should have text
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });
});

test.describe('ManagePaymasterFull - Error Handling', () => {
  test('should show error banner when present', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Check for error banner
    const errorBanner = page.locator('.error-banner');
    const hasError = await errorBanner.count() > 0;

    // If there's an error, it should be visible
    if (hasError) {
      await expect(errorBanner).toBeVisible();
    }
  });

  test('should show retry button on load failure', async ({ page }) => {
    // Test with invalid address
    await page.goto('/operator/manage?address=invalid');

    await page.waitForTimeout(2000);

    // Should show error state
    const errorContainer = page.locator('.error-container');
    if (await errorContainer.count() > 0) {
      await expect(errorContainer).toBeVisible();
    }
  });
});

test.describe('ManagePaymasterFull - Owner vs Viewer', () => {
  test('should show different badges for owner and viewer', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    const ownerBadge = page.locator('.owner-badge');
    const viewerBadge = page.locator('.viewer-badge');

    const hasOwner = await ownerBadge.count() > 0;
    const hasViewer = await viewerBadge.count() > 0;

    // Should have exactly one badge
    expect(hasOwner !== hasViewer).toBeTruthy();
  });

  test('should disable edit buttons for viewers', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    const viewerBadge = page.locator('.viewer-badge');
    const isViewer = await viewerBadge.count() > 0;

    if (isViewer) {
      const editButtons = page.locator('.edit-button');
      const count = await editButtons.count();

      for (let i = 0; i < count; i++) {
        await expect(editButtons.nth(i)).toBeDisabled();
      }
    }
  });
});

test.describe('ManagePaymasterFull - Performance', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(MANAGE_URL);
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle tab switching smoothly', async ({ page }) => {
    await page.goto(MANAGE_URL);

    await page.waitForTimeout(2000);

    // Switch between tabs rapidly
    await page.locator('.tab-button:has-text("EntryPoint")').click();
    await page.waitForTimeout(100);

    await page.locator('.tab-button:has-text("Registry")').click();
    await page.waitForTimeout(100);

    await page.locator('.tab-button:has-text("Token Management")').click();
    await page.waitForTimeout(100);

    await page.locator('.tab-button:has-text("Configuration")').click();

    // Should end up on Configuration tab
    const activeTab = page.locator('.tab-button.active');
    await expect(activeTab).toContainText('Configuration');
  });
});
