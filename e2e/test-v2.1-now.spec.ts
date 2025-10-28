import { test, expect } from '@playwright/test';

test('v2.1 button should work', async ({ page }) => {
  // Collect console logs
  const logs: string[] = [];
  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Navigate to explorer
  await page.goto('http://localhost:3001/explorer');
  await page.waitForLoadState('networkidle');

  // Wait for page to render
  await page.waitForTimeout(2000);

  // Look for v2.1 button
  const v21Button = page.locator('button, a').filter({ hasText: /v2\.1/i });

  console.log('Searching for v2.1 button...');
  const count = await v21Button.count();
  console.log(`Found ${count} elements matching v2.1`);

  if (count > 0) {
    console.log('Clicking v2.1 button...');
    await v21Button.first().click();
    await page.waitForTimeout(3000);

    // Check console logs
    console.log('\n=== Console Logs ===');
    logs.forEach(log => console.log(log));

    // Check for errors
    const hasError = logs.some(log =>
      log.includes('could not decode') ||
      log.includes('BAD_DATA') ||
      log.includes('Failed to query')
    );

    if (hasError) {
      console.log('\n❌ ERROR FOUND IN LOGS');
    } else {
      console.log('\n✅ NO ERRORS - v2.1 works!');
    }

    expect(hasError).toBe(false);
  } else {
    console.log('❌ v2.1 button not found');
    throw new Error('v2.1 button not found');
  }
});
