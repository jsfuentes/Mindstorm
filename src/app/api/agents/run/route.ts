import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { claudeBin, resolveCwd } from "@/lib/claude-bin";

export async function POST(request: NextRequest) {
  const { prompt, cwd, sessionId, isFollowUp } = await request.json();

  const args = [
    "--print",
    "--verbose",
    "--permission-mode",
    "plan",
    "--output-format",
    "stream-json",
  ];

  if (isFollowUp) {
    args.push("--resume", sessionId);
  } else {
    args.push("--session-id", sessionId);
  }

  args.push("-p", prompt);

  const encoder = new TextEncoder();
  const resolvedCwd = resolveCwd(cwd);

  const stream = new ReadableStream({
    start(controller) {
      const env = { ...process.env } as NodeJS.ProcessEnv &
        Record<string, string | undefined>;
      delete env.CLAUDE_CODE;
      delete env.CLAUDECODE;

      const child = spawn(claudeBin, args, {
        cwd: resolvedCwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let buffer = "";

      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) {
            controller.enqueue(encoder.encode(`data: ${line}\n\n`));
          }
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: text })}\n\n`
            )
          );
        }
      });

      child.on("close", (code) => {
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(`data: ${buffer}\n\n`));
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", exitCode: code })}\n\n`
          )
        );
        controller.close();
      });

      child.on("error", (err) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`
          )
        );
        controller.close();
      });

      // Kill child on connection close
      request.signal.addEventListener("abort", () => {
        child.kill("SIGTERM");
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
