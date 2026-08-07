# ss-security-plan

**Initiative — trust posture (not PR gate).** Optional lens; resume/edit under `/ss-roadmap` or when trust model is unclear. See [`ss-flow.md`](../harness/ss-flow.md).

Set **how we intend to be secure** as living **Markdown** (`.harness/security-posture.md`) with derived HTML for humans. Does **not** implement code, does **not** replace the per-PR Story gate (`/ss-security-audit`).

## Two tracks

| Track | When | Tooling |
|-------|------|---------|
| **Posture / decisions** | Trust model unclear; hardening roadmap | Living MD + Q&A ([`security-plan`](../skills/engineering/security-plan/SKILL.md)) |
| **Whole-plugin assess** | Release, quarterly, major feature, or “is the plugin healthy?” | [`harness-security-assess.md`](../harness/harness-security-assess.md) + `security-assess.cjs` |

**Every PR** still uses [`ss-security-audit`](./ss-security-audit.md) only — lean ship gate. Do **not** run Wordfence/full Semgrep on every PR.

## Agent procedure

In **Agent** mode, follow [`security-plan`](../skills/engineering/security-plan/SKILL.md):

1. **Locate** the living Markdown via `docs/agents/domain.md`, then `.harness/initiatives/<slug>/security-posture.md`, then legacy `.harness/security-posture.md` — see `tools/lib/plan-paths.cjs`. `## gate` lives in that same file. **Do not hand-edit** derived `.html`.
2. **If missing:** `node .cursor/vendor/skillsync/tools/init-plan-html.cjs . --kind security [--slug <slug>] --product "…" --task "…"`.
3. **If stages/finish-line have keys** — refresh **Jira → Markdown** only, then re-render. Never push status back to Jira.
4. **If the user asks for assess / deep / whole-plugin health** (or no recent `## assess` and they want health):
   - Read [`harness-security-assess.md`](../harness/harness-security-assess.md).
   - Run:
     ```bash
     node .cursor/vendor/skillsync/tools/security-assess.cjs . --write-state
     ```
   - Fold `.harness/security-assess.json` / `## Security Assess` into Markdown **`## assess`** (and refresh `## cves` from deps probe), then re-render.
5. If no filled content — explore entrypoints / trust surfaces; draft Markdown per [`HTML-REPORT.md`](../skills/engineering/security-plan/HTML-REPORT.md).
6. **Render:**

```bash
node .cursor/vendor/skillsync/tools/render-plan-html.cjs . --kind security [--slug <slug>] --validate
```

Open the `.html`; tell the user the path.
7. **Follow-ups** — targeted Q&A on open posture decisions only; rewrite the same `.md` after each material answer, then re-render.
8. When stages are ready — `/ss-to-issues` (fold into existing epics when possible); write keys into the Markdown, then re-render.
9. **Validate:** `validate-plan-html.cjs . --kind security` (cross-checks `#assess` / `#status` against `security-assess.json` when present).
10. On lock: offer ADRs; mirror pointer into `.harness/state.md` when present.
11. **Handoff:** `/ss-plan` for a hardening slice — **every PR still runs** [`/ss-security-audit`](./ss-security-audit.md) after review.

**Not** a full grill. **Not** Phase A/B of the audit. **Not** a pen-test score — the plan includes **CVE/dep** and optional **assess** machine snapshots instead. Inventory themes: [`harness-security-audit.md`](../harness/harness-security-audit.md).

**Skip** when posture is already agreed and only a normal story ships (still run the audit gate). Run **assess** when the user wants whole-plugin health.

Available as `/ss-security-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
