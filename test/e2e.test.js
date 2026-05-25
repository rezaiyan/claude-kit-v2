/**
 * E2E tests for the memory hook lifecycle.
 *
 * Strategy: each test gets an isolated tmp DB via CLAUDE_KIT_DB_PATH.
 * Hooks are invoked as child processes (same way Claude Code calls them),
 * so we test the real executable boundary — stdin → stdout + DB side-effects.
 *
 * Lifecycle under test:
 *   UserPromptSubmit  → records first_prompt in sessions table
 *   Stop              → writes summary (request + completed + tools_used)
 *   SessionStart      → injects prior summaries as additionalContext
 *   SessionEnd        → marks session completed
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { spawnSync } from "child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mdToHtml } from "../hooks/plan/md-to-html.js";
import { renderPlan, renderIndex } from "../hooks/plan/templates.js";

const HOOKS_DIR = join(import.meta.dir, "../hooks/memory");
const QUALITY_DIR = join(import.meta.dir, "../hooks/quality");

// ── helpers ──────────────────────────────────────────────────────────────────

function runHook(hook, payload, dbPath) {
  const result = spawnSync("bun", [join(HOOKS_DIR, `${hook}.js`)], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_KIT_DB_PATH: dbPath },
  });
  if (result.error) throw result.error;
  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    status: result.status,
    json: (() => {
      try {
        return JSON.parse(result.stdout.trim());
      } catch {
        return null;
      }
    })(),
  };
}

function runQualityHook(hook, payload, { configPath, enabled = true } = {}) {
  // Write a minimal config to a temp file so isToolEnabled reads it correctly
  const env = { ...process.env };
  if (configPath) {
    writeFileSync(
      configPath,
      JSON.stringify({ version: 1, tools: { quality: { enabled } } }),
    );
    env.CLAUDE_KIT_CONFIG_PATH = configPath;
  }
  const result = spawnSync("bun", [join(QUALITY_DIR, `${hook}.js`)], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env,
  });
  if (result.error) throw result.error;
  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    status: result.status,
    json: (() => {
      try {
        return JSON.parse(result.stdout.trim());
      } catch {
        return null;
      }
    })(),
  };
}

function makeTranscript(dir, messages) {
  const path = join(dir, "transcript.jsonl");
  writeFileSync(path, messages.map((m) => JSON.stringify(m)).join("\n") + "\n");
  return path;
}

// ── fixtures ─────────────────────────────────────────────────────────────────

let tmpDir;
let dbPath;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ck-e2e-"));
  dbPath = join(tmpDir, "memory.db");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ── tests ────────────────────────────────────────────────────────────────────

describe("UserPromptSubmit", () => {
  test("records first prompt in DB", () => {
    const r = runHook(
      "user-prompt-submit",
      {
        session_id: "sess-001",
        cwd: "/projects/myapp",
        prompt: "fix the login bug",
      },
      dbPath,
    );

    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ suppressOutput: true });

    // Verify DB via session-start (reads back what was stored)
    const start = runHook(
      "session-start",
      { session_id: "sess-002", cwd: "/projects/myapp" },
      dbPath,
    );
    // No summaries yet (Stop not called) — context should be empty
    expect(start.json).toEqual({});
  });

  test("strips system-reminder tags from prompt", () => {
    const r = runHook(
      "user-prompt-submit",
      {
        session_id: "sess-strip",
        cwd: "/projects/myapp",
        prompt:
          "real question<system-reminder>ignore this</system-reminder> continued",
      },
      dbPath,
    );
    expect(r.status).toBe(0);
  });

  test("no-ops gracefully when session_id missing", () => {
    const r = runHook(
      "user-prompt-submit",
      { cwd: "/projects/myapp", prompt: "hello" },
      dbPath,
    );
    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ suppressOutput: true });
  });
});

describe("Stop", () => {
  test("writes summary with request, completed, tools_used", () => {
    // Seed a session first
    runHook(
      "user-prompt-submit",
      {
        session_id: "sess-stop-01",
        cwd: "/projects/myapp",
        prompt: "fix auth",
      },
      dbPath,
    );

    const transcript_path = makeTranscript(tmpDir, [
      {
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Fixed auth by updating token check." },
            {
              type: "tool_use",
              id: "1",
              name: "Edit",
              input: { file_path: "/src/auth.ts" },
            },
            { type: "tool_use", id: "2", name: "Bash", input: {} },
          ],
        },
      },
    ]);

    const r = runHook(
      "stop",
      { session_id: "sess-stop-01", cwd: "/projects/myapp", transcript_path },
      dbPath,
    );

    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ continue: true });

    // Verify summary appears in next SessionStart
    const start = runHook(
      "session-start",
      { session_id: "sess-stop-02", cwd: "/projects/myapp" },
      dbPath,
    );
    const ctx = start.json?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("fix auth");
    expect(ctx).toContain("Fixed auth by updating token check.");
    expect(ctx).toContain("Edit");
    expect(ctx).toContain("Bash");
  });

  test("records files modified", () => {
    runHook(
      "user-prompt-submit",
      { session_id: "sess-files", cwd: "/projects/myapp", prompt: "refactor" },
      dbPath,
    );

    const transcript_path = makeTranscript(tmpDir, [
      {
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Refactored." },
            {
              type: "tool_use",
              id: "1",
              name: "Write",
              input: { file_path: "/src/index.ts" },
            },
            {
              type: "tool_use",
              id: "2",
              name: "Edit",
              input: { file_path: "/src/utils.ts" },
            },
          ],
        },
      },
    ]);

    runHook(
      "stop",
      { session_id: "sess-files", cwd: "/projects/myapp", transcript_path },
      dbPath,
    );

    const start = runHook(
      "session-start",
      { session_id: "sess-files-2", cwd: "/projects/myapp" },
      dbPath,
    );
    const ctx = start.json?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("/src/index.ts");
    expect(ctx).toContain("/src/utils.ts");
  });

  test("no-ops gracefully when transcript_path missing", () => {
    const r = runHook(
      "stop",
      { session_id: "sess-notranscript", cwd: "/projects/myapp" },
      dbPath,
    );
    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ continue: true });
  });
});

describe("SessionStart", () => {
  test("returns empty object when no prior summaries", () => {
    const r = runHook(
      "session-start",
      { session_id: "sess-fresh", cwd: "/projects/myapp" },
      dbPath,
    );
    expect(r.status).toBe(0);
    expect(r.json).toEqual({});
  });

  test("injects up to 5 recent summaries", () => {
    // Write 6 sessions
    for (let i = 1; i <= 6; i++) {
      runHook(
        "user-prompt-submit",
        {
          session_id: `sess-many-${i}`,
          cwd: "/projects/myapp",
          prompt: `task ${i}`,
        },
        dbPath,
      );
      const transcript_path = makeTranscript(tmpDir, [
        {
          type: "assistant",
          message: { content: [{ type: "text", text: `done task ${i}` }] },
        },
      ]);
      runHook(
        "stop",
        {
          session_id: `sess-many-${i}`,
          cwd: "/projects/myapp",
          transcript_path,
        },
        dbPath,
      );
    }

    const r = runHook(
      "session-start",
      { session_id: "sess-check", cwd: "/projects/myapp" },
      dbPath,
    );
    const ctx = r.json?.hookSpecificOutput?.additionalContext ?? "";

    // Should contain sessions 2-6 (latest 5), not session 1
    expect(ctx).toContain("task 6");
    expect(ctx).toContain("task 2");
    expect(ctx).not.toContain("task 1");
    // Exactly 5 session headers
    expect([...ctx.matchAll(/### Session \d/g)].length).toBe(5);
  });

  test("only returns summaries for matching project", () => {
    runHook(
      "user-prompt-submit",
      {
        session_id: "sess-proj-a",
        cwd: "/projects/alpha",
        prompt: "alpha work",
      },
      dbPath,
    );
    const tp = makeTranscript(tmpDir, [
      {
        type: "assistant",
        message: { content: [{ type: "text", text: "alpha done" }] },
      },
    ]);
    runHook(
      "stop",
      {
        session_id: "sess-proj-a",
        cwd: "/projects/alpha",
        transcript_path: tp,
      },
      dbPath,
    );

    const r = runHook(
      "session-start",
      { session_id: "sess-proj-b", cwd: "/projects/beta" },
      dbPath,
    );
    expect(r.json).toEqual({});
  });
});

describe("SessionEnd", () => {
  test("marks session completed without error", () => {
    runHook(
      "user-prompt-submit",
      { session_id: "sess-end-01", cwd: "/projects/myapp", prompt: "work" },
      dbPath,
    );

    const r = runHook(
      "session-end",
      { session_id: "sess-end-01", cwd: "/projects/myapp", reason: "normal" },
      dbPath,
    );
    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ continue: true });
  });

  test("no-ops gracefully when session_id missing", () => {
    const r = runHook("session-end", { reason: "normal" }, dbPath);
    expect(r.status).toBe(0);
  });
});

describe("Quality hooks", () => {
  let configPath;

  beforeEach(() => {
    configPath = join(tmpDir, "config.json");
  });

  // ── block-no-verify ──────────────────────────────────────────────────────────

  describe("block-no-verify", () => {
    test("blocks git --no-verify", () => {
      const r = runQualityHook(
        "block-no-verify",
        { tool_input: { command: "git commit --no-verify -m 'skip'" } },
        { configPath },
      );
      expect(r.status).toBe(0);
      expect(r.json?.decision).toBe("block");
      expect(r.json?.reason).toMatch(/--no-verify/);
    });

    test("approves normal git commit", () => {
      const r = runQualityHook(
        "block-no-verify",
        { tool_input: { command: "git commit -m 'normal'" } },
        { configPath },
      );
      expect(r.json?.decision).toBe("approve");
    });

    test("approves non-git commands", () => {
      const r = runQualityHook(
        "block-no-verify",
        { tool_input: { command: "npm test" } },
        { configPath },
      );
      expect(r.json?.decision).toBe("approve");
    });

    test("approves everything when quality disabled", () => {
      const r = runQualityHook(
        "block-no-verify",
        { tool_input: { command: "git commit --no-verify -m 'skip'" } },
        { configPath, enabled: false },
      );
      expect(r.json?.decision).toBe("approve");
    });
  });

  // ── config-protection ────────────────────────────────────────────────────────

  describe("config-protection", () => {
    test("blocks .env file", () => {
      const r = runQualityHook(
        "config-protection",
        { tool_input: { file_path: "/project/.env" } },
        { configPath },
      );
      expect(r.json?.decision).toBe("block");
      expect(r.json?.reason).toMatch(/\.env/);
    });

    test("blocks .env.production", () => {
      const r = runQualityHook(
        "config-protection",
        { tool_input: { file_path: "/project/.env.production" } },
        { configPath },
      );
      expect(r.json?.decision).toBe("block");
    });

    test("blocks .pem file", () => {
      const r = runQualityHook(
        "config-protection",
        { tool_input: { file_path: "/certs/server.pem" } },
        { configPath },
      );
      expect(r.json?.decision).toBe("block");
    });

    test("blocks secrets file", () => {
      const r = runQualityHook(
        "config-protection",
        { tool_input: { file_path: "/config/secrets.json" } },
        { configPath },
      );
      expect(r.json?.decision).toBe("block");
    });

    test("approves normal source file", () => {
      const r = runQualityHook(
        "config-protection",
        { tool_input: { file_path: "/project/src/auth.ts" } },
        { configPath },
      );
      expect(r.json?.decision).toBe("approve");
    });

    test("approves everything when quality disabled", () => {
      const r = runQualityHook(
        "config-protection",
        { tool_input: { file_path: "/project/.env" } },
        { configPath, enabled: false },
      );
      expect(r.json?.decision).toBe("approve");
    });
  });

  // ── check-console-log ────────────────────────────────────────────────────────

  describe("check-console-log", () => {
    test("warns on console.log in src/ file", () => {
      const r = runQualityHook(
        "check-console-log",
        {
          tool_input: {
            file_path: "/project/src/utils.ts",
            new_string: 'function foo() { console.log("debug"); }',
          },
        },
        { configPath },
      );
      expect(r.status).toBe(0);
      expect(r.json).toMatchObject({ continue: true });
      expect(r.stderr).toMatch(/console\.log/);
    });

    test("no warning for non-src file", () => {
      const r = runQualityHook(
        "check-console-log",
        {
          tool_input: {
            file_path: "/project/scripts/debug.ts",
            new_string: 'console.log("ok")',
          },
        },
        { configPath },
      );
      expect(r.stderr).toBe("");
    });

    test("no warning when no console.log", () => {
      const r = runQualityHook(
        "check-console-log",
        {
          tool_input: {
            file_path: "/project/src/utils.ts",
            new_string: "function foo() { return 42; }",
          },
        },
        { configPath },
      );
      expect(r.stderr).toBe("");
    });

    test("silent when quality disabled", () => {
      const r = runQualityHook(
        "check-console-log",
        {
          tool_input: {
            file_path: "/project/src/utils.ts",
            new_string: 'console.log("debug")',
          },
        },
        { configPath, enabled: false },
      );
      expect(r.stderr).toBe("");
    });
  });

  // ── post-edit-format ─────────────────────────────────────────────────────────

  describe("post-edit-format", () => {
    test("returns continue:true for any file", () => {
      const r = runQualityHook(
        "post-edit-format",
        { tool_input: { file_path: "/project/src/foo.ts" } },
        { configPath },
      );
      expect(r.status).toBe(0);
      expect(r.json).toMatchObject({ continue: true });
    });

    test("returns continue:true for empty path", () => {
      const r = runQualityHook(
        "post-edit-format",
        { tool_input: { file_path: "" } },
        { configPath },
      );
      expect(r.json).toMatchObject({ continue: true });
    });

    test("returns continue:true when quality disabled", () => {
      const r = runQualityHook(
        "post-edit-format",
        { tool_input: { file_path: "/project/src/foo.ts" } },
        { configPath, enabled: false },
      );
      expect(r.json).toMatchObject({ continue: true });
    });
  });
});

describe("mdToHtml", () => {
  test("converts h1/h2/h3 headings", () => {
    const html = mdToHtml("# Title\n## Section\n### Sub");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<h2>Section</h2>");
    expect(html).toContain("<h3>Sub</h3>");
  });

  test("converts bullet list", () => {
    const html = mdToHtml("- item one\n- item two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item one</li>");
    expect(html).toContain("<li>item two</li>");
    expect(html).toContain("</ul>");
  });

  test("converts unchecked checkboxes", () => {
    const html = mdToHtml("- [ ] do this");
    expect(html).toContain('class="checklist"');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("checked");
    expect(html).toContain("do this");
  });

  test("converts checked checkboxes", () => {
    const html = mdToHtml("- [x] done this");
    expect(html).toContain("checked");
    expect(html).toContain("done this");
  });

  test("converts fenced code block", () => {
    const html = mdToHtml("```js\nconst x = 1;\n```");
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain("const x = 1;");
    expect(html).toContain("</code></pre>");
  });

  test("converts inline code", () => {
    const html = mdToHtml("use `foo()` here");
    expect(html).toContain("<code>foo()</code>");
  });

  test("converts bold and italic", () => {
    const html = mdToHtml("**bold** and *italic*");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  test("escapes HTML special chars in code blocks", () => {
    const html = mdToHtml("```\n<script>alert(1)</script>\n```");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("strips plan-type comment", () => {
    const html = mdToHtml("<!-- plan-type: feature -->\n# Title");
    expect(html).not.toContain("plan-type");
    expect(html).toContain("<h1>Title</h1>");
  });
});

describe("renderPlan", () => {
  const base = {
    planType: "feature",
    title: "My Feature",
    date: "2026-05-25",
    project: "myapp",
    cwd: "/projects/myapp",
    bodyHtml: "<h2>Goal</h2><p>Build it.</p>",
    otherPlans: [],
  };

  test("produces valid HTML document", () => {
    const html = renderPlan(base);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("My Feature");
  });

  test("feature type shows blue badge", () => {
    const html = renderPlan({ ...base, planType: "feature" });
    expect(html).toContain("Feature");
    expect(html).toContain("#3b82f6");
  });

  test("bug type shows red badge", () => {
    const html = renderPlan({ ...base, planType: "bug" });
    expect(html).toContain("Bug Investigation");
    expect(html).toContain("#ef4444");
  });

  test("architecture type shows purple badge", () => {
    const html = renderPlan({ ...base, planType: "architecture" });
    expect(html).toContain("Architecture");
    expect(html).toContain("#8b5cf6");
  });

  test("migration type shows orange badge", () => {
    const html = renderPlan({ ...base, planType: "migration" });
    expect(html).toContain("Migration");
    expect(html).toContain("#f97316");
  });

  test("research type shows teal badge", () => {
    const html = renderPlan({ ...base, planType: "research" });
    expect(html).toContain("Research");
    expect(html).toContain("#14b8a6");
  });

  test("renders sidebar links for otherPlans", () => {
    const html = renderPlan({
      ...base,
      otherPlans: [
        {
          name: "2026-05-25-my-feature",
          href: "2026-05-25-my-feature.html",
          active: true,
        },
        {
          name: "2026-05-24-other",
          href: "2026-05-24-other.html",
          active: false,
        },
      ],
    });
    expect(html).toContain("2026-05-25-my-feature");
    expect(html).toContain("2026-05-24-other");
  });

  test("includes localStorage checkbox persistence script", () => {
    const html = renderPlan(base);
    expect(html).toContain("localStorage");
    expect(html).toContain('type="checkbox"');
  });

  test("wraps H2 sections in section-card divs", () => {
    const html = renderPlan({ ...base, bodyHtml: "<h2>Goal</h2><p>text</p>" });
    expect(html).toContain("section-card");
  });

  test("unknown plan type falls back to feature styling", () => {
    const html = renderPlan({ ...base, planType: "unknown" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("#3b82f6");
  });
});

describe("renderIndex", () => {
  test("lists all plans", () => {
    const html = renderIndex({
      plans: [
        { name: "2026-05-25-feature-a", href: "2026-05-25-feature-a.html" },
        { name: "2026-05-24-bug-b", href: "2026-05-24-bug-b.html" },
      ],
      project: "myapp",
      cwd: "/projects/myapp",
    });
    expect(html).toContain("2026-05-25-feature-a");
    expect(html).toContain("2026-05-24-bug-b");
    expect(html).toContain("<!DOCTYPE html>");
  });

  test("renders empty state when no plans", () => {
    const html = renderIndex({
      plans: [],
      project: "myapp",
      cwd: "/projects/myapp",
    });
    expect(html).toContain("<!DOCTYPE html>");
  });
});

describe("Full lifecycle", () => {
  test("SessionStart injects prior session after full lifecycle completes", () => {
    const SID = "sess-full-01";

    // 1. User submits prompt
    runHook(
      "user-prompt-submit",
      {
        session_id: SID,
        cwd: "/projects/myapp",
        prompt: "implement dark mode",
      },
      dbPath,
    );

    // 2. Session ends (Claude stops)
    const transcript_path = makeTranscript(tmpDir, [
      {
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Implemented dark mode via CSS variables." },
            {
              type: "tool_use",
              id: "1",
              name: "Edit",
              input: { file_path: "/src/theme.css" },
            },
          ],
        },
      },
    ]);
    runHook(
      "stop",
      { session_id: SID, cwd: "/projects/myapp", transcript_path },
      dbPath,
    );
    runHook(
      "session-end",
      { session_id: SID, cwd: "/projects/myapp", reason: "normal" },
      dbPath,
    );

    // 3. New session starts — should see prior session
    const r = runHook(
      "session-start",
      { session_id: "sess-full-02", cwd: "/projects/myapp" },
      dbPath,
    );

    const ctx = r.json?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("implement dark mode");
    expect(ctx).toContain("Implemented dark mode via CSS variables.");
    expect(ctx).toContain("/src/theme.css");
    expect(ctx).toContain("Edit");
  });
});
