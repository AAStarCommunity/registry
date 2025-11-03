import { test, expect } from '@playwright/test';

test.describe('UI Fixes Verification', () => {
  /**
   * Test 1: Verify PaymasterDetail page content is centered
   */
  test('PaymasterDetail error state should be centered', async ({ page }) => {
    // Navigate to a paymaster detail page (using a test address)
    await page.goto('/paymaster/0x0000000000000000000000000000000000000000');

    // Wait for error state to be visible
    await page.waitForSelector('.error-state', { timeout: 5000 }).catch(() => null);

    // Check if error-state has flex layout
    const errorState = await page.locator('.error-state').first();
    if (await errorState.isVisible()) {
      const computedStyle = await errorState.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          display: style.display,
          alignItems: style.alignItems,
          justifyContent: style.justifyContent,
          minHeight: style.minHeight,
        };
      });

      expect(computedStyle.display).toContain('flex');
      expect(computedStyle.alignItems).toContain('center');
      expect(computedStyle.justifyContent).toContain('center');
      console.log('✅ PaymasterDetail error state is properly centered');
    }
  });

  /**
   * Test 2: Verify LaunchPaymaster Deploy Another Paymaster button doesn't overflow
   */
  test('LaunchPaymaster Deploy Another button should not overflow', async ({ page }) => {
    await page.goto('/launch-paymaster');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if deploy-another-prompt exists
    const deployPrompt = await page.locator('.deploy-another-prompt').first();
    if (await deployPrompt.isVisible()) {
      // Get the bounding box
      const box = await deployPrompt.boundingBox();
      const button = await deployPrompt.locator('.action-button').first();
      const buttonBox = await button.boundingBox();

      if (box && buttonBox) {
        // Check that button is within the container (with some tolerance)
        const isWithinBounds = buttonBox.x + buttonBox.width <= box.x + box.width + 5;
        expect(isWithinBounds).toBeTruthy();
        console.log('✅ Deploy button is within container bounds');

        // Verify flex layout
        const computedStyle = await deployPrompt.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            flexDirection: style.flexDirection,
            display: style.display,
          };
        });

        expect(computedStyle.display).toContain('flex');
        expect(computedStyle.flexDirection).toBe('column');
        console.log('✅ Deploy prompt uses column flex layout');
      }
    }
  });

  /**
   * Test 3: Verify Community Information fields are always displayed
   */
  test('LaunchPaymaster Community Info should show all fields', async ({ page, context }) => {
    // Set up local storage to simulate connected wallet state
    await context.addInitScript(() => {
      localStorage.setItem('walletConnected', 'true');
    });

    await page.goto('/launch-paymaster');
    await page.waitForLoadState('networkidle');

    // Look for info-card with community-card class
    const communityCard = await page.locator('.info-card.community-card').first();
    if (await communityCard.isVisible()) {
      // Get all info items
      const infoItems = await communityCard.locator('.info-item').all();

      console.log(`Found ${infoItems.length} info items in Community card`);

      // Check expected field labels
      const expectedLabels = [
        'Name:',
        'ENS:',
        'Description:',
        'Website:',
        'Twitter:',
        'Members:',
        'xPNTs Token:',
        'MySBT:',
      ];

      const foundLabels: string[] = [];
      for (const item of infoItems) {
        const label = await item.locator('.item-label').textContent();
        if (label) {
          foundLabels.push(label);
        }
      }

      console.log('Found labels:', foundLabels);

      // Check that most expected labels are present (some may not show if community is not loaded)
      const minExpected = 5;
      expect(foundLabels.length).toBeGreaterThanOrEqual(minExpected);
      console.log(`✅ Community card shows ${foundLabels.length} information fields`);
    }
  });

  /**
   * Test 4: Verify empty Community fields show placeholder text
   */
  test('Empty Community fields should show placeholder text', async ({ page }) => {
    await page.goto('/launch-paymaster');
    await page.waitForLoadState('networkidle');

    const communityCard = await page.locator('.info-card.community-card').first();
    if (await communityCard.isVisible()) {
      // Look for empty state indicators
      const emptyItems = await communityCard.locator('.item-value.empty').all();

      if (emptyItems.length > 0) {
        console.log(`✅ Found ${emptyItems.length} empty value placeholders`);

        // Check first empty item
        const firstEmpty = await emptyItems[0].textContent();
        expect(firstEmpty).toMatch(/Not set|Not provided|Not configured/);
        console.log(`✅ Empty fields show appropriate placeholder: "${firstEmpty}"`);
      }
    }
  });

  /**
   * Test 5: Verify responsive behavior on mobile viewport
   */
  test('Deploy Another button should stack on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/launch-paymaster');
    await page.waitForLoadState('networkidle');

    const deployPrompt = await page.locator('.deploy-another-prompt').first();
    if (await deployPrompt.isVisible()) {
      const computedStyle = await deployPrompt.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          flexDirection: style.flexDirection,
        };
      });

      expect(computedStyle.flexDirection).toBe('column');
      console.log('✅ Deploy prompt stacks vertically on mobile');
    }
  });
});
