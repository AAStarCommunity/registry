/**
 * Playwright Test Fixtures
 *
 * Custom fixtures that extend Playwright's base test
 * to provide additional functionality like MetaMask mocking.
 */

import { test as base } from '@playwright/test';
import { getEthereumMockScript } from './mocks/ethereum';

/**
 * Extended test fixture with MetaMask mock injected
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Inject MetaMask mock before every test
    await page.addInitScript(getEthereumMockScript());

    // Make page available to tests
    await use(page);
  },
});

export { expect } from '@playwright/test';
