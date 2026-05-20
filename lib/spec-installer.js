/**
 * spec-installer — manage /spec workflow commands in ~/.claude/commands/
 *
 * Commands are written to ~/.claude/commands/ when spec tool is enabled,
 * removed when disabled. A marker comment identifies files we own so we
 * never remove files belonging to other tools.
 */
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  readFileSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";

const COMMANDS_DIR = join(homedir(), ".claude", "commands");
const MARKER = "<!-- installed-by: claude-kit-v2 -->";

const COMMANDS = [
  {
    name: "spec",
    description:
      "Write a detailed implementation plan — bite-sized TDD tasks, exact file paths, no placeholders",
  },
  {
    name: "implement",
    description:
      "Execute an implementation plan using subagent-driven development — fresh subagent per task with two-stage review",
  },
  {
    name: "tdd",
    description:
      "Test-driven development — Iron Law red-green-refactor with 80% coverage requirement",
  },
  {
    name: "verify",
    description:
      "Verify work is actually complete — evidence gate requiring fresh command output before any completion claims",
  },
];

function commandContent({ name, description }) {
  return [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    "---",
    MARKER,
    "",
    `Use the \`claude-kit-v2:${name}\` skill for this request.`,
    "",
  ].join("\n");
}

/** Install spec workflow commands to ~/.claude/commands/.
 *  Skips any file not written by us to avoid clobbering user files. */
export function installSpec() {
  mkdirSync(COMMANDS_DIR, { recursive: true });
  const results = { installed: [], skipped: [] };

  for (const cmd of COMMANDS) {
    const dest = join(COMMANDS_DIR, `${cmd.name}.md`);
    if (existsSync(dest)) {
      const existing = readFileSync(dest, "utf8");
      if (!existing.includes(MARKER)) {
        results.skipped.push(cmd.name);
        continue;
      }
    }
    writeFileSync(dest, commandContent(cmd));
    results.installed.push(cmd.name);
  }

  return results;
}

/** Remove spec workflow commands from ~/.claude/commands/.
 *  Only removes files that contain our marker. */
export function uninstallSpec() {
  const results = { removed: [], skipped: [] };

  for (const cmd of COMMANDS) {
    const dest = join(COMMANDS_DIR, `${cmd.name}.md`);
    if (!existsSync(dest)) continue;
    const content = readFileSync(dest, "utf8");
    if (content.includes(MARKER)) {
      unlinkSync(dest);
      results.removed.push(cmd.name);
    } else {
      results.skipped.push(cmd.name);
    }
  }

  return results;
}

/** Returns per-command status for display in TUI. */
export function specStatus() {
  return COMMANDS.map((cmd) => {
    const dest = join(COMMANDS_DIR, `${cmd.name}.md`);
    if (!existsSync(dest)) return { name: cmd.name, state: "missing" };
    const content = readFileSync(dest, "utf8");
    return {
      name: cmd.name,
      state: content.includes(MARKER) ? "ours" : "foreign",
    };
  });
}
