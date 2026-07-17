---
name: ui-ux-planner
description: >
  UI/UX planning for product surfaces — goals, efficient user flows, screen inventory,
  design decisions, and a durable UX Contract for handoff into /ss-plan. Use when designing
  or redesigning screens/flows, planning UI-heavy stories, running /ss-ui-ux-plan, or when
  the user asks for senior UX planning before implementation. Does not write production UI
  code or replace domain/TDD grilling in /ss-plan.
---

# UI/UX planner

Plan **product UX** (flows + surfaces) before delivery planning. Invoke via **`/ss-ui-ux-plan`**.

Produces a **UX Contract** markdown artifact. **`/ss-plan`** consumes it for Behavior & Test Contracts — do not skip straight to implement on UI-heavy work.

## When to use

| Use this | Skip / use something else |
|----------|---------------------------|
| New or redesigned screens, wizards, admin UX, empty/error states | Pure backend / no UI → go to [`ss-plan`](../../../commands/ss-plan.md) |
| Flow efficiency ("too many steps", unclear primary action) | Multi-epic initiative first → [`major-feature-roadmap`](../major-feature-roadmap/SKILL.md), then this for UI-heavy capabilities |
| Design decisions that should stick through TDD | Pixel polish while implementing → keep decisions here; polish later |
| Critique of an existing flow before rewriting | Code review of React performance → [`frontend-react-best-practices`](../frontend-react-best-practices/SKILL.md) |

**Non-goals:** no production UI code, no RED tests, no tracker publish required, no replacing grill-me / grill-tdd.

## Order in the delivery loop

```text
(optional roadmap) → /ss-arch-plan? → /ss-ui-ux-plan → /ss-plan → /ss-to-issues? → /ss-implement → …
```

1. **`/ss-ui-ux-plan`** (this skill) — UX Contract agreed.
2. **`/ss-plan`** — domain grill + TDD grill + harness state; map journeys to **name** / **expectation** contracts.
3. Continue the normal ss-* loop.

If an UX Contract already exists for this story and the user confirms it is current, do not re-plan — point Next Action at `/ss-plan`.

## Interaction model

1. **Explore** — story/epic brief in chat, repo UI patterns, `CONTEXT.md` / design tokens if present.
2. **Draft** UX Contract (synthesize first; do not start with a 40-question interview).
3. **Targeted Q&A** — one open decision at a time with a recommended answer (flows, density, progressive disclosure).
4. **Persist** — write the contract file; summarize for handoff.

**Prose:** full sentences and scannable tables (same planning carve-out as [`caveman`](../../productivity/caveman/SKILL.md) for `/ss-plan`). Resume caveman after planning if the session uses it.

Foundations and decision rules: [foundations.md](foundations.md). Output shapes: [templates.md](templates.md).

## Repo inputs

Read when present:

1. Consumer **`AGENTS.md`** / design-system notes
2. **`CONTEXT.md`**, **`docs/adr/`**
3. Existing UI in the same product area (patterns to match — Jakob’s Law)
4. Parent story or capability brief from chat (keys optional — tracker-agnostic)

**UX Contract path** (first match):

1. Path from consumer docs (`docs/agents/domain.md` or similar)
2. Existing convention (e.g. `docs/ux/`)
3. Default: **`docs/ux/ux-<slug>.md`** (create `docs/ux/` if needed)

Also mirror a short pointer into **`.harness/state.md`** when that file already exists for the story:

```markdown
## UX Contract

- **Path:** `docs/ux/ux-<slug>.md`
- **Status:** agreed | draft
```

If `.harness/state.md` does not exist yet, the contract file alone is enough; `/ss-plan` will pick it up from chat/path.

## Workflow

### 1. Frame the job

Capture:

- **Primary job** — one sentence user/caller outcome
- **Actors** — who uses this
- **Success** — how we know the flow worked
- **Non-goals** — flows/screens out of scope
- **Constraints** — platform, a11y bar, existing components, brand/density

### 2. Map efficient flows

For each priority journey:

1. List steps as `step > step > outcome` (same shape later used in TDD **expectation**).
2. **Cut steps** — merge, default, or progressive-disclose until the happy path is minimal.
3. Add **one** primary failure/recovery path (validation, empty, permission) — not every edge.
4. Apply [foundations.md](foundations.md) — Hick, Fitts, progressive disclosure, feedback.

### 3. Inventory surfaces

Table: surface → purpose → primary action → empty / loading / error / success.

Prefer **one primary action** per surface. Split screens that compete for two jobs.

### 4. Decide (and record)

Irreversible or high-conflict choices go in **Design decisions** (problem → options → choice → why). Offer an ADR only when the consumer already uses ADRs for UX/IA and the choice is hard to reverse.

### 5. Handoff checklist

Before closing:

- [ ] Happy path step count is explicit and justified
- [ ] Primary action obvious on each surface
- [ ] Empty / error / success named
- [ ] A11y expectations listed (labels, keyboard, contrast)
- [ ] Open questions tagged `blocks: ss-plan` vs `defer`
- [ ] Contract file written; user agreed (or explicitly asked to proceed with draft)
- [ ] Next Action: **`/ss-plan`** with contract path referenced

## Tracker-agnostic enrichment (optional)

If the user wants parent/epic/story text updated, use [templates.md](templates.md) **Capability overview** and **Story body** sections — **paste-ready** by default. Only call a tracker MCP when the **consumer** already uses one and the user asks to publish; never hard-code a vendor workflow in this skill.

## Anti-patterns

- Horizontal tickets: “design all screens” then “build all screens”
- Skipping flow work and jumping to colors/shadows
- Inventing a new pattern when the product already has one
- Specifying implementation (CSS grid, component library internals) unless required by constraints
- Replacing `/ss-plan` — this skill stops at the UX Contract

## Done definition

Stop when:

1. UX Contract is written and agreed (or accepted as draft with open questions listed), and  
2. Handoff says run **`/ss-plan`** next (unless user scopes design-only discovery).
