# HTML Plans Tool Implementation Plan

> **For agentic workers:** Use claude-kit-v2:implement to execute this plan task-by-task.

**Goal:** Add an opt-in `plan` tool that detects planning conversations, instructs Claude to write structured markdown plans to `.claude/plans/`, and converts them to self-contained visual HTML files auto-opened in the browser.

**Architecture:** Two hooks wire the flow — `UserPromptSubmit` detects planning keywords and injects a skill file as `additionalContext`; `PostToolUse` on `Write` intercepts writes to `.claude/plans/*.md`, converts to HTML via `md-to-html.js` and `templates.js`, regenerates `index.html`, and opens the browser. Config key `plan.aggressiveness` controls open behavior.

**Tech Stack:** Bun, vanilla JS (no new deps), inline CSS + JS in generated HTML, `bun:test` for tests.

---

## Files

**Create:**
- `hooks/plan/md-to-html.js`
- `hooks/plan/templates.js`
- `hooks/plan/user-prompt-submit.js`
- `hooks/plan/post-tool-use.js`
- `skills/plan/plan.md`

**Modify:**
- `lib/config.js` — add `plan` defaults + merge in `getConfig`
- `lib/tools.js` — add `plan` entry
- `hooks/hooks.json` — add two hook entries
- `test/e2e.test.js` — add plan hook tests

---

## Progress
Done: 0 / 7 · Left: 7

---

### Task 1: Config + Tools Registry

**Files:**
- Modify: `lib/config.js`
- Modify: `lib/tools.js`

- [ ] **Step 1: Add `plan` defaults to `lib/config.js`**

In `DEFAULTS.tools`, add:

```js
plan: {
  enabled: false,
  aggressiveness: "auto-open", // "auto-open" | "silent" | "ask"
},
```

In `getConfig()`, add to the `tools` spread:

```js
plan: {
  ...DEFAULTS.tools.plan,
  ...(data.tools?.plan ?? {}),
},
```

- [ ] **Step 2: Add `plan` entry to `lib/tools.js`**

```js
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
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test
```

Expected: all existing tests pass (0 failures).

- [ ] **Step 4: Commit**

```bash
git add lib/config.js lib/tools.js
git commit -m "feat(plan): add plan tool to config and tools registry"
```

---

### Task 2: Skill File

**Files:**
- Create: `skills/plan/plan.md`

- [ ] **Step 1: Create `skills/` dir and write skill file**

```bash
mkdir -p /Users/ali/projects/claude-kit-v2/skills/plan
```

Write `skills/plan/plan.md`:

```markdown
# HTML Plans — Instructions for Claude

When you detect you are about to produce a plan (architecture, feature, bug investigation, migration, or research), write the plan as a structured markdown file. Do NOT just respond with a plan in the chat — write it to a file so it is saved and rendered as HTML.

## File Location

Write to: `.claude/plans/YYYY-MM-DD-<kebab-slug>.md`

Where:
- `YYYY-MM-DD` = today's date
- `<kebab-slug>` = plan title, lowercase, spaces → hyphens, special chars stripped

Example: `.claude/plans/2026-05-25-user-auth-redesign.md`

## Required First Line

The FIRST line of the file MUST be the plan type comment:

```
<!-- plan-type: feature -->
```

Allowed values: `feature`, `bug`, `architecture`, `migration`, `research`

## Type Selection

Choose the type that best matches the conversation:

| Type | When to use | Inferred from |
|------|-------------|---------------|
| `feature` | New capability, UI, API endpoint | "plan", "build", "add", "implement" |
| `bug` | Debugging, root cause, fix investigation | "investigate", "debug", "why is", "broken", "fix" |
| `architecture` | System design, structural decisions | "architect", "design system", "structure", "how should we" |
| `migration` | Moving from X to Y, upgrades | "migrate", "upgrade", "move from" |
| `research` | Exploration, spikes, evaluation | "research", "spike", "explore", "evaluate" |

Default to `feature` when ambiguous.

## Section Schemas by Type

### feature

```markdown
<!-- plan-type: feature -->
# <Feature Name>

## Goal
One paragraph: what this builds and why.

## Background
Context, current state, constraints.

## User Stories
- [ ] As a <user>, I want <action> so that <benefit>
- [ ] As a <user>, I want <action> so that <benefit>

## Implementation Steps
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Open Questions
- Question 1
- Question 2

## Risks
- Risk 1
- Risk 2
```

### bug

```markdown
<!-- plan-type: bug -->
# <Bug Title>

## Symptom
What is observed. When. Frequency. Impact.

## Reproduction Steps
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Root Cause Hypothesis
Best current theory. Evidence supporting it.

## Investigation Plan
- [ ] Check X
- [ ] Instrument Y
- [ ] Verify Z

## Fix Options
- Option A: description, trade-offs
- Option B: description, trade-offs
```

### architecture

```markdown
<!-- plan-type: architecture -->
# <Decision Title>

## Context
Problem being solved. Current state. Why a decision is needed now.

## Decision Drivers
- Driver 1
- Driver 2

## Options Considered

### Option A: <name>
Description. Pros. Cons.

### Option B: <name>
Description. Pros. Cons.

## Decision
Chosen option and why.

## Consequences
What becomes easier. What becomes harder. Follow-up decisions needed.
```

### migration

```markdown
<!-- plan-type: migration -->
# <Migration Title>

## Current State
What exists today. Why it needs to change.

## Target State
What we're moving to. Success criteria.

## Migration Steps
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Rollback Plan
How to revert if migration fails. Decision point.

## Risks
- Risk 1: mitigation
- Risk 2: mitigation
```

### research

```markdown
<!-- plan-type: research -->
# <Research Question>

## Question
Exact question being investigated.

## Motivation
Why this matters. What decision it unblocks.

## Approach
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Resources
- [Resource name](url or path)
- [Resource name](url or path)

## Expected Output
What artifact or decision comes out of this research.
```

## Formatting Rules

- Use standard markdown only: `#` headings, `-` bullets, `- [ ]` checkboxes, ` ``` ` code blocks, `**bold**`, `*italic*`
- Keep headings to H1 (title), H2 (sections), H3 (subsections)
- Checkboxes on any step that will be verified as done
- After writing the file, tell the user the plan has been saved and will open in their browser
```

- [ ] **Step 2: Commit**

```bash
git add skills/plan/plan.md
git commit -m "feat(plan): add plan skill file with adaptive type templates"
```

---

### Task 3: Markdown Parser

**Files:**
- Create: `hooks/plan/md-to-html.js`
- Modify: `test/e2e.test.js`

- [ ] **Step 1: Write failing tests for `md-to-html.js`**

Add to `test/e2e.test.js` (after existing imports, before first `describe`):

```js
import { mdToHtml } from "../hooks/plan/md-to-html.js";
```

Add at end of file:

```js
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
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test 2>&1 | grep -E "mdToHtml|FAIL|error"
```

Expected: import error or test failures because `hooks/plan/md-to-html.js` doesn't exist.

- [ ] **Step 3: Create `hooks/plan/` dir**

```bash
mkdir -p /Users/ali/projects/claude-kit-v2/hooks/plan
```

- [ ] **Step 4: Write `hooks/plan/md-to-html.js`**

```js
/**
 * Markdown → HTML converter — no external dependencies.
 * Handles: headings, bullets, checkboxes, code blocks, inline formatting.
 */

/**
 * Convert inline markdown (bold, italic, inline code, HTML escape).
 * HTML escaping runs first so the formatting patterns don't clash.
 */
function inline(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

/**
 * Convert markdown string to HTML string.
 * Strips <!-- plan-type: ... --> comments before processing.
 *
 * @param {string} markdown
 * @returns {string} html
 */
export function mdToHtml(markdown) {
  // Strip HTML comments (e.g. <!-- plan-type: feature -->)
  const cleaned = markdown.replace(/<!--[\s\S]*?-->\n?/g, "");

  const lines = cleaned.split("\n");
  let html = "";
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = "";
  let inList = false;
  let listClass = "";

  const flushList = () => {
    if (inList) {
      html += `</ul>\n`;
      inList = false;
      listClass = "";
    }
  };

  for (const line of lines) {
    // ── Fenced code block ────────────────────────────────────────────────────
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeLang = line.slice(3).trim() || "text";
        codeLines = [];
      } else {
        inCodeBlock = false;
        const escaped = codeLines
          .join("\n")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        html += `<pre><code class="language-${codeLang}">${escaped}</code></pre>\n`;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // ── Headings ─────────────────────────────────────────────────────────────
    let m;
    if ((m = line.match(/^#### (.+)/))) {
      flushList();
      html += `<h4>${inline(m[1])}</h4>\n`;
      continue;
    }
    if ((m = line.match(/^### (.+)/))) {
      flushList();
      html += `<h3>${inline(m[1])}</h3>\n`;
      continue;
    }
    if ((m = line.match(/^## (.+)/))) {
      flushList();
      html += `<h2>${inline(m[1])}</h2>\n`;
      continue;
    }
    if ((m = line.match(/^# (.+)/))) {
      flushList();
      html += `<h1>${inline(m[1])}</h1>\n`;
      continue;
    }

    // ── Checkboxes ───────────────────────────────────────────────────────────
    if ((m = line.match(/^- \[ \] (.+)/))) {
      if (!inList || listClass !== "checklist") {
        flushList();
        html += `<ul class="checklist">\n`;
        inList = true;
        listClass = "checklist";
      }
      const label = m[1].replace(/"/g, "&quot;");
      html += `<li><input type="checkbox" data-label="${label}"> ${inline(m[1])}</li>\n`;
      continue;
    }
    if ((m = line.match(/^- \[x\] (.+)/i))) {
      if (!inList || listClass !== "checklist") {
        flushList();
        html += `<ul class="checklist">\n`;
        inList = true;
        listClass = "checklist";
      }
      const label = m[1].replace(/"/g, "&quot;");
      html += `<li><input type="checkbox" checked data-label="${label}"> ${inline(m[1])}</li>\n`;
      continue;
    }

    // ── Bullets ──────────────────────────────────────────────────────────────
    if ((m = line.match(/^[-*] (.+)/))) {
      if (!inList || listClass !== "bullet") {
        flushList();
        html += `<ul>\n`;
        inList = true;
        listClass = "bullet";
      }
      html += `<li>${inline(m[1])}</li>\n`;
      continue;
    }

    // ── Empty line ───────────────────────────────────────────────────────────
    if (line.trim() === "") {
      flushList();
      continue;
    }

    // ── Paragraph ────────────────────────────────────────────────────────────
    flushList();
    html += `<p>${inline(line)}</p>\n`;
  }

  flushList();
  return html;
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test --reporter=spec 2>&1 | grep -E "mdToHtml|pass|fail"
```

Expected: all `mdToHtml` tests pass.

- [ ] **Step 6: Commit**

```bash
git add hooks/plan/md-to-html.js test/e2e.test.js
git commit -m "feat(plan): add markdown-to-html parser with tests"
```

---

### Task 4: HTML Templates

**Files:**
- Create: `hooks/plan/templates.js`
- Modify: `test/e2e.test.js`

- [ ] **Step 1: Write failing tests for `templates.js`**

Add to `test/e2e.test.js` imports:

```js
import { renderPlan, renderIndex } from "../hooks/plan/templates.js";
```

Add at end of file:

```js
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
        { name: "2026-05-25-my-feature", href: "2026-05-25-my-feature.html", active: true },
        { name: "2026-05-24-other", href: "2026-05-24-other.html", active: false },
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
    const html = renderIndex({ plans: [], project: "myapp", cwd: "/projects/myapp" });
    expect(html).toContain("<!DOCTYPE html>");
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test 2>&1 | grep -E "renderPlan|renderIndex|FAIL|error" | head -20
```

Expected: import error because `hooks/plan/templates.js` doesn't exist.

- [ ] **Step 3: Write `hooks/plan/templates.js`**

```js
/**
 * HTML templates for plan types.
 * All output is self-contained: inline CSS + vanilla JS, no external deps.
 */

const TYPE_CONFIG = {
  feature:      { color: "#3b82f6", badge: "Feature",          accent: "#3b82f6" },
  bug:          { color: "#ef4444", badge: "Bug Investigation", accent: "#ef4444" },
  architecture: { color: "#8b5cf6", badge: "Architecture",      accent: "#8b5cf6" },
  migration:    { color: "#f97316", badge: "Migration",          accent: "#f97316" },
  research:     { color: "#14b8a6", badge: "Research",           accent: "#14b8a6" },
};

/**
 * Wrap H2 sections in .section-card divs with accent border.
 * Content between H2 tags becomes the card body.
 */
function wrapSections(html, accentColor) {
  // Split on <h2>...</h2> tags, keeping the delimiter
  const parts = html.split(/(<h2>[\s\S]*?<\/h2>)/);
  let result = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("<h2>")) {
      // Inject accent color on h2
      const h2 = part.replace(
        "<h2>",
        `<h2 style="border-left-color:${accentColor}">`,
      );
      // Gather content until next h2 or end
      const content = parts[i + 1] && !parts[i + 1].startsWith("<h2>")
        ? parts[++i]
        : "";
      result += `<div class="section-card">${h2}<div class="section-content">${content}</div></div>\n`;
    } else {
      result += part;
    }
  }
  return result;
}

const BASE_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; }
a { color: inherit; text-decoration: none; }

/* Layout */
.layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }

/* Sidebar */
.sidebar { background: #0f172a; padding: 1.5rem 1rem; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.sidebar-title { color: #94a3b8; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0 0.75rem; margin-bottom: 0.75rem; }
.sidebar-link { display: block; color: #94a3b8; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.82rem; margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background 0.1s; }
.sidebar-link:hover { background: #1e293b; color: #e2e8f0; }
.sidebar-link.active { background: #1e293b; color: #f1f5f9; font-weight: 600; }
.sidebar-index { display: block; color: #64748b; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.8rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
.sidebar-index:hover { color: #94a3b8; }

/* Main */
.main { padding: 2.5rem 3rem; max-width: 920px; }

/* Header */
.plan-header { margin-bottom: 2rem; }
.plan-header-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.badge { display: inline-block; padding: 0.2rem 0.7rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; color: white; letter-spacing: 0.04em; text-transform: uppercase; }
.plan-date { font-size: 0.8rem; color: #64748b; margin-left: auto; }
.plan-title { font-size: 1.9rem; font-weight: 800; color: #0f172a; margin-bottom: 0.35rem; }
.plan-meta { font-size: 0.78rem; color: #64748b; }
.plan-meta span { margin-right: 1.25rem; }

/* Section cards */
.section-card { background: white; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.section-card h2 { font-size: 1rem; font-weight: 700; color: #0f172a; padding: 0.9rem 1.25rem; border-left: 4px solid #64748b; cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center; }
.section-card h2::after { content: '▾'; font-size: 0.8rem; color: #94a3b8; transition: transform 0.15s; }
.section-card h2.collapsed::after { transform: rotate(-90deg); }
.section-content { padding: 1.25rem 1.5rem; border-top: 1px solid #f1f5f9; }
.section-content > *:last-child { margin-bottom: 0; }

/* Typography */
h3 { font-size: 0.95rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; margin-top: 1rem; }
h4 { font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.35rem; margin-top: 0.75rem; }
p { color: #374151; margin-bottom: 0.75rem; font-size: 0.9rem; }
strong { color: #1e293b; }

/* Lists */
ul { padding-left: 1.4rem; margin-bottom: 0.75rem; }
li { margin-bottom: 0.3rem; font-size: 0.9rem; color: #374151; line-height: 1.55; }

/* Checklist */
ul.checklist { list-style: none; padding-left: 0; }
ul.checklist li { display: flex; align-items: flex-start; gap: 0.5rem; }
input[type=checkbox] { margin-top: 0.2rem; flex-shrink: 0; width: 15px; height: 15px; cursor: pointer; }
input[type=checkbox]:checked + * { text-decoration: line-through; color: #94a3b8; }

/* Code */
pre { background: #0f172a; color: #e2e8f0; padding: 1rem 1.25rem; border-radius: 8px; overflow-x: auto; font-size: 0.82rem; margin-bottom: 0.75rem; }
code { font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace; }
p code, li code { background: #f1f5f9; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.83em; color: #0f172a; }

/* Print */
@media print {
  .sidebar { display: none; }
  .layout { grid-template-columns: 1fr; }
  .section-card { box-shadow: none; break-inside: avoid; }
}
`;

const BASE_JS = `
// Collapsible sections
document.querySelectorAll('.section-card h2').forEach(h2 => {
  h2.addEventListener('click', () => {
    const content = h2.nextElementSibling;
    const collapsed = content.style.display === 'none';
    content.style.display = collapsed ? '' : 'none';
    h2.classList.toggle('collapsed', !collapsed);
  });
});

// Checkbox persistence via localStorage
const STORAGE_KEY = 'plan-checks::' + location.pathname;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  document.querySelectorAll('input[type=checkbox]').forEach((cb, i) => {
    if (saved[i] !== undefined) cb.checked = saved[i];
    cb.addEventListener('change', () => {
      const state = {};
      document.querySelectorAll('input[type=checkbox]').forEach((c, j) => { state[j] = c.checked; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  });
} catch (_) { /* localStorage unavailable */ }
`;

/**
 * Render a full plan HTML page.
 *
 * @param {object} opts
 * @param {string} opts.planType - feature | bug | architecture | migration | research
 * @param {string} opts.title
 * @param {string} opts.date - YYYY-MM-DD
 * @param {string} opts.project
 * @param {string} opts.cwd
 * @param {string} opts.bodyHtml - converted markdown HTML
 * @param {Array<{name:string, href:string, active:boolean}>} opts.otherPlans
 * @returns {string} complete HTML document
 */
export function renderPlan({ planType, title, date, project, cwd, bodyHtml, otherPlans = [] }) {
  const cfg = TYPE_CONFIG[planType] ?? TYPE_CONFIG.feature;
  const wrapped = wrapSections(bodyHtml, cfg.accent);

  const sidebarLinks = otherPlans
    .map(p => `<a href="${p.href}" class="sidebar-link${p.active ? " active" : ""}">${p.name}</a>`)
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Plan</title>
  <style>${BASE_CSS}</style>
</head>
<body>
<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-title">Plans</div>
    <a href="index.html" class="sidebar-index">← All plans</a>
    ${sidebarLinks}
  </nav>
  <main class="main">
    <div class="plan-header">
      <div class="plan-header-top">
        <span class="badge" style="background:${cfg.color}">${cfg.badge}</span>
        <span class="plan-date">${date}</span>
      </div>
      <h1 class="plan-title">${title}</h1>
      <div class="plan-meta">
        <span>📁 ${project}</span>
        <span title="${cwd}">${cwd}</span>
      </div>
    </div>
    ${wrapped}
  </main>
</div>
<script>${BASE_JS}</script>
</body>
</html>`;
}

/**
 * Render the plans index page.
 *
 * @param {object} opts
 * @param {Array<{name:string, href:string}>} opts.plans
 * @param {string} opts.project
 * @param {string} opts.cwd
 * @returns {string} complete HTML document
 */
export function renderIndex({ plans, project, cwd }) {
  const items = plans.length
    ? plans
        .map(p => `<li><a href="${p.href}">${p.name}</a></li>`)
        .join("\n      ")
    : "<li>No plans yet.</li>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project} — Plans</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; padding: 3rem; }
    h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.5rem; }
    .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 2rem; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 0.5rem; }
    a { color: #3b82f6; font-size: 0.95rem; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${project} — Plans</h1>
  <div class="meta">${cwd}</div>
  <ul>
      ${items}
  </ul>
</body>
</html>`;
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test --reporter=spec 2>&1 | grep -E "renderPlan|renderIndex|✓|✗"
```

Expected: all `renderPlan` and `renderIndex` tests pass.

- [ ] **Step 5: Commit**

```bash
git add hooks/plan/templates.js test/e2e.test.js
git commit -m "feat(plan): add HTML templates for all 5 plan types with tests"
```

---

### Task 5: UserPromptSubmit Hook

**Files:**
- Create: `hooks/plan/user-prompt-submit.js`
- Modify: `test/e2e.test.js`

- [ ] **Step 1: Write failing tests**

Add to `test/e2e.test.js` (after existing `QUALITY_DIR` constant):

```js
const PLAN_DIR = join(import.meta.dir, "../hooks/plan");
```

Add helper function after `runQualityHook`:

```js
function runPlanHook(hook, payload, { configPath, enabled = true, aggressiveness = "silent" } = {}) {
  const env = { ...process.env };
  if (configPath) {
    writeFileSync(
      configPath,
      JSON.stringify({ version: 1, tools: { plan: { enabled, aggressiveness } } }),
    );
    env.CLAUDE_KIT_CONFIG_PATH = configPath;
  }
  const result = spawnSync("bun", [join(PLAN_DIR, `${hook}.js`)], {
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
```

Add at end of file:

```js
describe("plan/user-prompt-submit", () => {
  let configPath;

  beforeEach(() => {
    configPath = join(tmpDir, "config.json");
  });

  test("injects additionalContext when planning keyword detected", () => {
    const r = runPlanHook(
      "user-prompt-submit",
      { prompt: "let's plan the new auth feature", session_id: "s1", cwd: "/projects/myapp" },
      { configPath },
    );
    expect(r.status).toBe(0);
    const ctx = r.json?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("HTML Plans");
    expect(ctx).toContain("feature");
  });

  test("infers bug type from debug keyword", () => {
    const r = runPlanHook(
      "user-prompt-submit",
      { prompt: "let's investigate why the login is broken", session_id: "s2", cwd: "/projects/myapp" },
      { configPath },
    );
    const ctx = r.json?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("bug");
  });

  test("infers architecture type from architect keyword", () => {
    const r = runPlanHook(
      "user-prompt-submit",
      { prompt: "architect the new data pipeline", session_id: "s3", cwd: "/projects/myapp" },
      { configPath },
    );
    const ctx = r.json?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("architecture");
  });

  test("infers migration type from migrate keyword", () => {
    const r = runPlanHook(
      "user-prompt-submit",
      { prompt: "migrate the database from postgres to sqlite", session_id: "s4", cwd: "/projects/myapp" },
      { configPath },
    );
    const ctx = r.json?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("migration");
  });

  test("infers research type from spike keyword", () => {
    const r = runPlanHook(
      "user-prompt-submit",
      { prompt: "spike on whether we should use redis here", session_id: "s5", cwd: "/projects/myapp" },
      { configPath },
    );
    const ctx = r.json?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("research");
  });

  test("returns suppressOutput when no planning keyword", () => {
    const r = runPlanHook(
      "user-prompt-submit",
      { prompt: "what is 2 + 2", session_id: "s6", cwd: "/projects/myapp" },
      { configPath },
    );
    expect(r.json).toMatchObject({ suppressOutput: true });
    expect(r.json?.hookSpecificOutput).toBeUndefined();
  });

  test("returns suppressOutput when plan tool disabled", () => {
    const r = runPlanHook(
      "user-prompt-submit",
      { prompt: "plan the new auth feature", session_id: "s7", cwd: "/projects/myapp" },
      { configPath, enabled: false },
    );
    expect(r.json).toMatchObject({ suppressOutput: true });
  });

  test("strips system-reminder tags before keyword scan", () => {
    const r = runPlanHook(
      "user-prompt-submit",
      {
        prompt: "hello<system-reminder>plan something</system-reminder> world",
        session_id: "s8",
        cwd: "/projects/myapp",
      },
      { configPath },
    );
    // "plan" is inside a system-reminder tag — should be stripped, no injection
    expect(r.json).toMatchObject({ suppressOutput: true });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test 2>&1 | grep -E "plan/user-prompt|FAIL|error" | head -15
```

Expected: test failures because `hooks/plan/user-prompt-submit.js` doesn't exist.

- [ ] **Step 3: Write `hooks/plan/user-prompt-submit.js`**

```js
#!/usr/bin/env bun
/**
 * UserPromptSubmit hook — detect planning keywords and inject plan skill.
 * Input (stdin): { session_id, cwd, prompt }
 */
import { isToolEnabled } from "../../lib/config.js";
import { readFileSync, existsSync } from "fs";
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
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test --reporter=spec 2>&1 | grep -E "plan/user-prompt|✓|✗"
```

Expected: all `plan/user-prompt-submit` tests pass.

- [ ] **Step 5: Commit**

```bash
git add hooks/plan/user-prompt-submit.js test/e2e.test.js
git commit -m "feat(plan): add UserPromptSubmit hook with keyword detection and type inference"
```

---

### Task 6: PostToolUse Hook

**Files:**
- Create: `hooks/plan/post-tool-use.js`
- Modify: `test/e2e.test.js`

- [ ] **Step 1: Write failing tests**

Add at end of `test/e2e.test.js`:

```js
describe("plan/post-tool-use", () => {
  let configPath;
  let plansDir;

  beforeEach(() => {
    configPath = join(tmpDir, "config.json");
    plansDir = join(tmpDir, ".claude", "plans");
    mkdirSync(plansDir, { recursive: true });
  });

  test("converts .md plan to .html and writes index", () => {
    const mdPath = join(plansDir, "2026-05-25-my-feature.md");
    writeFileSync(
      mdPath,
      "<!-- plan-type: feature -->\n# My Feature\n\n## Goal\nBuild it.\n",
    );

    const r = runPlanHook(
      "post-tool-use",
      { tool_name: "Write", tool_input: { file_path: mdPath } },
      { configPath },
    );

    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ continue: true });

    // HTML file created
    const htmlPath = join(plansDir, "2026-05-25-my-feature.html");
    const { existsSync: exists, readFileSync: read } = await import("fs");
    // Use sync check
    const { existsSync, readFileSync } = await import("fs");
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("My Feature");
    expect(html).toContain("Feature"); // badge

    // index.html created
    const indexHtml = readFileSync(join(plansDir, "index.html"), "utf8");
    expect(indexHtml).toContain("2026-05-25-my-feature");
  });

  test("uses feature type when no plan-type comment", () => {
    const mdPath = join(plansDir, "2026-05-25-no-type.md");
    writeFileSync(mdPath, "# No Type Plan\n\n## Goal\nDefault.\n");

    runPlanHook(
      "post-tool-use",
      { tool_name: "Write", tool_input: { file_path: mdPath } },
      { configPath },
    );

    const htmlPath = join(plansDir, "2026-05-25-no-type.html");
    const { readFileSync } = await import("fs");
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("#3b82f6"); // feature blue
  });

  test("no-ops for non-Write tool", () => {
    const r = runPlanHook(
      "post-tool-use",
      { tool_name: "Edit", tool_input: { file_path: join(plansDir, "test.md") } },
      { configPath },
    );
    expect(r.json).toMatchObject({ continue: true, suppressOutput: true });
  });

  test("no-ops when path does not match .claude/plans/*.md", () => {
    const r = runPlanHook(
      "post-tool-use",
      { tool_name: "Write", tool_input: { file_path: "/projects/myapp/src/index.ts" } },
      { configPath },
    );
    expect(r.json).toMatchObject({ continue: true, suppressOutput: true });
  });

  test("no-ops when plan tool disabled", () => {
    const mdPath = join(plansDir, "2026-05-25-disabled.md");
    writeFileSync(mdPath, "<!-- plan-type: feature -->\n# Disabled\n");

    const r = runPlanHook(
      "post-tool-use",
      { tool_name: "Write", tool_input: { file_path: mdPath } },
      { configPath, enabled: false },
    );
    expect(r.json).toMatchObject({ continue: true, suppressOutput: true });

    // HTML should NOT be created
    const htmlPath = join(plansDir, "2026-05-25-disabled.html");
    const { existsSync } = await import("fs");
    expect(existsSync(htmlPath)).toBe(false);
  });

  test("bug type plan produces red badge", () => {
    const mdPath = join(plansDir, "2026-05-25-bug-report.md");
    writeFileSync(
      mdPath,
      "<!-- plan-type: bug -->\n# Login Bug\n\n## Symptom\nCrashes.\n",
    );

    runPlanHook(
      "post-tool-use",
      { tool_name: "Write", tool_input: { file_path: mdPath } },
      { configPath },
    );

    const { readFileSync } = await import("fs");
    const html = readFileSync(join(plansDir, "2026-05-25-bug-report.html"), "utf8");
    expect(html).toContain("#ef4444"); // red
    expect(html).toContain("Bug Investigation");
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test 2>&1 | grep -E "plan/post-tool|FAIL|error" | head -15
```

Expected: failures because `hooks/plan/post-tool-use.js` doesn't exist.

- [ ] **Step 3: Write `hooks/plan/post-tool-use.js`**

```js
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

// Only handle Write tool
if (toolName !== "Write") {
  console.log(NOOP);
  process.exit(0);
}

// Only handle .claude/plans/*.md paths
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

// Ensure current plan appears in the list
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

const html = renderPlan({ planType, title, date, project, cwd, bodyHtml, otherPlans });
writeFileSync(htmlFilePath, html);

// ── Regenerate index.html ─────────────────────────────────────────────────────

const indexHtml = renderIndex({ plans: otherPlans, project, cwd });
writeFileSync(join(plansDir, "index.html"), indexHtml);

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
  // "silent" and "ask" — print path to stderr so Claude sees it
  process.stderr.write(`plan saved: ${htmlFilePath}\n`);
}

console.log(NOOP);
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test --reporter=spec 2>&1 | grep -E "plan/post-tool|✓|✗"
```

Expected: all `plan/post-tool-use` tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test
```

Expected: 0 failures across all tests.

- [ ] **Step 6: Commit**

```bash
git add hooks/plan/post-tool-use.js test/e2e.test.js
git commit -m "feat(plan): add PostToolUse hook for md→html conversion and browser open"
```

---

### Task 7: hooks.json Wiring

**Files:**
- Modify: `hooks/hooks.json`

- [ ] **Step 1: Add UserPromptSubmit entry**

In `hooks/hooks.json`, add to the `UserPromptSubmit` array (after the existing memory hook entry):

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "sh $CLAUDE_PLUGIN_ROOT/hooks/run.sh $CLAUDE_PLUGIN_ROOT/hooks/plan/user-prompt-submit.js",
      "timeout": 5000
    }
  ]
}
```

- [ ] **Step 2: Add PostToolUse entry**

In `hooks/hooks.json`, add to the `PostToolUse` array (after the existing Write|Edit|NotebookEdit entry):

```json
{
  "matcher": "Write",
  "hooks": [
    {
      "type": "command",
      "command": "sh $CLAUDE_PLUGIN_ROOT/hooks/run.sh $CLAUDE_PLUGIN_ROOT/hooks/plan/post-tool-use.js",
      "timeout": 10000
    }
  ]
}
```

- [ ] **Step 3: Run full test suite one final time**

```bash
cd /Users/ali/projects/claude-kit-v2 && bun test
```

Expected: 0 failures.

- [ ] **Step 4: Commit**

```bash
git add hooks/hooks.json
git commit -m "feat(plan): wire plan hooks into hooks.json"
```

---

## Self-Review

**Spec coverage:**
- ✅ Opt-in tool in tools.js + config.js
- ✅ Keyword detection + type inference → UserPromptSubmit
- ✅ Skill file injected as additionalContext
- ✅ PostToolUse on Write → md→html conversion
- ✅ 5 plan types with distinct visual styling
- ✅ Per-project `.claude/plans/` directory
- ✅ Sidebar + index.html navigation
- ✅ Interactive checkboxes with localStorage
- ✅ Collapsible H2 sections
- ✅ aggressiveness config (auto-open / silent / ask)
- ✅ Auto-open browser on macOS/Linux
- ✅ Self-contained HTML (no external deps)
- ✅ Tests for all hooks and utilities

**No placeholders, no TBDs.**

**Type consistency:** `planType` string flows from PostToolUse → `TYPE_CONFIG` lookup in `templates.js` → badge + color. `mdToHtml` is a pure function imported by `post-tool-use.js`. All names consistent across tasks.
