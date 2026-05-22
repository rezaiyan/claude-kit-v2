#!/usr/bin/env bun
/**
 * install.js — install deps, register `claudekit` globally, add PATH
 *
 * Idempotent: safe to run multiple times.
 * Uses a marker comment so uninstall.js can remove exactly what was added.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync } from "child_process";

const MARKER = "# added by claudekit";
const ZSHRC = join(homedir(), ".zshrc");
const BLOCK = `\n${MARKER}\nexport BUN_INSTALL="$HOME/.bun"\nexport PATH="$BUN_INSTALL/bin:$PATH"\n`;

const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg, hint) => {
  console.error(`\n  ✗ ${msg}\n    ${hint}\n`);
  process.exit(1);
};
const step = (n, total, msg) => console.log(`\n[${n}/${total}] ${msg}`);

const TOTAL = 3;

// ── 1. PATH ───────────────────────────────────────────────────────────────────

step(1, TOTAL, "Setting up PATH");

try {
  const zshrc = existsSync(ZSHRC) ? readFileSync(ZSHRC, "utf8") : "";

  if (zshrc.includes(MARKER)) {
    ok("PATH already configured (claudekit marker found)");
  } else if (zshrc.includes("BUN_INSTALL") || zshrc.includes(".bun/bin")) {
    ok("~/.bun/bin already in ~/.zshrc (set by another tool)");
  } else {
    writeFileSync(ZSHRC, zshrc + BLOCK);
    ok("Added ~/.bun/bin to PATH in ~/.zshrc");
  }
} catch (e) {
  fail("Could not update ~/.zshrc", `Check file permissions: ls -la ${ZSHRC}`);
}

// ── 2. Dependencies ───────────────────────────────────────────────────────────

step(2, TOTAL, "Installing dependencies");

try {
  execSync("bun install", {
    cwd: import.meta.dir + "/..",
    stdio: "pipe",
    timeout: 60_000,
  });
  ok("Dependencies installed (@clack/prompts, picocolors)");
} catch (e) {
  const stderr = e.stderr?.toString().trim();
  if (stderr) console.error(`    ${stderr}`);
  fail(
    "bun install failed",
    "Check your internet connection, then retry: bun run install",
  );
}

// ── 3. Register command ───────────────────────────────────────────────────────

step(3, TOTAL, "Registering claudekit command");

try {
  execSync("bun link", {
    cwd: import.meta.dir + "/..",
    stdio: "pipe",
    timeout: 15_000,
  });
  ok("claudekit registered globally (~/.bun/bin/claudekit)");
} catch (e) {
  const stderr = e.stderr?.toString().trim();
  if (stderr) console.error(`    ${stderr}`);
  fail(
    "bun link failed — claudekit command not registered",
    "Try running manually: cd " + import.meta.dir + "/.. && bun link",
  );
}

// ── Done ──────────────────────────────────────────────────────────────────────

console.log(`
╔══════════════════════════════════════════╗
║   claudekit installed successfully!      ║
╚══════════════════════════════════════════╝

  Open a new terminal, then run:

    claudekit

  to choose which tools to enable.
`);
