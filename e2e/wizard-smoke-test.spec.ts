/**
 * Smoke test for new wizard - simple single page test
 * Verifies basic rendering and key elements
 */

import { test, expect } from '@playwright/test';

test.describe('Wizard Smoke Test', () => {
  test('new wizard page renders correctly', async ({ page }) => {
    // Navigate to the new wizard
    await page.goto('http://localhost:5173/operator/wizard-new');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that we're not on an error page
    await expect(page.locator('body')).not.toContainText('404');
    await expect(page.locator('body')).not.toContainText('Page not found');

    // Check for wizard header
    const header = page.locator('h1');
    await expect(header).toBeVisible();
    await expect(header).toContainText('部署向导');

    // Check for progress bar container
    await expect(page.locator('.wizard-progress')).toBeVisible();

    // Check that all 3 steps are present
    const steps = page.locator('.progress-step');
    await expect(steps).toHaveCount(3);

    // Check first step is active
    const firstStep = steps.first();
    await expect(firstStep).toHaveClass(/active/);

    // Check step labels exist
    await expect(page.locator('.step-label').first()).toBeVisible();

    console.log('✅ Wizard page loaded successfully');
    console.log('✅ All key elements present');
    console.log('✅ Progress bar rendered');
    console.log('✅ Step 1 is active');
  });

  test('old wizard page still works', async ({ page }) => {
    // Navigate to the old wizard
    await page.goto('http://localhost:5173/operator/wizard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that page loads (old wizard has different structure)
    await expect(page.locator('body')).not.toContainText('404');

    console.log('✅ Old wizard still accessible');
  });
});
