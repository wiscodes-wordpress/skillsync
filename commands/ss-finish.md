# ss-finish

**REQUIRED voice:** one short status line per leaf (review / security / handoff / feature evidence / PR URL). No phase essays ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md)).

**Story — Done agent.** One fresh session after Implement / `/ss-loop` completes (Remaining empty). Follow [`ss-flow`](./ss-flow.md) phase Done. Belt map: [`harness/ss-flow.md`](../harness/ss-flow.md).

Runs the post-implement leaf commands **in order**. Prefer this over opening five separate agents for the same tail.

## Default (pre-merge)

1. [`/ss-review`](./ss-review.md) — critic; on FAIL, fix in this session (scoped to findings), then re-review until PASS.
2. [`/ss-security-audit`](./ss-security-audit.md) — required before PR when vendored.
3. [`/ss-feature-evidence`](./ss-feature-evidence.md) — after audit PASS; skip if no UI, no browser E2E, or the human already saw the feature.
4. [`/ss-handoff`](./ss-handoff.md) — optional; skip if the human already knows the diff.
5. [`/ss-submit-pr`](./ss-submit-pr.md) — open PR, report the URL, then watch CI on the head branch and push fix commits until green or blocked.

Do not merge. Do not close the tracker yet. Stay in this session for the CI result.

## After merge (resume)

6. [`/ss-close-story`](./ss-close-story.md) — tracker Done + harness reset.

Invoke with “resume close”, “after merge”, or `/ss-close-story` directly.

## Context budget

- Start **fresh** after implement — load critic first; PR/close skills only after review PASS.
- Contract is **`.harness/state.md`** (TDD Evidence, Verification Plan, Security Evidence) + the branch diff — not the implement chat.
- Leaf commands stay available for partial re-runs (e.g. security only). Prefer one `/ss-finish` over five leaf agents unless re-running a single gate.
- More savings tips: [`harness/ss-flow.md`](../harness/ss-flow.md) → **Further savings**.

**Voice:** one short status line per leaf (review / security / handoff / feature evidence / PR URL). No phase essays ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md) `/ss-*` chat voice).

Available as `/ss-finish` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
