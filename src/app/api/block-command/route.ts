import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COMMAND_PROMPTS: Record<string, string> = {
  rewrite: "Rewrite this to be clearer and better structured.",
  condense: "Make this more concise while keeping all key information.",
  expand: "Expand this with more detail, examples, or supporting points.",
};

export async function POST(request: NextRequest) {
  const { blockHtml, command } = (await request.json()) as {
    blockHtml: string;
    command: string;
  };

  const instruction = COMMAND_PROMPTS[command];
  if (!instruction) {
    return NextResponse.json({ error: "Unknown command" }, { status: 400 });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: `You transform HTML blocks as instructed. Return ONLY the updated HTML block — no explanation, no wrapping tags. Preserve the same outer tag type (e.g. if given a <p>, return a <p>; if given a <ul>, return a <ul>). Use semantic HTML: <strong>, <em>, <ul>, <ol>, <li> as needed within the block.`,
    messages: [
      {
        role: "user",
        content: `${instruction}\n\nBlock:\n${blockHtml}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ html: text });
}
