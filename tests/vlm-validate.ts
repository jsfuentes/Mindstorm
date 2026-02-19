import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const screenshotDir = path.join(__dirname, "..", "test-screenshots");

type ValidationResult = {
  file: string;
  pass: boolean;
  analysis: string;
};

const EXPECTATIONS: Record<string, string> = {
  "01-initial-state.png": `This should show the initial state of a brainstorming app with:
- A two-panel layout: white document area on the LEFT taking most width, gray sidebar on the RIGHT
- The document area should show empty state text like "Start brainstorming"
- A chat input box at the BOTTOM of the document area
- The sidebar should show "Questions" and "Ideas" section headers
- Minimalist, clean design`,

  "02-after-first-input.png": `This should show the app after the user submitted brainstorming content:
- The document area should now contain structured content (headers, text, possibly bullet points)
- The empty state should be GONE
- The chat input should be at the bottom, cleared and ready for more input
- The sidebar should still be visible on the right`,

  "03-first-content.png": `This should show the app with a recipe platform document:
- The document area should contain structured content about a recipe sharing platform
- Should have headers and organized text
- Chat input at the bottom
- Sidebar visible on right`,

  "04-added-more-content.png": `This should show the app with expanded content:
- Document should now include BOTH recipe sharing AND meal planning content
- Content should be well-organized with headers and sections
- Should mention meal planning, weekly calendar, or grocery list`,

  "05-after-reorganize.png": `This should show the app after a reorganization command:
- Document should be reorganized with clear sections: Overview, Core Features, Advanced Features, Technical Considerations
- The content should be well-structured with these header sections
- All previous content should still be present, just reorganized`,

  "06-sidebar-questions.png": `This should show the sidebar with AI-generated questions:
- The sidebar Questions section should contain actual question items (not empty)
- Questions should be displayed as a list
- Each question should be relevant to the document content`,

  "07-ideas-collapsed.png": `This should show the app with the Ideas section collapsed:
- Questions should be visible in the sidebar
- The Ideas section should be collapsed (no idea items visible, just the header)`,

  "08-ideas-expanded.png": `This should show the app with the Ideas section expanded:
- Questions should be visible in the sidebar
- The Ideas section should be EXPANDED showing idea items
- Ideas should be relevant to the document content`,

  "09-after-processing.png": `This should show the app after processing is complete:
- Document should contain content about a project management tool
- Chat input should be enabled and empty (ready for new input)
- Send button should say "Send" (not "Thinking...")`,

  // Settings screenshots
  "settings-01-button-visible.png": `This should show the app initial state with a settings gear icon:
- A gear/cog icon button should be visible in the top-right area of the document panel
- The rest of the layout should be the standard brainstorming app layout`,

  "settings-02-modal-open.png": `This should show the settings modal open:
- A modal dialog should be visible over the app
- The modal should have a left sidebar with "SETTINGS" header and a "Templates" item
- The right side should show template editing with Name field and Template textarea
- The default template name should be "Spec Template"
- The textarea should contain template text with sections like Context, Target Outcomes, etc.
- A Save button should be at the bottom right`,

  "settings-03-full-layout.png": `Same as settings-02 — the settings modal with full layout visible:
- Left sidebar with "SETTINGS" and "Templates"
- Right side: Name input with "Spec Template", Template textarea with default content, Save button
- No appendix sections UI should be present`,

  "settings-04-name-edited.png": `This should show the settings modal with the template name edited:
- The Name input should show "My Custom Template" instead of "Spec Template"
- The template content textarea should still have the default template`,

  "settings-07-reopened-persisted.png": `This should show the settings modal after saving and reopening:
- The Name input should show "Engineering Design Doc" (persisted from a previous save)
- The template content should still be present`,

  // Queue screenshots
  "queue-01-processing-chip.png": `This should show a message being processed:
- A floating chip/pill should appear ABOVE the chat input bar
- The chip should contain text about "REST API" or "authentication"
- The chip should have a small dot indicator (processing indicator)
- The chat input below should be EMPTY and ENABLED (not disabled)
- The Send button should say "Send"`,

  "queue-03-multiple-queued.png": `This should show multiple messages queued:
- There should be 3 floating chips/pills above the chat input
- The FIRST chip (processing) should mention "JWT tokens" or "authentication" — it should appear slightly darker/more prominent
- The SECOND and THIRD chips (queued) should appear lighter/more muted
- One should mention "rate limiting" and another "WebSocket"
- The chat input below should be empty and enabled`,

  "queue-04-sequential-start.png": `This should show two messages in the queue:
- A processing chip showing "First message" (darker, with processing indicator)
- A queued chip showing "Second message" (lighter/muted)
- Chat input should be empty and enabled`,

  "queue-05-second-processing.png": `This should show the second message now being processed:
- The document should show "Response 1" content (first message completed)
- A single processing chip showing "Second message" should be above the input
- No queued messages remaining`,

  "queue-06-all-done.png": `This should show the app after all queued messages are processed:
- The document should show "Response 2" content
- There should be NO floating chips above the input — the queue is empty
- The chat input should be clean and ready for new input`,

  "queue-07-truncated-text.png": `This should show a long message being truncated in the chip:
- A processing chip should be visible above the input
- The text should be TRUNCATED with an ellipsis (...) because it's too long to fit
- The chip should NOT wrap to multiple lines — it should be a single line with overflow hidden`,
};

async function validateScreenshot(
  filePath: string,
  expectation: string
): Promise<ValidationResult> {
  const fileName = path.basename(filePath);
  const imageData = fs.readFileSync(filePath);
  const base64 = imageData.toString("base64");

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: base64,
            },
          },
          {
            type: "text",
            text: `You are a visual QA validator. Analyze this screenshot and determine if it meets the expected criteria.

EXPECTED:
${expectation}

Respond in this exact JSON format:
{
  "pass": true/false,
  "analysis": "Brief description of what you see and whether it matches expectations"
}

Be strict but fair. The app should have the described layout and content. Minor styling differences are OK.`,
          },
        ],
      },
    ],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  // Strip markdown code block wrapping if present
  const text = rawText
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "")
    .trim();

  try {
    const result = JSON.parse(text);
    return {
      file: fileName,
      pass: result.pass,
      analysis: result.analysis,
    };
  } catch {
    return {
      file: fileName,
      pass: false,
      analysis: `Failed to parse VLM response: ${text.slice(0, 200)}`,
    };
  }
}

async function main() {
  console.log("=== VLM Visual Validation ===\n");

  const files = fs.readdirSync(screenshotDir).filter((f) => f.endsWith(".png"));

  if (files.length === 0) {
    console.log("No screenshots found. Run Playwright tests first.");
    process.exit(1);
  }

  console.log(`Found ${files.length} screenshots to validate.\n`);

  const results: ValidationResult[] = [];

  for (const file of files.sort()) {
    const expectation = EXPECTATIONS[file];
    if (!expectation) {
      console.log(`  SKIP ${file} — no expectation defined`);
      continue;
    }

    console.log(`  Validating ${file}...`);
    const result = await validateScreenshot(
      path.join(screenshotDir, file),
      expectation
    );
    results.push(result);

    const icon = result.pass ? "PASS" : "FAIL";
    console.log(`  ${icon} ${file}`);
    console.log(`       ${result.analysis}\n`);
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  console.log(`\n=== Results: ${passed}/${total} passed ===`);

  if (passed < total) {
    console.log("\nFailed validations:");
    results
      .filter((r) => !r.pass)
      .forEach((r) => {
        console.log(`  - ${r.file}: ${r.analysis}`);
      });
    process.exit(1);
  }

  console.log("\nAll visual validations passed!");
}

main().catch((err) => {
  console.error("VLM validation error:", err);
  process.exit(1);
});
