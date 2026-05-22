#!/usr/bin/env bun
/**
 * PostToolUse:Write|Edit — warn on console.log in src/ or lib/ files
 */
import { isToolEnabled } from "../../lib/config.js";

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));

if (!isToolEnabled("quality")) {
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

const path = input?.tool_input?.file_path ?? "";
const content =
  input?.tool_input?.new_string ?? input?.tool_input?.content ?? "";

const inSrc = /\bsrc\//.test(path) || /\blib\//.test(path);
const hasCL = /console\.log\(/.test(content);

if (inSrc && hasCL && /\.(ts|tsx|js|jsx|kt|kts)$/.test(path)) {
  process.stderr.write(
    `[claude-kit] console.log detected in ${path} — remove before committing\n`,
  );
}

console.log(JSON.stringify({ continue: true, suppressOutput: true }));
