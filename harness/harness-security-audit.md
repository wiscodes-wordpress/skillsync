---
name: harness-security-audit
description: Two-phase security gate — Phase A scripts (facts), Phase B agent judgment (no invented findings)
---

# Security audit harness

**When:** After `/ss-review` PASS (and any review fixes), **before** `/ss-submit-pr`.

**Roles**

| Phase | Owner | May FAIL the gate? |
|-------|--------|-------------------|
| **A — Machine gates** | `tools/security-audit.cjs` | Yes — court record |
| **B — Agent review** | This harness | Yes — but only with file:line evidence |

AI **runs** Phase A and **judges** Phase B. AI must **not** dismiss Phase A failures or invent scanner findings.

## Checklist (audit)

Use this inventory-first list (also mirrored in Phase A where automatable):

### Surface inventory
- [ ] REST routes, `wp_ajax_*` / `nopriv`, `admin_post_*`, cron, uploads, remote fetch
- [ ] Options / meta that store secrets or PII

### Authz + CSRF
- [ ] Capability check on privileged actions
- [ ] Nonce / CSRF on state-changing actions
- [ ] REST `permission_callback` real (not accidental `__return_true`)
- [ ] Object-level authz where IDs are user-controlled

### Input / output / SQL
- [ ] Sanitize + validate inputs; escape outputs in context
- [ ] `$wpdb->prepare` / safe builders for dynamic SQL
- [ ] Uploads allowlisted + capability-gated

### Secrets / deps / dangerous APIs
- [ ] No hardcoded secrets
- [ ] No `eval` / `assert` / `extract($_…)`
- [ ] Dependency advisories reviewed when `--deps` used

### Frontend (when TS/JS present)
- [ ] `fallow security` candidates addressed (install `fallow` for CI signal)
- [ ] XSS sinks, unsafe URL/open redirects, secrets in client bundles

**Whole-plugin health** (not every PR): use [`harness-security-assess.md`](./harness-security-assess.md) via `/ss-security-plan` — Semgrep + deps + Wordfence.

## Procedure (Agent)

### 1. Phase A — run scripts

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --write-state
```

Optional:

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --write-state --deps
node .cursor/vendor/skillsync/tools/security-audit.cjs . --write-state --base main
```

- If exit **≠ 0**: report **Machine gates** failures from `.harness/state.md` → **## Security Evidence**. Fix code, re-run Phase A. **Do not** set Phase B PASS.
- If exit **0**: Phase A is PASS; Phase B is PENDING. Continue.

Load optional skills when linked: `wordpress-security-validation`, `postgresql-security-best-practices`, `supabase-security`, fallow agent skill if present.

### 2. Phase B — agent review (dismiss-by-default)

Read **## Security Evidence** inventory and warnings.

Then:

1. For each **warning** and each high-risk entrypoint: confirm or dismiss with **file:line** evidence.
2. Hunt script-blind gaps: IDOR, wrong capability, public-by-mistake routes, FE sinks fallow did not run (if fallow missing, note as follow-up — do not invent CVEs).
3. Every Phase B finding must cite **entrypoint + missing control** or a **machine finding id**. No speculative CVEs.

**Verdict values**

- `PASS` — no confirmed issues; warnings dismissed with evidence
- `FAIL` — confirmed issue(s) that must be fixed before PR
- `NEEDS_HUMAN` — incomplete evidence / judgment call

Record Phase B:

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --set-phase-b PASS
# or FAIL | NEEDS_HUMAN
```

Overall **Status: PASS** requires Phase A PASS **and** Phase B PASS.

### 3. Chat output (required)

```markdown
## Security Audit: <FAIL|IN_PROGRESS|PASS|NEEDS_HUMAN>

### Machine gates (Phase A)
- Status: PASS|FAIL
- Entrypoints: N
- Errors / warnings: (quote from Security Evidence or say none)

### Agent review (Phase B)
- Status: PASS|FAIL|NEEDS_HUMAN|PENDING
- Confirmed: (bullets with file:line) | none
- Dismissed warnings: (bullets with reason) | none
- Needs human: (bullets) | none

### Next
- FAIL → fix → re-run `/ss-security-audit`
- PASS → `/ss-feature-evidence` (UI) → `/ss-submit-pr` (review handoff + human Accept runs **before** this audit when `reviewHandoffHumanEvidence` is `required`)
```

## Submit PR gate

`/ss-submit-pr` must run:

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --check-state
```

Refuse to open a PR if Security Evidence is not overall PASS.

## References

- [WordPress Security APIs](https://developer.wordpress.org/apis/security/)
- [Plugin Handbook — Security](https://developer.wordpress.org/plugins/security/)
- [Plugin Review checklist](https://make.wordpress.org/plugins/handbook/performing-reviews/review-checklist/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [fallow](https://github.com/fallow-rs/fallow) + [security agent verification](https://github.com/fallow-rs/fallow/blob/main/docs/security-agent-verification.md)
