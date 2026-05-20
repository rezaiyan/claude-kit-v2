---
name: tdd
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development (TDD)

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

## When to Use

**Always:**
- New features
- Bug fixes
- Refactoring
- Behavior changes

**Exceptions (ask the user):**
- Throwaway prototypes
- Generated code
- Configuration files

Thinking "skip TDD just this once"? Stop. That's rationalization.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete

## Red-Green-Refactor

```
RED → verify RED → GREEN → verify GREEN → REFACTOR → repeat
```

### RED — Write Failing Test

Write one minimal test showing what should happen.

**Requirements:**
- One behavior
- Clear name
- Real code (no mocks unless unavoidable)

**Good (Kotlin):**
```kotlin
@Test
fun `retries failed operations 3 times`() {
    var attempts = 0
    val operation = {
        attempts++
        if (attempts < 3) throw RuntimeException("fail")
        "success"
    }
    val result = retryOperation(operation)
    assertEquals("success", result)
    assertEquals(3, attempts)
}
```

**Bad:**
```kotlin
@Test
fun `retry works`() {
    val mock = mockk<() -> String>()
    every { mock() } throws RuntimeException() andThen throws RuntimeException() andThen returns "success"
    retryOperation(mock)
    verify(exactly = 3) { mock() }
}
```
Vague name, tests mock not code.

### Verify RED — Watch It Fail

**MANDATORY. Never skip.**

Run only the new test. Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing, not typos

**Test passes?** You're testing existing behavior. Fix test.

**Test errors?** Fix error, re-run until it fails correctly.

### GREEN — Minimal Code

Write simplest code to pass the test. Don't add features, don't refactor other code.

### Verify GREEN — Watch It Pass

**MANDATORY.**

Run ALL tests. Confirm:
- New test passes
- Other tests still pass
- No errors or warnings

**Test fails?** Fix code, not test.

**Other tests fail?** Fix now.

### REFACTOR — Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

## Coverage Requirements

**Minimum 80% coverage.** Verify with:
```bash
# Kotlin/Gradle
./gradlew koverReport

# TypeScript/Jest
npm test -- --coverage --coverageThreshold='{"global":{"lines":80}}'

# Python
uv run pytest --cov=src --cov-fail-under=80
```

Coverage is a floor, not a goal. Focus on behavior coverage — all critical paths, edge cases, error conditions.

## Good Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior | `test('test1')` |
| **Shows intent** | Demonstrates desired API | Obscures what code should do |
| **Real** | Tests real behavior | Tests mock behavior |

## Anti-Patterns

- Testing implementation details instead of behavior
- Adding test-only methods to production classes
- Mocking without understanding what you're mocking
- Partial mocks that hide structural assumptions
- Dependent tests (each test must work independently)
- Unmocked external dependencies in unit tests

## Mandatory Mocking in Unit Tests

| Call Type | MUST Mock |
|-----------|-----------|
| HTTP/Network | Mock the client |
| Subprocess | Mock `ProcessBuilder` / `subprocess.run` |
| File I/O | Use temp directories or mock |
| Database | Use test fixtures or in-memory |
| External APIs | Mock the client |

Mock at the boundary (where imported, not where defined). Test taking > 1s = likely unmocked I/O.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost. Keeping unverified code is technical debt. |
| "TDD will slow me down" | TDD is faster than debugging. |

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass (full suite, not just new tests)
- [ ] Coverage ≥ 80% verified
- [ ] Tests use real code (mocks only for external deps)
- [ ] Edge cases and error conditions covered

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

## Bug Fix Protocol

Bug found? Write failing test that reproduces it. Follow TDD cycle. Test proves fix and prevents regression.

**Never fix bugs without a test.**

## Final Rule

```
Production code → test exists and failed first
Otherwise → not TDD
```
