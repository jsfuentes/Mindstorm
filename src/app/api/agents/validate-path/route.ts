import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { walkDir } from "@/lib/walk-dir";

export async function POST(request: NextRequest) {
  const { cwd } = await request.json();

  // Expand ~ to home directory
  const resolved = cwd.startsWith("~")
    ? path.join(process.env.HOME || "/", cwd.slice(1))
    : cwd;

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      return NextResponse.json({ valid: false, error: "Not a directory" });
    }
    const { count, topEntries } = await walkDir(resolved);
    return NextResponse.json({
      valid: true,
      fileCount: count,
      topEntries,
      resolvedPath: resolved,
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Directory not found" });
  }
}
