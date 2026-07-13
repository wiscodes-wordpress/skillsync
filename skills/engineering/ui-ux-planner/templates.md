# UX Contract templates

Tracker- and product-neutral. Prefer writing **`docs/ux/ux-<slug>.md`**. Optional body sections below are for pasting into a parent issue when the user asks — no vendor assumed.

## UX Contract file

```markdown
# UX Contract — <short title>

**Status:** draft | agreed  
**Slug:** <slug>  
**Related:** <story/epic key or title — optional>

## Primary job

<one sentence>

## Actors

- …

## Success looks like

- …

## Non-goals

- …

## Constraints

- Platform / density / existing components / a11y bar: …

## Journeys (priority order)

### J1 — <name>
- **expectation:** step 1 > step 2 > outcome
- **Efficiency notes:** <what was cut or defaulted>
- **Failure / recovery:** <one path>

### J2 — …
- **expectation:** …
- …

## Surfaces

| ID | Surface | Purpose | Primary action | Empty | Loading | Error | Success |
|----|---------|---------|----------------|-------|---------|-------|---------|
| S1 | … | … | … | … | … | … | … |

## Design decisions

| ID | Decision | Options | Choice | Why |
|----|----------|---------|--------|-----|
| D1 | … | A / B | … | … |

## Accessibility

- …
- Keyboard: …
- Labels / roles for primary actions: …

## Open questions

| Question | Blocks | Notes |
|----------|--------|-------|
| … | ss-plan \| defer | … |

## Handoff

**Next:** `/ss-plan` — use journeys as Behavior & Test Contract seeds (`name` + `expectation`).
```

## Capability / parent overview (optional paste)

Use when enriching a larger parent item (capability, epic, initiative section):

```markdown
## UX scope

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

**Contract:** `docs/ux/ux-<slug>.md` (status: agreed | draft)

### Flow slice
- **expectation:** step > step > outcome

### Surfaces
- …

### States
- Empty: …
- Error: …
- Success: …

### Acceptance (UX)
- [ ] Happy path completes in ≤ N intentional steps (per contract)
- [ ] Primary action is obvious and named accessibly
- [ ] Empty / error / success states behave as listed
```
