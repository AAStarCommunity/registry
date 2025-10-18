import { test, expect } from '@playwright/test';

/**
 * Deploy Wizard E2E Tests
 *
 * Tests the complete 7-step deployment wizard flow at /operator/wizard
 */

test.describe('Deploy Wizard - Basic UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/operator/wizard');
  });

  test('should load the wizard page with correct title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Deploy Your Paymaster');
    await expect(page.locator('.wizard-subtitle')).toBeVisible();
  });

  test('should display all 7 steps in progress indicator', async ({ page }) => {
    const steps = page.locator('.progress-step');
    await expect(steps).toHaveCount(7);

    // Check step titles
    await expect(steps.nth(0)).toContainText('Deploy Contract');
    await expect(steps.nth(1)).toContainText('Check Wallet');
    await expect(steps.nth(2)).toContainText('Select Stake Option');
    await expect(steps.nth(3)).toContainText('Prepare Resources');
    await expect(steps.nth(4)).toContainText('Stake to EntryPoint');
    await expect(steps.nth(5)).toContainText('Register to Registry');
    await expect(steps.nth(6)).toContainText('Manage Paymaster');
  });

  test('should show Step 1 (Config Form) as active by default', async ({ page }) => {
    // Step 1 should be active
    const activeStep = page.locator('.progress-step.active');
    await expect(activeStep).toContainText('Deploy Contract');

    // Content should show config form
    await expect(page.locator('h2')).toContainText('Step 1');
  });

  test('should display step icons', async ({ page }) => {
    const icons = ['🚀', '💼', '⚡', '📦', '🔒', '📝', '⚙️'];

    for (let i = 0; i < icons.length; i++) {
      const stepIcon = page.locator('.progress-step').nth(i).locator('.progress-step-circle');
      await expect(stepIcon).toContainText(icons[i]);
    }
  });

  test('should have wizard help section', async ({ page }) => {
    await expect(page.locator('.wizard-help h3')).toContainText('Need Help');

    // Check help links
    const helpLinks = page.locator('.wizard-help a');
    await expect(helpLinks).toHaveCount(3);
  });

  test('help section should have correct links', async ({ page }) => {
    const links = page.locator('.wizard-help a');

    await expect(links.nth(0)).toHaveAttribute('href', '/docs/deployment-guide');
    await expect(links.nth(1)).toHaveAttribute('href', '/demo?role=operator');
    await expect(links.nth(2)).toHaveAttribute('href', 'https://discord.gg/aastar');
  });

  test('help links should open in new tab', async ({ page }) => {
    const links = page.locator('.wizard-help a');

    for (let i = 0; i < await links.count(); i++) {
      await expect(links.nth(i)).toHaveAttribute('target', '_blank');
      await expect(links.nth(i)).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
});

test.describe('Deploy Wizard - Step 1 (Config Form)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/operator/wizard');
  });

  test('should display all required form fields', async ({ page }) => {
    await expect(page.locator('#communityName')).toBeVisible();
    await expect(page.locator('#treasury')).toBeVisible();
    await expect(page.locator('#gasToUSDRate')).toBeVisible();
    await expect(page.locator('#pntPriceUSD')).toBeVisible();
    await expect(page.locator('#serviceFeeRate')).toBeVisible();
    await expect(page.locator('#maxGasCostCap')).toBeVisible();
    await expect(page.locator('#minTokenBalance')).toBeVisible();
  });

  test('should show validation error for invalid community name', async ({ page }) => {
    const input = page.locator('#communityName');
    await input.fill('ab'); // Too short
    await input.blur();

    await expect(page.locator('.error-message')).toContainText('at least 3 characters');
  });

  test('should show validation error for invalid treasury address', async ({ page }) => {
    const input = page.locator('#treasury');
    await input.fill('invalid-address');
    await input.blur();

    await expect(page.locator('.error-message')).toContainText('Invalid Ethereum address');
  });

  test('should have cancel and next buttons', async ({ page }) => {
    await expect(page.locator('.btn-cancel')).toBeVisible();
    await expect(page.locator('.btn-next')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('wizard should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/operator/wizard');

    // Progress should be visible
    await expect(page.locator('.wizard-progress')).toBeVisible();

    // Content should be visible
    await expect(page.locator('.wizard-content')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('wizard should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/operator/wizard');

    // H1 for main title
    await expect(page.locator('h1')).toBeVisible();

    // H2 for step title
    await expect(page.locator('h2')).toBeVisible();
  });

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/operator/wizard');

    const input = page.locator('#communityName');
    const label = page.locator('label[for="communityName"]');

    await expect(label).toBeVisible();
  });

  test('buttons should be keyboard accessible', async ({ page }) => {
    await page.goto('/operator/wizard');

    const buttons = page.locator('button');

    for (let i = 0; i < Math.min(await buttons.count(), 3); i++) {
      await buttons.nth(i).focus();
      await expect(buttons.nth(i)).toBeFocused();
    }
  });
});
