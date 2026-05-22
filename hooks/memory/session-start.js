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

let freshInstall = false;
const installErrors = [];

if (pluginRoot && !existsSync(claudekitBin)) {
  // Step 1: install deps
  try {
    execSync("bun install", {
      cwd: pluginRoot,
      stdio: "pipe",
      timeout: 60_000,
    });
  } catch (e) {
    installErrors.push("deps: " + (e.stderr?.toString().trim() || e.message));
  }

  // Step 2: register claudekit command
  try {
    execSync("bun link", { cwd: pluginRoot, stdio: "pipe", timeout: 15_000 });
  } catch (e) {
    installErrors.push("link: " + (e.stderr?.toString().trim() || e.message));
  }

  // Step 3: add ~/.bun/bin to PATH in ~/.zshrc
  try {
    const MARKER = "# added by claudekit";
    const ZSHRC = join(homedir(), ".zshrc");
    const zshrc = existsSync(ZSHRC) ? readFileSync(ZSHRC, "utf8") : "";
    if (!zshrc.includes(MARKER) && !zshrc.includes(".bun/bin")) {
      writeFileSync(
        ZSHRC,
        zshrc +
          `\n${MARKER}\nexport BUN_INSTALL="$HOME/.bun"\nexport PATH="$BUN_INSTALL/bin:$PATH"\n`,
      );
    }
  } catch (e) {
    installErrors.push("path: " + e.message);
  }

  freshInstall = true;
}

// After fresh install, report status to Claude
if (freshInstall) {
  const ok = installErrors.length === 0;
  const lines = ok
    ? [
        "**claudekit installed successfully.**",
        "",
        "Open a new terminal tab, then run `claudekit` to choose which tools to enable.",
        "Until then, all tools are on by default.",
      ]
    : [
        "**claudekit install completed with warnings.**",
        "",
        "Issues encountered:",
        ...installErrors.map((e) => `- ${e}`),
        "",
        "To fix: open a terminal in the plugin directory and run `bun run install`.",
        "Or reinstall: `/plugin uninstall claudekit@rezaiyan` then `/plugin install claudekit@rezaiyan`",
      ];

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: lines.join("\n"),
      },
    }),
  );
  process.exit(0);
}

// ── Config ────────────────────────────────────────────────────────────────────

// Config may not be importable yet if deps just installed — use dynamic import
const { isToolEnabled, getConfig } = await import("../../lib/config.js");

// ── Spec workflow sync ────────────────────────────────────────────────────────
// Ensure ~/.claude/commands/ matches the spec tool's enabled state.
// Runs every session start — idempotent, silent on failure.
try {
  const { installSpec, uninstallSpec } =
    await import("../../lib/spec-installer.js");
  if (isToolEnabled("spec")) {
    installSpec();
  } else {
    uninstallSpec();
  }
} catch {
  /* never block session start */
}

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
