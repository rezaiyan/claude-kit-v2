/**
 * Tool registry — single source of truth for available tools.
 * Add a new tool here and it automatically appears in the TUI + config.
 */
export const TOOLS = {
  memory: {
    label: "Memory",
    hint: "SQLite · no API calls · ~200 tokens/session",
    description: [
      "Saves a summary of every Claude Code session to a local SQLite database.",
      "At the start of each session, recent summaries are injected into context",
      "so Claude already knows what you worked on and where you left off.",
      "Nothing leaves your machine. No LLM calls. No token cost on injection.",
    ].join("\n"),
    enabledByDefault: true,
  },
  notify: {
    label: "Desktop Notify",
    hint: "macOS · osascript · fires on Stop",
    description: [
      "Sends a macOS desktop notification when Claude Code finishes a task.",
      "Shows the project name so you know which session completed.",
      "Uses osascript — no dependencies, no network calls.",
    ].join("\n"),
    enabledByDefault: true,
  },
  spec: {
    label: "Spec Workflow",
    hint: "opt-in · installs /spec /implement /tdd /verify commands",
    description: [
      "Installs four slash commands into ~/.claude/commands/:",
      "  /spec     — write a detailed implementation plan",
      "  /implement — execute a plan via subagent-driven development",
      "  /tdd      — test-driven development, red-green-refactor",
      "  /verify   — evidence gate before any completion claim",
      "Disable removes only commands written by claude-kit-v2.",
    ].join("\n"),
    enabledByDefault: false,
  },
  quality: {
    label: "Quality Guards",
    hint: "opt-out · 4 hooks · blocks bad habits, auto-formats",
    description: [
      "Four hooks that enforce code quality on every edit:",
      "  block-no-verify    — blocks git --no-verify (fix hooks, don't skip)",
      "  config-protection  — blocks writes to .env, .pem, .key, secrets files",
      "  post-edit-format   — auto-runs prettier/ktfmt after every file edit",
      "  check-console-log  — warns when console.log lands in src/ or lib/",
      "All hooks are silent when their tool (prettier/ktfmt) is not installed.",
    ].join("\n"),
    enabledByDefault: true,
  },
  plan: {
    label: "HTML Plans",
    hint: "opt-in · saves plans as visual HTML files in .claude/plans/",
    description: [
      "When you discuss planning with Claude, saves the plan as a",
      "self-contained HTML file in .claude/plans/ — visually formatted,",
      "auto-opens in browser. Supports 5 plan types: feature, bug,",
      "architecture, migration, research. Each plan has an interactive",
      "checklist, collapsible sections, and a sidebar index of all plans.",
    ].join("\n"),
    enabledByDefault: false,
  },
};
