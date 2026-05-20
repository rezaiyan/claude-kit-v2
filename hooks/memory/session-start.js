#!/usr/bin/env bun
/**
 * SessionStart hook — inject recent session summaries as additionalContext
 * Input (stdin): { session_id, cwd, source }
 *
 * Also handles first-run setup when installed via Claude Code marketplace:
 * installs deps and links `claudekit` command if not already done.
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { basename, join } from "path";
import { execSync } from "child_process";

// ── First-run setup ───────────────────────────────────────────────────────────
// When installed via marketplace, deps aren't installed and claudekit isn't
// linked yet. Detect this and self-setup once, silently.

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
const claudekitBin = join(homedir(), ".bun", "bin", "claudekit");

if (pluginRoot && !existsSync(claudekitBin)) {
  try {
    // Install npm deps (@clack/prompts, picocolors)
    execSync("bun install", {
      cwd: pluginRoot,
      stdio: "pipe",
      timeout: 60_000,
    });

    // Register `claudekit` command globally
    execSync("bun link", { cwd: pluginRoot, stdio: "pipe", timeout: 15_000 });

    // Add ~/.bun/bin to PATH in ~/.zshrc if not already present
    const MARKER = "# added by claude-kit";
    const ZSHRC = join(homedir(), ".zshrc");
    const zshrc = existsSync(ZSHRC) ? readFileSync(ZSHRC, "utf8") : "";
    if (!zshrc.includes(MARKER) && !zshrc.includes(".bun/bin")) {
      writeFileSync(
        ZSHRC,
        zshrc +
          `\n${MARKER}\nexport BUN_INSTALL="$HOME/.bun"\nexport PATH="$BUN_INSTALL/bin:$PATH"\n`,
      );
    }
  } catch {
    // Never block session start — setup failure is non-fatal
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

// Config may not be importable yet if deps just installed — use dynamic import
const { isToolEnabled, getConfig } = await import("../../lib/config.js");

if (!isToolEnabled("memory")) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

const cfg = getConfig();

if (cfg.tools.memory.dbPath) {
  process.env.CLAUDE_KIT_DB_PATH = cfg.tools.memory.dbPath.replace(
    /^~/,
    homedir(),
  );
}

const { getRecentSummaries } = await import("./db.js");

// ── Inject context ────────────────────────────────────────────────────────────

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));
const project = basename(input.cwd ?? process.cwd());

let context = "";
try {
  const summaries = getRecentSummaries(
    project,
    cfg.tools.memory.recentSessions,
  );
  if (summaries.length > 0) {
    const lines = summaries.map((s, i) => {
      const date =
        s.summary_at?.split("T")[0] ?? s.summary_at?.split(" ")[0] ?? "";
      const tools = s.tools_used ? ` [${s.tools_used}]` : "";
      const parts = [`### Session ${i + 1} — ${date}${tools}`];
      if (s.request) parts.push(`**Asked:** ${s.request}`);
      if (s.completed) parts.push(`**Done:** ${s.completed}`);
      return parts.join("\n");
    });
    context = `## Recent sessions in \`${project}\`\n\n${lines.join("\n\n")}`;
  }
} catch {
  // DB not ready yet — silent, first run
}

if (context) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: context,
      },
    }),
  );
} else {
  console.log(JSON.stringify({}));
}
