import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTemplateContent } from "@/lib/queries";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type HistoryMessage = { role: "user" | "assistant"; content: string };

const BASE_SYSTEM_PROMPT = `You are a brainstorming assistant that helps users organize their thoughts into a structured document.

You receive user messages that are either:
1. **Content** — ideas, thoughts, specs, notes to be captured in the document
2. **Commands** — instructions to reorganize, restructure, rewrite, or change the existing document

Your job is to maintain and update a living HTML document based on user input.

RULES:
- Return ONLY the updated full HTML document content (no wrapping <html>, <body>, or <head> tags — just the inner content)
- Use semantic HTML: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>
- Keep the document well-organized, clean, and readable
- Preserve all existing content unless the user explicitly asks to remove something
- Do not include any explanation or commentary — return ONLY the HTML content`;

function buildSystemPrompt() {
  const template = getTemplateContent();
  if (!template) return BASE_SYSTEM_PROMPT;

  return `${BASE_SYSTEM_PROMPT}

TEMPLATE — You MUST structure the document following this template. Use the exact section titles and ordering:
---
${template}
---

TEMPLATE RULES:
- Use the exact section headings from the template above as HTML headings
- Replace bracketed placeholder text [...] with actual content based on the user's input
- Preserve the order of sections as defined in the template
- When the user provides content, place it in the most relevant template section
- Any information that does not fit into the defined template sections must go in an "Appendix" section at the bottom
- If the user explicitly requests new sections not in the template, add them as sub-sections under Appendix
- Do NOT invent new top-level sections outside the template — follow it closely`;
}

export async function POST(request: NextRequest) {
  const { message, documentHtml, history } = (await request.json()) as {
    message: string;
    documentHtml: string;
    history: HistoryMessage[];
  };

  const conversationMessages: Anthropic.MessageParam[] = history
    .slice(-10)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  conversationMessages.push({
    role: "user",
    content: `Current document:
<document>
${documentHtml || "<p>Empty document — no content yet.</p>"}
</document>

User input: "${message}"

Return the updated HTML document content.`,
  });

  const systemPrompt = buildSystemPrompt();

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages: conversationMessages,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ documentHtml: text });
}
