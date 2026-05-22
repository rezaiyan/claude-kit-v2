#!/usr/bin/env bun
/**
 * PostToolUse:Write|Edit — auto-format on save
 * Kotlin: ktfmt (if available)
 * TypeScript/JS: prettier (if available)
 */
import { execSync } from "child_process";
import { isToolEnabled } from "../../lib/config.js";

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));

if (!isToolEnabled("quality")) {
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

const path = input?.tool_input?.file_path ?? input?.tool_input?.path ?? "";

if (!path) {
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

try {
  if (/\.(kt|kts)$/.test(path)) {
    execSync(`ktfmt --kotlinlang-style "${path}" 2>/dev/null`, {
      timeout: 10000,
    });
  } else if (/\.(ts|tsx|js|jsx)$/.test(path)) {
    execSync(`prettier --write "${path}" 2>/dev/null`, { timeout: 10000 });
  }
} catch {
  // formatter not installed or failed — silent, don't block
}

console.log(JSON.stringify({ continue: true, suppressOutput: true }));
