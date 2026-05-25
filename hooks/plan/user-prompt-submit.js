#!/usr/bin/env bun
/**
 * UserPromptSubmit hook — detect planning keywords and inject plan skill.
 * Input (stdin): { session_id, cwd, prompt }
 */
import { isToolEnabled } from "../../lib/config.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));

if (!isToolEnabled("plan")) {
  console.log(JSON.stringify({ suppressOutput: true }));
  process.exit(0);
}

const { prompt = "" } = input;

// Strip system-reminder and other XML-style tags before scanning
const clean = prompt.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "").trim();

const PLANNING_KEYWORDS =
  /\b(plan|design|architect|migrate|investigate|debug|spike|research|explore|build|implement)\b/i;

if (!PLANNING_KEYWORDS.test(clean)) {
  console.log(JSON.stringify({ suppressOutput: true }));
  process.exit(0);
}

// ── Infer plan type ───────────────────────────────────────────────────────────

function inferType(text) {
  if (/\b(investigat|debug|why is|broken|bug|fix)\b/i.test(text)) return "bug";
  if (/\b(architect|design system|how should we structure)\b/i.test(text))
    return "architecture";
  if (/\b(migrat|upgrade|move from)\b/i.test(text)) return "migration";
  if (/\b(research|spike|explore|evaluat)\b/i.test(text)) return "research";
  return "feature";
}

const planType = inferType(clean);

// ── Read skill file ───────────────────────────────────────────────────────────

const skillPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../skills/plan/plan.md",
);

let skillContent = "";
try {
  skillContent = readFileSync(skillPath, "utf8");
} catch {
  skillContent =
    "Write the plan as a markdown file in `.claude/plans/YYYY-MM-DD-<slug>.md`. " +
    "First line must be `<!-- plan-type: " +
    planType +
    " -->`.";
}

// ── Inject context ────────────────────────────────────────────────────────────

const context = [
  `## HTML Plans Tool Active`,
  ``,
  `Inferred plan type: **${planType}**`,
  ``,
  skillContent,
].join("\n");

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: context,
    },
  }),
);
