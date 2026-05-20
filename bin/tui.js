#!/usr/bin/env bun
import {
  intro,
  outro,
  select,
  multiselect,
  text,
  confirm,
  spinner,
  note,
  isCancel,
  cancel,
} from "@clack/prompts";
import pc from "picocolors";
import { existsSync } from "fs";
import { homedir } from "os";
import { getConfig, saveConfig, CONFIG_PATH } from "../lib/config.js";
import { TOOLS } from "../lib/tools.js";

// ── Entry ──────────────────────────────────────────────────────────────────────

async function main() {
  console.clear();

  if (!existsSync(CONFIG_PATH)) {
    await onboarding();
    return;
  }

  intro(pc.bgCyan(pc.black(" claude-kit ")));
  await mainMenu();
  outro("Done.");
}

// ── Onboarding (first run) ─────────────────────────────────────────────────────

async function onboarding() {
  intro(pc.bgCyan(pc.black(" claude-kit ")));

  note(
    "Looks like this is your first time here.\nLet's set up your tools — you can change this anytime.",
    "Welcome",
  );

  // Show each tool with its full description
  const toolEntries = Object.entries(TOOLS);
  const descBlock = toolEntries
    .map(([, t]) => `${pc.bold(t.label)}  ${pc.dim(t.hint)}\n${t.description}`)
    .join("\n\n");
  note(descBlock, "Available tools");

  const selected = await multiselect({
    message: "Which tools would you like to enable?",
    options: toolEntries.map(([key, tool]) => ({
      value: key,
      label: tool.label,
      hint: tool.hint,
    })),
    initialValues: toolEntries
      .filter(([, t]) => t.enabledByDefault)
      .map(([k]) => k),
  });

  if (isCancel(selected)) {
    cancel("Setup cancelled. Run claudekit anytime to configure.");
    process.exit(0);
  }

  const config = getConfig();
  for (const [key] of toolEntries) {
    config.tools[key] = {
      ...(config.tools[key] ?? {}),
      enabled: selected.includes(key),
    };
  }
  saveConfig(config);

  const enabledLabels = selected.map((k) => TOOLS[k]?.label ?? k);
  if (enabledLabels.length > 0) {
    note(
      enabledLabels.map((l) => `${pc.green("●")} ${l}`).join("\n"),
      "✓ Enabled",
    );
  } else {
    note(
      pc.dim("No tools enabled. Run claudekit to enable tools later."),
      "✓ Saved",
    );
  }

  outro("All set. Run claudekit anytime to adjust settings.");
}

// ── Main menu ──────────────────────────────────────────────────────────────────

async function mainMenu() {
  while (true) {
    const config = getConfig();

    const toolOptions = Object.entries(TOOLS).map(([key, tool]) => {
      const enabled = config.tools[key]?.enabled !== false;
      return {
        value: key,
        label: tool.label,
        hint: enabled ? pc.green("enabled") : pc.dim("disabled"),
      };
    });

    const choice = await select({
      message: "Select a tool",
      options: [...toolOptions, { value: "exit", label: "Exit" }],
    });

    if (isCancel(choice) || choice === "exit") break;
    if (choice === "memory") await memoryMenu();
    if (choice === "notify") await notifyMenu();
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

// ── Notify tool menu ───────────────────────────────────────────────────────────

async function notifyMenu() {
  while (true) {
    const config = getConfig();
    const notif = config.tools.notify;

    note(
      `Status    ${notif.enabled ? pc.green("● enabled") : pc.red("○ disabled")}`,
      "Desktop Notify",
    );

    const choice = await select({
      message: "Action",
      options: [
        {
          value: "toggle",
          label: notif.enabled ? pc.red("Disable") : pc.green("Enable"),
        },
        { value: "back", label: "Back" },
      ],
    });

    if (isCancel(choice) || choice === "back") break;

    if (choice === "toggle") {
      config.tools.notify.enabled = !notif.enabled;
      saveConfig(config);
      note(
        config.tools.notify.enabled
          ? pc.green("Desktop notifications enabled.")
          : pc.dim("Desktop notifications disabled."),
        "✓ Saved",
      );
    }
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

main().catch((e) => {
  cancel(String(e.message ?? e));
  process.exit(1);
});
