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
