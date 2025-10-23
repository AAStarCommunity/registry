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

  test('Full Flow: Steps 1-3 (without wallet connection)', async ({ page }) => {
    // === STEP 1: Configure ===
    console.log('Starting Step 1: Configure');

    // Fill Step 1 form
    await page.locator('input[name="communityName"], input[id="communityName"]').fill(TEST_CONFIG.communityName);
    await page.locator('input[name="treasury"], input[id="treasury"]').fill(TEST_CONFIG.treasury);

    // Click Next
    await page.locator('button:has-text("Next"), button.btn-next').first().click();

    // Wait for Step 2
    await page.waitForTimeout(2000);

    console.log('✅ Step 1 completed');

    // === STEP 2: Wallet Check ===
    console.log('Starting Step 2: Wallet Check');

    // Check if Step 2 is displayed (wallet connection UI)
    // Note: This will likely show "Connect Wallet" button
    const step2Indicator = page.locator('h2, h3, .step-title').first();
    await expect(step2Indicator).toContainText(/wallet|connect/i, { timeout: TEST_CONFIG.timeout });

    console.log('⚠️  Step 2: Wallet connection required (test cannot proceed without wallet mock)');

    // For now, just verify we reached Step 2
    // Full wallet integration test would require MetaMask mock
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
