/**
 * Playwright Screenshot Capture - Deploy Wizard Flow
 *
 * Captures screenshots of the complete 7-step deployment wizard
 * for documentation purposes
 *
 * Created: 2025-10-23
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Screenshot configuration
const SCREENSHOT_CONFIG = {
  outputDir: 'docs/screenshots',
  fullPage: true,
  animations: 'disabled' as const,
};

const TEST_CONFIG = {
  communityName: 'Demo Community',
  treasury: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  timeout: 3000,
};

test.describe('Wizard Flow Screenshots', () => {
  test('Capture complete wizard flow (Steps 1-5)', async ({ page }) => {
    console.log('📸 Starting screenshot capture for wizard flow...');

    // Configure page for better screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });

    // === Step 0: Landing Page ===
    console.log('📸 Capturing: Landing Page');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, '00-landing-page.png'),
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    console.log('✅ Saved: 00-landing-page.png');

    // === Step 1: Configuration Form ===
    console.log('📸 Capturing: Step 1 - Configuration');
    await page.goto('/operator/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, '01-step1-configuration.png'),
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    console.log('✅ Saved: 01-step1-configuration.png');

    // Fill form and proceed to Step 2
    const communityInput = page.locator('input[name="communityName"], input[id="communityName"]');
    await communityInput.fill(TEST_CONFIG.communityName);
    const treasuryInput = page.locator('input[name="treasury"], input[id="treasury"]');
    await treasuryInput.fill(TEST_CONFIG.treasury);

    const nextButton = page.locator('button:has-text("Next"), button.btn-next, button[type="submit"]');
    await nextButton.click();
    await page.waitForTimeout(2000);

    // === Step 2: Wallet Check (Test Mode) ===
    console.log('📸 Capturing: Step 2 - Wallet Check');
    await page.goto('/operator/wizard?testMode=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, '02-step2-wallet-check.png'),
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    console.log('✅ Saved: 02-step2-wallet-check.png');

    // Proceed to Step 3
    const nextButton2 = page.locator('button:has-text("Next"), button:has-text("继续")').first();
    await nextButton2.click();
    await page.waitForTimeout(2000);

    // === Step 3: Stake Option Selection ===
    console.log('📸 Capturing: Step 3 - Stake Option (Before Selection)');
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, '03a-step3-stake-option.png'),
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    console.log('✅ Saved: 03a-step3-stake-option.png');

    // Select Standard mode
    const optionCards = page.locator('.stake-option-card');
    await optionCards.first().click();
    await page.waitForTimeout(1500);

    console.log('📸 Capturing: Step 3 - Stake Option (After Selection)');
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, '03b-step3-stake-selected.png'),
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    console.log('✅ Saved: 03b-step3-stake-selected.png');

    // Proceed to Step 4
    const nextButton3 = page.locator('button:has-text("继续")');
    await expect(nextButton3).toBeEnabled({ timeout: 5000 });
    await nextButton3.click();
    await page.waitForTimeout(2000);

    // === Step 4: Resource Preparation ===
    console.log('📸 Capturing: Step 4 - Resource Preparation');
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, '04-step4-resource-preparation.png'),
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    console.log('✅ Saved: 04-step4-resource-preparation.png');

    // Proceed to Step 5
    const nextButton4 = page.locator('button:has-text("继续部署")');
    await expect(nextButton4).toBeEnabled({ timeout: 5000 });
    await nextButton4.click();
    await page.waitForTimeout(2000);

    // === Step 5: Deposit to EntryPoint ===
    console.log('📸 Capturing: Step 5 - Deposit to EntryPoint');
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, '05-step5-deposit-entrypoint.png'),
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    console.log('✅ Saved: 05-step5-deposit-entrypoint.png');

    console.log('');
    console.log('✅ Screenshot capture complete!');
    console.log('📁 Screenshots saved to: docs/screenshots/');
    console.log('');
    console.log('📋 Captured screenshots:');
    console.log('  - 00-landing-page.png');
    console.log('  - 01-step1-configuration.png');
    console.log('  - 02-step2-wallet-check.png');
    console.log('  - 03a-step3-stake-option.png');
    console.log('  - 03b-step3-stake-selected.png');
    console.log('  - 04-step4-resource-preparation.png');
    console.log('  - 05-step5-deposit-entrypoint.png');
  });

  test('Capture Super Mode option', async ({ page }) => {
    console.log('📸 Capturing Super Mode variation...');

    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate to Step 3 with test mode
    await page.goto('/operator/wizard?testMode=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate to Step 3
    const nextButton2 = page.locator('button:has-text("Next"), button:has-text("继续")').first();
    await nextButton2.click();
    await page.waitForTimeout(2000);

    // Select Super mode (second option)
    const optionCards = page.locator('.stake-option-card');
    await optionCards.nth(1).click();
    await page.waitForTimeout(1500);

    console.log('📸 Capturing: Step 3 - Super Mode Selected');
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, '03c-step3-super-mode-selected.png'),
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    console.log('✅ Saved: 03c-step3-super-mode-selected.png');

    // Proceed to Step 4
    const nextButton3 = page.locator('button:has-text("继续")');
    await expect(nextButton3).toBeEnabled({ timeout: 5000 });
    await nextButton3.click();
    await page.waitForTimeout(2000);

    // Capture Step 4 for Super Mode
    console.log('📸 Capturing: Step 4 - Resource Preparation (Super Mode)');
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, '04b-step4-super-mode.png'),
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    console.log('✅ Saved: 04b-step4-super-mode.png');

    console.log('✅ Super Mode screenshots captured!');
  });

  test('Capture mobile views', async ({ page }) => {
    console.log('📸 Capturing mobile view screenshots...');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X

    // Landing page mobile
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, 'mobile-00-landing.png'),
      fullPage: true,
    });
    console.log('✅ Saved: mobile-00-landing.png');

    // Step 1 mobile
    await page.goto('/operator/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, 'mobile-01-step1.png'),
      fullPage: true,
    });
    console.log('✅ Saved: mobile-01-step1.png');

    // Step 3 mobile
    await page.goto('/operator/wizard?testMode=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const nextButton = page.locator('button:has-text("Next"), button:has-text("继续")').first();
    await nextButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_CONFIG.outputDir, 'mobile-03-step3.png'),
      fullPage: true,
    });
    console.log('✅ Saved: mobile-03-step3.png');

    console.log('✅ Mobile screenshots captured!');
  });
});
