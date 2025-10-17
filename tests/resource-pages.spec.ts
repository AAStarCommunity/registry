/**
 * Playwright Test for Resource Pages
 * Tests GetGToken and GetPNTs pages
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.VITE_BASE_URL || "http://localhost:5173";

test.describe("Resource Pages Tests", () => {
  test.describe("GetGToken Page", () => {
    test("should load GetGToken page successfully", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Check page title
      await expect(page.locator("h1")).toContainText("Get GToken");

      // Check subtitle
      await expect(page.locator(".subtitle")).toContainText(
        "GToken is required for staking"
      );
    });

    test("should display GToken information section", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Check "What is GToken" section
      await expect(
        page.locator("h2").filter({ hasText: "What is GToken?" })
      ).toBeVisible();

      // Check feature list
      await expect(page.locator(".feature-list")).toBeVisible();
      await expect(page.locator(".feature-list li")).toHaveCount(4);

      // Verify features are listed
      await expect(page.locator(".feature-list")).toContainText(
        "Staking Requirements"
      );
      await expect(page.locator(".feature-list")).toContainText(
        "Reputation Building"
      );
    });

    test("should display contract information", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Check Contract Information section
      await expect(
        page.locator("h2").filter({ hasText: "Contract Information" })
      ).toBeVisible();

      // Check contract details are displayed
      await expect(page.locator(".contract-info")).toBeVisible();
      await expect(page.locator(".info-row").first()).toBeVisible();

      // Check for contract address
      await expect(page.locator(".value.mono")).toBeVisible();

      // Check explorer link
      await expect(page.locator(".explorer-link")).toBeVisible();
      await expect(page.locator(".explorer-link")).toHaveAttribute(
        "href",
        /etherscan.io/
      );
    });

    test("should display acquisition methods", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Check "How to Get GToken" section
      await expect(
        page.locator("h2").filter({ hasText: "How to Get GToken?" })
      ).toBeVisible();

      // Check method cards exist
      await expect(page.locator(".method-card")).toHaveCount(2); // Testnet: 2 methods

      // Check recommended method
      await expect(page.locator(".method-card.recommended")).toBeVisible();
      await expect(page.locator(".badge")).toContainText("FREE");
    });

    test("should have working back button", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Check back button exists
      const backButton = page.locator(".back-button");
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText("Back");
    });

    test("should display FAQ section", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Check FAQ section
      await expect(
        page.locator("h2").filter({ hasText: "Frequently Asked Questions" })
      ).toBeVisible();

      // Check FAQ items
      await expect(page.locator(".faq-item")).toHaveCount(4);

      // Test expanding FAQ
      const firstFaq = page.locator(".faq-item").first();
      await firstFaq.click();

      // Check if FAQ content is visible after click
      await expect(firstFaq.locator("p")).toBeVisible();
    });

    test("should have Add to MetaMask button", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Check "Add to MetaMask" section
      await expect(
        page.locator("h2").filter({ hasText: "Add GToken to MetaMask" })
      ).toBeVisible();

      // Check button exists
      const addTokenButton = page
        .locator(".action-button.outline")
        .filter({ hasText: "Add GToken to MetaMask" });
      await expect(addTokenButton).toBeVisible();
    });
  });

  test.describe("GetPNTs Page", () => {
    test("should load GetPNTs page successfully", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-pnts`);

      // Check page title
      await expect(page.locator("h1")).toContainText("Get PNTs");

      // Check subtitle
      await expect(page.locator(".subtitle")).toContainText(
        "PNTs (Points Token) are used to pay for gas"
      );
    });

    test("should display PNTs information section", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-pnts`);

      // Check "What are PNTs" section
      await expect(
        page.locator("h2").filter({ hasText: "What are PNTs?" })
      ).toBeVisible();

      // Check feature list
      await expect(page.locator(".feature-list")).toBeVisible();
      await expect(page.locator(".feature-list li")).toHaveCount(4);

      // Verify features are listed
      await expect(page.locator(".feature-list")).toContainText("Gas Payment");
      await expect(page.locator(".feature-list")).toContainText(
        "Fast Stake Flow Deposit"
      );
    });

    test("should display contract information", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-pnts`);

      // Check Contract Information section
      await expect(
        page.locator("h2").filter({ hasText: "Contract Information" })
      ).toBeVisible();

      // Check contract details are displayed
      await expect(page.locator(".contract-info")).toBeVisible();

      // Check for minimum deposit
      await expect(page.locator(".value.highlight")).toBeVisible();
    });

    test("should display acquisition methods", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-pnts`);

      // Check "How to Get PNTs" section
      await expect(
        page.locator("h2").filter({ hasText: "How to Get PNTs?" })
      ).toBeVisible();

      // Check method cards exist (testnet: 3 methods)
      await expect(page.locator(".method-card")).toHaveCount(3);

      // Check recommended method
      await expect(page.locator(".method-card.recommended")).toBeVisible();
      await expect(page.locator(".badge")).toContainText("FREE");
    });

    test("should have working back button", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-pnts`);

      // Check back button exists
      const backButton = page.locator(".back-button");
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText("Back");
    });

    test("should display FAQ section", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-pnts`);

      // Check FAQ section
      await expect(
        page.locator("h2").filter({ hasText: "Frequently Asked Questions" })
      ).toBeVisible();

      // Check FAQ items
      await expect(page.locator(".faq-item")).toHaveCount(5);

      // Test expanding FAQ
      const firstFaq = page.locator(".faq-item").first();
      await firstFaq.click();

      // Check if FAQ content is visible after click
      await expect(firstFaq.locator("p")).toBeVisible();
    });

    test("should have Add to MetaMask button", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-pnts`);

      // Check "Add to MetaMask" section
      await expect(
        page.locator("h2").filter({ hasText: "Add PNT to MetaMask" })
      ).toBeVisible();

      // Check button exists
      const addTokenButton = page
        .locator(".action-button.outline")
        .filter({ hasText: "Add PNT to MetaMask" });
      await expect(addTokenButton).toBeVisible();
    });
  });

  test.describe("Navigation Between Pages", () => {
    test("should navigate from GetGToken to GetPNTs", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Verify we're on GetGToken page
      await expect(page.locator("h1")).toContainText("Get GToken");

      // Navigate to GetPNTs via URL
      await page.goto(`${BASE_URL}/get-pnts`);

      // Verify we're on GetPNTs page
      await expect(page.locator("h1")).toContainText("Get PNTs");
    });
  });

  test.describe("Responsive Design", () => {
    test("should be mobile responsive - GetGToken", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Check if page loads
      await expect(page.locator("h1")).toBeVisible();

      // Check if method cards stack vertically
      await expect(page.locator(".method-card").first()).toBeVisible();
    });

    test("should be mobile responsive - GetPNTs", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/get-pnts`);

      // Check if page loads
      await expect(page.locator("h1")).toBeVisible();

      // Check if method cards stack vertically
      await expect(page.locator(".method-card").first()).toBeVisible();
    });
  });

  test.describe("External Links", () => {
    test("should have correct external links - GetGToken", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-gtoken`);

      // Check explorer link
      const explorerLink = page.locator(".explorer-link").first();
      await expect(explorerLink).toHaveAttribute("target", "_blank");
      await expect(explorerLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    test("should have correct external links - GetPNTs", async ({ page }) => {
      await page.goto(`${BASE_URL}/get-pnts`);

      // Check explorer link
      const explorerLink = page.locator(".explorer-link").first();
      await expect(explorerLink).toHaveAttribute("target", "_blank");
      await expect(explorerLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });
});
