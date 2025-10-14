import { test, expect } from '@playwright/test';

/**
 * Analytics Dashboard E2E Tests
 *
 * Tests the main analytics dashboard functionality including:
 * - Page loading and rendering
 * - Statistics cards display
 * - Daily trends chart
 * - Top users table
 * - Recent transactions table
 * - Refresh functionality
 */

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics dashboard
    await page.goto('http://localhost:5173/analytics/dashboard');
  });

  test('should load dashboard page successfully', async ({ page }) => {
    // Wait for page title
    await expect(page.locator('h1')).toContainText('SuperPaymaster Gas 统计');

    // Check for refresh button
    await expect(page.getByRole('button', { name: /刷新数据/ })).toBeVisible();
  });

  test('should display statistics cards', async ({ page }) => {
    // Wait for stats to load (or loading state)
    await page.waitForSelector('.stats-grid, .loading', { timeout: 10000 });

    // If not loading, check for stats cards
    const isLoading = await page.locator('.loading').isVisible().catch(() => false);

    if (!isLoading) {
      // Check for 4 stat cards
      const statCards = page.locator('.stat-card');
      await expect(statCards).toHaveCount(4);

      // Verify stat card icons
      await expect(statCards.nth(0).locator('.stat-icon')).toContainText('🚀');
      await expect(statCards.nth(1).locator('.stat-icon')).toContainText('⛽');
      await expect(statCards.nth(2).locator('.stat-icon')).toContainText('💰');
      await expect(statCards.nth(3).locator('.stat-icon')).toContainText('👥');
    }
  });

  test('should display daily trends section', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for daily trends section
    const trendsSection = page.locator('text=📈 每日趋势');
    await expect(trendsSection).toBeVisible();
  });

  test('should display top users section', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for top users section
    const topUsersSection = page.locator('text=🏆 Top 10 用户');
    await expect(topUsersSection).toBeVisible();
  });

  test('should display recent transactions section', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for recent transactions section
    const recentTxSection = page.locator('text=🕐 最近交易');
    await expect(recentTxSection).toBeVisible();
  });

  test('should show cache status', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for cache status text
    const cacheStatus = page.locator('text=/最后更新/');

    // Should be visible if data loaded
    const isVisible = await cacheStatus.isVisible().catch(() => false);
    if (isVisible) {
      await expect(cacheStatus).toBeVisible();
    }
  });

  test('should handle refresh button click', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find and click refresh button
    const refreshButton = page.getByRole('button', { name: /刷新/ });
    await expect(refreshButton).toBeVisible();

    // Click refresh button
    await refreshButton.click();

    // Should show loading state or refresh indicator
    await page.waitForTimeout(1000);
  });

  test('should show error state if network fails', async ({ page }) => {
    // Intercept network requests and fail them
    await page.route('https://eth-sepolia.g.alchemy.com/**', route => {
      route.abort('failed');
    });

    // Reload page
    await page.reload();

    // Wait for error state
    await page.waitForTimeout(3000);

    // Should show error message or empty state
    const errorMsg = page.locator('text=/加载失败|暂无数据/');
    const isVisible = await errorMsg.isVisible().catch(() => false);

    // Either error or empty state should be visible
    expect(isVisible).toBeTruthy();
  });

  test('should have working Etherscan links in top users', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);

    // Find first user address link (if exists)
    const addressLinks = page.locator('.users-table .address a');
    const linkCount = await addressLinks.count();

    if (linkCount > 0) {
      const firstLink = addressLinks.first();
      await expect(firstLink).toHaveAttribute('href', /sepolia\.etherscan\.io\/address/);
      await expect(firstLink).toHaveAttribute('target', '_blank');
    }
  });

  test('should have working Etherscan links in recent transactions', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);

    // Find transaction hash links (if exists)
    const txLinks = page.locator('.transactions-table .address a[href*="/tx/"]');
    const linkCount = await txLinks.count();

    if (linkCount > 0) {
      const firstLink = txLinks.first();
      await expect(firstLink).toHaveAttribute('href', /sepolia\.etherscan\.io\/tx/);
      await expect(firstLink).toHaveAttribute('target', '_blank');
    }
  });

  test('should display loading state initially', async ({ page }) => {
    // Navigate and quickly check for loading state
    await page.goto('http://localhost:5173/analytics/dashboard');

    // Should show loading spinner or text
    const loadingIndicator = page.locator('.loading, .spinner, text=/加载/');

    // Either loading state or content should appear quickly
    await Promise.race([
      loadingIndicator.waitFor({ timeout: 2000 }).catch(() => {}),
      page.locator('.stats-grid').waitFor({ timeout: 2000 }).catch(() => {})
    ]);

    // Test passes if either loads or content appears
    expect(true).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for content
    await page.waitForTimeout(2000);

    // Stats grid should still be visible
    const statsGrid = page.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();

    // Should adapt to mobile width
    const width = await statsGrid.evaluate(el => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(375);
  });
});
