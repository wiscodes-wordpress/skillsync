---
name: ui-ux-planner
description: >
  UI/UX planning for product surfaces — living HTML is the plan source of truth
  (journeys, screen inventory, states, decisions). On /ss-ui-ux-plan, draft or rewrite
  the same HTML; follow-ups update that file. Use when designing or redesigning
  screens/flows, planning UI-heavy stories, or when the user asks for senior UX
  planning before /ss-plan. Does not write production UI code or replace TDD grilling.
---

# UI/UX planner

Plan **product UX** (flows + surfaces) as a visual **living HTML** briefing before delivery planning. Invoke via **`/ss-ui-ux-plan`**.

The HTML is the **source of truth**. **`/ss-plan`** consumes journeys from it for Behavior & Test Contracts — do not skip straight to implement on UI-heavy work.

## Source of truth

The living HTML (`.harness/ux-plan.html`) is **the** source of truth for this UX plan: primary job, journeys, surfaces, states, design decisions, a11y, and open questions.

**Presentation:** follow [HTML-REPORT.md](HTML-REPORT.md) — sticky nav, Job, Journeys, Surfaces, States, Decisions, Handoff. That browser HTML is the deliverable; do **not** substitute a Cursor Canvas or chat-only summary for the SoT.

| Layer | Role |
|-------|------|
| **HTML** | Plan SoT — read and decide from here |
| Optional **`docs/ux/ux-<slug>.md`** | Thin paste/export for tracker — not a competing SoT |
| **`.harness/state.md` pointer** | Path + status for the delivery loop |

Follow-up answers **update that same HTML** before the next question. Do not spawn timestamped copies per answer.

## When to use

| Use this | Skip / use something else |
|----------|---------------------------|
| New or redesigned screens, wizards, admin UX, empty/error states | Pure backend / no UI → go to [`ss-plan`](../../../commands/ss-plan.md) |
| Flow efficiency ("too many steps", unclear primary action) | Multi-epic initiative first → [`major-feature-roadmap`](../major-feature-roadmap/SKILL.md), then this for UI-heavy capabilities |
| Design decisions that should stick through TDD | Pixel polish while implementing → keep decisions here; polish later |
| Critique of an existing flow before rewriting | Code review of React performance → [`frontend-react-best-practices`](../frontend-react-best-practices/SKILL.md) |
| Living visual UX SoT before `/ss-plan` | Structure/modules → [`arch-plan`](../arch-plan/SKILL.md); security posture → [`security-plan`](../security-plan/SKILL.md) |

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

**Stable path (prefer):** `.harness/ux-plan.html`  
Create `.harness/` if needed. One active file — rewrite in place.

**Per-slug (when multiple UX plans coexist):** `.harness/ux-<slug>.html` — still rewrite that file in place; do not timestamp.

**Fallback:** `$TMPDIR` / `/tmp` / `%TEMP%` → `ux-plan-<repo-slug>.html` (stable name, not timestamped).

On user **"lock this"** / approve: optionally write a **thin** markdown export to `docs/ux/ux-<slug>.md` (or consumer UX path) for tracker paste — HTML remains SoT. Do not maintain a full duplicate contract in markdown.

Open after write: `open <path>` (macOS), `xdg-open` (Linux), `start` (Windows).

## Repo inputs

Read when present:

1. Consumer **`AGENTS.md`** / design-system notes
2. **`CONTEXT.md`**, **`docs/adr/`**
3. Existing UI in the same product area (patterns to match — Jakob’s Law)
4. Parent story or capability brief from chat (keys optional — tracker-agnostic)
5. Existing **`.harness/ux-plan.html`** or `.harness/ux-*.html` (always check first)
6. Legacy **`docs/ux/ux-*.md`** — migrate content into HTML if HTML is missing and markdown is the only artifact

Also mirror a short pointer into **`.harness/state.md`** when that file already exists for the story:

```markdown
## UX Plan

- **HTML:** `.harness/ux-plan.html`  ← plan SoT
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
- **Constraints** — platform, a11y bar, existing components, brand/density

### 2. Map efficient flows

For each priority journey (HTML `#journeys`):

1. List steps as `step > step > outcome` (same shape later used in TDD **expectation**).
2. **Cut steps** — merge, default, or progressive-disclose until the happy path is minimal.
3. Add **one** primary failure/recovery path (validation, empty, permission) — not every edge.
4. Apply [foundations.md](foundations.md) — Hick, Fitts, progressive disclosure, feedback.

### 3. Inventory surfaces and states

HTML `#surfaces` + `#states`: surface → purpose → primary action → empty / loading / error / success.

Prefer **one primary action** per surface. Split screens that compete for two jobs.

### 4. Decide (and record)

Irreversible or high-conflict choices go in `#decisions` (problem → options → choice → why). Offer an ADR only when the consumer already uses ADRs for UX/IA and the choice is hard to reverse.

Material follow-ups: rewrite the **same** HTML before the next question.

### 5. Handoff checklist

Before closing:

- [ ] Happy path step count is explicit and justified
- [ ] Primary action obvious on each surface
- [ ] Empty / error / success named
- [ ] A11y expectations listed (labels, keyboard, contrast)
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
- Dual SoT — full markdown contract *and* HTML saying different things
- Replacing `/ss-plan` — this skill stops at the UX plan HTML

## Done definition

Stop when:

1. Living HTML is written and agreed (or accepted as draft with open questions listed), and  
2. Handoff says run **`/ss-plan`** next (unless user scopes design-only discovery).
