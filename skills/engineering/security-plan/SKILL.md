---
name: security-plan
description: >
  Security posture planning — living HTML is the posture source of truth (surfaces,
  trust decisions, hardening stages with optional Jira keys). On /ss-security-plan,
  refresh keyed issue status one-way from Jira; follow-ups rewrite the same file.
  Use for durable how-we-intend-to-be-secure. Does not replace /ss-security-audit
  (per-PR gate) or /ss-plan TDD grilling.
---

# Security plan

Set **security posture** as a visual **living HTML** briefing. Invoke via **`/ss-security-plan`**.

This is **posture planning** (durable intent), not a relentless grill and not the ship gate.

## Source of truth

The living HTML (`.harness/security-posture.html`) is **the** source of truth for security posture: surface inventory, open/resolved trust decisions, hardening stages, optional epic/story keys, and **status as shown** after refresh.

**Presentation:** follow [HTML-REPORT.md](HTML-REPORT.md) — same craft as [`arch-plan`](../arch-plan/SKILL.md) (sticky nav, Phase, At a glance, Current|Target, decisions, stages). Browser HTML is the deliverable — not a chat TODO dump or Cursor Canvas.

| Layer | Role |
|-------|------|
| **HTML** | Posture SoT — read and decide from here |
| **Jira epics / stories** | Workflow; keys join stages; status feeds into HTML on command run |
| **ADRs** | Load-bearing *why* (e.g. public REST policy) |
| **`/ss-security-audit`** | Per-PR **gate** — Phase A scripts + Phase B judgment; consumes posture, does not replace it |

**One-way only:** Jira → HTML on refresh. Never push workflow status from this skill back to Jira.

Follow-up answers **update that same HTML** before the next question.

## Boundaries

| Use this | Use something else |
|----------|-------------------|
| Durable posture, trust boundaries, hardening roadmap | Per-PR PASS/FAIL → [`/ss-security-audit`](../../../commands/ss-security-audit.md) |
| Targeted Q&A on open security decisions | Full TDD grill → [`/ss-plan`](../../../commands/ss-plan.md) |
| Living HTML stages + **CVE/dep scan snapshot** | Penetration methodology / exploit PoCs → `wordpress-penetration-testing` (on demand only) |
| How we intend to be secure | Structure/seams → [`arch-plan`](../arch-plan/SKILL.md) |

**Signal preference:** posture HTML uses a **machine CVE / dependency advisory snapshot** (npm/composer audit or `security-audit.cjs --deps`). It does **not** invent a pen-test score, readiness %, or subjective security grade.

**Non-goals:** no production code, no inventing CVEs, no pen-test scores, no replacing Phase A machine gates, no bidirectional Jira sync, no merging this into the architecture HTML as a full audit section.

## Order in the delivery loop

```text
(optional roadmap / arch-plan) → /ss-security-plan? → … → /ss-plan → … → /ss-security-audit → /ss-submit-pr
```

Optional — same altitude as arch-plan. Run when posture is unclear or hardening work needs staging. **Every PR still runs `/ss-security-audit`.**

## Interaction model

1. **Explore + draft** — inventory surfaces from the repo (and harness checklist themes). Synthesize first; do **not** open with a long interview.
2. **Write living HTML** — path below; open in browser; tell the user the absolute path.
3. **Targeted Q&A** — only on **open** trust decisions (one at a time, with a recommended answer).
4. **After every material answer** — rewrite the **same** HTML.
5. **Lock** — ADRs when load-bearing; stages → `/ss-to-issues` or `/ss-plan`; remind that ship gate remains `/ss-security-audit`.

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

Scaffold: [HTML-REPORT.md](HTML-REPORT.md). Stages: [STAGES.md](STAGES.md). Checklist themes: [`harness-security-audit.md`](../../../harness/harness-security-audit.md) (inventory only — do not run the gate here unless the user asks).

## Repo inputs

1. **`AGENTS.md`**, **`docs/agents/issue-tracker.md`**, **`docs/agents/domain.md`**
2. **`CONTEXT.md`**, **`docs/adr/`** (authz / data / public API decisions)
3. Entrypoints: REST, ajax, admin_post, cron, uploads, remote fetch, FE bundles
4. Existing **`.harness/security-posture.html`** and optionally **`.harness/architecture-plan.html`** (trust seams)
5. Stack skills **on demand** only (`wordpress-security-validation`, fallow) — not every run

## Workflow

### 1. Frame posture

- **Primary job** of this posture (one sentence)
- **Trust boundary** summary — who may do what
- **Non-goals** — accepted risk or out-of-scope (explicit)
- **Constraints** — compliance, public vs private APIs, WP roles

### 2. Draft HTML

Per [HTML-REPORT.md](HTML-REPORT.md): header + nav, Phase (when keyed), At a glance, surfaces, **CVE/dep scan snapshot** (`#cves`), Current|Target risk shape, decisions, hardening stages, non-goals. Optional finish-line when stories exist.

When drafting or refreshing: run or cite the last dep scan if available (`node …/security-audit.cjs . --deps` or npm/composer audit). Record counts and date — never a fake pen-test score.

### 3. Decision loop

Only open decisions. Material answers rewrite HTML. Do not grill every checklist item.

### 4. Publish keys (optional)

Fold into existing security/hardening epics when possible; write `data-epic` / `data-story`. Next `/ss-security-plan` refreshes status.

### 5. Handoff

| Next | When |
|------|------|
| `/ss-to-issues` | Publish hardening stages |
| `/ss-plan` | Behavior + TDD for one hardening slice |
| `/ss-security-audit` | **Every** PR after review — required gate |
| ADR | Public-by-design routes, secret storage, capability model |

Mirror into `.harness/state.md` when present:

```markdown
## Security Posture

- **HTML:** `.harness/security-posture.html`  ← posture SoT
- **Status:** draft | agreed
- **Last Jira refresh:** <date or —>
- **Ship gate:** `/ss-security-audit` (unchanged)
```
