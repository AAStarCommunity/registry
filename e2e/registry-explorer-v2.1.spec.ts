/**
 * Registry Explorer v2.1 E2E Test
 *
 * Tests the fix for v2.1 ABI format issue where 'external' keyword
 * was causing ethers.js to fail parsing contract calls.
 */

import { test, expect } from '@playwright/test';

test.describe('Registry Explorer v2.1', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console messages to capture errors
    page.on('console', (msg) => {
      const text = msg.text();
      console.log(`[Browser Console ${msg.type()}]:`, text);
    });

    // Navigate to Registry Explorer
    await page.goto('/explorer');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load v2.1 without ABI decode errors', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Click on v2.1 (Latest) button
    const v21Button = page.getByText('v2.1 (Latest)', { exact: false });
    await expect(v21Button).toBeVisible();
    await v21Button.click();

    // Wait for potential errors to appear
    await page.waitForTimeout(2000);

    // Check for ABI-related errors
    const hasAbiError = errors.some(err =>
      err.includes('could not decode result data') ||
      err.includes('BAD_DATA') ||
      err.includes('getCommunityCount')
    );

    // Should NOT have ABI decode errors
    expect(hasAbiError).toBe(false);

    // Should show zero paymasters (fresh deployment)
    await expect(page.getByText('0', { exact: false })).toBeVisible();
  });

  test('should display correct contract address for v2.1', async ({ page }) => {
    // Expected v2.1 address
    const expectedAddress = '0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3';

    // Click v2.1 button
    await page.getByText('v2.1 (Latest)', { exact: false }).click();
    await page.waitForTimeout(1000);

    // Check if address is displayed somewhere (in debug logs or UI)
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain(expectedAddress.toLowerCase());
  });

  test('should handle zero communities gracefully', async ({ page }) => {
    // Click v2.1 button
    await page.getByText('v2.1 (Latest)', { exact: false }).click();

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Should not show error state
    const errorText = page.getByText('Failed to query Registry', { exact: false });
    await expect(errorText).not.toBeVisible();

    // Should show 0 active paymasters
    await expect(page.getByText('0', { exact: false })).toBeVisible();
  });

  test('should log correct debug information', async ({ page }) => {
    const logs: string[] = [];

    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    // Click v2.1 button
    await page.getByText('v2.1 (Latest)', { exact: false }).click();
    await page.waitForTimeout(1500);

    // Check for expected debug logs
    const hasVersionLog = logs.some(log => log.includes('Version selected: v2.1'));
    const hasAddressLog = logs.some(log => log.includes('0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3'));

    expect(hasVersionLog).toBe(true);
    expect(hasAddressLog).toBe(true);
  });

  test('should switch between versions without errors', async ({ page }) => {
    // Click v2.1
    await page.getByText('v2.1 (Latest)', { exact: false }).click();
    await page.waitForTimeout(1000);

    // Click v2.0
    await page.getByText('v2.0', { exact: false }).click();
    await page.waitForTimeout(1000);

    // Click v2.1 again
    await page.getByText('v2.1 (Latest)', { exact: false }).click();
    await page.waitForTimeout(1000);

    // Should not crash or show errors
    await expect(page.getByText('Registry Explorer')).toBeVisible();
  });
});

test.describe('Registry Explorer ABI Format Validation', () => {
  test('v2.0 should work with corrected ABI', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/explorer');
    await page.waitForLoadState('networkidle');

    // Click v2.0 button
    await page.getByText('v2.0', { exact: false }).click();
    await page.waitForTimeout(2000);

    // Should not have decode errors
    const hasDecodeError = errors.some(err =>
      err.includes('could not decode result data')
    );
    expect(hasDecodeError).toBe(false);
  });

  test('v1.2 should continue working', async ({ page }) => {
    await page.goto('/explorer');
    await page.waitForLoadState('networkidle');

    // Click v1.2 button
    await page.getByText('v1.2', { exact: false }).click();
    await page.waitForTimeout(2000);

    // Should load without crashing
    await expect(page.getByText('Registry Explorer')).toBeVisible();
  });
});
