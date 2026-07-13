---
name: grill-tdd
description: TDD grilling after domain alignment — behaviors, RED test contracts, false-positive audit, and test-pyramid placement. Use during /ss-plan step 1b after grill-me or grill-with-docs, or when planning test-first work before implementation.
---

# Grill TDD

Second grilling phase for **`/ss-plan`**. Run **after** [`grill-me`](../../productivity/grill-me/SKILL.md) or [`grill-with-docs`](../grill-with-docs/SKILL.md) completes — domain scope and design decisions must already be resolved.

Interview the user one question at a time. For each question, provide your recommended answer. If a question can be answered by exploring the codebase, explore the codebase instead.

**Do not write test files during this session.** Agree on behaviors and test **contracts** only. Actual RED→GREEN cycles happen in **`/ss-implement`** (all Remaining cycles, sequential) via the [`tdd`](../tdd/SKILL.md) skill.

## Prerequisites

Before starting:

- Domain grill (step 1a) is complete — scope, constraints, and terminology are agreed.
- You have read the repo’s test layout (framework, paths, existing patterns in **`AGENTS.md`**, harness addenda, and nearby tests).

## Question phases (in order)

Walk these phases sequentially. Do not skip ahead until the current phase is resolved.

### A. Behavior and interface

Align on what callers and users observe — not internal structure.

- What is the **public surface** (REST route, hook return shape, component props, CLI command, WordPress hook)?
- Which **behaviors** matter most for this story? Prioritize — you cannot test everything.
- What are explicit **non-goals** for this story?
- Where do **boundaries** sit for mocks (external I/O only — never internal collaborators)? See [`tdd/mocking.md`](../tdd/mocking.md).

Use project vocabulary from **`CONTEXT.md`** when present.

### B. Failure expectation (RED contract)

For each prioritized behavior, nail what “failing correctly” means **before** any production code exists. Capture it as categories (not a wall of prose):

| Category | Meaning |
|----------|---------|
| **name** | Plain-language test title (`describe` / `it` or equivalent) — *what* the system does |
| **expectation** | Ordered scenario as `step 1 > step 2 > step 3` (arrange/act → observable outcome). Last step is the assertion that must fail RED |
| **red** | Why it fails correctly before production exists (missing export, wrong default, handler not connected) |

Also confirm:

- What **exact assertion** is the final step of **expectation**?
- Cycle **order** — tracer bullet first, then incremental behaviors.

One behavior at a time.

### C. False-positive audit

For each proposed test, challenge whether a passing test could still hide broken behavior. See [`tdd/tests.md`](../tdd/tests.md).

Ask explicitly:

- If we refactor internals without changing behavior, should this test still pass?
- Are we asserting **behavior** or mere **existence** (`toBeDefined`, element present without user action)?
- Are we mocking **internals** instead of system boundaries?
- If this test passes, could the user-facing outcome still be wrong?
- Does the test name describe **what** the system does, not **how**?

Reject or rewrite any test that fails this audit.

### D. Test pyramid placement

Assign each behavior a layer. Do **not** plan E2E for every unit behavior.

| Layer | When to use |
|-------|-------------|
| **Unit / integration (default)** | Behavior provable through public API in isolation — most behaviors belong here |
| **E2E spine (sparse)** | Cross-layer user journey that unit tests cannot honestly cover — at most **one spine per user-facing flow**, not one E2E per unit test |

Apply stack-specific rules only when the consumer links them (**`AGENTS.md`** / `skillsync.config.json`):

- **React unit:** [`jest-react-testing`](../jest-react-testing/SKILL.md)
- **WordPress:** [`wordpress-testing-qa`](../wordpress-testing-qa/SKILL.md)
- **UI locators:** [accessible-locator-priority](../../../harness/accessible-locator-priority.md)

Do **not** load [`testing-expert`](../testing-expert/SKILL.md) in the ss-* flow — use `tdd` + stack skill.

### D2. Locator strategy (E2E and UI unit)

For UI behaviors, agree how the test will find elements — **same priority as RTL**:

1. **Role** (e.g. `getByRole` / `page.getByRole`)
2. **Label** (`getByLabelText` / `getByLabel`)
3. **Placeholder**
4. **Text**
5. **Alt text** / **title**
6. **Test ID** — **last resort only**

Do not plan `data-testid` additions to production UI unless roles/labels are impossible and the user accepts that trade-off.

### E. Test strategy ADR (optional)

Offer an ADR only when the testing approach encodes a **hard-to-reverse** choice (same bar as [`grill-with-docs`](../grill-with-docs/SKILL.md)) — for example “we verify persistence through the repository interface, not direct SQL.”

## Anti-patterns (call out immediately)

- **Horizontal TDD at plan time** — agreeing a full test suite upfront without prioritized vertical order. Plan **order of RED→GREEN cycles**, not a bulk test dump.
- **E2E duplication** — E2E that repeats every branch already covered by fast unit tests.
- **Implementation-detail tests** — asserting call order, private methods, or internal mocks.
- **Placeholder assertions** — tests that pass without exercising the behavior.
- **Test tampering** — planning to “fix” tests instead of production code in GREEN.
- **Gratuitous test ID** — `data-testid` or test-ID queries when role/label would work.

## Session output (required handoff)

When grilling is complete, produce a **Behavior & Test Contract** summary for the harness planner.

**Prefer one card per behavior** (categories over wide tables). Keep language scannable.

```markdown
## Behavior & Test Contracts

### Behaviors (priority order)
1. <behavior — user/caller observable outcome>
2. …

### Test contracts

#### B1
- **name:** Feature: Save, when draft valid, shows confirmation
- **expectation:** open editor > edit title > click Save > see confirmation toast
- **red:** fails — Save handler not wired (click no-ops / assertion misses toast)
- **layer:** unit
- **path:** `src/…/Save.test.tsx` (proposed)
- **locator:** role=button, name=Save *(UI only)*
- **guard:** would fail if Save no-ops or toast text never appears (not existence-only)

#### B2
- **name:** …
- **expectation:** … > … > …
- **red:** …
- **layer:** unit | integration | E2E spine
- **path:** `…`
- **locator:** … *(omit if non-UI)*
- **guard:** …

### E2E spines (if any)
| Spine ID | Covers | Journey gap (not duplicated in unit) |
|----------|--------|--------------------------------------|
| S1 | B1, B3 | … |

### Non-goals
- …
```

**Category guide**

| Field | Required | Tip |
|-------|----------|-----|
| **name** | yes | Same wording the implementer will use in `it(...)` / equivalent |
| **expectation** | yes | Chain with ` > ` — each hop is a user/caller action or observable; **last hop = assertion** |
| **red** | yes | Proves the test is wired before GREEN |
| **layer** | yes | unit / integration / E2E spine |
| **path** | yes | Proposed test file using real repo paths |
| **locator** | UI only | Role/label first — see accessible-locator-priority |
| **guard** | yes | One-line false-positive rejection (“would catch X”) |

Do not start harness planning until this summary is agreed with the user.
