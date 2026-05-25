#!/usr/bin/env bun
/**
 * PostToolUse:Write hook — convert .claude/plans/*.md to HTML.
 * Input (stdin): { tool_name, tool_input: { file_path }, tool_response }
 */
import { isToolEnabled, getConfig } from "../../lib/config.js";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from "fs";
import { join, dirname, basename } from "path";
import { execSync } from "child_process";
import { mdToHtml } from "./md-to-html.js";
import { renderPlan, renderIndex } from "./templates.js";

const NOOP = JSON.stringify({ continue: true, suppressOutput: true });

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));

if (!isToolEnabled("plan")) {
  console.log(NOOP);
  process.exit(0);
}

const toolName = input?.tool_name ?? "";
const filePath = input?.tool_input?.file_path ?? "";

if (toolName !== "Write") {
  console.log(NOOP);
  process.exit(0);
}

if (!/.claude\/plans\/[^/]+\.md$/.test(filePath)) {
  console.log(NOOP);
  process.exit(0);
}

// ── Ensure plans dir exists ───────────────────────────────────────────────────

const plansDir = dirname(filePath);
if (!existsSync(plansDir)) {
  try {
    mkdirSync(plansDir, { recursive: true });
  } catch {
    console.log(NOOP);
    process.exit(0);
  }
}

// ── Read markdown ─────────────────────────────────────────────────────────────

let markdown = "";
try {
  markdown = readFileSync(filePath, "utf8");
} catch {
  console.log(NOOP);
  process.exit(0);
}

// ── Extract plan type ─────────────────────────────────────────────────────────

const typeMatch = markdown.match(/<!--\s*plan-type:\s*(\w+)\s*-->/);
const planType = typeMatch?.[1] ?? "feature";

// ── Extract title from first H1 ───────────────────────────────────────────────

const titleMatch = markdown
  .replace(/<!--[\s\S]*?-->/g, "")
  .match(/^#\s+(.+)$/m);
const title = titleMatch?.[1]?.trim() ?? basename(filePath, ".md");

// ── Convert markdown → HTML ───────────────────────────────────────────────────

const bodyHtml = mdToHtml(markdown);

// ── Build sidebar plan list ───────────────────────────────────────────────────

const htmlFileName = basename(filePath, ".md") + ".html";
const htmlFilePath = join(plansDir, htmlFileName);

let existingHtmlFiles = [];
try {
  existingHtmlFiles = readdirSync(plansDir).filter(
    (f) => f.endsWith(".html") && f !== "index.html",
  );
} catch {
  /* empty dir */
}

if (!existingHtmlFiles.includes(htmlFileName)) {
  existingHtmlFiles.push(htmlFileName);
}

const otherPlans = existingHtmlFiles.map((f) => ({
  name: f.replace(/\.html$/, ""),
  href: f,
  active: f === htmlFileName,
}));

// ── Render HTML ───────────────────────────────────────────────────────────────

const date = new Date().toISOString().split("T")[0];
const cwd = process.cwd();
const project = basename(cwd);

const html = renderPlan({
  planType,
  title,
  date,
  project,
  cwd,
  bodyHtml,
  otherPlans,
});
try {
  writeFileSync(htmlFilePath, html);
} catch {
  console.log(NOOP);
  process.exit(0);
}

// ── Regenerate index.html ─────────────────────────────────────────────────────

try {
  const indexHtml = renderIndex({ plans: otherPlans, project, cwd });
  writeFileSync(join(plansDir, "index.html"), indexHtml);
} catch {
  /* index generation failure is non-fatal */
}

// ── Open browser ──────────────────────────────────────────────────────────────

const cfg = getConfig();
const aggressiveness = cfg.tools?.plan?.aggressiveness ?? "auto-open";

if (aggressiveness === "auto-open") {
  try {
    const openCmd = process.platform === "darwin" ? "open" : "xdg-open";
    execSync(`${openCmd} "${htmlFilePath}"`, { timeout: 5000, stdio: "pipe" });
  } catch {
    // browser open failure is non-fatal
  }
} else {
  process.stderr.write(`plan saved: ${htmlFilePath}\n`);
}

console.log(NOOP);
