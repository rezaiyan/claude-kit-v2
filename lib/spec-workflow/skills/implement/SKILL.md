---
name: implement
description: Use when executing implementation plans with independent tasks — dispatches fresh subagent per task with two-stage review
---

# Subagent-Driven Implementation

Execute plan by dispatching a fresh subagent per task, with two-stage review after each: spec compliance first, then code quality.

**Why subagents:** Fresh subagent per task = isolated context = no confusion from prior tasks. You construct exactly what they need. Preserves your context for coordination.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration.

## When to Use

- Have an implementation plan (`docs/plans/*.md`)
- Tasks are mostly independent
- Want to stay in this session

## The Process

```
Read plan, extract ALL tasks with full text → create task list

For each task:
  1. Dispatch implementer subagent (full task text + context)
  2. Answer any questions before they proceed
  3. Implementer implements, tests, commits, self-reviews
  4. Dispatch spec reviewer subagent
     → Issues? Implementer fixes → re-review
     → ✅ Spec compliant
  5. Dispatch code quality reviewer subagent
     → Issues? Implementer fixes → re-review
     → ✅ Code quality approved
  6. Mark task complete

After all tasks:
  Dispatch final code reviewer for entire implementation
  Invoke claude-kit-v2:finish
```

## Model Selection

- **1-2 files, clear spec** → fast/cheap model
- **Multi-file, integration concerns** → standard model
- **Architecture, design, review** → most capable model

## Implementer Subagent Prompt Template

```
You are implementing Task N from an implementation plan.

## Context
Project: <project name and one-line description>
Stack: <key technologies>
Plan goal: <overall plan goal>

## Task
<full task text verbatim from plan>

## Instructions
- Follow TDD: write failing test first, verify it fails, implement minimal code, verify it passes
- Self-review before reporting done: check spec compliance, test coverage, code quality
- Commit when done

## Status
Report one of:
- DONE: Work complete, tests pass, committed
- DONE_WITH_CONCERNS: Complete but flagging <specific concern>
- NEEDS_CONTEXT: Need <specific missing information>
- BLOCKED: Cannot proceed because <specific reason>
```

## Spec Reviewer Subagent Prompt Template

```
You are reviewing code for spec compliance only — not style or quality.

## Spec Requirements
<relevant section of the plan for this task>

## Recent Commits
<git log --oneline -5>

## Review
Check: Does the implementation match what the spec requires?
- Missing anything specified? List it.
- Added anything NOT specified? List it.

Report: ✅ Spec compliant OR ❌ Issues: <list>
```

## Code Quality Reviewer Subagent Prompt Template

```
You are reviewing code quality — not spec compliance (already verified).

## Recent Commits
<git log --oneline -5>
<git diff HEAD~N..HEAD>

## Review
Check: Is this implementation well-built?
- Tests adequate? (TDD followed?)
- Names clear?
- Code readable without comments?
- Any obvious bugs or edge cases missed?

Report: ✅ Approved OR Issues (Critical/Important/Minor): <list>
```

## Handling Implementer Status

**DONE:** Proceed to spec compliance review.

**DONE_WITH_CONCERNS:** Read the concerns. If correctness/scope concerns → address before review. If observations (file getting large) → note and proceed.

**NEEDS_CONTEXT:** Provide the missing context and re-dispatch.

**BLOCKED:** Assess:
1. Context problem → provide context, re-dispatch same model
2. Needs more reasoning → re-dispatch with more capable model
3. Task too large → break into smaller pieces
4. Plan is wrong → escalate to user

Never force same model to retry without changes.

## Red Flags

- Start implementation without a plan
- Skip spec compliance review (must come before quality review)
- Skip code quality review
- Proceed with unfixed issues
- Dispatch multiple implementers in parallel (causes conflicts)
- Let implementer self-review replace actual review (both needed)
- Move to next task while either review has open issues

## Integration

**Before implementing:** Use `claude-kit-v2:brainstorm` → `claude-kit-v2:spec` to create the plan.

**Each task:** Subagents should follow `claude-kit-v2:tdd`.

**After all tasks:** Invoke `claude-kit-v2:finish`.
