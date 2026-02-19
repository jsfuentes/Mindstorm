import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "child_process";
import { claudeBin, resolveCwd } from "@/lib/claude-bin";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an analytical brainstorming assistant. Given a document being collaboratively built, generate:

1. **Questions**: Clarifying questions that would help improve or expand the document. Rank by importance (1 = most important).
2. **Ideas**: Alternative considerations, suggestions, or creative angles. Rank by relevance (1 = most relevant).

Return a JSON object with this exact structure:
{
  "questions": [
    { "id": "q1", "text": "...", "importance": 1 },
    { "id": "q2", "text": "...", "importance": 2 }
  ],
  "ideas": [
    { "id": "i1", "text": "...", "relevance": 1 },
    { "id": "i2", "text": "...", "relevance": 2 }
  ]
}

RULES:
- Generate 3-5 questions, ranked by importance (1 = most important)
- Generate 3 ideas/alternatives, ranked by relevance (1 = most relevant)
- Questions should be specific and actionable
- Ideas should offer genuinely different perspectives or approaches
- Return ONLY valid JSON, no explanation or markdown`;

export async function POST(request: NextRequest) {
  try {
    const { documentHtml, cwd } = (await request.json()) as {
      documentHtml: string;
      cwd?: string;
    };

    if (!documentHtml || documentHtml.includes("Empty document")) {
      return NextResponse.json({ questions: [], ideas: [] });
    }

    // When cwd is provided, use Claude Code for codebase-aware insights
    if (cwd) {
      return handleWithClaudeCode(documentHtml, cwd);
    }

    // Fallback: direct Anthropic API call
    return handleWithApi(documentHtml);
  } catch (error) {
    console.error("Insights API error:", error);
    return NextResponse.json({ questions: [], ideas: [] });
  }
}

async function handleWithClaudeCode(documentHtml: string, cwd: string) {
  const prompt = `You are reviewing a design/spec document for a project in this codebase. Explore the codebase to understand the architecture, key files, and patterns. Then analyze the document and generate insights.

Document:
${documentHtml}

Based on your understanding of BOTH the document AND the actual codebase, generate:
1. Questions that would help improve this spec — reference specific files, patterns, or architectural decisions from the codebase where relevant
2. Ideas for alternative approaches or considerations based on what you see in the code

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "questions": [
    { "id": "q1", "text": "...", "importance": 1 },
    { "id": "q2", "text": "...", "importance": 2 }
  ],
  "ideas": [
    { "id": "i1", "text": "...", "relevance": 1 },
    { "id": "i2", "text": "...", "relevance": 2 }
  ]
}

RULES:
- Generate 3-5 questions, ranked by importance (1 = most important)
- Generate 3 ideas/alternatives, ranked by relevance (1 = most relevant)
- Questions should reference actual codebase files/patterns when relevant
- Ideas should be grounded in the reality of the codebase
- Return ONLY valid JSON`;

  const resolvedCwd = resolveCwd(cwd);
  const env = { ...process.env } as NodeJS.ProcessEnv &
    Record<string, string | undefined>;
  delete env.CLAUDE_CODE;
  delete env.CLAUDECODE;

  const output = execFileSync(
    claudeBin,
    ["--print", "--permission-mode", "plan", "-p", prompt],
    {
      cwd: resolvedCwd,
      env,
      encoding: "utf-8",
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  const text = output
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "")
    .trim();

  // Find the JSON object in the output
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Claude Code returned no JSON:", text.slice(0, 500));
    return NextResponse.json({ questions: [], ideas: [] });
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return NextResponse.json({
    questions: parsed.questions || [],
    ideas: parsed.ideas || [],
  });
}

async function handleWithApi(documentHtml: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze this document and generate questions and ideas:\n\n${documentHtml}`,
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

  const parsed = JSON.parse(text);
  return NextResponse.json({
    questions: parsed.questions || [],
    ideas: parsed.ideas || [],
  });
}
