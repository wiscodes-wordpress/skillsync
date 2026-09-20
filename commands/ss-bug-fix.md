# ss-bug-fix

**REQUIRED voice:** simple, concise teammate chat ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md): problem → fix → next). One status line per phase — detail in **`.harness/state.md`**, not chat.

**Belt: Bug fix** — lighter than Story. Root cause before code; investigation evidence before merge. Map: [`harness/ss-flow.md`](../harness/ss-flow.md) → Bug belt.

**Use when:** something is broken, throwing, failing tests, or a reported regression — not a new feature.

**Skip:** [`ss-plan`](./ss-plan.md) / grill-tdd unless the fix needs multi-cycle behavioral contracts. Skip [`ss-feature-evidence`](./ss-feature-evidence.md) and [`ss-handoff`](./ss-handoff.md) by default.

## Start

1. **Branch** — consumer wrapper (issue key in branch name when applicable).
2. **State** — when vendored and state is missing or still a feature plan:

```bash
node .cursor/vendor/skillsync/tools/init-state.cjs . --mode bug --task "PROJECT-123 short title"
```

3. **Skills** — read [`diagnose`](../skills/engineering/diagnose/SKILL.md) (engine for repro → hypotheses → instrument → fix).
4. **Harness** — follow [`harness-bug-fix.md`](../harness/harness-bug-fix.md) end-to-end.

## Done tail (same session or resume)

After fix + regression evidence in state:

1. [`/ss-review`](./ss-review.md) — critic; on FAIL, fix scoped to findings, re-review until PASS.
2. [`/ss-security-audit`](./ss-security-audit.md) — when vendored; required before PR.
3. [`/ss-submit-pr`](./ss-submit-pr.md) — PR body must include **Root cause** (symptom + mechanism). Stop for merge.

Close tracker after merge via consumer wrapper or [`/ss-close-story`](./ss-close-story.md).

## Optional GitNexus

When MCP is indexed ([`docs/gitnexus.md`](../docs/gitnexus.md)): `query` / `context` during investigation; `impact` before shared-symbol edits; `detect_changes` before review. Skip if unavailable.

## Tiering

| Tier | When | Path |
|------|------|------|
| **trivial** | Obvious typo, single-line wrong constant, stack trace points to one line | Repro → fix → regression → Done tail |
| **standard** | Anything else | Full [`diagnose`](../skills/engineering/diagnose/SKILL.md) + [`harness-bug-fix.md`](../harness/harness-bug-fix.md) gates |

Set **Tier** in state; default **standard** when unsure.

Available as `/ss-bug-fix` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
