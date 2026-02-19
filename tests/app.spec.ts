import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "test-screenshots");

test.describe("Mindstorm Brainstorming App", () => {
  test("displays initial layout with two panels and chat input", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify two-panel layout exists
    const appContainer = page.getByTestId("app-container");
    await expect(appContainer).toBeVisible();

    // Document panel (left)
    const docPanel = page.getByTestId("document-panel");
    await expect(docPanel).toBeVisible();

    // Sidebar (right)
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();

    // Chat input at the bottom
    const chatInput = page.getByTestId("chat-input");
    await expect(chatInput).toBeVisible();

    const sendButton = page.getByTestId("send-button");
    await expect(sendButton).toBeVisible();

    // Template content should be shown by default (or document content if session exists)
    const docContent = page.getByTestId("document-content");
    await expect(docContent).toBeVisible({ timeout: 5000 });

    // Toolbar buttons
    await expect(page.getByTestId("copy-button")).toBeVisible();
    await expect(page.getByTestId("clear-button")).toBeVisible();
    await expect(page.getByTestId("settings-button")).toBeVisible();

    // Sidebar sections
    await expect(page.getByTestId("sidebar").getByRole("heading", { name: "Questions" })).toBeVisible();
    await expect(page.getByTestId("sidebar").getByRole("heading", { name: "Ideas" })).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "01-initial-state.png"),
      fullPage: true,
    });
  });

  test("submits content and updates the document", async ({ page }) => {
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    // Type and submit content
    await chatInput.fill(
      "I want to build a mobile app for tracking daily habits. Key features: streak tracking, reminders, and social accountability."
    );
    await sendButton.click();

    // Processing chip should appear
    await expect(page.getByTestId("processing-message")).toBeVisible();

    // Wait for document content to appear (AI response)
    const docContent = page.getByTestId("document-content");
    await expect(docContent).toBeVisible({ timeout: 30000 });

    // Document should contain some structured content
    await expect(docContent).not.toBeEmpty();

    // Empty state should be gone
    await expect(page.getByText("Start brainstorming")).not.toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "02-after-first-input.png"),
      fullPage: true,
    });
  });

  test("adds more content and restructures document", async ({ page }) => {
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    // First input
    await chatInput.fill(
      "Building a recipe sharing platform. Users can upload recipes with photos, rate and comment on others' recipes."
    );
    await sendButton.click();
    await expect(page.getByTestId("document-content")).toBeVisible({
      timeout: 30000,
    });

    await page.screenshot({
      path: path.join(screenshotDir, "03-first-content.png"),
      fullPage: true,
    });

    // Second input — add more content
    await chatInput.fill(
      "Also need a meal planning feature where users can drag recipes into a weekly calendar. Include a grocery list generator."
    );
    await sendButton.click();

    // Wait for document to update
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="document-content"]');
        return el && el.innerHTML.toLowerCase().includes("meal");
      },
      { timeout: 30000 }
    );

    await page.screenshot({
      path: path.join(screenshotDir, "04-added-more-content.png"),
      fullPage: true,
    });

    // Third input — command to reorganize
    await chatInput.fill(
      "Reorganize the document with clear sections: Overview, Core Features, Advanced Features, Technical Considerations"
    );
    await sendButton.click();

    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="document-content"]');
        return el && el.innerHTML.toLowerCase().includes("overview");
      },
      { timeout: 30000 }
    );

    await page.screenshot({
      path: path.join(screenshotDir, "05-after-reorganize.png"),
      fullPage: true,
    });
  });

  test("sidebar shows questions after content is added", async ({ page }) => {
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    // Submit content
    await chatInput.fill(
      "I'm designing an e-commerce platform for handmade crafts. Sellers should be able to create shops, list products, and manage orders."
    );
    await sendButton.click();
    await expect(page.getByTestId("document-content")).toBeVisible({
      timeout: 30000,
    });

    // Wait for questions to appear in sidebar (insights API can take time)
    const questionsList = page.getByTestId("questions-list");
    await expect(questionsList).toBeVisible({ timeout: 45000 });

    // Should have multiple question items
    const questionItems = questionsList.locator("li");
    await expect(questionItems.first()).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "06-sidebar-questions.png"),
      fullPage: true,
    });
  });

  test("ideas section expands and collapses", async ({ page }) => {
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    // Submit content
    await chatInput.fill(
      "A fitness app that uses AI to generate personalized workout plans based on user goals, equipment available, and time constraints."
    );
    await sendButton.click();
    await expect(page.getByTestId("document-content")).toBeVisible({
      timeout: 30000,
    });

    // Wait for insights to load (insights API can take time)
    await expect(page.getByTestId("questions-list")).toBeVisible({
      timeout: 45000,
    });

    // Ideas should be collapsed by default
    await expect(page.getByTestId("ideas-list")).not.toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "07-ideas-collapsed.png"),
      fullPage: true,
    });

    // Click to expand ideas
    const ideasToggle = page.getByTestId("ideas-toggle");
    await ideasToggle.click();

    // Ideas should now be visible
    await expect(page.getByTestId("ideas-list")).toBeVisible();

    // Scroll sidebar to bottom so expanded ideas are fully visible
    await page.getByTestId("sidebar").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.join(screenshotDir, "08-ideas-expanded.png"),
      fullPage: true,
    });

    // Click to collapse again
    await ideasToggle.click();
    await expect(page.getByTestId("ideas-list")).not.toBeVisible();
  });

  test("input stays enabled during processing and clears after submit", async ({
    page,
  }) => {
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    await chatInput.fill("A project management tool with kanban boards");
    await sendButton.click();

    // Input should stay enabled (queue-based processing)
    await expect(chatInput).toBeEnabled();
    await expect(sendButton).toHaveText("Send");

    // Input should be cleared after submission
    await expect(chatInput).toHaveValue("");

    // Processing chip should be visible
    await expect(page.getByTestId("processing-message")).toBeVisible();

    // Wait for processing to finish
    await expect(page.getByTestId("processing-message")).not.toBeVisible({
      timeout: 30000,
    });

    await page.screenshot({
      path: path.join(screenshotDir, "09-after-processing.png"),
      fullPage: true,
    });
  });

  test("editor is editable and accepts typed input", async ({ page }) => {
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    // Submit content to get document into editor
    await chatInput.fill("A simple note about testing the editor");
    await sendButton.click();
    await expect(page.getByTestId("document-content")).toBeVisible({
      timeout: 30000,
    });

    // Wait for ProseMirror editor to render inside document-content
    await page.waitForSelector(
      '[data-testid="document-content"] .ProseMirror',
      { timeout: 10000 }
    );

    // Click into the editor and type
    const editor = page.locator(
      '[data-testid="document-content"] .ProseMirror'
    );
    await editor.click();
    await page.keyboard.type(" EDITED_TEXT");

    // Verify the typed text appears in the editor
    await expect(editor).toContainText("EDITED_TEXT");

    await page.screenshot({
      path: path.join(screenshotDir, "12-editor-editable.png"),
      fullPage: true,
    });
  });

  test("clear button shows confirmation modal and clears document", async ({
    page,
  }) => {
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    // Submit content first so there's something to clear
    await chatInput.fill("A quick note about project architecture");
    await sendButton.click();
    await expect(page.getByTestId("document-content")).toBeVisible({
      timeout: 30000,
    });

    // Click the clear button
    await page.getByTestId("clear-button").click();

    // Confirmation modal should appear
    const modal = page.getByTestId("clear-confirm-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("cannot be undone");

    await page.screenshot({
      path: path.join(screenshotDir, "10-clear-confirm-modal.png"),
      fullPage: true,
    });

    // Cancel should close the modal without clearing
    await page.getByTestId("clear-cancel-button").click();
    await expect(modal).not.toBeVisible();
    await expect(page.getByTestId("document-content")).toBeVisible();

    // Open modal again and confirm
    await page.getByTestId("clear-button").click();
    await expect(modal).toBeVisible();
    await page.getByTestId("clear-confirm-button").click();

    // Modal should close and document should show template (not the chat content)
    await expect(modal).not.toBeVisible();
    await expect(page.getByTestId("document-content")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "11-after-clear.png"),
      fullPage: true,
    });
  });
});
