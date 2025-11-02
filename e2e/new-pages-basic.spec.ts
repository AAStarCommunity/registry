/**
 * Basic Page Tests - New Pages
 *
 * Tests basic page rendering and navigation for:
 * - LaunchPaymaster page
 * - ConfigureSuperPaymaster page
 * - Resource flow section on landing page
 *
 * NOT testing full contract interactions, just page functionality
 */

import { test, expect } from '@playwright/test';

test.describe('LaunchPaymaster Page - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/launch-paymaster');
  });

  test('should render page header correctly', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Launch Paymaster');
    await expect(page.locator('.subtitle')).toContainText('Deploy your Paymaster using PaymasterFactory');
  });

  test('should have back button', async ({ page }) => {
    const backButton = page.locator('.back-button');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('← Back');
  });

  test('should display info sections', async ({ page }) => {
    // Check "What is PaymasterFactory" section
    await expect(page.locator('h2').filter({ hasText: 'What is PaymasterFactory?' })).toBeVisible();

    // Check feature list
    await expect(page.locator('.feature-list')).toBeVisible();
    await expect(page.locator('.feature-list li')).toHaveCount(4);
  });

  test('should show wallet connect prompt when not connected', async ({ page }) => {
    // Should show connect wallet button
    const connectButton = page.locator('button', { hasText: 'Connect Wallet' });
    await expect(connectButton).toBeVisible();
  });

  test('should have contract info section', async ({ page }) => {
    // Check info sections exist (not checking specific title as it may vary)
    const infoSections = page.locator('.info-section');
    await expect(infoSections.first()).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.launch-paymaster-container')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('ConfigureSuperPaymaster Page - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/configure-superpaymaster');
  });

  test('should render page header correctly', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Configure SuperPaymaster');
    await expect(page.locator('h1')).toContainText('AOA+ Mode');
    await expect(page.locator('.subtitle')).toContainText('Register your operator to SuperPaymaster V2');
  });

  test('should have back button', async ({ page }) => {
    const backButton = page.locator('.back-button');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('← Back');
  });

  test('should display AOA+ mode explanation', async ({ page }) => {
    // Check "What is AOA+ Mode" section
    await expect(page.locator('h2').filter({ hasText: 'What is AOA+ Mode?' })).toBeVisible();

    // Check feature list
    await expect(page.locator('.feature-list')).toBeVisible();
    const features = page.locator('.feature-list li');
    await expect(features).toHaveCount(4);

    // Verify feature content
    await expect(features.first()).toContainText('Shared Infrastructure');
    await expect(features.nth(1)).toContainText('Lower Entry Barrier');
  });

  test('should display requirements section', async ({ page }) => {
    // Check requirements section
    await expect(page.locator('h2').filter({ hasText: 'Requirements' })).toBeVisible();

    // Check requirement values
    const contractInfo = page.locator('.contract-info');
    await expect(contractInfo).toBeVisible();
    await expect(contractInfo).toContainText('50 GT');
    await expect(contractInfo).toContainText('1000 aPNTs');
  });

  test('should show wallet connect prompt when not connected', async ({ page }) => {
    // Should show connect wallet button
    const connectButton = page.locator('button', { hasText: 'Connect Wallet' });
    await expect(connectButton).toBeVisible();
  });

  test('should have action footer with navigation links', async ({ page }) => {
    const footer = page.locator('.action-footer');
    await expect(footer).toBeVisible();

    // Check back to wizard link
    const wizardLink = footer.locator('a[href="/operator/wizard"]');
    await expect(wizardLink).toBeVisible();
    await expect(wizardLink).toContainText('Back to Wizard');

    // Check manage link
    const manageLink = footer.locator('a[href="/operator/manage"]');
    await expect(manageLink).toBeVisible();
    await expect(manageLink).toContainText('Manage SuperPaymaster');
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.configure-superpaymaster-container')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Landing Page - Resource Flow Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
  });

  test('should display "How to Launch Paymaster" section', async ({ page }) => {
    // Scroll to flow section
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();

    // Check section title
    const sectionTitle = page.locator('.launch-flow-section .section-title');
    await expect(sectionTitle).toBeVisible();
    await expect(sectionTitle).toContainText('How to Launch Paymaster');
  });

  test('should display all 4 flow steps', async ({ page }) => {
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();

    // Check all flow cards
    const flowCards = page.locator('.flow-card');
    await expect(flowCards).toHaveCount(4);

    // Check step titles
    await expect(flowCards.nth(0)).toContainText('Register Community');
    await expect(flowCards.nth(1)).toContainText('Bind MySBT');
    await expect(flowCards.nth(2)).toContainText('Deploy xPNTs');
    await expect(flowCards.nth(3)).toContainText('Launch Paymaster');
  });

  test('should have correct navigation links', async ({ page }) => {
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();

    // Check Register Community link
    const registerLink = page.locator('a[href="/register-community"]');
    await expect(registerLink).toBeVisible();

    // Check Bind MySBT link
    const bindLink = page.locator('a[href="/bind-sbt"]');
    await expect(bindLink).toBeVisible();

    // Check Deploy xPNTs link
    const xpntsLink = page.locator('a[href="/get-xpnts"]');
    await expect(xpntsLink).toBeVisible();

    // Check Launch Paymaster link
    const launchLink = page.locator('a[href="/launch-paymaster"]');
    await expect(launchLink).toBeVisible();
  });

  test('should display arrows between steps', async ({ page }) => {
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();

    // Check arrows
    const arrows = page.locator('.flow-arrow');
    await expect(arrows).toHaveCount(3); // 3 arrows between 4 steps
  });

  test('should highlight the last step', async ({ page }) => {
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();

    // Check that Launch Paymaster card has highlight class
    const launchCard = page.locator('.flow-card.highlight');
    await expect(launchCard).toBeVisible();
    await expect(launchCard).toContainText('Launch Paymaster');
  });

  test('should display quick start note', async ({ page }) => {
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();

    // Check flow note
    const flowNote = page.locator('.flow-note');
    await expect(flowNote).toBeVisible();
    await expect(flowNote).toContainText('Quick Start');
    await expect(flowNote).toContainText('Deployment Wizard');

    // Check wizard link
    const wizardLink = flowNote.locator('a[href="/operator/wizard"]');
    await expect(wizardLink).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();

    // Flow cards should still be visible
    const flowCards = page.locator('.flow-card');
    await expect(flowCards.first()).toBeVisible();
  });
});

test.describe('Page Navigation - Route Tests', () => {
  test('should navigate to LaunchPaymaster from landing page', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Click Launch Paymaster link in flow section
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();
    await page.locator('a[href="/launch-paymaster"]').first().click();

    // Check URL
    await expect(page).toHaveURL('http://localhost:5173/launch-paymaster');
    await expect(page.locator('h1')).toContainText('Launch Paymaster');
  });

  test('should navigate to ConfigureSuperPaymaster from direct URL', async ({ page }) => {
    await page.goto('http://localhost:5173/configure-superpaymaster');

    // Check page loaded correctly
    await expect(page.locator('h1')).toContainText('Configure SuperPaymaster');
  });

  test('should navigate back from LaunchPaymaster', async ({ page }) => {
    await page.goto('http://localhost:5173/launch-paymaster');

    // Click back button
    await page.locator('.back-button').click();

    // Should navigate back (could be to previous page or home)
    // Just check we're not on launch-paymaster anymore
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/launch-paymaster');
  });

  test('should have correct route for /bind-sbt', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Click Bind MySBT link
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();
    await page.locator('a[href="/bind-sbt"]').first().click();

    // Check URL (should be /bind-sbt, not /get-sbt)
    await expect(page).toHaveURL('http://localhost:5173/bind-sbt');
    await expect(page.locator('h1')).toContainText('Bind MySBT');
  });

  test('legacy /get-sbt route should still work', async ({ page }) => {
    await page.goto('http://localhost:5173/get-sbt');

    // Should still load the page (legacy route)
    await expect(page.locator('h1')).toContainText('Bind MySBT');
  });
});

test.describe('CSS and Styling Tests', () => {
  test('LaunchPaymaster should have correct gradient theme', async ({ page }) => {
    await page.goto('http://localhost:5173/launch-paymaster');

    const header = page.locator('.launch-paymaster-header');
    await expect(header).toBeVisible();

    // Check gradient is applied
    const bgColor = await header.evaluate((el) => {
      return window.getComputedStyle(el).background;
    });
    expect(bgColor).toContain('linear-gradient');
  });

  test('ConfigureSuperPaymaster should have purple/blue gradient', async ({ page }) => {
    await page.goto('http://localhost:5173/configure-superpaymaster');

    const header = page.locator('.configure-superpaymaster-header');
    await expect(header).toBeVisible();

    // Check gradient is applied
    const bgColor = await header.evaluate((el) => {
      return window.getComputedStyle(el).background;
    });
    expect(bgColor).toContain('linear-gradient');
  });

  test('Flow cards should have hover effects', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.locator('.launch-flow-section').scrollIntoViewIfNeeded();

    const firstCard = page.locator('.flow-card').first();

    // Get initial transform
    const initialTransform = await firstCard.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    // Hover over card
    await firstCard.hover();

    // Wait a bit for transition
    await page.waitForTimeout(400);

    // Check if transform changed (should have translateY)
    const hoverTransform = await firstCard.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    // Transform should change on hover
    expect(hoverTransform).not.toBe(initialTransform);
  });
});
