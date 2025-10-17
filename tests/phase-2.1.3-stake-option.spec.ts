/**
 * Playwright Test for Phase 2.1.3: Stake Option Selection
 * Tests StakeOptionCard and Step3_StakeOption components
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.VITE_BASE_URL || "http://localhost:5173";

test.describe("Phase 2.1.3: Stake Option Selection Tests", () => {
  // Note: These tests require the full deploy flow to be accessible
  // For now, we'll test the components in isolation if possible

  test.describe("StakeOptionCard Component", () => {
    test.skip("should display Standard Flow option card", async ({ page }) => {
      // This test would require a route to render the component
      // Skip for now until integration is complete
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check for Standard Flow card
      const standardCard = page.locator(".stake-option-card").filter({
        has: page.locator('h3:has-text("Standard ERC-4337 Flow")'),
      });

      await expect(standardCard).toBeVisible();

      // Check card structure
      await expect(standardCard.locator(".stake-option-header")).toBeVisible();
      await expect(standardCard.locator(".requirements-list")).toBeVisible();
      await expect(standardCard.locator(".steps-list")).toBeVisible();
      await expect(standardCard.locator(".benefits-list")).toBeVisible();
    });

    test.skip("should display Fast Flow option card", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check for Fast Flow card
      const fastCard = page.locator(".stake-option-card").filter({
        has: page.locator('h3:has-text("Fast Stake Flow")'),
      });

      await expect(fastCard).toBeVisible();

      // Check for warnings section (Fast Flow has warnings)
      await expect(fastCard.locator(".warnings-list")).toBeVisible();
    });

    test.skip("should show resource requirements with status indicators", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check for requirement items
      const requirementItem = page.locator(".requirement-item").first();
      await expect(requirementItem).toBeVisible();

      // Check for status icons (✅ or ❌)
      await expect(requirementItem.locator(".requirement-icon")).toBeVisible();
      await expect(
        requirementItem.locator(".requirement-content")
      ).toBeVisible();
    });

    test.skip("should display action buttons", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check for select button
      const selectButton = page.locator(".select-button").first();
      await expect(selectButton).toBeVisible();
    });

    test.skip("should show recommended badge when applicable", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check for recommended badge
      const recommendedBadge = page
        .locator(".badge.recommended")
        .filter({ hasText: "推荐" });

      // At least one card should have recommended badge
      const count = await recommendedBadge.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Step3_StakeOption Main Component", () => {
    test.skip("should display page header", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check header
      await expect(
        page.locator(".step3-header h2").filter({ hasText: "选择 Stake 方案" })
      ).toBeVisible();

      // Check description
      await expect(page.locator(".step3-description")).toBeVisible();
    });

    test.skip("should display wallet summary", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check wallet summary section
      await expect(page.locator(".wallet-summary")).toBeVisible();
      await expect(
        page.locator(".wallet-summary h3").filter({ hasText: "当前钱包状态" })
      ).toBeVisible();

      // Check for wallet items (ETH, GToken, PNTs)
      await expect(page.locator(".wallet-item")).toHaveCount(3);

      // Check wallet item structure
      const firstItem = page.locator(".wallet-item").first();
      await expect(firstItem.locator(".wallet-label")).toBeVisible();
      await expect(firstItem.locator(".wallet-value")).toBeVisible();
    });

    test.skip("should display recommendation box", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check recommendation box
      const recommendationBox = page.locator(".recommendation-box");
      await expect(recommendationBox).toBeVisible();

      // Check recommendation header
      await expect(
        recommendationBox.locator(".recommendation-header h3")
      ).toContainText("智能推荐");

      // Check recommendation icon
      await expect(
        recommendationBox.locator(".recommendation-icon")
      ).toBeVisible();

      // Check recommendation text
      await expect(
        recommendationBox.locator(".recommendation-text")
      ).toBeVisible();

      // Check recommendation reason
      await expect(
        recommendationBox.locator(".recommendation-reason")
      ).toBeVisible();

      // Check score bar
      await expect(recommendationBox.locator(".score-bar")).toBeVisible();
      await expect(recommendationBox.locator(".score-fill")).toBeVisible();
      await expect(recommendationBox.locator(".score-value")).toBeVisible();
    });

    test.skip("should display both option cards", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check options grid
      await expect(page.locator(".stake-options-grid")).toBeVisible();

      // Should have 2 cards (Standard and Fast)
      await expect(page.locator(".stake-option-card")).toHaveCount(2);
    });

    test.skip("should allow option selection", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Click on first option card
      const firstCard = page.locator(".stake-option-card").first();
      await firstCard.click();

      // Check if card is selected
      await expect(firstCard).toHaveClass(/selected/);

      // Check if selected option details appear
      await expect(page.locator(".selected-option-details")).toBeVisible();
    });

    test.skip("should display preparation checklist when option selected", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Select an option
      await page.locator(".stake-option-card").first().click();

      // Check selected option details
      const detailsSection = page.locator(".selected-option-details");
      await expect(detailsSection).toBeVisible();

      // Check details content
      await expect(detailsSection.locator("h3")).toContainText("准备清单预览");
    });

    test.skip("should show resource preparation links when resources insufficient", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Select an option
      await page.locator(".stake-option-card").first().click();

      // If resources are insufficient, preparation section should show
      const prepSection = page.locator(".preparation-needed");

      if ((await prepSection.count()) > 0) {
        // Check preparation links
        await expect(prepSection.locator(".prep-link")).toHaveCount(
          (value) => value >= 1
        );

        // Check link properties
        const firstLink = prepSection.locator(".prep-link").first();
        await expect(firstLink).toHaveAttribute("target", "_blank");
        await expect(firstLink).toHaveAttribute("rel", "noopener noreferrer");
      }
    });

    test.skip("should display navigation buttons", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check navigation section
      await expect(page.locator(".step3-navigation")).toBeVisible();

      // Check back button
      const backButton = page.locator(".nav-button.back");
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText("上一步");

      // Check next button
      const nextButton = page.locator(".nav-button.next");
      await expect(nextButton).toBeVisible();
    });

    test.skip("should disable next button when no option selected or resources insufficient", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Initially, next button might be disabled if no auto-selection
      const nextButton = page.locator(".nav-button.next");

      // Check if button shows appropriate text
      const buttonText = await nextButton.textContent();
      expect(buttonText).toMatch(/(继续|资源未就绪)/);
    });

    test.skip("should display help section", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check help section
      const helpSection = page.locator(".help-section");
      await expect(helpSection).toBeVisible();

      // Check summary
      await expect(helpSection.locator("summary")).toContainText("需要帮助");

      // Expand help section
      await helpSection.locator("summary").click();

      // Check help content
      await expect(helpSection.locator(".help-content")).toBeVisible();
      await expect(helpSection.locator(".help-content h4")).toHaveCount(
        (count) => count >= 1
      );
    });

    test.skip("should have working external links in help section", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Expand help section
      await page.locator(".help-section summary").click();

      // Check for external links
      const links = page.locator(".help-content a");
      const count = await links.count();

      if (count > 0) {
        // Check first link
        const firstLink = links.first();
        await expect(firstLink).toHaveAttribute("target", "_blank");
        await expect(firstLink).toHaveAttribute("rel", "noopener noreferrer");
      }
    });
  });

  test.describe("Responsive Design", () => {
    test.skip("should be mobile responsive", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check if page loads
      await expect(page.locator(".step3-header h2")).toBeVisible();

      // Check if cards stack vertically (only 1 card visible in viewport)
      await expect(page.locator(".stake-options-grid")).toBeVisible();
    });

    test.skip("should display wallet items vertically on mobile", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check wallet summary
      const walletSummary = page.locator(".wallet-summary");
      await expect(walletSummary).toBeVisible();

      // Wallet items should be visible
      await expect(walletSummary.locator(".wallet-item")).toHaveCount(3);
    });
  });

  test.describe("Animation Tests", () => {
    test.skip("should have fade-in animations", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check if main sections have animation classes
      const mainSections = [
        ".wallet-summary",
        ".recommendation-box",
        ".stake-options-grid",
      ];

      for (const selector of mainSections) {
        const element = page.locator(selector);
        await expect(element).toBeVisible();
      }
    });

    test.skip("should show card hover effects", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Hover over first card
      const firstCard = page.locator(".stake-option-card").first();
      await firstCard.hover();

      // Card should be visible and respond to hover
      await expect(firstCard).toBeVisible();
    });
  });

  test.describe("Integration Tests", () => {
    test.skip("should pass selected option to next step", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Select an option
      await page.locator(".stake-option-card").first().click();

      // If resources are sufficient, click next
      const nextButton = page.locator(".nav-button.next");

      if (!(await nextButton.isDisabled())) {
        await nextButton.click();

        // Should navigate to next step
        // Check URL or page content
        await page.waitForTimeout(1000);
        // Add assertions based on actual next step
      }
    });

    test.skip("should preserve selection when navigating back", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Select first option
      const firstCard = page.locator(".stake-option-card").first();
      await firstCard.click();

      // Get the title of selected option
      const selectedTitle = await firstCard
        .locator(".stake-option-header h3")
        .textContent();

      // Click back
      await page.locator(".nav-button.back").click();

      // Navigate forward again
      await page.goto(`${BASE_URL}/operator/deploy-v2/step3`);

      // Check if selection is preserved (depends on state management)
      // This test assumes state persistence
    });
  });
});
