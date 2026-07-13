# Critic module — TDD test integrity

Load when **`.harness/state.md`** contains **Behavior & Test Contracts** or a **RED→GREEN Plan** (typical after **`/ss-plan`** TDD flow).

Also read:

- [`tdd/tests.md`](../skills/engineering/tdd/tests.md) — good/bad test examples (not full `tdd` skill)
- [accessible-locator-priority.md](./accessible-locator-priority.md) when UI or E2E specs are in the diff

**Contract source:** **`.harness/state.md`** (not `grill-tdd` — planning is done).

## Mission

Prevent **false positives** and **test tampering**: tests must prove planned behaviors; green must come from **production fixes**, not deleted or weakened assertions.

## Rubric additions (score when TDD plan present)

Add these categories to the core critic rubric:

| Category | Question |
|----------|----------|
| **Test contract fidelity** | Every behavior ID in the plan maps to a test that would catch regression |
| **RED discipline** | Completed cycles have RED evidence in state (fail output before GREEN) |
| **Test integrity** | GREEN did not remove/weaken tests to pass |
| **E2E sync** | Spines cover journey gaps only; no duplicate of unit branches |
| **Locator discipline** (UI/E2E) | Role/label priority per accessible-locator-priority; no gratuitous test IDs |

**FAIL** if test tampering detected or RED evidence missing for claimed TDD cycles.

## Step 1 — Contract vs diff

Build a table from **Behavior & Test Contracts** in state.md (cards with **name** / **expectation** / **layer** / **path**):

| Behavior ID | Planned layer | **name** match in diff? | Last hop of **expectation** asserted? |
|-------------|---------------|-------------------------|---------------------------------------|
| B1 | unit | | |
| S1 | E2E spine | | |

**FAIL** if a planned behavior has no matching test in the diff (unless explicitly deferred in Remaining with human approval). Match on Behavior ID + **name**; treat the final ` > ` hop of **expectation** as the required assertion.

**Mechanical assist:** `tools/tdd-audit.cjs` parses contract cards and fails completed cycles whose **name** is absent from the test diff; last-hop / **path** mismatches are warnings (`--strict-warn` to fail).
## Step 2 — Test tampering diff audit

Inspect test file changes:

```bash
git diff -- '*.test.*' '*.spec.*' '__tests__/*' 'e2e/*' 'tests/*'
```

### Tampering signals (FAIL unless documented contract change)

| Signal | Example |
|--------|---------|
| Removed test case | deleted `it(` / `test(` block |
| Removed assertion | fewer `expect(` in hunks |
| Weakened matcher | `toBe('Save')` → `toBeDefined()` |
| Skip / todo | `.skip`, `xit`, `test.skip` |
| Hollow interaction | assert visibility only, no user action |
| Mock hides behavior | new mock that prevents exercising the behavior under test |
| Test-only GREEN | cycle went green with **zero** production file changes |

### Allowed test changes in GREEN (require note in findings)

- Same behavior ID; selector fix (e.g. wrong `getByRole` → correct one)
- Stronger assertion or additional case for **same** behavior
- Fixture/helper only — assertions unchanged

## Step 3 — RED discipline

Check **`## TDD Evidence`** in state.md (or **Last Harness Output**):

| Required per completed cycle | Missing → |
|------------------------------|-----------|
| Scoped command run | IN_PROGRESS |
| FAIL snippet / error message before GREEN | FAIL (not TDD) |
| PASS after GREEN | IN_PROGRESS |

## Step 4 — Re-break check

For each **completed** cycle with **medium/high** risk, or when tampering is suspected:

1. Temporarily revert **production** hunks for that cycle (stash prod paths only, or mental review of prod diff).
2. Run the scoped test command → must **FAIL**.
3. Restore production code → must **PASS**.

Record in verdict:

```markdown
### Re-break
| Cycle | Re-break FAIL without prod? | Notes |
|-------|----------------------------|-------|
| 1 | yes | stashed src/... only |
```

**FAIL** if test passes with production fix removed (test does not prove behavior).

## Step 5 — E2E sync

When E2E spines are planned:

- Spine IDs (S1, …) link to behavior IDs (B1, B3) — not every unit behavior
- E2E does not re-assert every validation branch already covered in unit tests
- Spine command appears in harness output with pass/fail

## Step 6 — UI locator audit (when UI/E2E tests in diff)

Apply [accessible-locator-priority.md](./accessible-locator-priority.md) using the repo’s test stack:

```bash
git diff -- '*.test.*' '*.spec.*' '__tests__/*' 'e2e/*' 'tests/*'
```

| Finding | Severity |
|---------|----------|
| Test ID / `data-testid` without justification | high — FAIL if gratuitous |
| CSS class / xpath selectors as primary | medium — IN_PROGRESS minimum |
| Role / label for interactive elements | expected |

**FAIL** if agent added `data-testid` to production components only to satisfy tests — fix semantics instead.

## Output section (add to critic chat output)

```markdown
### TDD Contract Audit
| Behavior ID | Layer | Test found | RED evidenced | Tampering | Locator OK |
|-------------|-------|------------|---------------|-----------|------------|

### Test integrity
- Prod lines changed: …
- Test assertion delta: …
- Re-break: …

### E2E sync
- …
```

## Verdict gates

| Condition | Verdict |
|-----------|---------|
| Tampering signal + no documented contract change | **FAIL** |
| Missing RED evidence for completed cycles | **FAIL** |
| Re-break fails (test passes without prod) | **FAIL** |
| Gratuitous test ID in UI tests or production markup | **FAIL** |
| Contract gap (planned behavior untested) | **FAIL** |
| Minor locator nit, strong otherwise | **IN_PROGRESS** |
