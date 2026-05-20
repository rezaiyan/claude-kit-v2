#!/usr/bin/env bun
/**
 * uninstall.js — remove PATH entry and unregister `claudekit`
 *
 * Only removes what install.js added (identified by marker comment).
 * Never touches PATH entries added by other tools.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync } from "child_process";

const MARKER = "# added by claude-kit";
const ZSHRC = join(homedir(), ".zshrc");

// ── 1. Remove PATH block ─────────────────────────────────────────────────────

if (existsSync(ZSHRC)) {
  const content = readFileSync(ZSHRC, "utf8");
  const cleaned = content.replace(
    /\n# added by claude-kit\nexport BUN_INSTALL=.*\nexport PATH=.*\n/,
    "\n",
  );
  if (cleaned !== content) {
    writeFileSync(ZSHRC, cleaned);
    console.log("✓ Removed PATH entry from ~/.zshrc");
  } else if (content.includes(MARKER)) {
    // marker present but block pattern didn't match — remove just the marker line
    writeFileSync(ZSHRC, content.replace(/\n# added by claude-kit\n/, "\n"));
    console.log("✓ Removed marker from ~/.zshrc");
  } else {
    console.log("✓ No claude-kit PATH entry found in ~/.zshrc");
  }
}

// ── 2. bun unlink ────────────────────────────────────────────────────────────

try {
  execSync("bun unlink", { cwd: import.meta.dir + "/..", stdio: "pipe" });
  console.log("✓ Unregistered claudekit");
} catch {
  console.log("✓ claudekit was not globally registered");
}

// ── Done ─────────────────────────────────────────────────────────────────────

console.log(
  "\nUninstalled. Open a new terminal for PATH changes to take effect.\n",
);
