---
name: verify
description: Use when about to claim work is complete, fixed, or passing — requires running verification commands and confirming output before any success claims
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Claim → Required Evidence

| Claim | Required Evidence | Insufficient |
|-------|-------------------|-------------|
| "Tests pass" | Fresh run: 0 failures | Previous run, "should pass" |
| "Build succeeds" | Build exit 0 | "Linter passed" |
| "Bug fixed" | Reproducing test passes | "Code changed" |
| "UI works" | Browser automation verification | "API returns 200" |
| "No regression" | Full suite green | "My test passes" |
| "Requirements met" | Line-by-line checklist vs. spec | "Tests passing" |
| "Agent completed" | VCS diff shows changes | Agent reports "success" |

## Execution Verification

Unit tests with mocks prove nothing about real-world behavior. After tests pass:

- **CLI command** → run it
- **API endpoint** → call it
- **Frontend UI** → use browser automation
- **Any runnable program** → run it

**When:** After tests pass, after refactoring, after changing imports/deps/config, before marking any task complete.

**Skip only for:** documentation-only, test-only, pure internal refactoring (no entry points), config-only changes.

## Frontend / UI Changes

Unit tests and typechecks are NOT sufficient for UI changes.

After tests pass, verify with browser automation that the change works in the running app.

Procedure:
1. Build/deploy the change
2. Navigate to the affected page
3. Interact with the changed UI
4. Verify correct behavior

**Common pitfalls:** stale cached bundles, bundle not deployed to served location, CSS layout issues invisible to tests, elements in DOM but not visible/interactive.

## Output Correctness

**Running without errors ≠ correct output.** If code processes external data, fetch that data independently and compare. Numbers and content MUST match.

## Red Flags — STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Done!", "Fixed!", "Complete!")
- About to commit/push without verification
- Trusting agent success reports without checking VCS diff
- Relying on partial verification
- Thinking "just this once"

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## When Execution Fails After Tests Pass

This is a real bug — not a test environment quirk.

Fix immediately → re-run tests → re-execute → add test to catch this failure type.

## Quick Reference

```
About to claim something works?
→ What command proves it?
→ Run it now
→ Read full output
→ THEN make the claim
```
