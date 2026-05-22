#!/usr/bin/env bun
/**
 * PreToolUse:Write|Edit — block writes to .env and secret files
 * Input (stdin): { tool_name, tool_input: { file_path } }
 */
import { isToolEnabled } from "../../lib/config.js";

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));

if (!isToolEnabled("quality")) {
  console.log(JSON.stringify({ decision: "approve" }));
  process.exit(0);
}

const PROTECTED = /\.(env|env\.\w+|pem|key|p12|pfx|secret)$/i;
const ALSO_PROTECTED = /(secrets?|credentials?|\.aws\/credentials)/i;

const path = input?.tool_input?.file_path ?? "";

if (PROTECTED.test(path) || ALSO_PROTECTED.test(path)) {
  console.log(
    JSON.stringify({
      decision: "block",
      reason: `Protected file: ${path}. Edit manually if intentional.`,
    }),
  );
} else {
  console.log(JSON.stringify({ decision: "approve" }));
}
