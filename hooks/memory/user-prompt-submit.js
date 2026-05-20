#!/usr/bin/env bun
/**
 * UserPromptSubmit hook — record first prompt as session request
 * Input (stdin): { session_id, cwd, prompt }
 */
import { getConfig, isToolEnabled } from "../../lib/config.js";
import { homedir } from "os";
import { basename } from "path";

if (!isToolEnabled("memory")) {
  console.log(JSON.stringify({ suppressOutput: true }));
  process.exit(0);
}

const cfg = getConfig();
if (cfg.tools.memory.dbPath) {
  process.env.CLAUDE_KIT_DB_PATH = cfg.tools.memory.dbPath.replace(
    /^~/,
    homedir(),
  );
}

const { upsertSession } = await import("./db.js");

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));
const { session_id, cwd, prompt } = input;

if (!session_id) {
  console.log(JSON.stringify({ suppressOutput: true }));
  process.exit(0);
}

const project = basename(cwd ?? process.cwd());
const clean = (prompt ?? "").replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "").trim();

try {
  upsertSession(session_id, project, clean.slice(0, 200));
} catch {
  // silent — never block user prompt
}

console.log(JSON.stringify({ suppressOutput: true }));
