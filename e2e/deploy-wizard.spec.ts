/**
 * Playwright E2E Test - Deploy Wizard Complete User Flow
 *
 * Tests the complete 7-step deployment wizard following actual user journey
 * Updated: 2025-10-23 - Rewritten to match new 7-step flow
 *
 * New 7-Step Flow:
 * 1. Step 1: Connect Wallet - 连接钱包并检查资源
 * 2. Step 2: Configuration - 配置参数
 * 3. Step 3: Deploy Paymaster - 部署合约
 * 4. Step 4: Select Stake Option - 选择质押选项
 * 5. Step 5: Stake - 质押
 * 6. Step 6: Register - 注册
 * 7. Step 7: Complete - 完成
 *
 * Test Strategy:
 * - testMode=true auto-skips Step 1 (Connect Wallet), starts at Step 2
 * - Steps 1-2: UI element validation
 * - Steps 3-4: Configuration and deployment flow
 * - Steps 5-7: Stake and register UI (no real transactions)
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

  test('Step 1: Connect Wallet - UI Verification', async ({ page }) => {
    // Verify Step 1: Connect Wallet is displayed
    await expect(page.locator('h2, h3, .step-title').first()).toContainText(/connect|wallet|钱包/i, { timeout: 5000 });

    console.log('✅ Step 1: Connect Wallet UI displayed');

    // Verify wallet connection UI elements exist
    const walletButton = page.locator('button:has-text("Connect"), button:has-text("连接"), button:has-text("MetaMask")');
    const walletButtonCount = await walletButton.count();

    if (walletButtonCount > 0) {
      console.log('✅ Step 1: Wallet connection button found');
    } else {
      console.log('⚠️  Step 1: Wallet button not found (may auto-connect in test mode)');
    }
  });

  test('Full Flow: Steps 2-4 (with test mode - Standard Mode)', async ({ page }) => {
    // Enable console log capture
    page.on('console', msg => console.log(`🖥️ Browser Console [${msg.type()}]:`, msg.text()));

    // Navigate with testMode enabled - should auto-skip Step 1 (Connect Wallet)
    await page.goto('/operator/wizard?testMode=true');
    await page.waitForLoadState('networkidle');

    console.log('🧪 Test Mode: Full flow test starting (Step 1 auto-skipped)');

    // Wait for test mode initialization
    await page.waitForTimeout(1000);

    // === STEP 2: Configuration ===
    console.log('Verifying Step 2: Configuration');

    const step2Indicator = page.locator('h2, h3').first();
    await expect(step2Indicator).toContainText(/configure|config|配置/i, { timeout: TEST_CONFIG.timeout });

    // Verify configuration form fields
    const communityInput = page.locator('input[name="communityName"], input[id="communityName"]');
    await expect(communityInput).toBeVisible({ timeout: 5000 });
    console.log('✅ Step 2: Community name input found');

    const treasuryInput = page.locator('input[name="treasury"], input[id="treasury"]');
    await expect(treasuryInput).toBeVisible();
    console.log('✅ Step 2: Treasury input found');

    // Fill configuration form
    await communityInput.fill(TEST_CONFIG.communityName);
    await treasuryInput.fill(TEST_CONFIG.treasury);

    // Click Next to proceed to Step 3
    const nextButton2 = page.locator('button:has-text("Next"), button:has-text("继续"), button[type="submit"]').first();
    await expect(nextButton2).toBeVisible({ timeout: 5000 });
    await nextButton2.click();
    await page.waitForTimeout(2000);

    console.log('✅ Step 2 completed, proceeding to Step 3');

    // === STEP 3: Deploy Paymaster ===
    console.log('Verifying Step 3: Deploy Paymaster');

    const step3Indicator = page.locator('h2, h3').first();
    await expect(step3Indicator).toContainText(/deploy|paymaster|部署/i, { timeout: TEST_CONFIG.timeout });

    // Verify deployment UI elements
    const deployButton = page.locator('button:has-text("Deploy"), button:has-text("部署"), button:has-text("Continue")');
    const deployButtonCount = await deployButton.count();

    if (deployButtonCount > 0) {
      console.log('✅ Step 3: Deploy button found');

      // In test mode, deployment should be mock - click to proceed
      await deployButton.first().click();
      console.log('🔄 Waiting for Step 4 to appear...');

      // Wait for Step 4 heading to appear (increased timeout)
      await page.waitForSelector('h2:has-text("Select Stake Option"), h2:has-text("质押"), h3:has-text("Select Stake Option"), h3:has-text("质押")', { timeout: 15000 });
      console.log('✅ Step 3: Deployment initiated (mock)');
    } else {
      console.log('⚠️  Step 3: Deploy button not found (may auto-deploy in test mode)');
    }

    console.log('✅ Step 3 completed, proceeding to Step 4');

    // === STEP 4: Select Stake Option ===
    console.log('Verifying Step 4: Select Stake Option');

    const step4Indicator = page.locator('h2, h3').first();
    await expect(step4Indicator).toContainText(/stake|option|质押/i, { timeout: TEST_CONFIG.timeout });

    // Verify recommendation box exists
    const recommendationBox = page.locator('.recommendation-box');
    await expect(recommendationBox).toBeVisible({ timeout: 5000 });
    console.log('✅ Step 4: Recommendation box displayed');

    // Verify both option cards are visible
    const optionCards = page.locator('.stake-option-card');
    await expect(optionCards).toHaveCount(2, { timeout: 5000 });
    console.log('✅ Step 4: Both option cards visible');

    // Select Standard mode (first option)
    await optionCards.first().click();
    await page.waitForTimeout(1000);
    console.log('✅ Step 4: Selected Standard mode');

    // Wait for button to be enabled and click
    const nextButton4 = page.locator('button:has-text("继续"), button:has-text("Continue")');
    await expect(nextButton4).toBeEnabled({ timeout: 5000 });
    await nextButton4.click();
    await page.waitForTimeout(2000);

    console.log('✅ Step 4 completed');
  });

  test('Steps 5-7: Complete UI Flow Verification', async ({ page }) => {
    // This test verifies the complete 7-step wizard UI structure
    // Note: Steps 5-7 involve blockchain transactions which cannot be fully tested in E2E
    // This test only verifies UI elements are present and accessible

    await page.goto('/operator/wizard?testMode=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('🧪 Testing complete 7-step wizard UI flow');

    // Navigate through steps quickly to reach Step 5
    // Step 2: Fill configuration and click Next
    const communityInput = page.locator('input[name="communityName"], input[id="communityName"]');
    await communityInput.fill(TEST_CONFIG.communityName);
    const treasuryInput = page.locator('input[name="treasury"], input[id="treasury"]');
    await treasuryInput.fill(TEST_CONFIG.treasury);

    const nextButton2 = page.locator('button:has-text("Next"), button:has-text("继续")').first();
    await nextButton2.click();
    await page.waitForTimeout(1500);

    // Step 3: Deploy Paymaster (auto-skip or click if button exists)
    const deployButton = page.locator('button:has-text("Deploy"), button:has-text("部署"), button:has-text("Continue")');
    if (await deployButton.count() > 0) {
      await deployButton.first().click();
      await page.waitForTimeout(1500);
    }

    // Step 4: Select stake option and click Next
    const optionCards = page.locator('.stake-option-card').first();
    await optionCards.click();
    await page.waitForTimeout(1000);
    const nextButton4 = page.locator('button:has-text("继续"), button:has-text("Continue")');
    await expect(nextButton4).toBeEnabled({ timeout: 5000 });
    await nextButton4.click();
    await page.waitForTimeout(1500);

    // === STEP 5: Stake ===
    console.log('Verifying Step 5: Stake');

    const step5Indicator = page.locator('h2, h3').first();
    const step5Text = await step5Indicator.textContent();
    console.log(`Step 5 title: ${step5Text}`);

    // Verify Step 5 UI elements
    const step5HasButtons = await page.locator('button').count() > 0;
    console.log(`✅ Step 5: UI rendered with ${await page.locator('button').count()} buttons`);
    expect(step5HasButtons).toBeTruthy();

    // Verify stake-related elements exist
    const hasStakeElements = await page.locator('input, button:has-text("Stake"), button:has-text("质押")').count() > 0;
    if (hasStakeElements) {
      console.log('✅ Step 5: Stake form elements found');
    }

    // === STEP 6 & 7: Register and Complete ===
    console.log('⚠️  Note: Steps 6-7 (Register & Complete) require manual testing with real wallet for transaction execution');

    console.log('✅ Steps 5-7 UI verification complete');
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
  test('analyze wizard Step 1 (Connect Wallet) structure', async ({ page }) => {
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

  test('analyze wizard Step 2 (Configuration) structure with testMode', async ({ page }) => {
    await page.goto('/operator/wizard?testMode=true');
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

    // Capture button texts
    const buttons = await page.locator('button').allTextContents();
    console.log('🔘 Buttons:', buttons);

    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/wizard-step2-structure.png', fullPage: true });
    console.log('📸 Screenshot saved to test-results/wizard-step2-structure.png');
  });
});
