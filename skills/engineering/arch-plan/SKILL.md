---
name: arch-plan
description: >
  Project/plugin architecture direction — living HTML is the plan source of truth
  (current vs target, decisions, stages with Jira epic keys). On /ss-arch-plan, refresh
  epic status into the HTML one-way from Jira when keys exist; follow-ups rewrite the
  same file. Use for structural direction before delivery. Does not implement code or
  replace /ss-plan TDD grilling.
---

# Architecture plan

Set **project or plugin architecture direction** as a visual **living HTML** briefing. Invoke via **`/ss-arch-plan`**.

## Source of truth

The living HTML (`.harness/architecture-plan.html`) is **the** source of truth for this architecture plan: target shape, diagrams, open/resolved decisions, staged rollout, epic keys, and **status as shown** after refresh.

| Layer | Role |
|-------|------|
| **HTML** | Plan SoT — read and decide from here |
| **Jira epics** | Workflow system; **keys join** stages to tickets; status **feeds into** HTML on command run |
| **ADRs / `CONTEXT.md`** | Narrow permanence for load-bearing *why* and glossary names |

**One-way only:** Jira → HTML on refresh. Never push workflow status from this skill back to Jira. Create/link epic keys when publishing stages; do not transition issues here.

If HTML and Jira disagree after a refresh, re-run refresh or fix the key mapping — do not invent a second plan in chat.

Follow-up answers **update that same HTML** before the next question. Do not spawn timestamped copies per answer.

## Boundaries

| Use this | Use something else |
|----------|-------------------|
| Plugin/project target shape, seams, phased migration | One story behaviors → [`ss-plan`](../../../commands/ss-plan.md) |
| Living plan SoT (HTML) + epic-keyed stages | Multi-epic product scope → [`major-feature-roadmap`](../major-feature-roadmap/SKILL.md) |
| Open decisions + stages toward a target | Deepening friction only → [`improve-codebase-architecture`](../improve-codebase-architecture/SKILL.md) (reuse inside this flow when exploring existing code) |
| Structural direction before delivery | UI flows → [`ui-ux-planner`](../ui-ux-planner/SKILL.md) |

**Non-goals:** no production code, no RED tests, no React/textbook encyclopedia, no bidirectional Jira sync, no second competing plan doc. Do not load `testing-expert` or stack novels by default.

## Order in the delivery loop

```text
(optional product roadmap) → /ss-arch-plan? → /ss-ui-ux-plan? → /ss-plan → …
```

Optional — same altitude as product roadmap/UI plan, not every story. Skip when structure is already agreed and only behavior changes.

## Vocabulary

Use [`improve-codebase-architecture/LANGUAGE.md`](../improve-codebase-architecture/LANGUAGE.md) terms exactly: **module**, **interface**, **implementation**, **depth**, **seam**, **adapter**, **leverage**, **locality**. Prefer `CONTEXT.md` names for domain concepts.

## On every `/ss-arch-plan` run

1. **Locate** the living HTML (path below).
2. **If it exists and any stage has an epic key** → **Refresh status** (see below), rewrite HTML, reopen/tell user to refresh the browser.
3. **Then** continue: draft (if missing), decision loop, lock/publish, or handoff — as the user needs.
4. If HTML exists but **no** epic keys yet → skip Jira; resume planning.
5. If no HTML → explore + draft (no Jira required).

### Refresh status (Jira → HTML only)

When stages list epic keys (e.g. `PROJ-123`):

1. Read consumer **`docs/agents/issue-tracker.md`** (project key, epic type) when present.
2. With **Atlassian MCP**, read each tool schema before calling. Fetch each keyed epic (`jira_get_issue` or equivalent).
3. For each stage: update **Jira status** (and epic summary/title if useful) in the HTML. Map coarse plan badges from Jira when helpful: e.g. Done → `done`, In Progress → `ready`/`in-progress`, else `pending` — prefer showing the **raw Jira status name** plus a small badge.
4. Set header **Last refreshed** to now.
5. **Do not** transition, comment, or edit Jira fields for status.
6. If MCP is unavailable: note keys that could not refresh; leave prior badges; continue planning.

Compare at **epic** level by default. Stories may sit under epics for implementation; only key a story on a stage when that phase is intentionally one story.

**Prose in chat:** full sentences and scannable lists (caveman planning carve-out, same as `/ss-plan`). Resume caveman after planning if the session uses it.

## Living HTML path

**Stable path (prefer):** `.harness/architecture-plan.html`  
Create `.harness/` if needed. One file — rewrite in place.

**Fallback:** `$TMPDIR` / `/tmp` / `%TEMP%` → `architecture-plan-<repo-slug>.html` (stable name, not timestamped).

On user **"lock this"** / approve: optionally copy to `docs/architecture/architecture-plan.html` (or path from consumer `docs/agents/domain.md`). HTML remains plan SoT; ADRs still record irreversible *why*.

Open after write: `open <path>` (macOS), `xdg-open` (Linux), `start` (Windows).

HTML scaffold: [HTML-REPORT.md](HTML-REPORT.md). Stages + epic keys: [STAGES.md](STAGES.md).

## Repo inputs

Read when present:

1. Consumer **`AGENTS.md`**, **`docs/agents/domain.md`**, **`docs/agents/issue-tracker.md`**
2. **`CONTEXT.md`** / **`CONTEXT-MAP.md`**, **`docs/adr/`**
3. Entrypoints and package layout (plugin bootstrap, `src/`, public APIs)
4. Parent initiative or capability brief from chat
5. Existing **`.harness/architecture-plan.html`** (always check first)

Stack skills **only when** the consumer is clearly that stack and the question needs them.

When the draft must confront real friction in existing modules, use the explore mindset from [`improve-codebase-architecture`](../improve-codebase-architecture/SKILL.md) (deletion test, shallow vs deep) and fold findings into **Current shape** / **Open decisions**.

## Workflow

### 1. Frame direction

- **Primary job** of the architecture (one sentence)
- **Scope** — whole plugin/project vs one area
- **Non-goals**
- **Constraints** — platform, public API stability, existing ADRs

### 2. Draft or update the living HTML

Sections required (see [HTML-REPORT.md](HTML-REPORT.md)):

1. **Current shape** — diagram-first
2. **Target shape** — same visual language
3. **Open decisions** — unanswered stay visible
4. **Phased stages** — [STAGES.md](STAGES.md); each row may hold an **Epic key**
5. **Non-goals / ADR conflicts**

Sparse prose. Diagrams carry understanding.

### 3. Decision loop

Until the user locks or pauses:

1. Point at the highest-impact **open** decision.
2. Ask one focused question with a recommended option.
3. On answer: rewrite HTML — resolve decision, update target/stages/diagrams.
4. Repeat.

Material = changes target shape, a seam, a stage, an epic key, or a named decision.

### 4. Publish epic keys (optional)

When stages are stable enough to track:

1. Prefer [`to-issues`](../to-issues/SKILL.md) / **`/ss-to-issues`** — one **epic per stage** (or one parent epic + child epics per consumer tracker docs).
2. Write returned keys into the HTML stage rows (`data-epic` / visible key).
3. Do not invent status; next `/ss-arch-plan` refresh will fill it.

### 5. Promote and hand off

When direction is **agreed**:

| Artifact | When |
|----------|------|
| `CONTEXT.md` terms | New module/concept names |
| ADR | Load-bearing *why* (optional one-liner: `Arch plan: .harness/architecture-plan.html`) |
| `.harness/state.md` | Pointer + migration stages with epic keys |
| `/ss-to-issues` | Publish stages as epics if keys missing |
| `/ss-plan` | Per stage / first vertical slice — behavior/TDD |

Mirror into state when `.harness/state.md` exists:

```markdown
## Architecture Plan

- **HTML:** `.harness/architecture-plan.html`  ← plan SoT
- **Status:** draft | agreed
- **Locked:** <date or —>
- **Last Jira refresh:** <date or —>
```

```markdown
## Migration Stages

| ID | Title | Acceptance | Epic | Notes |
|----|-------|------------|------|-------|
| S0 | … | … | PROJ-123 | … |
```

**Handoff:** `/ss-to-issues` (if no keys) or `/ss-plan` for the first stage — not `/ss-implement` until a behavior plan exists.
