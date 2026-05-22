#!/usr/bin/env bun
/**
 * PreToolUse:Bash — block git --no-verify
 * Input (stdin): { tool_name, tool_input: { command } }
 */
import { isToolEnabled } from "../../lib/config.js";

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));

if (!isToolEnabled("quality")) {
  console.log(JSON.stringify({ decision: "approve" }));
  process.exit(0);
}

const cmd = input?.tool_input?.command ?? "";

if (/git\s+.*--no-verify/.test(cmd)) {
  console.log(
    JSON.stringify({
      decision: "block",
      reason: "git --no-verify bypasses hooks. Fix the hook failure instead.",
    }),
  );
} else {
  console.log(JSON.stringify({ decision: "approve" }));
}
