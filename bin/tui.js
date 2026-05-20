#!/usr/bin/env bun
import {
  intro,
  outro,
  select,
  text,
  confirm,
  spinner,
  note,
  isCancel,
  cancel,
} from "@clack/prompts";
import pc from "picocolors";
import { getConfig, saveConfig } from "../lib/config.js";
import { homedir } from "os";

async function main() {
  console.clear();
  intro(pc.bgCyan(pc.black(" claude-kit ")));
  await mainMenu();
  outro("Done.");
}

// ── Main menu ──────────────────────────────────────────────────────────────────

async function mainMenu() {
  while (true) {
    const config = getConfig();
    const memEnabled = config.tools.memory.enabled;

    const choice = await select({
      message: "Select a tool",
      options: [
        {
          value: "memory",
          label: "Memory",
          hint: memEnabled ? pc.green("enabled") : pc.dim("disabled"),
        },
        { value: "exit", label: "Exit" },
      ],
    });

    if (isCancel(choice) || choice === "exit") break;
    if (choice === "memory") await memoryMenu();
  }
}

// ── Memory tool menu ───────────────────────────────────────────────────────────

async function memoryMenu() {
  while (true) {
    const config = getConfig();
    const mem = config.tools.memory;

    note(
      [
        `Status    ${mem.enabled ? pc.green("● enabled") : pc.red("○ disabled")}`,
        `Sessions  ${pc.bold(String(mem.recentSessions))} recent per project injected on start`,
        `DB        ${pc.dim(mem.dbPath ?? "~/.claude-kit/memory.db")}`,
      ].join("\n"),
      "Memory",
    );

    const choice = await select({
      message: "Action",
      options: [
        {
          value: "toggle",
          label: mem.enabled ? pc.red("Disable") : pc.green("Enable"),
        },
        {
          value: "sessions",
          label: "Recent sessions count",
          hint: `current: ${mem.recentSessions}`,
        },
        {
          value: "dbpath",
          label: "Database path",
          hint: mem.dbPath ?? "default",
        },
        { value: "view", label: "View sessions" },
        {
          value: "clear",
          label: pc.red("Clear all sessions"),
          hint: "destructive",
        },
        { value: "back", label: "Back" },
      ],
    });

    if (isCancel(choice) || choice === "back") break;
    await handleMemoryAction(choice);
  }
}

// ── Actions ────────────────────────────────────────────────────────────────────

async function handleMemoryAction(choice) {
  const config = getConfig();
  const mem = config.tools.memory;

  if (choice === "toggle") {
    config.tools.memory.enabled = !mem.enabled;
    saveConfig(config);
    note(
      config.tools.memory.enabled
        ? pc.green("Memory tool is now enabled.")
        : pc.dim("Memory tool is now disabled."),
      "✓ Saved",
    );
  } else if (choice === "sessions") {
    const val = await text({
      message: "Recent sessions to inject per project (1–50)",
      initialValue: String(mem.recentSessions),
      validate: (v) => {
        const n = parseInt(v);
        if (isNaN(n) || n < 1 || n > 50)
          return "Enter a number between 1 and 50";
      },
    });
    if (!isCancel(val)) {
      config.tools.memory.recentSessions = parseInt(val);
      saveConfig(config);
      note(
        `Will inject ${config.tools.memory.recentSessions} session(s) on start`,
        "✓ Saved",
      );
    }
  } else if (choice === "dbpath") {
    const val = await text({
      message: "Database path (leave empty to use default)",
      initialValue: mem.dbPath ?? "",
      placeholder: "~/.claude-kit/memory.db",
    });
    if (!isCancel(val)) {
      config.tools.memory.dbPath = val.trim() || null;
      saveConfig(config);
      note(
        `DB: ${config.tools.memory.dbPath ?? pc.dim("default (~/.claude-kit/memory.db)")}`,
        "✓ Saved",
      );
    }
  } else if (choice === "view") {
    await viewSessions();
  } else if (choice === "clear") {
    const ok = await confirm({
      message: "Delete ALL sessions? This cannot be undone.",
      initialValue: false,
    });
    if (!isCancel(ok) && ok) {
      await clearSessions();
    }
  }
}

// ── View sessions ──────────────────────────────────────────────────────────────

async function viewSessions() {
  const s = spinner();
  s.start("Loading sessions…");

  try {
    const { getDb } = await resolvedDb();
    const db = getDb();

    const rows = db
      .query(
        `SELECT su.project, su.request, su.created_at
         FROM summaries su
         ORDER BY su.created_at DESC
         LIMIT 20`,
      )
      .all();

    if (rows.length === 0) {
      s.stop("No sessions found");
      note("No summaries recorded yet.", "Sessions");
      return;
    }

    s.stop(`${rows.length} session(s)`);

    const lines = rows.map((r, i) => {
      const date = (r.created_at ?? "").split(" ")[0];
      const req = (r.request ?? "(no prompt)").slice(0, 70);
      return `${pc.dim(`${i + 1}.`)} ${pc.bold(r.project)}  ${pc.dim(date)}\n   ${req}`;
    });

    note(lines.join("\n\n"), `Last ${rows.length} sessions`);
  } catch (e) {
    s.stop(pc.red(`Error: ${e.message}`));
  }
}

// ── Clear sessions ─────────────────────────────────────────────────────────────

async function clearSessions() {
  const s = spinner();
  s.start("Clearing…");
  try {
    const { getDb } = await resolvedDb();
    const db = getDb();
    db.run("DELETE FROM summaries");
    db.run("DELETE FROM sessions");
    s.stop(pc.green("All sessions cleared"));
  } catch (e) {
    s.stop(pc.red(`Error: ${e.message}`));
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Import db.js after optionally setting CLAUDE_KIT_DB_PATH from config. */
async function resolvedDb() {
  const cfg = getConfig();
  if (cfg.tools.memory.dbPath) {
    process.env.CLAUDE_KIT_DB_PATH = cfg.tools.memory.dbPath.replace(
      /^~/,
      homedir(),
    );
  }
  return import("../hooks/memory/db.js");
}

// ── Entry ──────────────────────────────────────────────────────────────────────

main().catch((e) => {
  cancel(String(e.message ?? e));
  process.exit(1);
});
