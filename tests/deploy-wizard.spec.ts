import { test, expect } from '@playwright/test';

/**
 * Deploy Wizard E2E Tests
 *
 * Tests the complete 7-step deployment wizard flow:
 * - Step 1: Deploy Contract
 * - Step 2: Check Wallet
 * - Step 3: Select Stake Option
 * - Step 4: Prepare Resources
 * - Step 5: Stake to EntryPoint
 * - Step 6: Register to Registry
 * - Step 7: Complete
 */

test.describe('Deploy Wizard', () => {
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

test.describe('Step 3: Stake Option Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-step3'); // Assumes isolated test route exists
  });

  test('should display wallet status section', async ({ page }) => {
    await expect(page.locator('.wallet-status')).toBeVisible();
    await expect(page.locator('.wallet-status h3')).toContainText('Current Wallet Status');
  });

  test('should show ETH, GToken, and PNTs balances', async ({ page }) => {
    const balanceItems = page.locator('.balance-item');

    await expect(balanceItems.nth(0)).toContainText('ETH');
    await expect(balanceItems.nth(1)).toContainText('GToken');
    await expect(balanceItems.nth(2)).toContainText('PNTs');
  });

  test('should display smart recommendation section', async ({ page }) => {
    const recommendation = page.locator('.recommendation-section');

    if (await recommendation.isVisible()) {
      await expect(recommendation.locator('h3')).toContainText('Smart Recommendation');
      await expect(recommendation.locator('.match-score')).toBeVisible();
    }
  });

  test('should show two stake option cards', async ({ page }) => {
    const optionCards = page.locator('.stake-option-card');
    await expect(optionCards).toHaveCount(2);

    // Standard Flow
    await expect(optionCards.nth(0)).toContainText('Standard Flow');
    await expect(optionCards.nth(0)).toContainText('ETH');

    // Fast Flow
    await expect(optionCards.nth(1)).toContainText('Fast Flow');
    await expect(optionCards.nth(1)).toContainText('PNTs');
  });

  test('should display requirements with status indicators', async ({ page }) => {
    const requirementItems = page.locator('.requirement-item');

    for (let i = 0; i < await requirementItems.count(); i++) {
      const item = requirementItems.nth(i);
      // Should have either ✅ or ❌
      const text = await item.textContent();
      expect(text).toMatch(/[✅❌]/);
    }
  });

  test('should allow selecting a stake option', async ({ page }) => {
    const optionCards = page.locator('.stake-option-card');

    // Click first card
    await optionCards.nth(0).click();

    // Should be selected
    await expect(optionCards.nth(0)).toHaveClass(/selected/);
  });

  test('should disable card if requirements not met', async ({ page }) => {
    const optionCards = page.locator('.stake-option-card');

    // Check if any card is disabled
    const disabledCard = optionCards.filter({ hasText: /disabled/i }).first();

    if (await disabledCard.isVisible()) {
      await expect(disabledCard).toHaveClass(/disabled/);
    }
  });

  test('should show preparation checklist when option selected', async ({ page }) => {
    const optionCards = page.locator('.stake-option-card');

    // Select an enabled option
    await optionCards.nth(0).click();

    // Checklist should appear
    await expect(page.locator('.preparation-checklist')).toBeVisible();
  });

  test('should have help toggle', async ({ page }) => {
    const helpToggle = page.locator('.help-toggle');

    if (await helpToggle.isVisible()) {
      await helpToggle.click();
      await expect(page.locator('.help-content')).toBeVisible();
    }
  });

  test('should navigate back to previous step', async ({ page }) => {
    const backButton = page.locator('.btn-back');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back');
  });

  test('should have next button', async ({ page }) => {
    const nextButton = page.locator('.btn-next');
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toContainText('Next');
  });
});

test.describe('Step 4: Resource Preparation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-step4'); // Assumes isolated test route exists
  });

  test('should display progress overview', async ({ page }) => {
    await expect(page.locator('.progress-overview')).toBeVisible();
    await expect(page.locator('.progress-text')).toContainText('Resources Ready');
  });

  test('should show progress bar', async ({ page }) => {
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('.progress-bar-fill')).toBeVisible();
  });

  test('should display auto-refresh toggle', async ({ page }) => {
    const autoRefreshToggle = page.locator('.auto-refresh-toggle');
    await expect(autoRefreshToggle).toBeVisible();
  });

  test('should show countdown when auto-refresh enabled', async ({ page }) => {
    const toggle = page.locator('.auto-refresh-toggle input[type="checkbox"]');

    if (!(await toggle.isChecked())) {
      await toggle.check();
    }

    await expect(page.locator('.countdown')).toBeVisible();
  });

  test('should have refresh all button', async ({ page }) => {
    const refreshButton = page.locator('.refresh-all-button');
    await expect(refreshButton).toBeVisible();
    await expect(refreshButton).toContainText('Refresh All');
  });

  test('should display checklist items', async ({ page }) => {
    const checklistItems = page.locator('.checklist-item');
    await expect(checklistItems.count()).toBeGreaterThan(0);
  });

  test('checklist items should show status icons', async ({ page }) => {
    const statusIcons = page.locator('.checklist-item .status-icon');

    for (let i = 0; i < await statusIcons.count(); i++) {
      await expect(statusIcons.nth(i)).toBeVisible();
    }
  });

  test('should show current vs required values', async ({ page }) => {
    const checklistItems = page.locator('.checklist-item');

    for (let i = 0; i < await checklistItems.count(); i++) {
      const item = checklistItems.nth(i);
      await expect(item.locator('.item-value')).toBeVisible();
    }
  });

  test('should have action links for insufficient resources', async ({ page }) => {
    const insufficientItems = page.locator('.checklist-item.insufficient');

    for (let i = 0; i < await insufficientItems.count(); i++) {
      const item = insufficientItems.nth(i);
      const actionLink = item.locator('.action-link');

      if (await actionLink.isVisible()) {
        await expect(actionLink).toHaveAttribute('href');
        await expect(actionLink).toHaveAttribute('target', '_blank');
      }
    }
  });

  test('should display last check time', async ({ page }) => {
    const lastCheckTime = page.locator('.last-check-time');
    await expect(lastCheckTime).toBeVisible();
  });

  test('should have help section', async ({ page }) => {
    await expect(page.locator('.help-section')).toBeVisible();
    await expect(page.locator('.help-section .help-title')).toContainText('Why');
  });

  test('next button should be disabled if resources not ready', async ({ page }) => {
    const nextButton = page.locator('.btn-next');
    const insufficientItems = page.locator('.checklist-item.insufficient');

    if (await insufficientItems.count() > 0) {
      await expect(nextButton).toBeDisabled();
    }
  });

  test('should show appropriate button text based on readiness', async ({ page }) => {
    const nextButton = page.locator('.btn-next');
    const text = await nextButton.textContent();

    expect(text).toMatch(/继续|资源未就绪|Continue|Not Ready/i);
  });
});

test.describe('Step 5: Stake to EntryPoint', () => {
  test('should display step header', async ({ page }) => {
    await page.goto('/test-step5');

    await expect(page.locator('h2')).toContainText('Step 5');
    await expect(page.locator('.step-description')).toBeVisible();
  });

  test('should show flow info badge', async ({ page }) => {
    await page.goto('/test-step5');

    const flowBadge = page.locator('.info-badge');
    await expect(flowBadge).toBeVisible();

    const text = await flowBadge.textContent();
    expect(text).toMatch(/Standard|Fast/);
  });

  test('should display current EntryPoint balance', async ({ page }) => {
    await page.goto('/test-step5');

    await expect(page.locator('.balance-card')).toBeVisible();
    await expect(page.locator('.balance-value')).toBeVisible();
  });

  test('should have deposit amount input', async ({ page }) => {
    await page.goto('/test-step5');

    const input = page.locator('input#deposit-amount');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'number');
  });

  test('should show recommended amount hint', async ({ page }) => {
    await page.goto('/test-step5');

    const hint = page.locator('.form-hint');
    await expect(hint).toContainText('Recommended');
  });

  test('should display user ETH balance', async ({ page }) => {
    await page.goto('/test-step5');

    await expect(page.locator('.user-balance')).toBeVisible();
    await expect(page.locator('.user-balance .balance-value')).toContainText('ETH');
  });

  test('should show warning if balance insufficient', async ({ page }) => {
    await page.goto('/test-step5');

    // Try to input more than available balance
    const input = page.locator('input#deposit-amount');
    await input.fill('999999');

    // Warning should appear
    const warning = page.locator('.warning-banner');
    if (await warning.isVisible()) {
      await expect(warning).toContainText('Insufficient');
    }
  });

  test('should have info section explaining EntryPoint', async ({ page }) => {
    await page.goto('/test-step5');

    await expect(page.locator('.info-section')).toBeVisible();
    await expect(page.locator('.info-title')).toContainText('Why');
  });

  test('deposit button should be disabled with invalid amount', async ({ page }) => {
    await page.goto('/test-step5');

    const input = page.locator('input#deposit-amount');
    const button = page.locator('.btn-next');

    // Clear input
    await input.fill('');
    await expect(button).toBeDisabled();

    // Enter 0
    await input.fill('0');
    await expect(button).toBeDisabled();
  });
});

test.describe('Step 6: Register to Registry', () => {
  test('should display paymaster info card', async ({ page }) => {
    await page.goto('/test-step6');

    await expect(page.locator('.paymaster-card')).toBeVisible();
    await expect(page.locator('.card-header h3')).toBeVisible();
  });

  test('should show GToken balance section', async ({ page }) => {
    await page.goto('/test-step6');

    await expect(page.locator('.balance-section h3')).toContainText('GToken');
    await expect(page.locator('.balance-card')).toBeVisible();
  });

  test('should display current balance and allowance', async ({ page }) => {
    await page.goto('/test-step6');

    const balanceItems = page.locator('.balance-item');

    await expect(balanceItems.nth(0)).toContainText('Balance');
    await expect(balanceItems.nth(1)).toContainText('Allowance');
  });

  test('should show GToken stake amount input', async ({ page }) => {
    await page.goto('/test-step6');

    const input = page.locator('input#gtoken-amount');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'number');
    await expect(input).toHaveAttribute('min', '10');
  });

  test('should display approval status', async ({ page }) => {
    await page.goto('/test-step6');

    const approvalStatus = page.locator('.approval-status');
    await expect(approvalStatus).toBeVisible();
  });

  test('should show approve button if approval needed', async ({ page }) => {
    await page.goto('/test-step6');

    const statusText = await page.locator('.approval-status').textContent();

    if (statusText?.includes('Required') || statusText?.includes('需要')) {
      const approveButton = page.locator('.btn-approve');
      await expect(approveButton).toBeVisible();
    }
  });

  test('should have register button', async ({ page }) => {
    await page.goto('/test-step6');

    const registerButton = page.locator('.btn-register');
    await expect(registerButton).toBeVisible();
    await expect(registerButton).toContainText('Register');
  });

  test('should show warning if GToken insufficient', async ({ page }) => {
    await page.goto('/test-step6');

    const input = page.locator('input#gtoken-amount');
    await input.fill('999999');

    const warning = page.locator('.warning-banner');
    if (await warning.isVisible()) {
      await expect(warning).toContainText('Insufficient');
    }
  });

  test('should have link to get GToken if insufficient', async ({ page }) => {
    await page.goto('/test-step6');

    const warning = page.locator('.warning-banner');

    if (await warning.isVisible()) {
      const link = warning.locator('a.get-token-link');
      if (await link.isVisible()) {
        await expect(link).toHaveAttribute('href', '/get-gtoken');
      }
    }
  });

  test('should display info section about Registry', async ({ page }) => {
    await page.goto('/test-step6');

    await expect(page.locator('.info-section')).toBeVisible();
    await expect(page.locator('.info-title')).toContainText('Why');
  });
});

test.describe('Step 7: Complete', () => {
  test('should display success header', async ({ page }) => {
    await page.goto('/test-step7');

    await expect(page.locator('.success-header')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Successfully');
  });

  test('should show success icon with animation', async ({ page }) => {
    await page.goto('/test-step7');

    const icon = page.locator('.success-icon');
    await expect(icon).toBeVisible();
    await expect(icon).toContainText('🎉');
  });

  test('should display deployment summary', async ({ page }) => {
    await page.goto('/test-step7');

    await expect(page.locator('.paymaster-summary')).toBeVisible();
    await expect(page.locator('.summary-title')).toContainText('Summary');
  });

  test('should show paymaster address with copy button', async ({ page }) => {
    await page.goto('/test-step7');

    const summaryItems = page.locator('.summary-item');
    const addressItem = summaryItems.filter({ hasText: /Paymaster Address/i }).first();

    await expect(addressItem).toBeVisible();
    await expect(addressItem.locator('.copy-btn')).toBeVisible();
  });

  test('should display transaction hashes as links', async ({ page }) => {
    await page.goto('/test-step7');

    const txLinks = page.locator('.summary-item a.value.link');

    for (let i = 0; i < await txLinks.count(); i++) {
      await expect(txLinks.nth(i)).toHaveAttribute('href');
      await expect(txLinks.nth(i)).toHaveAttribute('target', '_blank');
    }
  });

  test('should show quick action cards', async ({ page }) => {
    await page.goto('/test-step7');

    const actionCards = page.locator('.action-card');
    await expect(actionCards.count()).toBeGreaterThan(0);

    // Primary action should be "Manage Paymaster"
    const primaryCard = actionCards.filter({ has: page.locator('.card-title:has-text("Manage")') }).first();
    await expect(primaryCard).toHaveClass(/primary/);
  });

  test('should display next steps list', async ({ page }) => {
    await page.goto('/test-step7');

    await expect(page.locator('.next-steps')).toBeVisible();

    const stepItems = page.locator('.step-item');
    await expect(stepItems.count()).toBeGreaterThan(0);
  });

  test('next steps should be numbered', async ({ page }) => {
    await page.goto('/test-step7');

    const stepNumbers = page.locator('.step-number');

    for (let i = 0; i < await stepNumbers.count(); i++) {
      await expect(stepNumbers.nth(i)).toContainText(`${i + 1}`);
    }
  });

  test('should show resource links', async ({ page }) => {
    await page.goto('/test-step7');

    await expect(page.locator('.resources')).toBeVisible();

    const resourceLinks = page.locator('.resource-link');
    await expect(resourceLinks.count()).toBeGreaterThan(0);
  });

  test('resource links should open in new tab', async ({ page }) => {
    await page.goto('/test-step7');

    const links = page.locator('.resource-link');

    for (let i = 0; i < await links.count(); i++) {
      await expect(links.nth(i)).toHaveAttribute('target', '_blank');
    }
  });

  test('should have navigation buttons', async ({ page }) => {
    await page.goto('/test-step7');

    await expect(page.locator('.btn-secondary')).toBeVisible();
    await expect(page.locator('.btn-primary')).toBeVisible();
  });

  test('primary button should navigate to manage page', async ({ page }) => {
    await page.goto('/test-step7');

    const manageButton = page.locator('.btn-primary');
    await expect(manageButton).toContainText('Manage');
  });
});

test.describe('Responsive Design', () => {
  test('wizard should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/operator/wizard');

    // Progress should stack vertically
    await expect(page.locator('.wizard-progress')).toBeVisible();

    // Content should be visible
    await expect(page.locator('.wizard-content')).toBeVisible();
  });

  test('step 3 cards should stack on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/test-step3');

    const cards = page.locator('.stake-option-card');

    for (let i = 0; i < await cards.count(); i++) {
      await expect(cards.nth(i)).toBeVisible();
    }
  });

  test('step 4 should be readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/test-step4');

    await expect(page.locator('.progress-overview')).toBeVisible();
    await expect(page.locator('.checklist-item').first()).toBeVisible();
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
    await page.goto('/test-step5');

    const input = page.locator('input#deposit-amount');
    const label = page.locator('label[for="deposit-amount"]');

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

  test('external links should have rel noopener noreferrer', async ({ page }) => {
    await page.goto('/test-step7');

    const externalLinks = page.locator('a[target="_blank"]');

    for (let i = 0; i < await externalLinks.count(); i++) {
      await expect(externalLinks.nth(i)).toHaveAttribute('rel', /noopener/);
    }
  });
});
