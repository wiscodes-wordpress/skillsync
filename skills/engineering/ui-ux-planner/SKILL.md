---
name: ui-ux-planner
description: >
  UI/UX planning for product surfaces — Markdown is the plan source of truth;
  HTML is derived via render-plan-html.cjs (journeys, screen inventory, states,
  decisions). On /ss-ui-ux-plan, draft or rewrite the same MD then re-render.
  Use when designing or redesigning screens/flows, planning UI-heavy stories,
  or when the user asks for senior UX planning before /ss-plan. Does not write
  production UI code or replace TDD grilling.
---

# UI/UX planner

Plan **product UX** (flows + surfaces) as living **Markdown** with a derived HTML briefing before delivery planning. Invoke via **`/ss-ui-ux-plan`**.

The Markdown is the **source of truth**. **`/ss-plan`** consumes journeys from it for Behavior & Test Contracts — do not skip straight to implement on UI-heavy work.

**Prose:** apply [`anti-slop`](../../productivity/anti-slop/SKILL.md) to plan copy and chat — expand abbreviations on first use (information architecture (IA), architecture decision record (ADR), accessibility); no brochure voice.

## Source of truth

The living Markdown (pack `ux-plan.md` or legacy `.harness/ux-plan.md`) is **the** source of truth for this UX plan: primary job, journeys, surfaces, states, design decisions, accessibility, and open questions.

**Derived view:** `render-plan-html.cjs --kind ux` → `ux-plan.html` for humans. **Do not hand-edit** HTML. Follow [HTML-REPORT.md](HTML-REPORT.md) for section contract.

| Layer | Role |
|-------|------|
| **Markdown** | Plan source of truth — read and decide from here |
| **HTML** | Human browser view — derived only |
| Optional **`docs/ux/ux-<slug>.md`** | Thin paste/export for tracker — not a competing source of truth |
| **`.harness/state.md` pointer** | Path + status for the delivery loop |

Follow-up answers **update that same Markdown** then re-render before the next question. Do not spawn timestamped copies per answer.

## When to use

| Use this | Skip / use something else |
|----------|---------------------------|
| New or redesigned screens, wizards, admin UX, empty/error states | Pure backend / no UI → go to [`ss-plan`](../../../commands/ss-plan.md) |
| Flow efficiency ("too many steps", unclear primary action) | Multi-epic initiative first → [`major-feature-roadmap`](../major-feature-roadmap/SKILL.md), then this for UI-heavy capabilities |
| Design decisions that should stick through TDD | Pixel polish while implementing → keep decisions here; polish later |
| Critique of an existing flow before rewriting | Code review of React performance → [`frontend-react-best-practices`](../frontend-react-best-practices/SKILL.md) |
| Living visual UX source of truth before `/ss-plan` | Structure/modules → [`arch-plan`](../arch-plan/SKILL.md); security posture → [`security-plan`](../security-plan/SKILL.md) |

**Non-goals:** no production UI code, no RED tests, no tracker publish required, no replacing grill-me / grill-tdd, no Jira status refresh (v1).

## Order in the delivery loop

```text
(optional roadmap) → /ss-arch-plan? → /ss-ui-ux-plan → /ss-plan → /ss-to-issues? → /ss-implement → …
```

1. **`/ss-ui-ux-plan`** (this skill) — living HTML agreed (or accepted draft).
2. **`/ss-plan`** — domain grill + TDD grill + harness state; map journeys to **name** / **expectation** contracts.
3. Continue the normal ss-* loop.

If a UX HTML already exists for this story and the user confirms it is current, do not re-plan — point Next Action at `/ss-plan`.

## Interaction model

1. **Explore** — story/epic brief in chat, repo UI patterns, `CONTEXT.md` / design tokens if present.
2. **Draft** living HTML (synthesize first; do not start with a 40-question interview).
3. **Targeted Q&A** — one open decision at a time with a recommended answer (flows, density, progressive disclosure).
4. **Persist** — rewrite the same HTML; optionally thin markdown export; summarize for handoff.

**Prose:** full sentences and scannable tables (same planning carve-out as [`caveman`](../../productivity/caveman/SKILL.md) for `/ss-plan`). Resume caveman after planning if the session uses it.

Foundations and decision rules: [foundations.md](foundations.md). HTML scaffold: [HTML-REPORT.md](HTML-REPORT.md). Optional paste shapes: [templates.md](templates.md).

## Living HTML path

**Resolve order** (see `tools/lib/plan-paths.cjs`):

1. Path from consumer **`docs/agents/domain.md`** when it documents the UX SoT  
2. Initiative pack: **`.harness/initiatives/<slug>/ux-plan.html`** (`--slug`, or the only pack under `initiatives/`)  
3. Legacy single-file: **`.harness/ux-plan.html`**  
4. Config override: `skillsync.config.json` → `planHtml.ux`

**Do not** use flat `.harness/ux-<slug>.html` for new plans — put multi-train UX inside `initiatives/<slug>/ux-plan.html`.

Create the pack with `init-feature-pack.cjs`. One file per train — **rewrite in place**; no timestamped copies.

**Fallback:** `$TMPDIR` / `/tmp` / `%TEMP%` → `ux-plan-<repo-slug>.html` (stable name, not timestamped).

On user **"lock this"** / approve: optionally write a **thin** markdown export to `docs/ux/ux-<slug>.md` (or consumer UX path) for tracker paste — HTML remains the source of truth. Do not maintain a full duplicate contract in markdown.

Open after write: `open <path>` (macOS), `xdg-open` (Linux), `start` (Windows).

## Repo inputs

Read when present:

1. Consumer **`AGENTS.md`** / design-system notes
2. **`CONTEXT.md`**, **`docs/adr/`**
3. Existing UI in the same product area (patterns to match — Jakob’s Law)
4. Parent story or capability brief from chat (keys optional — tracker-agnostic)
5. Existing **ux-plan.html** (pack or harness root — always check `domain.md` / pack first; migrate legacy `.harness/ux-*.html` into the pack when found)
6. Legacy **`docs/ux/ux-*.md`** — migrate content into HTML if HTML is missing and markdown is the only artifact

Also mirror a short pointer into **`.harness/state.md`** when that file already exists for the story:

```markdown
## UX Plan

- **HTML:** `.harness/initiatives/<slug>/ux-plan.html` (or resolved path)  ← plan source of truth
- **Status:** agreed | draft
- **Slug:** <slug>
- **Export (optional):** `docs/ux/ux-<slug>.md`
```

If `.harness/state.md` does not exist yet, the HTML alone is enough; `/ss-plan` will pick it up from chat/path.

## Workflow

### 1. Frame the job

Capture in HTML `#job`:

- **Primary job** — one sentence user/caller outcome
- **Actors** — who uses this
- **Success** — how we know the flow worked
- **Non-goals** — flows/screens out of scope
- **Constraints** — platform, accessibility bar, existing components, brand/density

### 2. Map efficient flows

For each priority journey (HTML `#journeys`):

1. List steps as `step > step > outcome` (same shape later used in test-driven development **expectation**).
2. **Cut steps** — merge, default, or progressive-disclose until the happy path is minimal.
3. Add **one** primary failure/recovery path (validation, empty, permission) — not every edge.
4. Apply [foundations.md](foundations.md) — Hick’s Law, Fitts’s Law, progressive disclosure, feedback.

### 3. Inventory surfaces and states

HTML `#surfaces` + `#states`: surface → purpose → primary action → empty / loading / error / success.

Prefer **one primary action** per surface. Split screens that compete for two jobs.

### 4. Decide (and record)

Irreversible or high-conflict choices go in `#decisions` (problem → options → choice → why). Offer an architecture decision record (ADR) only when the consumer already uses ADRs for UX / information architecture (IA) and the choice is hard to reverse.

Material follow-ups: rewrite the **same** HTML before the next question.

### 5. Handoff checklist

Before closing:

- [ ] Happy path step count is explicit and justified
- [ ] Primary action obvious on each surface
- [ ] Empty / error / success named
- [ ] Accessibility expectations listed (labels, keyboard, contrast)
- [ ] Open questions tagged `blocks: ss-plan` vs `defer`
- [ ] Living HTML written/updated; opened for the user; agreed (or explicitly draft)
- [ ] Next Action: **`/ss-plan`** with HTML path referenced

## Tracker-agnostic enrichment (optional)

If the user wants parent/epic/story text updated, use [templates.md](templates.md) **Capability overview** and **Story body** sections — **paste-ready** by default. Point paste text at the **HTML** path. Only call a tracker MCP when the **consumer** already uses one and the user asks to publish; never hard-code a vendor workflow in this skill.

## Anti-patterns

- Horizontal tickets: “design all screens” then “build all screens”
- Skipping flow work and jumping to colors/shadows
- Inventing a new pattern when the product already has one
- Specifying implementation (CSS grid, component library internals) unless required by constraints
- Dual source of truth — full markdown contract *and* HTML saying different things
- Replacing `/ss-plan` — this skill stops at the UX plan HTML

## Done definition

Stop when:

1. Living HTML is written and agreed (or accepted as draft with open questions listed), and  
2. Handoff says run **`/ss-plan`** next (unless user scopes design-only discovery).
