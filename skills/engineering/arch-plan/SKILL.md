---
name: arch-plan
description: >
  Project/plugin architecture direction — Markdown is the plan source of truth;
  HTML is derived for humans via render-plan-html.cjs (current vs target, decisions,
  stages with Jira epic keys). On /ss-arch-plan, refresh epic status into the MD
  one-way from Jira when keys exist, then re-render HTML. Use for structural
  direction before delivery. Does not implement code or replace /ss-plan TDD grilling.
---

# Architecture plan

Set **project or plugin architecture direction** as a living **Markdown** plan with a derived **HTML** briefing for humans. Invoke via **`/ss-arch-plan`**.

**Prose:** apply [`anti-slop`](../../productivity/anti-slop/SKILL.md) to plan copy and chat — expand abbreviations on first use; no hype in “At a glance”.

## Source of truth

The living Markdown (pack `architecture-plan.md` or legacy `.harness/architecture-plan.md`) is **the** source of truth: target shape, diagrams (Mermaid fences), open/resolved decisions, phased rollout, epic/story keys, and **status as shown** after refresh.

**Derived view:** run `render-plan-html.cjs --kind arch` so humans open `architecture-plan.html` in a browser. **Do not hand-edit** the HTML. Follow [HTML-REPORT.md](HTML-REPORT.md) for section contract and craft; agents edit Markdown sections (`## phase`, `## current`, …).

| Layer | Role |
|-------|------|
| **Markdown** | Plan source of truth — read and decide from here |
| **HTML** | Human browser view — derived only |
| **Jira epics / stories** | Workflow; **keys join** stages to tickets; status **feeds into** MD on command run |
| **Architecture decision records (ADRs) / `CONTEXT.md`** | Narrow permanence for load-bearing *why* and glossary names |

**One-way only:** Jira → Markdown on refresh, then re-render HTML. Never push workflow status from this skill back to Jira. Create/link epic keys when publishing stages; do not transition issues here.

If MD and Jira disagree after a refresh, re-run refresh or fix the key mapping — do not invent a second plan in chat.

Follow-up answers **update that same Markdown** then re-render HTML before the next question. Do not spawn timestamped copies per answer.

## Boundaries

| Use this | Use something else |
|----------|-------------------|
| Plugin/project target shape, seams, phased migration | One story behaviors → [`ss-plan`](../../../commands/ss-plan.md) |
| Living plan source of truth (HTML) + epic-keyed stages | Multi-epic product scope → [`major-feature-roadmap`](../major-feature-roadmap/SKILL.md) |
| Open decisions + stages toward a target | Deepening friction only → [`improve-codebase-architecture`](../improve-codebase-architecture/SKILL.md) (reuse inside this flow when exploring existing code) |
| Structural direction before delivery | UI flows → [`ui-ux-planner`](../ui-ux-planner/SKILL.md) |
| Module shape / seams | Security posture → [`security-plan`](../security-plan/SKILL.md); per-PR gate → [`/ss-security-audit`](../../../commands/ss-security-audit.md) |

**Non-goals:** no production code, no RED tests, no React/textbook encyclopedia, no bidirectional Jira sync, no second competing plan doc. Do not load `testing-expert` or stack novels by default.

## Order in the delivery loop

```text
(optional product roadmap) → /ss-arch-plan? → /ss-ui-ux-plan? → /ss-plan → …
```

Optional — same altitude as product roadmap/UI plan, not every story. Skip when structure is already agreed and only behavior changes.

## Vocabulary

Use [`improve-codebase-architecture/LANGUAGE.md`](../improve-codebase-architecture/LANGUAGE.md) terms exactly: **module**, **interface**, **implementation**, **depth**, **seam**, **adapter**, **leverage**, **locality**. Prefer `CONTEXT.md` names for domain concepts.

## On every `/ss-arch-plan` run

1. **Locate** the living Markdown (resolve order below / `resolvePlanMdPath`).
2. **If it exists and any stage has an epic key** → **Refresh status** into the MD, re-render HTML, tell user to refresh the browser.
3. **Then** continue: draft (if missing), decision loop, lock/publish, or handoff — as the user needs.
4. If MD exists but **no** epic keys yet → skip Jira; resume planning.
5. If no MD → explore + draft via `init-plan-html.cjs` / rewrite MD (no Jira required).

### Refresh status (Jira → Markdown only)

When stages list epic or story keys (e.g. `PROJ-245`, `story: PROJ-271`):

1. Read consumer **`docs/agents/issue-tracker.md`** (project key, epic type) when present.
2. With **Atlassian MCP**, read each tool schema before calling. Fetch each keyed issue (`jira_get_issue` or equivalent) — prefer **story** when set, else epic.
3. For each stage: update **Jira status** (and title if useful) in the Markdown. Show the **raw Jira status name** (plus blocked-by notes when present).
4. Set frontmatter **`jira_refreshed`** to today. Refresh **phase** / **finish-line** when those sections exist.
5. Run `render-plan-html.cjs --kind arch`.
6. **Do not** transition, comment, or edit Jira fields for status.
7. If MCP is unavailable: note keys that could not refresh; leave prior badges; continue planning.

Compare at **epic** for portfolio/home; at **story** for stage progress when stories exist.

**Prose in chat:** full sentences and scannable lists (caveman planning carve-out, same as `/ss-plan`). Resume caveman after planning if the session uses it.

## Living plan paths

**Resolve order** (see `tools/lib/plan-paths.cjs`):

1. Path from consumer **`docs/agents/domain.md`** when it documents the arch SoT  
2. Initiative pack: **`.harness/initiatives/<slug>/architecture-plan.md`** (`--slug`, or the only pack under `initiatives/`)  
3. Legacy single-file: **`.harness/architecture-plan.md`**  
4. Config override: `skillsync.config.json` → `planMd.arch` (HTML: `planHtml.arch`)

Create the pack with `init-feature-pack.cjs` (or mkdir + rewrite). One MD file per train — **rewrite in place**; no timestamped copies. HTML is always derived.

On user **"lock this"** / approve: optionally copy rendered HTML to `docs/architecture/` (or path from consumer `docs/agents/domain.md`). **Markdown remains the plan source of truth**; architecture decision records (ADRs) still record irreversible *why*.

Open after render: `open <path.html>` (macOS), `xdg-open` (Linux), `start` (Windows).

Section contract: [HTML-REPORT.md](HTML-REPORT.md). Stages + epic keys: [STAGES.md](STAGES.md).

## Repo inputs

Read when present:

1. Consumer **`AGENTS.md`**, **`docs/agents/domain.md`**, **`docs/agents/issue-tracker.md`**
2. **`CONTEXT.md`** / **`CONTEXT-MAP.md`**, **`docs/adr/`**
3. Entrypoints and package layout (plugin bootstrap, `src/`, public APIs)
4. Parent initiative or capability brief from chat
5. Existing **architecture-plan.md** (pack or harness root — always check `domain.md` / pack first)

Stack skills **only when** the consumer is clearly that stack and the question needs them.

When the draft must confront real friction in existing modules, use the explore mindset from [`improve-codebase-architecture`](../improve-codebase-architecture/SKILL.md) (deletion test, shallow vs deep) and fold findings into **Current shape** / **Open decisions**.

## Workflow

### 1. Frame direction

- **Primary job** of the architecture (one sentence)
- **Scope** — whole plugin/project vs one area
- **Non-goals**
- **Constraints** — platform, public API stability, existing ADRs

### 2. Draft or update the living Markdown

Build sections per [HTML-REPORT.md](HTML-REPORT.md). **Required**:

1. Frontmatter (`product`, `status`, `updated`, `task`)
2. **`## phase`** (once any tracker join exists)
3. **`## finish-line`** once stories are keyed
4. **`## locks`** when locks exist
5. **`## current` / `## target`** — Mermaid fences
6. **`## decisions`** — open expanded; resolved compact (`### d0` articles)
7. **`## stages`** — [STAGES.md](STAGES.md); `epic:` / `story:` meta lines
8. **`## nongoals`**

Then: `render-plan-html.cjs --kind arch --validate`.

Sparse prose. Diagrams and cards carry understanding; finish-line carries **what to pick up next**.

### 3. Decision loop

Until the user locks or pauses:

1. Point at the highest-impact **open** decision.
2. Ask one focused question with a recommended option.
3. On answer: rewrite Markdown — resolve decision, update target/stages/diagrams, refresh locks / phase when needed; re-render HTML.
4. Repeat.

Material = changes target shape, a seam, a stage, a key, or a named decision.

### 4. Publish tracker keys (optional)

When stages are stable enough to track:

**Dual-track:** when a second epic owns a capability train (lean-core, primitives), document it as **Epic B** under `#finish-line` / `#epic-b` — do not duplicate it as a second S0–S5 stage list. Stages (`#stages`) stay the platform/deepening checklist on the home epic.

1. Prefer [`to-issues`](../to-issues/SKILL.md) / **`/ss-to-issues`** — **fold into existing epics** when possible (retitle/home epic + stories per stage; secondary epic for the B train). Only create one epic per stage when no home epic fits.
2. Write keys into HTML (`data-epic`, `data-story`, Phase mapping, **finish-line** rows).
3. Do not invent status; next `/ss-arch-plan` refresh will fill it.

### 5. Promote and hand off

When direction is **agreed**:

| Artifact | When |
|----------|------|
| `CONTEXT.md` terms | New module/concept names |
| Architecture decision record (ADR) | Load-bearing *why* (optional one-liner: `Arch plan: .harness/architecture-plan.html`) |
| `.harness/state.md` | Pointer + migration stages with epic keys |
| `/ss-to-issues` | Publish stages as epics if keys missing |
| `/ss-plan` | Per stage / first vertical slice — behavior/TDD |

Mirror into state when `.harness/state.md` exists:

```markdown
## Architecture Plan

- **HTML:** resolved `architecture-plan.html` (pack or root)  ← plan source of truth
- **Status:** draft | agreed
- **Locked:** <date or —>
- **Last Jira refresh:** <date or —>
```

```markdown
## Migration Stages

| ID | Title | Acceptance | Epic | Story | Notes |
|----|-------|------------|------|-------|-------|
| S0 | … | … | PROJ-245 | — | home |
| S1 | … | … | PROJ-245 | PROJ-271 | … |
```

**Handoff:** `/ss-to-issues` (if no keys) or `/ss-plan` for the first stage — not `/ss-implement` until a behavior plan exists.
