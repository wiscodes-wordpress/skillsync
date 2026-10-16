# ss-review-handoff

**Phase: review → human evidence** — follow [`harness/ss-flow.md`](../harness/ss-flow.md). Run **immediately after `/ss-review` PASS**, **before** `/ss-security-audit`. Usually via [`/ss-finish`](./ss-finish.md) step 2.

Produces **code walkthrough HTML** plus a **human sign-off card** so security and PR gates run on a tree the human already accepted.

In **Agent** mode, follow [`review-handoff-evidence`](../skills/engineering/review-handoff-evidence/SKILL.md) and [`code-handoff`](../skills/engineering/code-handoff/SKILL.md) + [`HTML-REPORT.md`](../skills/engineering/code-handoff/HTML-REPORT.md):

1. Confirm critic **PASS** in **`.harness/state.md`**.
2. Scaffold handoff MD when missing (`init-plan-html.cjs --kind handoff`).
3. Rewrite **`.harness/code-handoff.md`** from state + diff; `render-plan-html.cjs --kind handoff --validate`.
4. Write **`.harness/review-handoff-evidence.md`** from [CARD.md](../skills/engineering/review-handoff-evidence/CARD.md).
5. Pointer **`## Review handoff evidence`** on state (`Human: pending`).
6. Print **card** + **HTML** paths. Human ticks **Accept** before security. Do not tick for them.

**Waive** only when the human explicitly skips walkthrough — set `Human: waived — <reason>` in state (see SKILL).

When consumer `reviewHandoffHumanEvidence` is not `required`, this command is still the canonical walkthrough; the tool gate is optional.

In **Ask** mode, print the skill outline and exact commands; write files only if asked.

**Voice:** print the two paths and “tick Accept before `/ss-security-audit`” ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md)).

Available as `/ss-review-handoff` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
