# ss-security-audit

**Story — PR security gate.** Follow [`harness/ss-flow.md`](../harness/ss-flow.md). Usually run inside [`/ss-finish`](./ss-finish.md); use this leaf to re-run the gate alone.

Run **after** [`/ss-review`](./ss-review.md) PASS (and any review fixes), **before** [`/ss-submit-pr`](./ss-submit-pr.md).

**Two phases (do not blur):**

1. **Phase A (scripts)** — deterministic inventory + pattern gates via `security-audit.cjs` (court record).
2. **Phase B (agent)** — judgment only on evidence; dismiss-by-default; never invent scanner findings or override Phase A FAIL.

**Lean every-PR gate only.** Whole-plugin Semgrep / Wordfence health is **`/ss-security-plan`** + [`harness-security-assess.md`](../harness/harness-security-assess.md) — do not run those here.

If the project uses PostgreSQL or Supabase, load the linked stack skills before Phase B:

- `postgresql-security-best-practices` for database roles, SQL safety, and migration review
- `supabase-security` for RLS, auth boundaries, storage policies, and service-role safety

In **Agent** mode, read and follow [`harness-security-audit.md`](../harness/harness-security-audit.md) end-to-end.

**Pre-step / Phase A (when vendored):**

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --write-state
```

Optional dependency advisories: add `--deps`. After Phase B verdict:

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --set-phase-b PASS
```

Overall **## Security Evidence** `Status: PASS` is required before `/ss-submit-pr`.

**Related (optional):** durable posture planning → [`/ss-security-plan`](./ss-security-plan.md) (`.harness/security-posture.html`). This command remains the **per-PR gate**; the posture HTML does not PASS a PR.

Available as `/ss-security-audit` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
