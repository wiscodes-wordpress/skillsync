# ss-finish

**REQUIRED voice:** one short status line per leaf (review / security / handoff / PR URL). No phase essays ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md)).

**Story — Done agent.** One fresh session after Implement / `/ss-loop` completes (Remaining empty). Follow [`ss-flow`](./ss-flow.md) phase Done. Belt map: [`harness/ss-flow.md`](../harness/ss-flow.md).

Runs the post-implement leaf commands **in order**. Prefer this over opening five separate agents for the same tail.

## Default (pre-merge)

1. [`/ss-review`](./ss-review.md) — critic; on FAIL, fix in this session (scoped to findings), then re-review until PASS.
2. [`/ss-security-audit`](./ss-security-audit.md) — required before PR when vendored.
3. [`/ss-handoff`](./ss-handoff.md) — optional; skip if the human already knows the diff.
4. [`/ss-submit-pr`](./ss-submit-pr.md) — open PR; **stop here** and report the PR URL.

Do not merge. Do not close the tracker yet.

## After merge (resume)

5. [`/ss-close-story`](./ss-close-story.md) — tracker Done + harness reset.

Invoke with “resume close”, “after merge”, or `/ss-close-story` directly.

## Context budget

- Start **fresh** after implement — load critic first; PR/close skills only after review PASS.
- Contract is **`.harness/state.md`** (TDD Evidence, Verification Plan, Security Evidence) + the branch diff — not the implement chat.
- Leaf commands stay available for partial re-runs (e.g. security only). Prefer one `/ss-finish` over five leaf agents unless re-running a single gate.
- More savings tips: [`harness/ss-flow.md`](../harness/ss-flow.md) → **Further savings**.

**Voice:** one short status line per leaf (review / security / handoff / PR URL). No phase essays ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md) `/ss-*` chat voice).

Available as `/ss-finish` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
