---
name: tdd
description: Test-driven development RED→GREEN→REFACTOR. Use at /ss-implement when state has RED→GREEN Plan, or ad-hoc TDD. Planning lives in /ss-plan (grill-tdd), not this skill.
---

# Test-Driven Development

## Philosophy

**Core principle:** Tests verify behavior through public interfaces, not implementation details. Internals can change entirely; tests should not.

**Good tests** exercise real code paths through public APIs. They describe *what* the system does, not *how*. A good test reads like a specification — “user can checkout with valid cart” names a capability. These tests survive refactors because they ignore internal structure.

**Bad tests** couple to internals: mock collaborators, hit private methods, or check side effects outside the public interface. Warning sign: the test breaks when you refactor, but behavior did not change. If renaming an internal function fails tests, those tests were testing implementation, not behavior.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Anti-pattern: all tests first, then all code

**Do not write all tests first, then all implementation.** That turns RED into “dump every test” and GREEN into “dump every change.”

That produces weak tests:

- Tests written in bulk check *imagined* behavior, not *observed* behavior
- They often assert shape (data structures, signatures) instead of user-facing outcomes
- They pass when behavior breaks, or fail when behavior is fine
- You commit to test structure before you understand the implementation

**Correct approach:** one behavior at a time. Write one test → make it pass → repeat. Each cycle uses what you learned from the last. Because you just wrote the code, you know what matters and how to verify it.

```
WRONG (batch):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (one at a time):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
  ...
```

## Follow the expectation

When **`.harness/state.md`** has Behavior & Test Contracts, treat **expectation** as the script for the test:

```text
setup or open > user/caller action > … > observable result
```

- Encode those hops in the test body.
- Assert **only** the last hop (or the last hop plus necessary intermediate checks that still describe user-visible behavior).
- Do not invent a different scenario than the plan. If the plan’s expectation is wrong, stop and ask — do not silently rewrite it.

## Workflow

**Planning** happens in **`/ss-plan`** ([`grill-tdd`](../grill-tdd/SKILL.md) + state.md). At implement, read **`.harness/state.md`** — do not re-plan behaviors in chat.

### 1. First thin path

Write ONE test that confirms ONE thing about the system:

```
RED:   Write test for first behavior → test fails
GREEN: Write minimal code to pass → test passes
```

This proves the path works end to end before you add more behaviors.

### 2. Incremental loop

For each remaining behavior:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules:

- One test at a time
- Only enough code to pass the current test
- Do not anticipate future tests
- Keep tests focused on observable behavior (the **expectation** chain)

### 3. Refactor

After all tests for the current cycle pass, look for [refactor candidates](refactoring.md):

- [ ] Extract duplication
- [ ] Deepen modules (move complexity behind simple interfaces)
- [ ] Apply SOLID where it fits naturally
- [ ] Consider what new code reveals about existing code
- [ ] Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

## Checklist per cycle

```
[ ] Test follows the planned expectation (last hop = assertion)
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive an internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```
