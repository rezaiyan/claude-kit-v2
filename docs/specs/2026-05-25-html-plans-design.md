# HTML Plans Tool — Design Doc
_2026-05-25_

## Overview

A new claudekit tool (`plan`) that intercepts planning conversations, has Claude write structured markdown plan files, then converts them to self-contained, visually-rich HTML files — auto-opened in the browser.

**Enabled by default:** No (opt-in)

---

## Architecture

```
UserPromptSubmit hook
  ├── detect planning keywords in user prompt
  ├── infer plan type
  └── inject skill content → additionalContext
         ↓
  Claude writes .claude/plans/YYYY-MM-DD-<slug>.md
         ↓
PostToolUse hook (Write tool only)
  ├── filter: path matches .claude/plans/*.md
  ├── extract <!-- plan-type: X --> comment
  ├── convert markdown → HTML using type-specific template
  ├── write .claude/plans/YYYY-MM-DD-<slug>.html
  ├── regenerate .claude/plans/index.html
  └── open browser (if aggressiveness === "auto-open")
```

---

## New Files

```
hooks/plan/
  user-prompt-submit.js   ← keyword detection + context injection
  post-tool-use.js        ← md→html conversion + index regen + open
  templates.js            ← HTML templates per plan type
  md-to-html.js           ← markdown parser (no external deps)

skills/plan/
  plan.md                 ← adaptive templates + rules injected into Claude

lib/tools.js              ← add `plan` entry
lib/config.js             ← add plan config defaults
```

---

## Plan Types

Five adaptive types. Claude infers from conversation context; user can override with explicit keywords.

| Type | Trigger keywords | Required sections |
|------|-----------------|-------------------|
| `feature` | plan, build, add, implement | Goal, Background, User Stories, Implementation Steps, Open Questions, Risks |
| `bug` | investigate, debug, why is, fix | Symptom, Reproduction Steps, Root Cause Hypothesis, Investigation Plan, Fix Options |
| `architecture` | architect, design system, structure, how should we | Context, Decision Drivers, Options Considered, Decision, Consequences |
| `migration` | migrate, upgrade, move from X to Y | Current State, Target State, Migration Steps, Rollback Plan, Risks |
| `research` | research, spike, explore, evaluate | Question, Motivation, Approach, Resources, Expected Output |

**Type inference:** Infer from keyword set, default to `feature` if ambiguous. User can override by stating type explicitly ("this is a migration plan").

---

## Skill File (skills/plan/plan.md)

Injected as `additionalContext` when planning is detected. Instructs Claude to:

1. Write plan to `.claude/plans/YYYY-MM-DD-<kebab-slug>.md`
2. First line MUST be `<!-- plan-type: feature|bug|architecture|migration|research -->`
3. Use type-appropriate section schema (see Plan Types above)
4. Use standard markdown: headings, bullets, checkboxes (`- [ ]`), code blocks

---

## Hook: UserPromptSubmit

**File:** `hooks/plan/user-prompt-submit.js`

```
read stdin → parse { prompt }
if plan tool disabled → exit 0
keyword regex (case-insensitive):
  /\b(plan|design|architect|migrate|investigate|debug|spike|research|explore|build|implement)\b/
if match:
  infer type from keyword set
  inject plan.md skill content + type hint into additionalContext
exit 0
```

---

## Hook: PostToolUse

**File:** `hooks/plan/post-tool-use.js`

```
read stdin → parse { tool_name, tool_input }
if tool_name !== "Write" → exit 0
if tool_input.file_path !~ .claude/plans/*.md → exit 0

read .md file
extract <!-- plan-type: X --> → select HTML template
convert markdown → HTML (md-to-html.js)
inject into type template (templates.js)
write .html (same path, .html extension)
regenerate index.html (scan dir for all .html plans)

switch aggressiveness:
  "auto-open" → open browser to .html file
  "silent"    → print "plan saved: .claude/plans/xxx.html"
  "ask"       → print path only, user opens manually

edge cases:
  .claude/plans/ missing → mkdir -p
  plan-type comment missing → default "feature"
  .html exists → overwrite
  browser open: `open` (macOS), `xdg-open` (Linux)
```

---

## HTML Template Design

### Base Layout (all types)

```
┌─────────────────────────────────────────┐
│  [type badge]  Plan Title        [date] │
│  project: xxx  cwd: xxx                 │
├──────────┬──────────────────────────────┤
│          │                              │
│ SIDEBAR  │  CONTENT                     │
│          │  each H2 = card             │
│ All Plans│  checkboxes = interactive   │
│ ──────── │  code blocks = highlighted  │
│ plan-1   │  collapsible sections       │
│ plan-2   │                              │
│ plan-3   │                              │
└──────────┴──────────────────────────────┘
```

### Type-Specific Visual Cues

| Type | Badge color | Accent | Unique element |
|------|-------------|--------|----------------|
| `feature` | blue | blue border | User stories as cards |
| `bug` | red | red left stripe | Hypothesis confidence meter |
| `architecture` | purple | purple | ADR-style decision box |
| `migration` | orange | orange | Step-by-step progress track |
| `research` | teal | teal | Resources as link list |

### Interactive Elements

- Checkboxes on steps — state persists via `localStorage` (keyed by plan filename)
- Collapsible sections (click H2 to toggle)
- Sidebar links regenerated on each new plan
- Print-friendly via `@media print`
- **No external dependencies** — self-contained HTML, inline CSS, vanilla JS only

---

## Config

**`lib/config.js` defaults:**
```js
plan: {
  enabled: false,
  aggressiveness: "auto-open",  // "auto-open" | "silent" | "ask"
}
```

**`lib/tools.js` entry:**
```js
plan: {
  label: "HTML Plans",
  hint: "opt-in · saves plans as visual HTML files in .claude/plans/",
  description: "...",
  enabledByDefault: false,
}
```

---

## hooks.json Additions

Add to `UserPromptSubmit` array:
```json
{
  "hooks": [{
    "type": "command",
    "command": "sh $CLAUDE_PLUGIN_ROOT/hooks/run.sh $CLAUDE_PLUGIN_ROOT/hooks/plan/user-prompt-submit.js",
    "timeout": 5000
  }]
}
```

Add to `PostToolUse` array:
```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "sh $CLAUDE_PLUGIN_ROOT/hooks/run.sh $CLAUDE_PLUGIN_ROOT/hooks/plan/post-tool-use.js",
    "timeout": 10000
  }]
}
```

---

## File Naming

Plans stored as:
```
.claude/plans/
  YYYY-MM-DD-<kebab-slug>.md
  YYYY-MM-DD-<kebab-slug>.html
  index.html                    ← auto-regenerated
```

Slug derived from plan title: lowercase, spaces → hyphens, special chars stripped.

---

## Out of Scope

- Cloud sync or sharing of plans
- Plan editing via browser (read-only HTML)
- Plan search/filtering in index
- Non-macOS/Linux browser open (Windows `start` command)
