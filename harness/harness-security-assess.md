---
name: harness-security-assess
description: Whole-plugin security health (Semgrep + deps + Wordfence) — not the per-PR ship gate
---

# Security assess harness

**When:** Whole-plugin / release / quarterly / “is this plugin healthy?” — via **`/ss-security-plan`** deep assess. **Not** every PR.

**Not** [`harness-security-audit.md`](./harness-security-audit.md) — that remains the ship gate (`/ss-security-audit`).

## Two stages (do not merge)

| Stage | Command | Tools |
|-------|---------|--------|
| **1 — Every PR** | `/ss-security-audit` | `security-audit.cjs` lean Phase A + agent Phase B |
| **2 — Whole plugin** | `/ss-security-plan` (assess) | `security-assess.cjs` → living HTML `#assess` |

## Probes (Stage 2)

| Probe | Role | Completeness |
|-------|------|----------------|
| **surfaces** | PHP entrypoint census (reuse audit inventory) | Always runs |
| **semgrep** | Source static analysis (`tools/semgrep-rules/wordpress-plugin` + optional `p/php`) | Must **ran** for complete |
| **deps** | npm / composer advisories | Must **ran** for complete |
| **wordfence** | `wordfence vuln-scan` on a WordPress install | **required** by default for WP health — must **ran** for complete |

Wordfence needs a real WordPress root (core + installed packages), not only the plugin git tree.

## Config (`skillsync.config.json`)

```json
"securityAssess": {
  "wordpressRoot": "../wordpress",
  "wordfence": "required",
  "semgrepExtraConfigs": []
}
```

- **`wordpressRoot`** — absolute or consumer-relative path to a WP install. Without it, Wordfence is **blocked** and health stays **incomplete** (when `wordfence` is `required`).
- **`wordfence`:** `required` (default) | `off` (non-WP or explicit skip).
- Install CLI: `pip install wordfence` (license may be required for signatures). Docs: https://github.com/wordfence/wordfence-cli
- Install Semgrep: `pipx install semgrep` or `brew install semgrep`

## Procedure (Agent)

### 1. Run machine assess

```bash
node .cursor/vendor/skillsync/tools/security-assess.cjs . --write-state
```

Optional:

```bash
node .cursor/vendor/skillsync/tools/security-assess.cjs . --write-state --wordpress-root /path/to/wp
node .cursor/vendor/skillsync/tools/security-assess.cjs . --write-state --strict
```

Artifacts:

- `.harness/security-assess.json` — full report
- `.harness/state.md` → **`## Security Assess`** when `--write-state`

### 2. Fold into posture HTML

Update **`.harness/security-posture.html`** per [`security-plan/HTML-REPORT.md`](../skills/engineering/security-plan/HTML-REPORT.md) section **`#assess`**:

- Completeness + date + command
- Probe table (status + one-line detail)
- ERROR / WARNING counts (facts only — no pen-test score)
- Open trust decisions / hardening stages for confirmed issues
- Bottom **`#status`**: Red / Amber / Green chip + risk register (Open | Resolved | Accepted) — see HTML-REPORT

### 3. Triage (judgment)

- Confirm or dismiss ERROR findings with **file:line** (or Wordfence package/version).
- Turn confirmed gaps into hardening stages / `/ss-plan` stories.
- **Incomplete** ≠ “secure” — configure `wordpressRoot` + install Semgrep/Wordfence, then re-run.

### 4. Chat output (required)

```markdown
## Security Assess: <complete|incomplete>

### Probes
- surfaces: …
- semgrep: …
- deps: …
- wordfence: …

### Findings
- ERROR: N (bullets or none)
- WARNING: N (top items or none)

### Status summary
- Traffic light: Red | Amber | Green (one sentence why)
- Risks: Open / Resolved / Accepted (short table)

### Completeness gaps
- (reasons) | none

### Next
- Update `.harness/security-posture.html` #assess + #status
- Confirmed issues → stages / `/ss-plan`
- PRs still use `/ss-security-audit` only
```

## Rules

- AI must **not** invent CVE IDs or pen-test scores.
- AI must **not** treat assess PASS/completeness as a PR ship gate.
- Missing Semgrep or blocked Wordfence → **incomplete**, not silent success.
- Stage 1 audit stays lean — do not run full Semgrep/Wordfence on every PR.
