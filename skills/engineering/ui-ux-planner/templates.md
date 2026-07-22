# UX plan templates

Tracker- and product-neutral. **Source of truth is the living HTML** — see [HTML-REPORT.md](HTML-REPORT.md) and `.harness/ux-plan.html`.

Use this file for **optional thin markdown export** (tracker paste) and parent/story body snippets. Do **not** maintain a full second contract in markdown that can drift from the HTML.

## Thin markdown export (optional)

Only when the user wants a pasteable file or tracker attachment. Keep it short; deep content stays in HTML.

```markdown
# UX plan — <short title>

**Status:** draft | agreed  
**Slug:** <slug>  
**Source of truth (HTML):** `.harness/ux-plan.html`  
**Related:** <story/epic key or title — optional>

## Primary job

<one sentence>

## Journeys (seeds for /ss-plan)

### J1 — <name>
- **expectation:** step 1 > step 2 > outcome

### J2 — …
- **expectation:** …

## Surfaces (summary)

| ID | Surface | Primary action |
|----|---------|----------------|
| S1 | … | … |

## Open questions (blocking /ss-plan)

- …

## Handoff

**Next:** `/ss-plan` — seed Behavior & Test Contracts from journeys in the HTML source of truth.
```

Default export path: **`docs/ux/ux-<slug>.md`** (create `docs/ux/` if needed).

## Capability / parent overview (optional paste)

Use when enriching a larger parent item (capability, epic, initiative section):

```markdown
## UX scope

- **Source of truth:** `.harness/ux-plan.html`
- **Jobs:** …
- **Journeys:** J1 …; J2 …
- **Principles for this area:** shortest path; one primary action; …

## Out of UX scope

- …

## Open UX decisions

- …
```

## Story body (optional paste)

```markdown
## UX

**plan source of truth:** `.harness/ux-plan.html` (status: agreed | draft)  
**Export (optional):** `docs/ux/ux-<slug>.md`

### Flow slice
- **expectation:** step > step > outcome

### Surfaces
- …

### States
- Empty: …
- Error: …
- Success: …

### Acceptance (UX)
- [ ] Happy path completes in ≤ N intentional steps (per plan)
- [ ] Primary action is obvious and named accessibly
- [ ] Empty / error / success states behave as listed
```
