import { test, expect } from '@playwright/test';

test.describe('Basic Page Load Tests', () => {
  test('should load main page', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if any content loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'main-page.png', fullPage: true });

    console.log('Main page loaded successfully');
  });

  test('should load Get SBT page', async ({ page }) => {
    await page.goto('/get-sbt');

    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for specific content
    const content = await page.content();
    console.log('Page content length:', content.length);

    // Look for any visible element
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    await page.screenshot({ path: 'get-sbt-page.png', fullPage: true });
    console.log('Get SBT page loaded successfully');
  });

  test('should load admin batch mint page', async ({ page }) => {
    console.log('Loading admin batch mint page...');

    try {
      await page.goto('/admin-batch-mint', { timeout: 10000 });

      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const body = page.locator('body');
      await expect(body).toBeVisible({ timeout: 5000 });

      const root = page.locator('#root');
      await expect(root).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'admin-batch-mint-page.png', fullPage: true });

      // Check page content
      const content = await page.content();
      console.log('Admin page content length:', content.length);

      // Look for any error messages
      const errorElements = page.locator('text=error');
      const errorCount = await errorElements.count();
      console.log('Error elements found:', errorCount);

      if (errorCount > 0) {
        const errorText = await errorElements.first().textContent();
        console.log('Error text found:', errorText);
      }

      console.log('Admin batch mint page loaded successfully');

    } catch (error) {
      console.error('Failed to load admin page:', error);

      // Take screenshot even if failed
      await page.screenshot({ path: 'admin-batch-mint-error.png', fullPage: true });

      // Check browser console for errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error('Console error:', msg.text());
        }
      });

      throw error;
    }
  });

  test('should check React app mounting', async ({ page }) => {
    await page.goto('/');

    // Wait for React to mount
    await page.waitForFunction(() => {
      return window.React || document.querySelector('#root').children.length > 0;
    }, { timeout: 10000 });

    // Check if React devtools are present
    const hasReact = await page.evaluate(() => {
      return !!window.React || !!document.querySelector('[data-reactroot]');
    });

    console.log('React detected:', hasReact);

    // Take screenshot
    await page.screenshot({ path: 'react-app.png', fullPage: true });
  });
});