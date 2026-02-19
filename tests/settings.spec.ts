import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "test-screenshots");

test.describe("Settings & Template Management", () => {
  test("settings button is visible and opens the modal", async ({ page }) => {
    await page.goto("/");

    const settingsButton = page.getByTestId("settings-button");
    await expect(settingsButton).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "settings-01-button-visible.png"),
      fullPage: true,
    });

    await settingsButton.click();

    const modal = page.getByTestId("settings-modal");
    await expect(modal).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "settings-02-modal-open.png"),
      fullPage: true,
    });
  });

  test("modal displays correct layout with sidebar and template editor", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();

    // Sidebar with Templates tab
    const sidebar = page.getByTestId("settings-sidebar");
    await expect(sidebar).toBeVisible();
    const templatesTab = page.getByTestId("settings-templates-tab");
    await expect(templatesTab).toBeVisible();
    await expect(templatesTab).toHaveText("Templates");

    // Click Templates tab to see template editor
    await templatesTab.click();

    // Template name input with default value
    const nameInput = page.getByTestId("template-name-input");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue("Spec Template");

    // Template content textarea with default content
    const contentInput = page.getByTestId("template-content-input");
    await expect(contentInput).toBeVisible();
    const content = await contentInput.inputValue();
    expect(content).toContain("Context");
    expect(content).toContain("Target Outcomes");
    expect(content).toContain("Solutions");
    expect(content).toContain("Rollout plan");

    // Save button
    await expect(page.getByTestId("settings-save-button")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "settings-03-full-layout.png"),
      fullPage: true,
    });
  });

  test("can edit template name", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();
    await page.getByTestId("settings-templates-tab").click();

    const nameInput = page.getByTestId("template-name-input");
    await expect(nameInput).toHaveValue("Spec Template");

    await nameInput.clear();
    await nameInput.fill("My Custom Template");
    await expect(nameInput).toHaveValue("My Custom Template");

    await page.screenshot({
      path: path.join(screenshotDir, "settings-04-name-edited.png"),
      fullPage: true,
    });
  });

  test("can edit template content", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();
    await page.getByTestId("settings-templates-tab").click();

    const contentInput = page.getByTestId("template-content-input");
    await contentInput.clear();
    await contentInput.fill(
      "Custom Section 1\n\nCustom Section 2\n\nCustom Section 3"
    );

    const value = await contentInput.inputValue();
    expect(value).toBe(
      "Custom Section 1\n\nCustom Section 2\n\nCustom Section 3"
    );

    await page.screenshot({
      path: path.join(screenshotDir, "settings-05-content-edited.png"),
      fullPage: true,
    });
  });

  test("saving persists changes across modal close/reopen", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();
    await page.getByTestId("settings-templates-tab").click();

    // Edit name
    const nameInput = page.getByTestId("template-name-input");
    await nameInput.clear();
    await nameInput.fill("Engineering Design Doc");

    // Save
    await page.getByTestId("settings-save-button").click();

    // Modal should close after save
    await expect(page.getByTestId("settings-modal")).not.toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "settings-06-after-save-closed.png"),
      fullPage: true,
    });

    // Reopen modal
    await page.getByTestId("settings-button").click();
    await page.getByTestId("settings-templates-tab").click();

    // Verify persisted name
    await expect(page.getByTestId("template-name-input")).toHaveValue(
      "Engineering Design Doc"
    );

    await page.screenshot({
      path: path.join(screenshotDir, "settings-07-reopened-persisted.png"),
      fullPage: true,
    });
  });

  test("saving template content persists across reopen", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();
    await page.getByTestId("settings-templates-tab").click();

    const contentInput = page.getByTestId("template-content-input");
    await contentInput.clear();
    await contentInput.fill(
      "My custom template\n\nSection A\n\nSection B"
    );

    await page.getByTestId("settings-save-button").click();
    await expect(page.getByTestId("settings-modal")).not.toBeVisible();

    // Reopen and verify it loaded back
    await page.getByTestId("settings-button").click();
    await page.getByTestId("settings-templates-tab").click();
    const reloaded = await page
      .getByTestId("template-content-input")
      .inputValue();
    expect(reloaded).toBe("My custom template\n\nSection A\n\nSection B");

    await page.screenshot({
      path: path.join(screenshotDir, "settings-08-content-persisted.png"),
      fullPage: true,
    });
  });

  test("modal closes via X button", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();
    await expect(page.getByTestId("settings-modal")).toBeVisible();

    await page.getByTestId("settings-close-button").click();
    await expect(page.getByTestId("settings-modal")).not.toBeVisible();
  });

  test("modal closes via backdrop click", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();
    await expect(page.getByTestId("settings-modal")).toBeVisible();

    // Click the overlay (outside the modal)
    await page
      .getByTestId("settings-overlay")
      .click({ position: { x: 10, y: 10 } });
    await expect(page.getByTestId("settings-modal")).not.toBeVisible();
  });
});
