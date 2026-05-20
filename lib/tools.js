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
};
