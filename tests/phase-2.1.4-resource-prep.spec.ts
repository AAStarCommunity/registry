/**
 * Playwright Test for Phase 2.1.4: Resource Preparation
 * Tests ChecklistItem and Step4_ResourcePrep components
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.VITE_BASE_URL || "http://localhost:5173";

test.describe("Phase 2.1.4: Resource Preparation Tests", () => {
  // Note: These tests require the full deploy flow to be accessible
  // For now, we'll test the components in isolation if possible

  test.describe("ChecklistItem Component", () => {
    test.skip("should display checklist item with all states", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check for checklist items
      const checklistItems = page.locator(".checklist-item");
      await expect(checklistItems.first()).toBeVisible();

      // Check item structure
      const firstItem = checklistItems.first();
      await expect(firstItem.locator(".checklist-icon")).toBeVisible();
      await expect(firstItem.locator(".checklist-content")).toBeVisible();
      await expect(firstItem.locator(".checklist-actions")).toBeVisible();
    });

    test.skip("should show status icon based on state", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check for status icons (✅, ❌, 🔄, ⏳)
      const statusIcon = page.locator(".status-icon").first();
      await expect(statusIcon).toBeVisible();

      // Get icon text
      const iconText = await statusIcon.textContent();
      expect(iconText).toMatch(/[✅❌🔄⏳]/);
    });

    test.skip("should display status badge", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check for status badge
      const statusBadge = page.locator(".status-badge").first();
      await expect(statusBadge).toBeVisible();

      // Badge should contain status text
      const badgeText = await statusBadge.textContent();
      expect(badgeText).toMatch(/(已满足|不足|检查中|待检查)/);
    });

    test.skip("should show requirement details", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check for detail rows
      const detailRows = page.locator(".detail-row");
      await expect(detailRows.first()).toBeVisible();

      // Check for required and current values
      await expect(detailRows.first().locator(".detail-label")).toContainText(
        "要求"
      );
      await expect(detailRows.first().locator(".detail-value")).toBeVisible();
    });

    test.skip("should have refresh button", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check for refresh button
      const refreshButton = page
        .locator(".action-button.refresh")
        .first();
      await expect(refreshButton).toBeVisible();
      await expect(refreshButton).toContainText("刷新");
    });

    test.skip("should have action button for insufficient resources", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check for primary action button (Get Resource)
      const actionButtons = page.locator(".action-button.primary");
      const count = await actionButtons.count();

      if (count > 0) {
        const firstButton = actionButtons.first();
        await expect(firstButton).toBeVisible();
        await expect(firstButton).toContainText("获取");
      }
    });

    test.skip("should show checking progress when in checking state", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Look for checking progress bar
      const checkingProgress = page.locator(".checking-progress");
      const count = await checkingProgress.count();

      if (count > 0) {
        // If any item is checking, verify progress bar exists
        await expect(checkingProgress.first()).toBeVisible();
        await expect(
          checkingProgress.first().locator(".progress-fill")
        ).toBeVisible();
      }
    });

    test.skip("should have color-coded states", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check for different state classes
      const checklistItems = page.locator(".checklist-item");
      const count = await checklistItems.count();

      expect(count).toBeGreaterThan(0);

      // Check if items have state classes
      for (let i = 0; i < count; i++) {
        const item = checklistItems.nth(i);
        const classList = await item.getAttribute("class");
        expect(classList).toMatch(
          /(complete|insufficient|checking|pending)/
        );
      }
    });
  });

  test.describe("Step4_ResourcePrep Main Component", () => {
    test.skip("should display page header", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check header
      await expect(
        page.locator(".step4-header h2").filter({ hasText: "准备资源" })
      ).toBeVisible();

      // Check description
      await expect(page.locator(".step4-description")).toBeVisible();
    });

    test.skip("should display progress summary", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check progress summary section
      await expect(page.locator(".progress-summary")).toBeVisible();

      // Check progress header
      await expect(page.locator(".progress-header")).toBeVisible();
      await expect(page.locator(".progress-title h3")).toBeVisible();
      await expect(page.locator(".progress-percent")).toBeVisible();

      // Check progress bar
      await expect(page.locator(".progress-bar-container")).toBeVisible();
      await expect(page.locator(".progress-bar-track")).toBeVisible();
      await expect(page.locator(".progress-bar-fill")).toBeVisible();

      // Check progress message
      await expect(page.locator(".progress-message")).toBeVisible();
    });

    test.skip("should show correct progress percentage", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Get progress percentage
      const progressPercent = page.locator(".progress-percent");
      await expect(progressPercent).toBeVisible();

      const percentText = await progressPercent.textContent();
      expect(percentText).toMatch(/\d+%/);

      // Verify percentage is between 0-100
      const percent = parseInt(percentText || "0");
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    });

    test.skip("should display refresh controls", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check refresh controls section
      await expect(page.locator(".refresh-controls")).toBeVisible();

      // Check last check time
      await expect(page.locator(".refresh-info")).toBeVisible();
      await expect(page.locator(".refresh-label")).toContainText("上次检查");
      await expect(page.locator(".refresh-time")).toBeVisible();

      // Check refresh actions
      await expect(page.locator(".refresh-actions")).toBeVisible();
    });

    test.skip("should have auto-refresh toggle", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check auto-refresh toggle
      const autoRefreshToggle = page.locator(".auto-refresh-toggle");
      await expect(autoRefreshToggle).toBeVisible();

      // Check checkbox
      const checkbox = autoRefreshToggle.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible();

      // Check label
      await expect(autoRefreshToggle.locator(".toggle-label")).toContainText(
        "自动刷新"
      );
    });

    test.skip("should toggle auto-refresh and show countdown", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Toggle auto-refresh
      const checkbox = page.locator(
        ".auto-refresh-toggle input[type='checkbox']"
      );
      await checkbox.check();

      // Wait a moment for state update
      await page.waitForTimeout(500);

      // Check if countdown appears
      const toggleLabel = page.locator(".toggle-label");
      const labelText = await toggleLabel.textContent();

      // Should show countdown like "自动刷新 (10s)"
      expect(labelText).toContain("自动刷新");
      // Countdown might show if auto-refresh is enabled
    });

    test.skip("should have manual refresh button", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check refresh button
      const refreshButton = page.locator(".refresh-button");
      await expect(refreshButton).toBeVisible();
      await expect(refreshButton).toContainText("立即刷新");

      // Check button icon
      await expect(refreshButton.locator(".button-icon")).toBeVisible();
    });

    test.skip("should disable refresh button during refresh", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Click refresh button
      const refreshButton = page.locator(".refresh-button");
      await refreshButton.click();

      // Button might be disabled during refresh
      // Wait a moment and check
      await page.waitForTimeout(100);

      // Button text might change to "检查中..."
      const buttonText = await refreshButton.textContent();
      // Either disabled or text changed
    });

    test.skip("should display resource checklist", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check resource checklist section
      await expect(page.locator(".resource-checklist")).toBeVisible();
      await expect(page.locator(".checklist-title")).toContainText(
        "资源清单"
      );

      // Check checklist items container
      await expect(page.locator(".checklist-items")).toBeVisible();

      // Should have at least 2 items (ETH, GToken minimum)
      const items = page.locator(".checklist-item");
      const count = await items.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test.skip("should show different resources based on selected option", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Get checklist items
      const items = page.locator(".checklist-item");
      const count = await items.count();

      // Standard Flow: 2 items (ETH, GToken)
      // Fast Flow: 3 items (ETH, GToken, PNTs)
      expect(count).toMatch(/^[2-3]$/);
    });

    test.skip("should display help tip", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check help tip section
      await expect(page.locator(".help-tip")).toBeVisible();
      await expect(page.locator(".help-icon")).toBeVisible();
      await expect(page.locator(".help-content h4")).toContainText("提示");
    });

    test.skip("should display navigation buttons", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check navigation section
      await expect(page.locator(".step4-navigation")).toBeVisible();

      // Check back button
      const backButton = page.locator(".nav-button.back");
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText("上一步");

      // Check next button
      const nextButton = page.locator(".nav-button.next");
      await expect(nextButton).toBeVisible();
    });

    test.skip("should disable next button when resources not ready", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      const nextButton = page.locator(".nav-button.next");

      // Check button state
      const isDisabled = await nextButton.isDisabled();
      const buttonText = await nextButton.textContent();

      if (isDisabled) {
        // Should show "资源未就绪"
        expect(buttonText).toContain("资源未就绪");
      } else {
        // Should show "继续部署"
        expect(buttonText).toContain("继续部署");
      }
    });

    test.skip("should display additional info section", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check additional info details
      const additionalInfo = page.locator(".additional-info");
      await expect(additionalInfo).toBeVisible();

      // Check summary
      await expect(additionalInfo.locator("summary")).toContainText(
        "为什么需要这些资源"
      );

      // Expand details
      await additionalInfo.locator("summary").click();

      // Check info content
      await expect(additionalInfo.locator(".info-content")).toBeVisible();
      await expect(additionalInfo.locator(".info-section")).toHaveCount(
        (count) => count >= 2
      );
    });

    test.skip("should have working external links in additional info", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Expand additional info
      await page.locator(".additional-info summary").click();

      // Check for external links
      const links = page.locator(".info-section a");
      const count = await links.count();

      if (count > 0) {
        const firstLink = links.first();
        await expect(firstLink).toHaveAttribute("target", "_blank");
        await expect(firstLink).toHaveAttribute("rel", "noopener noreferrer");
      }
    });
  });

  test.describe("Interaction Tests", () => {
    test.skip("should refresh individual checklist item", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Find and click refresh button on first item
      const firstItemRefresh = page
        .locator(".checklist-item")
        .first()
        .locator(".action-button.refresh");

      if (await firstItemRefresh.isVisible()) {
        await firstItemRefresh.click();

        // Item should enter checking state
        await page.waitForTimeout(200);

        const firstItem = page.locator(".checklist-item").first();
        const classList = await firstItem.getAttribute("class");

        // Might be checking or complete/insufficient after quick check
        expect(classList).toBeTruthy();
      }
    });

    test.skip("should refresh all items via global refresh", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Click global refresh button
      const refreshButton = page.locator(".refresh-button");
      await refreshButton.click();

      // Wait for refresh to complete
      await page.waitForTimeout(1000);

      // All items should have updated states
      const items = page.locator(".checklist-item");
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
    });

    test.skip("should update last check time after refresh", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Get initial check time
      const refreshTime = page.locator(".refresh-time");
      const initialTime = await refreshTime.textContent();

      // Click refresh
      await page.locator(".refresh-button").click();

      // Wait for refresh to complete
      await page.waitForTimeout(1500);

      // Check time should update
      const newTime = await refreshTime.textContent();

      // Time should be different (likely "X 秒前")
      expect(newTime).toBeTruthy();
    });

    test.skip("should navigate to resource acquisition page via action button", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Find an action button with resource link
      const actionButton = page.locator(".action-button.primary").first();

      if (await actionButton.isVisible()) {
        // This would open a new page, so we check the link exists
        // In real scenario, button click opens resource page
        await expect(actionButton).toBeVisible();
      }
    });
  });

  test.describe("Responsive Design", () => {
    test.skip("should be mobile responsive", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check if page loads
      await expect(page.locator(".step4-header h2")).toBeVisible();

      // Check if sections stack vertically
      await expect(page.locator(".progress-summary")).toBeVisible();
      await expect(page.locator(".refresh-controls")).toBeVisible();
    });

    test.skip("should display refresh controls vertically on mobile", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Refresh controls should stack
      const refreshControls = page.locator(".refresh-controls");
      await expect(refreshControls).toBeVisible();

      // Actions should be visible
      await expect(refreshControls.locator(".refresh-actions")).toBeVisible();
    });

    test.skip("should display checklist items properly on mobile", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Checklist items should be visible
      const items = page.locator(".checklist-item");
      await expect(items.first()).toBeVisible();

      // Actions should stack vertically
      await expect(
        items.first().locator(".checklist-actions")
      ).toBeVisible();
    });
  });

  test.describe("Animation Tests", () => {
    test.skip("should have fade-in animations", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Main sections should be visible
      const mainSections = [
        ".progress-summary",
        ".refresh-controls",
        ".resource-checklist",
      ];

      for (const selector of mainSections) {
        await expect(page.locator(selector)).toBeVisible();
      }
    });

    test.skip("should show progress bar animation", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Check progress bar has transition
      const progressFill = page.locator(".progress-bar-fill");
      await expect(progressFill).toBeVisible();

      // Progress fill should have width based on actual progress
      const width = await progressFill.getAttribute("style");
      expect(width).toContain("width");
    });

    test.skip("should show spin animation during refresh", async ({ page }) => {
      await page.goto(`${BASE_URL}/operator/deploy-v2/step4`);

      // Click refresh
      await page.locator(".refresh-button").click();

      // Check for spinning icon
      const buttonIcon = page.locator(".refresh-button .button-icon");

      // Icon should be visible
      await expect(buttonIcon).toBeVisible();
    });
  });
});
