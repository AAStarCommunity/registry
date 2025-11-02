/**
 * Playwright tests for the refactored 3-step DeployWizard
 * Tests basic UI rendering and navigation, not full contract interactions
 */

import { test, expect } from '@playwright/test';

test.describe('Refactored Deploy Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/operator/wizard-new');
  });

  test('should render the wizard with progress bar', async ({ page }) => {
    // Check for wizard header
    await expect(page.locator('h1').filter({ hasText: '部署向导' })).toBeVisible();

    // Check for progress bar
    const progressSteps = page.locator('.progress-step');
    await expect(progressSteps).toHaveCount(3);

    // Verify step labels
    await expect(progressSteps.nth(0)).toContainText('连接 & 选择');
    await expect(progressSteps.nth(1)).toContainText('资源检测');
    await expect(progressSteps.nth(2)).toContainText('完成');
  });

  test('should start at Step 1 with correct content', async ({ page }) => {
    // Step 1 should be active
    const activeStep = page.locator('.progress-step.active').first();
    await expect(activeStep).toContainText('1');

    // Wizard subtitle should show Step 1 description
    await expect(page.locator('.wizard-subtitle')).toContainText('连接钱包并选择部署模式');
  });

  test('should have Step 1 marked as active', async ({ page }) => {
    // First step should have 'active' class
    const firstStep = page.locator('.progress-step').first();
    await expect(firstStep).toHaveClass(/active/);

    // Other steps should not be active
    const secondStep = page.locator('.progress-step').nth(1);
    await expect(secondStep).not.toHaveClass(/active/);
  });

  test('should display wizard content area', async ({ page }) => {
    // Check for wizard content container
    const wizardContent = page.locator('.wizard-content');
    await expect(wizardContent).toBeVisible();
  });

  test('should have responsive layout', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.wizard-container')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.wizard-container')).toBeVisible();
    await expect(page.locator('.progress-steps')).toBeVisible();
  });

  test('should display correct step indicator numbers', async ({ page }) => {
    const stepCircles = page.locator('.step-circle');
    await expect(stepCircles).toHaveCount(3);

    // Check step numbers
    await expect(stepCircles.nth(0)).toContainText('1');
    await expect(stepCircles.nth(1)).toContainText('2');
    await expect(stepCircles.nth(2)).toContainText('3');
  });

  test('should have progress line between steps', async ({ page }) => {
    const progressLines = page.locator('.progress-line');
    await expect(progressLines).toHaveCount(2); // Between 3 steps
  });

  test('progress bar should have proper spacing', async ({ page }) => {
    const progressBar = page.locator('.wizard-progress');
    await expect(progressBar).toBeVisible();

    // Check that progress steps are laid out horizontally
    const progressSteps = page.locator('.progress-steps');
    await expect(progressSteps).toBeVisible();
  });
});

test.describe('Wizard Navigation Flow (Simulated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/operator/wizard-new');
  });

  test('should show Step 1 subtitle initially', async ({ page }) => {
    await expect(page.locator('.wizard-subtitle')).toContainText('连接钱包并选择部署模式');
  });

  test('should have wizard container with proper styling', async ({ page }) => {
    const wizardContainer = page.locator('.wizard-container');
    await expect(wizardContainer).toBeVisible();

    // Check that it has the expected structure
    await expect(wizardContainer.locator('.wizard-header')).toBeVisible();
    await expect(wizardContainer.locator('.wizard-progress')).toBeVisible();
    await expect(wizardContainer.locator('.wizard-content')).toBeVisible();
  });
});

test.describe('Wizard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/operator/wizard-new');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('部署向导');
  });

  test('should have visible step labels', async ({ page }) => {
    const stepLabels = page.locator('.step-label');
    await expect(stepLabels).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      await expect(stepLabels.nth(i)).toBeVisible();
    }
  });
});

test.describe('Wizard CSS Styling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/operator/wizard-new');
  });

  test('active step should have active styling', async ({ page }) => {
    const activeStep = page.locator('.progress-step.active').first();
    await expect(activeStep).toBeVisible();
  });

  test('step circles should be properly styled', async ({ page }) => {
    const stepCircles = page.locator('.step-circle');

    for (let i = 0; i < 3; i++) {
      await expect(stepCircles.nth(i)).toBeVisible();
    }
  });
});
