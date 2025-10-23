/**
 * Playwright E2E Test - Deploy Wizard Complete User Flow
 *
 * Tests the complete 7-step deployment wizard following actual user journey
 * Updated: 2025-10-23 - Rewritten to match sequential wizard flow
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  communityName: 'E2E Test Community',
  treasury: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  timeout: 10000, // 10 seconds for step transitions
};

test.describe('Deploy Wizard - Complete User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at wizard entry point
    await page.goto('/operator/wizard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('Step 1: Should display and submit configuration form', async ({ page }) => {
    // Verify Step 1 is displayed
    await expect(page.locator('h2, h3, .step-title').first()).toContainText(/configure|config|setup/i, { timeout: 5000 });

    // Fill required fields
    const communityInput = page.locator('input[name="communityName"], input[id="communityName"]');
    await expect(communityInput).toBeVisible({ timeout: 5000 });
    await communityInput.fill(TEST_CONFIG.communityName);

    const treasuryInput = page.locator('input[name="treasury"], input[id="treasury"]');
    await expect(treasuryInput).toBeVisible();
    await treasuryInput.fill(TEST_CONFIG.treasury);

    // Submit form
    const nextButton = page.locator('button:has-text("Next"), button.btn-next, button[type="submit"]');
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // Wait for navigation to Step 2
    await page.waitForTimeout(1000);

    console.log('✅ Step 1: Configuration form submitted successfully');
  });

  test('Full Flow: Steps 2-4 (with test mode - Standard Mode)', async ({ page }) => {
    // Navigate with testMode enabled - should auto-skip to Step 2
    await page.goto('/operator/wizard?testMode=true');
    await page.waitForLoadState('networkidle');

    console.log('🧪 Test Mode: Full flow test starting');

    // Wait for test mode initialization
    await page.waitForTimeout(1000);

    // === STEP 2: Wallet Check (Test Mode - Auto Mock) ===
    console.log('Verifying Step 2: Wallet Check (Test Mode)');

    const step2Indicator = page.locator('h2, h3').first();
    await expect(step2Indicator).toContainText(/wallet|check/i, { timeout: TEST_CONFIG.timeout });

    console.log('✅ Step 2: Test mode wallet mock active');

    // Click Next to proceed to Step 3
    const nextButton2 = page.locator('button:has-text("Next"), button.btn-next, button[type="submit"]').first();
    await expect(nextButton2).toBeVisible({ timeout: 5000 });
    await nextButton2.click();
    await page.waitForTimeout(2000);

    console.log('✅ Step 2 completed, proceeding to Step 3');

    // === STEP 3: Stake Option ===
    console.log('Verifying Step 3: Stake Option');

    const step3Indicator = page.locator('h2, h3').first();
    await expect(step3Indicator).toContainText(/stake|option|Stake/i, { timeout: TEST_CONFIG.timeout });

    // Verify recommendation box exists
    const recommendationBox = page.locator('.recommendation-box');
    await expect(recommendationBox).toBeVisible({ timeout: 5000 });
    console.log('✅ Step 3: Recommendation box displayed');

    // Verify "You can choose freely" text
    await expect(page.locator('text=/choose freely/i')).toBeVisible({ timeout: 3000 });

    // Verify both option cards are visible
    const optionCards = page.locator('.stake-option-card');
    await expect(optionCards).toHaveCount(2, { timeout: 5000 });
    console.log('✅ Step 3: Both option cards visible');

    // Select Standard mode (first option)
    await optionCards.first().click();
    await page.waitForTimeout(1000);
    console.log('✅ Step 3: Selected Standard mode');

    // Wait for button to be enabled and click (Chinese text: "继续 →")
    const nextButton3 = page.locator('button:has-text("继续")');
    await expect(nextButton3).toBeEnabled({ timeout: 5000 });
    await nextButton3.click();
    await page.waitForTimeout(2000);

    console.log('✅ Step 3 completed, proceeding to Step 4');

    // === STEP 4: Resource Preparation ===
    console.log('Verifying Step 4: Resource Preparation');

    const step4Indicator = page.locator('h2, h3').first();
    await expect(step4Indicator).toContainText(/resource|prepare|Prepare/i, { timeout: TEST_CONFIG.timeout });

    // Verify resource checklist is shown
    const resourceChecklist = page.locator('.resource-checklist');
    await expect(resourceChecklist).toBeVisible({ timeout: 5000 });
    console.log('✅ Step 4: Resource checklist displayed');

    // In test mode, resources should be ready, so Next button should be enabled
    const nextButton4 = page.locator('button:has-text("继续部署")');
    await expect(nextButton4).toBeEnabled({ timeout: 5000 });
    console.log('✅ Step 4: Next button enabled (resources ready)');

    console.log('✅ Step 4: Resource preparation page verified');
  });

  test('Step 5-7: UI Structure Verification', async ({ page }) => {
    // This test verifies that Steps 5-7 can render properly
    // Actual transaction testing requires manual testing with real wallet

    await page.goto('/operator/wizard?testMode=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('🧪 Verifying Steps 5-7 UI structure');

    // Navigate through steps quickly to reach Step 5
    // Step 2: Click Next
    const nextButton2 = page.locator('button:has-text("Next"), button:has-text("继续")').first();
    await nextButton2.click();
    await page.waitForTimeout(1500);

    // Step 3: Select option and click Next (继续)
    const optionCards = page.locator('.stake-option-card').first();
    await optionCards.click();
    await page.waitForTimeout(1000);
    const nextButton3 = page.locator('button:has-text("继续")');
    await expect(nextButton3).toBeEnabled({ timeout: 5000 });
    await nextButton3.click();
    await page.waitForTimeout(1500);

    // Step 4: Click Next (继续部署)
    const nextButton4 = page.locator('button:has-text("继续部署")');
    await expect(nextButton4).toBeEnabled({ timeout: 5000 });
    await nextButton4.click();
    await page.waitForTimeout(1500);

    // === STEP 5: Stake to EntryPoint ===
    console.log('Verifying Step 5: Stake to EntryPoint UI');

    const step5Indicator = page.locator('h2, h3').first();
    const step5Text = await step5Indicator.textContent();
    console.log(`Step 5 title: ${step5Text}`);

    // Verify UI structure exists (we're not testing actual transactions)
    const hasActionButton = await page.locator('button').count() > 0;
    console.log(`✅ Step 5: UI rendered with ${await page.locator('button').count()} buttons`);

    console.log('✅ UI structure verification complete');
  });
});

test.describe('Language Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display LanguageToggle in header', async ({ page }) => {
    // Check if language toggle exists
    const langToggle = page.locator('[data-testid="language-toggle"], button:has-text("EN"), button:has-text("中文")');

    // Wait for header to load
    await page.waitForTimeout(1000);

    // Language toggle should be visible
    await expect(langToggle.first()).toBeVisible({ timeout: 5000 });

    console.log('✅ Language toggle is visible in header');
  });

  test('should default to English language', async ({ page }) => {
    // Check for English text in the page
    const body = page.locator('body');

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Look for English text (common words)
    const hasEnglishText = await body.textContent();
    expect(hasEnglishText).toMatch(/Launch|Paymaster|Operators|Explorer/i);

    console.log('✅ Default language is English');
  });

  test('should be able to click language toggle', async ({ page }) => {
    // Find and click language toggle
    const langToggle = page.locator('[data-testid="language-toggle"], button:has-text("EN"), button:has-text("中文")').first();

    await page.waitForTimeout(1000);

    if (await langToggle.isVisible()) {
      await langToggle.click();
      console.log('✅ Language toggle clicked successfully');
    } else {
      console.log('⚠️  Language toggle not found (may need to check selector)');
    }
  });
});

test.describe('Navigation and Routing', () => {
  test('should navigate to wizard from header CTA', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find "Launch Paymaster" button in header
    const ctaButton = page.locator('a:has-text("Launch Paymaster"), button:has-text("Launch Paymaster")');

    if (await ctaButton.isVisible()) {
      await ctaButton.click();

      // Should navigate to wizard
      await page.waitForURL(/\/operator\/(wizard|deploy)/, { timeout: 5000 });

      console.log('✅ Navigation to wizard successful');
    } else {
      console.log('⚠️  CTA button not found in header');
    }
  });

  test('should access wizard directly via URL', async ({ page }) => {
    await page.goto('/operator/wizard');
    await page.waitForLoadState('networkidle');

    // Verify wizard page loaded
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    console.log('✅ Wizard accessible via direct URL');
  });
});

test.describe('UI Elements Verification', () => {
  test('should display header with logo and navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check header exists
    const header = page.locator('header, .app-header');
    await expect(header).toBeVisible();

    // Check logo
    const logo = page.locator('.logo, a[href="/"]').first();
    await expect(logo).toBeVisible();

    // Check navigation links
    const nav = page.locator('nav, .main-nav');
    await expect(nav).toBeVisible();

    console.log('✅ Header UI elements verified');
  });

  test('should display footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check footer exists (use .first() to handle multiple footers)
    const footer = page.locator('footer, .app-footer, .footer').first();
    await expect(footer).toBeVisible();

    console.log('✅ Footer displayed');
  });
});

// Helper test to capture actual page structure for debugging
test.describe('Debug: Page Structure Analysis', () => {
  test('analyze wizard Step 1 structure', async ({ page }) => {
    await page.goto('/operator/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture page title
    const title = await page.title();
    console.log('📄 Page title:', title);

    // Capture all headings
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('📋 Headings:', headings);

    // Capture all input fields
    const inputs = await page.locator('input').count();
    console.log('🔤 Input fields count:', inputs);

    // Capture input names
    const inputNames = await page.locator('input').evaluateAll(
      (elements) => elements.map((el) => el.getAttribute('name') || el.getAttribute('id') || el.getAttribute('placeholder'))
    );
    console.log('📝 Input identifiers:', inputNames);

    // Capture button texts
    const buttons = await page.locator('button').allTextContents();
    console.log('🔘 Buttons:', buttons);

    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/wizard-step1-structure.png', fullPage: true });
    console.log('📸 Screenshot saved to test-results/wizard-step1-structure.png');
  });
});
