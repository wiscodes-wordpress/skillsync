---
name: review-handoff-evidence
description: >
  After critic PASS, generates the code walkthrough (code-handoff) plus a human
  sign-off card before /ss-security-audit. Use for /ss-review-handoff, review
  handoff human evidence, or when the consumer sets reviewHandoffHumanEvidence
  to required. Not agent-to-agent handoff, feature video evidence, or security audit.
---

# Review handoff evidence

**Phase: human review handoff** — durable walkthrough + explicit **Accept** before the security gate runs on the same tree.

**Does:** Run [`code-handoff`](../code-handoff/SKILL.md) (`.harness/code-handoff.md` → HTML), write **`.harness/review-handoff-evidence.md`**, pointer on **`.harness/state.md`**.  
**Does not:** Replace `/ss-review`, run `/ss-security-audit`, or tick human checkboxes.

Invoke via **`/ss-review-handoff`**. Order: **immediately after `/ss-review` PASS**, **before** `/ss-security-audit`.

## When to use / skip

| Use | Skip (record waiver in state) |
|-----|-------------------------------|
| Default when consumer `reviewHandoffHumanEvidence` is `required` | Human says skip walkthrough (e.g. already reviewed diff live) |
| Any non-trivial branch diff | Trivial doc-only with human OK to skip |

Waivers require an explicit human message; agents write `Human: waived — <reason>` under **`## Review handoff evidence`** in state.

## Workflow

1. Confirm **Last Critic Verdict** is **PASS** in `.harness/state.md`.
2. Follow **code-handoff** steps 1–6 (scaffold if needed, rewrite MD, render + validate HTML).
3. Write **`.harness/review-handoff-evidence.md`** from [CARD.md](CARD.md).
4. Set **`## Review handoff evidence`** on state (`Human: pending`).
5. Print **card path**, **HTML path**, and tell the human to tick **Accept** before `/ss-security-audit`. Do not tick Accept for them.

## Gate

When required, vendored tools enforce Accept before security / PR:

```bash
node .cursor/vendor/skillsync/tools/review-handoff-evidence.cjs . --check-state
```

## Related

| Command | Relationship |
|---------|----------------|
| `/ss-review` | Must PASS first |
| `/ss-security-audit` | Runs only after human Accept (or waiver) |
| `/ss-feature-evidence` | Running UI clip — after security |
| `/ss-handoff` | Legacy leaf; prefer `/ss-review-handoff` when review handoff is required |
