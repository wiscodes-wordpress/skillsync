# ss-security-plan

**Phase: security posture** — optional; above story delivery. See [`ss-flow.md`](../harness/ss-flow.md).

Set **how we intend to be secure** as a living HTML briefing (`.harness/security-posture.html`). Does **not** implement code, does **not** replace the per-PR gate.

## Two tracks

| Track | When | Tooling |
|-------|------|---------|
| **Posture / decisions** | Trust model unclear; hardening roadmap | Living HTML + Q&A ([`security-plan`](../skills/engineering/security-plan/SKILL.md)) |
| **Whole-plugin assess** | Release, quarterly, major feature, or “is the plugin healthy?” | [`harness-security-assess.md`](../harness/harness-security-assess.md) + `security-assess.cjs` |

**Every PR** still uses [`ss-security-audit`](./ss-security-audit.md) only — lean ship gate. Do **not** run Wordfence/full Semgrep on every PR.

## Agent procedure

In **Agent** mode, follow [`security-plan`](../skills/engineering/security-plan/SKILL.md):

1. **Locate** `.harness/security-posture.html`.
2. **If stages/finish-line have keys** — refresh **Jira → HTML** only. Never push status back to Jira.
3. **If the user asks for assess / deep / whole-plugin health** (or no recent `#assess` and they want health):
   - Read [`harness-security-assess.md`](../harness/harness-security-assess.md).
   - Run:
     ```bash
     node .cursor/vendor/skillsync/tools/security-assess.cjs . --write-state
     ```
   - Fold `.harness/security-assess.json` / `## Security Assess` into HTML **`#assess`** (and refresh `#cves` from deps probe).
4. If no HTML — explore entrypoints / trust surfaces; draft per [`HTML-REPORT.md`](../skills/engineering/security-plan/HTML-REPORT.md). Open the file; tell the user the path.
5. **Follow-ups** — targeted Q&A on open posture decisions only; rewrite the same HTML after each material answer.
6. When stages are ready — `/ss-to-issues` (fold into existing epics when possible); write keys into the HTML.
7. On lock: offer ADRs; mirror pointer into `.harness/state.md` when present.
8. **Handoff:** `/ss-plan` for a hardening slice — **every PR still runs** [`/ss-security-audit`](./ss-security-audit.md) after review.

**Not** a full grill. **Not** Phase A/B of the audit. **Not** a pen-test score — the HTML includes **CVE/dep** and optional **assess** machine snapshots instead. Inventory themes: [`harness-security-audit.md`](../harness/harness-security-audit.md).

**Skip** when posture is already agreed and only a normal story ships (still run the audit gate). Run **assess** when the user wants whole-plugin health.

Available as `/ss-security-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
