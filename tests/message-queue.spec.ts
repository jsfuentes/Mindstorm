import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "test-screenshots");

function mockApis(page: import("@playwright/test").Page, delay: number) {
  return Promise.all([
    page.route("/api/chat", async (route) => {
      await new Promise((r) => setTimeout(r, delay));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          documentHtml:
            "<h1>Project Spec</h1><p>Updated document content.</p>",
        }),
      });
    }),
    page.route("/api/insights", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ questions: [], ideas: [] }),
      });
    }),
  ]);
}

test.describe("Message Queue", () => {
  test("shows processing chip when a message is being processed", async ({
    page,
  }) => {
    await mockApis(page, 3000);
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    await chatInput.fill("Design a REST API for user authentication");
    await page.getByTestId("send-button").click();

    // Processing chip should appear with the message text
    const processingChip = page.getByTestId("processing-message");
    await expect(processingChip).toBeVisible();
    await expect(processingChip).toContainText(
      "Design a REST API for user authentication"
    );

    // Input should be cleared and still enabled
    await expect(chatInput).toHaveValue("");
    await expect(chatInput).toBeEnabled();

    await page.screenshot({
      path: path.join(screenshotDir, "queue-01-processing-chip.png"),
      fullPage: true,
    });

    // Wait for processing to finish
    await expect(processingChip).not.toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(screenshotDir, "queue-02-processing-done.png"),
      fullPage: true,
    });
  });

  test("queues multiple messages and shows them as floating chips", async ({
    page,
  }) => {
    await mockApis(page, 3000);
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    // Submit first message
    await chatInput.fill(
      "Build a user authentication system with JWT tokens"
    );
    await sendButton.click();

    // Submit second message while first is processing
    await chatInput.fill(
      "Add rate limiting middleware to protect against abuse"
    );
    await sendButton.click();

    // Submit third message
    await chatInput.fill("Implement WebSocket support for real-time updates");
    await sendButton.click();

    // Processing chip should show first message
    const processingChip = page.getByTestId("processing-message");
    await expect(processingChip).toBeVisible();
    await expect(processingChip).toContainText("JWT tokens");

    // Queued messages should be visible
    const queuedMessages = page.getByTestId("queued-message");
    await expect(queuedMessages).toHaveCount(2);
    await expect(queuedMessages.first()).toContainText("rate limiting");
    await expect(queuedMessages.nth(1)).toContainText("WebSocket");

    // The full queue container should be visible
    await expect(page.getByTestId("message-queue")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "queue-03-multiple-queued.png"),
      fullPage: true,
    });
  });

  test("processes queued messages sequentially", async ({ page }) => {
    let callCount = 0;
    await page.route("/api/chat", async (route) => {
      callCount++;
      const current = callCount;
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          documentHtml: `<h1>Response ${current}</h1><p>Content from message ${current}.</p>`,
        }),
      });
    });
    await page.route("/api/insights", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ questions: [], ideas: [] }),
      });
    });

    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    // Submit two messages quickly
    await chatInput.fill("First message");
    await sendButton.click();
    await chatInput.fill("Second message");
    await sendButton.click();

    // First should be processing, second queued
    await expect(page.getByTestId("processing-message")).toContainText(
      "First message"
    );
    await expect(page.getByTestId("queued-message")).toHaveCount(1);

    await page.screenshot({
      path: path.join(screenshotDir, "queue-04-sequential-start.png"),
      fullPage: true,
    });

    // Wait for first to complete — second should become processing
    await expect(page.getByTestId("processing-message")).toContainText(
      "Second message",
      { timeout: 5000 }
    );
    await expect(page.getByTestId("queued-message")).toHaveCount(0);

    await page.screenshot({
      path: path.join(screenshotDir, "queue-05-second-processing.png"),
      fullPage: true,
    });

    // Wait for second to complete — all chips gone
    await expect(page.getByTestId("message-queue")).not.toBeVisible({
      timeout: 5000,
    });

    // Document should have the final response
    await expect(page.getByTestId("document-content")).toContainText(
      "Response 2"
    );

    await page.screenshot({
      path: path.join(screenshotDir, "queue-06-all-done.png"),
      fullPage: true,
    });
  });

  test("input is always enabled while messages are queued", async ({
    page,
  }) => {
    await mockApis(page, 3000);
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");
    const sendButton = page.getByTestId("send-button");

    // Submit a message
    await chatInput.fill("Some message");
    await sendButton.click();

    // Input should remain enabled and editable
    await expect(chatInput).toBeEnabled();
    await expect(chatInput).toHaveValue("");
    await expect(sendButton).toHaveText("Send");

    // Can type a new message immediately
    await chatInput.fill("Another message");
    await expect(chatInput).toHaveValue("Another message");

    // Can submit the new message
    await sendButton.click();
    await expect(chatInput).toHaveValue("");

    // Both messages should be tracked
    await expect(page.getByTestId("processing-message")).toBeVisible();
    await expect(page.getByTestId("queued-message")).toHaveCount(1);
  });

  test("message text is truncated in chips", async ({ page }) => {
    await mockApis(page, 3000);
    await page.goto("/");

    const chatInput = page.getByTestId("chat-input");

    // Submit a very long message
    await chatInput.fill(
      "This is a very long message that should be truncated with an ellipsis when displayed as a floating chip above the send bar because it exceeds the available width"
    );
    await page.getByTestId("send-button").click();

    // The chip should have truncate class (text-overflow: ellipsis)
    const chipText = page.getByTestId("processing-message").locator(".truncate");
    await expect(chipText).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "queue-07-truncated-text.png"),
      fullPage: true,
    });
  });
});
