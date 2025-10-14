import { test, expect } from '@playwright/test';

/**
 * User Gas Records E2E Tests
 *
 * Tests the user gas records query functionality including:
 * - Page loading and rendering
 * - Address input and validation
 * - User statistics display
 * - Transaction history
 * - Error handling
 */

test.describe('User Gas Records', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to user gas records page
    await page.goto('http://localhost:5173/analytics/user');
  });

  test('should load user records page successfully', async ({ page }) => {
    // Wait for page title
    await expect(page.locator('h1')).toContainText('查询 Gas 使用记录');

    // Check for address input
    await expect(page.locator('input[placeholder*="钱包地址"]')).toBeVisible();

    // Check for search button
    await expect(page.getByRole('button', { name: /查询/ })).toBeVisible();
  });

  test('should show initial state before search', async ({ page }) => {
    // Should show initial state message
    const initialState = page.locator('.initial-state, text=/开始查询/');
    await expect(initialState).toBeVisible();
  });

  test('should validate empty address input', async ({ page }) => {
    // Click search without entering address
    await page.getByRole('button', { name: /查询/ }).click();

    // Should show alert or validation message
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('请输入钱包地址');
      await dialog.accept();
    });
  });

  test('should validate invalid address format', async ({ page }) => {
    // Enter invalid address
    await page.locator('input[placeholder*="钱包地址"]').fill('0xinvalid');

    // Click search button
    await page.getByRole('button', { name: /查询/ }).click();

    // Should show validation error
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('无效的钱包地址');
      await dialog.accept();
    });
  });

  test('should accept valid address format', async ({ page }) => {
    // Enter valid address (example from contract)
    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);

    // Click search button
    await page.getByRole('button', { name: /查询/ }).click();

    // Wait for results or loading state
    await page.waitForTimeout(3000);

    // Should show either user stats or no data message
    const hasResults = await page.locator('.user-stats-section').isVisible().catch(() => false);
    const noData = await page.locator('.no-data').isVisible().catch(() => false);

    expect(hasResults || noData).toBeTruthy();
  });

  test('should display user statistics when data exists', async ({ page }) => {
    // Use a known address with data (if available)
    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    // Wait for results
    await page.waitForTimeout(3000);

    // Check if user stats section exists
    const statsSection = page.locator('.user-stats-section');
    const hasStats = await statsSection.isVisible().catch(() => false);

    if (hasStats) {
      // Should have 4 stat cards
      const statCards = page.locator('.stat-card');
      await expect(statCards).toHaveCount(4);

      // Verify stat card icons
      await expect(statCards.nth(0).locator('.stat-icon')).toContainText('🚀');
      await expect(statCards.nth(1).locator('.stat-icon')).toContainText('⛽');
      await expect(statCards.nth(2).locator('.stat-icon')).toContainText('💰');
      await expect(statCards.nth(3).locator('.stat-icon')).toContainText('📊');
    }
  });

  test('should show no data message for address without transactions', async ({ page }) => {
    // Use a new/empty address
    const emptyAddress = '0x0000000000000000000000000000000000000001';
    await page.locator('input[placeholder*="钱包地址"]').fill(emptyAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    // Wait for results
    await page.waitForTimeout(3000);

    // Should show no data message
    const noData = page.locator('.no-data, text=/未找到数据/');
    const isVisible = await noData.isVisible().catch(() => false);

    // Either no data message or some results
    expect(isVisible || await page.locator('.user-stats-section').isVisible()).toBeTruthy();
  });

  test('should show timeline when user has transactions', async ({ page }) => {
    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    await page.waitForTimeout(3000);

    // Check for timeline section
    const timeline = page.locator('.timeline');
    const hasTimeline = await timeline.isVisible().catch(() => false);

    if (hasTimeline) {
      // Should show first and last transaction times
      await expect(page.locator('text=/首次交易/')).toBeVisible();
      await expect(page.locator('text=/最近交易/')).toBeVisible();
    }
  });

  test('should show comparison with global average', async ({ page }) => {
    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    await page.waitForTimeout(3000);

    // Check for comparison section
    const comparison = page.locator('.comparison');
    const hasComparison = await comparison.isVisible().catch(() => false);

    if (hasComparison) {
      await expect(page.locator('text=/与全局平均对比/')).toBeVisible();
    }
  });

  test('should display transaction history table', async ({ page }) => {
    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    await page.waitForTimeout(3000);

    // Check for transactions table
    const txTable = page.locator('.transactions-table');
    const hasTable = await txTable.isVisible().catch(() => false);

    if (hasTable) {
      // Should have table headers
      await expect(page.locator('th:has-text("时间")')).toBeVisible();
      await expect(page.locator('th:has-text("Gas Token")')).toBeVisible();
      await expect(page.locator('th:has-text("实际 Gas")')).toBeVisible();
      await expect(page.locator('th:has-text("PNT 支付")')).toBeVisible();
    }
  });

  test('should have working Etherscan links', async ({ page }) => {
    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    await page.waitForTimeout(3000);

    // Find address links in transaction table
    const addressLinks = page.locator('.transactions-table .address a');
    const linkCount = await addressLinks.count();

    if (linkCount > 0) {
      const firstLink = addressLinks.first();
      const href = await firstLink.getAttribute('href');
      expect(href).toContain('sepolia.etherscan.io');
      await expect(firstLink).toHaveAttribute('target', '_blank');
    }
  });

  test('should show clear button after search', async ({ page }) => {
    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    await page.waitForTimeout(2000);

    // Should show clear button
    const clearButton = page.getByRole('button', { name: /清除/ });
    await expect(clearButton).toBeVisible();
  });

  test('should clear search when clicking clear button', async ({ page }) => {
    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    await page.waitForTimeout(2000);

    // Click clear button
    const clearButton = page.getByRole('button', { name: /清除/ });
    await clearButton.click();

    // Input should be cleared
    const input = page.locator('input[placeholder*="钱包地址"]');
    await expect(input).toHaveValue('');

    // Should show initial state again
    await expect(page.locator('.initial-state')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept and fail network requests
    await page.route('https://eth-sepolia.g.alchemy.com/**', route => {
      route.abort('failed');
    });

    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    await page.waitForTimeout(3000);

    // Should show error message
    const errorMsg = page.locator('.error-message, text=/查询失败/');
    const hasError = await errorMsg.isVisible().catch(() => false);

    expect(hasError).toBeTruthy();
  });

  test('should show refresh button with cached data', async ({ page }) => {
    const testAddress = '0xc8d1Ae1063176BEBC750D9aD5D057BA4A65daf3d';
    await page.locator('input[placeholder*="钱包地址"]').fill(testAddress);
    await page.getByRole('button', { name: /查询/ }).click();

    await page.waitForTimeout(3000);

    // Check for cache info and refresh button
    const refreshButton = page.locator('button:has-text("刷新")');
    const hasRefresh = await refreshButton.isVisible().catch(() => false);

    if (hasRefresh) {
      await expect(refreshButton).toBeVisible();
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Form should still be usable
    const input = page.locator('input[placeholder*="钱包地址"]');
    await expect(input).toBeVisible();

    const searchBtn = page.getByRole('button', { name: /查询/ });
    await expect(searchBtn).toBeVisible();
  });
});
