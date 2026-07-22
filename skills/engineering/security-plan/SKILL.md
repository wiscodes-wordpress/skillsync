---
name: security-plan
description: >
  Security posture planning — living HTML is the posture source of truth (surfaces,
  trust decisions, hardening stages with optional Jira keys). On /ss-security-plan,
  refresh keyed issue status one-way from Jira; follow-ups rewrite the same file.
  Supports whole-plugin security assess (Semgrep + deps + Wordfence) into HTML #assess.
  Use for durable how-we-intend-to-be-secure and plugin health. Does not replace
  /ss-security-audit (per-PR gate) or /ss-plan TDD grilling.
---

# Security plan

Set **security posture** as a visual **living HTML** briefing. Invoke via **`/ss-security-plan`**.

This is **posture planning** (durable intent) plus optional **whole-plugin assess** — not a relentless grill and not the ship gate.

**Prose:** apply [`anti-slop`](../../productivity/anti-slop/SKILL.md) to HTML copy and chat — expand abbreviations on first use; keep trust decisions concrete.

## Two stages

| Stage | Question | Command / tool |
|-------|----------|----------------|
| **1 — Every PR** | May this change ship? | [`/ss-security-audit`](../../../commands/ss-security-audit.md) — lean |
| **2 — Whole plugin** | Is the product healthy? | This skill + [`harness-security-assess.md`](../../../harness/harness-security-assess.md) + `security-assess.cjs` |

Stage 2 probes: surface census, **Semgrep**, npm/composer **deps**, **Wordfence CLI** `vuln-scan` (required for complete WordPress health when `wordpressRoot` is set). Do **not** run Stage 2 on every PR.

## Source of truth

The living HTML (`.harness/security-posture.html`) is **the** source of truth for security posture: surface inventory, open/resolved trust decisions, hardening stages, optional epic/story keys, machine **assess** / CVE snapshots, and **status as shown** after refresh.

**Presentation:** follow [HTML-REPORT.md](HTML-REPORT.md) — same craft as [`arch-plan`](../arch-plan/SKILL.md) (sticky nav, Phase, At a glance, Current|Target, decisions, stages). Browser HTML is the deliverable — not a chat TODO dump or Cursor Canvas.

| Layer | Role |
|-------|------|
| **HTML** | Posture source of truth — read and decide from here |
| **Jira epics / stories** | Workflow; keys join stages; status feeds into HTML on command run |
| **Architecture decision records (ADRs)** | Load-bearing *why* (e.g. public REST policy) |
| **`/ss-security-audit`** | Per-PR **gate** — Phase A scripts + Phase B judgment; consumes posture, does not replace it |
| **`security-assess.cjs`** | Whole-plugin facts → `#assess` (completeness + findings); not a PR gate |

**One-way only:** Jira → HTML on refresh. Never push workflow status from this skill back to Jira.

Follow-up answers **update that same HTML** before the next question.

## Boundaries

| Use this | Use something else |
|----------|-------------------|
| Durable posture, trust boundaries, hardening roadmap | Per-PR PASS/FAIL → [`/ss-security-audit`](../../../commands/ss-security-audit.md) |
| Whole-plugin health (Semgrep / Wordfence / deps) | Same — Stage 2 assess into `#assess` |
| Targeted Q&A on open security decisions | Full TDD grill → [`/ss-plan`](../../../commands/ss-plan.md) |
| Living HTML stages + **CVE/dep** + **assess** snapshots | Penetration methodology / exploit PoCs → `wordpress-penetration-testing` (on demand only) |
| How we intend to be secure | Structure/seams → [`arch-plan`](../arch-plan/SKILL.md) |

**Signal preference:** posture HTML uses **machine** snapshots (assess JSON, npm/composer audit). It does **not** invent a pen-test score, readiness %, or subjective security grade. **Incomplete** assess (missing Semgrep or blocked Wordfence) is honest — not a fake PASS.

**Non-goals:** no production code, no inventing CVEs, no pen-test scores, no replacing Phase A machine gates, no bidirectional Jira sync, no merging this into the architecture HTML as a full audit section, no Wordfence/full Semgrep on every PR.

## Order in the delivery loop

```text
(optional roadmap / arch-plan) → /ss-security-plan? (+ assess when health needed) → … → /ss-plan → … → /ss-security-audit → /ss-submit-pr
```

Optional — same altitude as arch-plan. Run when posture is unclear, hardening needs staging, or **whole-plugin health** is requested. **Every PR still runs `/ss-security-audit`.**

## Interaction model

1. **Explore + draft** — inventory surfaces from the repo (and harness checklist themes). Synthesize first; do **not** open with a long interview.
2. **Assess when health is in scope** — run `security-assess.cjs` per harness; fold into `#assess`.
3. **Write living HTML** — path below; open in browser; tell the user the absolute path.
4. **Targeted Q&A** — only on **open** trust decisions (one at a time, with a recommended answer).
5. **After every material answer** — rewrite the **same** HTML.
6. **Lock** — ADRs when load-bearing; stages → `/ss-to-issues` or `/ss-plan`; remind that ship gate remains `/ss-security-audit`.

**Prose:** full sentences (caveman planning carve-out). Resume caveman after if the session uses it.

## On every `/ss-security-plan` run

1. **Locate** `.harness/security-posture.html`.
2. **If stages/finish-line have keys** → refresh **Jira → HTML** only (same rules as arch-plan); rewrite; reopen.
3. Then continue draft / decision loop / publish / handoff.
4. No keys → skip Jira. No file → explore + draft.

## Living HTML path

**Stable path:** `.harness/security-posture.html`  
**Fallback:** `$TMPDIR` / `/tmp` → `security-posture-<repo-slug>.html`

Optionally lock-copy to `docs/security/security-posture.html` when the user asks.

Open: `open` / `xdg-open` / `start`.

Scaffold: [HTML-REPORT.md](HTML-REPORT.md). Stages: [STAGES.md](STAGES.md). Checklist themes: [`harness-security-audit.md`](../../../harness/harness-security-audit.md) (inventory only — do not run the PR gate here unless the user asks). Whole-plugin probes: [`harness-security-assess.md`](../../../harness/harness-security-assess.md).

## Repo inputs

1. **`AGENTS.md`**, **`docs/agents/issue-tracker.md`**, **`docs/agents/domain.md`**
2. **`CONTEXT.md`**, **`docs/adr/`** (authz / data / public API decisions)
3. Entrypoints: REST, ajax, admin_post, cron, uploads, remote fetch, FE bundles
4. Existing **`.harness/security-posture.html`** and optionally **`.harness/architecture-plan.html`** (trust seams)
5. **`skillsync.config.json` → `securityAssess`** (`wordpressRoot`, `wordfence`)
6. Last **`.harness/security-assess.json`** / `## Security Assess` when present
7. Stack skills **on demand** only (`wordpress-security-validation`, fallow) — not every run

## Workflow

### 1. Frame posture

- **Primary job** of this posture (one sentence)
- **Trust boundary** summary — who may do what
- **Non-goals** — accepted risk or out-of-scope (explicit)
- **Constraints** — compliance, public vs private APIs, WP roles

### 2. Whole-plugin assess (when health is in scope)

When the user asks for assess / deep / whole-plugin health, or `#assess` is missing/stale and they want health:

```bash
node .cursor/vendor/skillsync/tools/security-assess.cjs . --write-state
```

Follow [`harness-security-assess.md`](../../../harness/harness-security-assess.md). Fold facts into HTML **`#assess`** (and `#cves` from the deps probe). Triage ERROR findings into stages — do not invent CVEs.

### 3. Draft HTML

Per [HTML-REPORT.md](HTML-REPORT.md): header + nav, Phase (when keyed), At a glance, surfaces, **assess snapshot** (`#assess`), **CVE/dep scan snapshot** (`#cves`), Current|Target risk shape, decisions, hardening stages, non-goals. Optional finish-line when stories exist.

When drafting or refreshing: prefer last `security-assess.cjs` run; else cite `security-audit.cjs . --deps` / npm/composer audit. Record counts and date — never a fake pen-test score.

### 4. Decision loop

Only open decisions. Material answers rewrite HTML. Do not grill every checklist item.

### 5. Publish keys (optional)

Fold into existing security/hardening epics when possible; write `data-epic` / `data-story`. Next `/ss-security-plan` refreshes status.

### 6. Handoff

| Next | When |
|------|------|
| `/ss-to-issues` | Publish hardening stages |
| `/ss-plan` | Behavior + TDD for one hardening slice |
| Re-run assess | After hardening or before release |
| `/ss-security-audit` | **Every** PR after review — required gate |
| Architecture decision record (ADR) | Public-by-design routes, secret storage, capability model |

Mirror into `.harness/state.md` when present:

```markdown
## Security Posture

- **HTML:** `.harness/security-posture.html`  ← posture source of truth
- **Status:** draft | agreed
- **Last assess:** <date or —> (`.harness/security-assess.json`)
- **Last Jira refresh:** <date or —>
- **Ship gate:** `/ss-security-audit` (unchanged)
```
