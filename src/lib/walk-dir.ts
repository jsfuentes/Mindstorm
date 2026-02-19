import fs from "fs/promises";
import path from "path";

const EXCLUDED = new Set(["node_modules", ".git", ".next", "dist", ".cache"]);

export async function walkDir(
  dir: string,
  depth = 0
): Promise<{ count: number; topEntries: string[] }> {
  if (depth > 5) return { count: 0, topEntries: [] };
  let count = 0;
  const topEntries: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name) || entry.name.startsWith(".")) continue;
    if (depth === 0) {
      topEntries.push(entry.isDirectory() ? `${entry.name}/` : entry.name);
    }
    if (entry.isDirectory()) {
      const sub = await walkDir(path.join(dir, entry.name), depth + 1);
      count += sub.count;
    } else {
      count++;
    }
  }
  return { count, topEntries };
}
