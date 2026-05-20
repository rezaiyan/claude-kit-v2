---
name: spec
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Implementation Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for the codebase and questionable taste. Document everything: which files to touch, code to write, tests, how to verify. Bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

**Announce at start:** "I'm using the spec skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Scope Check

If the spec covers multiple independent subsystems, suggest breaking into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified.

- Design units with clear boundaries and well-defined interfaces. One clear responsibility per file.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" — step
- "Run it to make sure it fails" — step
- "Implement the minimal code to make the test pass" — step
- "Run the tests and make sure they pass" — step
- "Commit" — step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** Use claude-kit-v2:implement to execute this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.kt`
- Modify: `exact/path/to/existing.kt`
- Test: `src/test/exact/path/TestFile.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
@Test
fun `specific behavior description`() {
    val result = functionUnderTest(input)
    assertEquals(expected, result)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew test --tests "com.example.TestClass.specific behavior description"`
Expected: FAIL with "unresolved reference"

- [ ] **Step 3: Write minimal implementation**

```kotlin
fun functionUnderTest(input: Input): Output {
    return expected
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew test --tests "..."`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/...
git commit -m "feat: add specific feature"
```
````

## No Placeholders

These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" without showing the code
- "Write tests for the above" without actual test code
- "Similar to Task N" — repeat the code, engineer may read tasks out of order
- Steps describing what to do without showing how

## Remember

- Exact file paths always
- Complete code in every step
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing the complete plan:

**1. Spec coverage:** Can you point to a task that implements each requirement? List any gaps.

**2. Placeholder scan:** Search for TBDs, vague steps, missing code blocks. Fix them.

**3. Type consistency:** Do the types, method signatures, and names you used in later tasks match what you defined in earlier tasks?

Fix inline. No need to re-review.

## Execution Handoff

After saving the plan:

> "Plan saved to `docs/plans/<filename>.md`. Ready to implement — invoke `claude-kit-v2:implement` to execute task-by-task, or we can execute inline."
