#!/usr/bin/env bun
/**
 * SessionEnd hook — mark session complete
 * Input (stdin): { session_id, cwd, reason }
 */
import { getConfig, isToolEnabled } from "../../lib/config.js";
import { homedir } from "os";

if (!isToolEnabled("memory")) {
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

const cfg = getConfig();
if (cfg.tools.memory.dbPath) {
  process.env.CLAUDE_KIT_DB_PATH = cfg.tools.memory.dbPath.replace(
    /^~/,
    homedir(),
  );
}

const { completeSession } = await import("./db.js");

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));
const { session_id } = input;

if (session_id) {
  try {
    completeSession(session_id);
  } catch {
    // silent
  }
}

console.log(JSON.stringify({ continue: true, suppressOutput: true }));
