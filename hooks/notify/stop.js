#!/usr/bin/env bun
/**
 * Stop hook — macOS desktop notification
 */
import { execSync } from "child_process";
import { isToolEnabled } from "../../lib/config.js";

if (!isToolEnabled("notify")) {
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));
const project = input?.cwd?.split("/").at(-1) ?? "claude-code";

try {
  if (process.platform === "darwin") {
    execSync(
      `osascript -e 'display notification "Task complete in ${project}" with title "Claude Code"'`,
      { timeout: 3000 },
    );
  }
} catch {
  /* silent */
}

console.log(JSON.stringify({ continue: true, suppressOutput: true }));
