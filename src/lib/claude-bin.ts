import { execSync } from "child_process";
import path from "path";
import os from "os";

export function getClaudePath(): string {
  try {
    return execSync("zsh -ilc 'which claude'", { encoding: "utf-8" }).trim();
  } catch {
    return "claude";
  }
}

export const claudeBin = getClaudePath();

export function resolveCwd(cwd: string): string {
  if (cwd.startsWith("~")) {
    return path.join(os.homedir(), cwd.slice(1));
  }
  return cwd;
}
