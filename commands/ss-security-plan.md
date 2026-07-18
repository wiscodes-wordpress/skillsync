# ss-security-plan

**Phase: security posture** — optional; above story delivery. See [`ss-flow.md`](../harness/ss-flow.md).

Set **how we intend to be secure** as a living HTML briefing (`.harness/security-posture.html`). Does **not** implement code, does **not** replace the per-PR gate.

In **Agent** mode, follow [`security-plan`](../skills/engineering/security-plan/SKILL.md):

1. **Locate** `.harness/security-posture.html`.
2. **If stages/finish-line have keys** — refresh **Jira → HTML** only. Never push status back to Jira.
3. If no HTML — explore entrypoints / trust surfaces; draft per [`HTML-REPORT.md`](../skills/engineering/security-plan/HTML-REPORT.md). Open the file; tell the user the path.
4. **Follow-ups** — targeted Q&A on open posture decisions only; rewrite the same HTML after each material answer.
5. When stages are ready — `/ss-to-issues` (fold into existing epics when possible); write keys into the HTML.
6. On lock: offer ADRs; mirror pointer into `.harness/state.md` when present.
7. **Handoff:** `/ss-plan` for a hardening slice — **every PR still runs** [`/ss-security-audit`](./ss-security-audit.md) after review.

**Not** a full grill. **Not** Phase A/B of the audit. Inventory themes: [`harness-security-audit.md`](../harness/harness-security-audit.md).

**Skip** when posture is already agreed and only a normal story ships (still run the audit gate).

Available as `/ss-security-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
