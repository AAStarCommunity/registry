import { test } from '@playwright/test';

test('debug explorer page', async ({ page }) => {
  await page.goto('http://localhost:3001/explorer');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Get all text content
  const bodyText = await page.locator('body').textContent();
  console.log('\n=== Page Text Content ===');
  console.log(bodyText);

  // Get all buttons
  const buttons = await page.locator('button').all();
  console.log('\n=== All Buttons ===');
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    console.log(`Button ${i}: "${text}"`);
  }

  // Take screenshot
  await page.screenshot({ path: 'explorer-debug.png', fullPage: true });
  console.log('\n=== Screenshot saved to explorer-debug.png ===');
});
