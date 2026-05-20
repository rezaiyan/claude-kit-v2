#!/usr/bin/env bun
/**
 * install.js — add ~/.bun/bin to PATH and register `claudekit` globally
 *
 * Idempotent: safe to run multiple times.
 * Uses a marker comment so uninstall.js can remove exactly what we added.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync } from "child_process";

const MARKER = "# added by claude-kit";
const ZSHRC = join(homedir(), ".zshrc");
const BLOCK = `\n${MARKER}\nexport BUN_INSTALL="$HOME/.bun"\nexport PATH="$BUN_INSTALL/bin:$PATH"\n`;

// ── 1. PATH ──────────────────────────────────────────────────────────────────

const zshrc = existsSync(ZSHRC) ? readFileSync(ZSHRC, "utf8") : "";

if (zshrc.includes(MARKER)) {
  console.log("✓ PATH already set (claude-kit marker found)");
} else if (zshrc.includes("BUN_INSTALL") || zshrc.includes(".bun/bin")) {
  console.log("✓ ~/.bun/bin already in ~/.zshrc (set by another tool)");
} else {
  writeFileSync(ZSHRC, zshrc + BLOCK);
  console.log("✓ Added ~/.bun/bin to PATH in ~/.zshrc");
}

// ── 2. bun link ──────────────────────────────────────────────────────────────

try {
  execSync("bun link", { cwd: import.meta.dir + "/..", stdio: "pipe" });
  console.log("✓ Registered claudekit globally");
} catch (e) {
  console.error("✗ bun link failed:", e.stderr?.toString().trim());
  process.exit(1);
}

// ── Done ─────────────────────────────────────────────────────────────────────

console.log(
  "\nInstalled. Open a new terminal (or run: source ~/.zshrc) then type:",
);
console.log("\n  claudekit\n");
