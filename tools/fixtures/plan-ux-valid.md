---
kind: ux
product: demo-plugin · bulk-field-edit · DEMO-310
status: agreed
updated: "2026-07-25"
task: "Primary job: an editor updates one field across many posts without opening each post."
---

## phase

1. Architecture locked
2. **/ss-ui-ux-plan — current**
3. /ss-plan

| Journey / surface | Jira home | Status |
| --- | --- | --- |
| J1 bulk edit one field | DEMO-310 | To Do |

> Read this as: journeys are agreed; answer the blank-value question, then run /ss-plan.

## job

- **Actors:** site editor, administrator
- **Success looks like:** selected posts show the new value after one confirm
- **Constraints:** WordPress list table density, existing components, keyboard reachable

## locks

**Locked**

- D1 — edit happens in a panel, not inline in the table

**Handoff**

1. Answer the blank-value question, then run /ss-plan

## journeys

### j1
- title: Bulk edit one field

**expectation:** select posts > open panel > set value > confirm > see updated count

Efficiency: no per-post confirm; the panel defaults to the last used field.

Failure: a rejected value keeps the panel open with an inline error.

## surfaces

| ID | Surface | Purpose | Primary action |
| --- | --- | --- | --- |
| S1 | Posts list table | Choose posts | Open bulk panel |
| S2 | Bulk edit panel | Set one value | Confirm update |

## states

| Surface | Empty | Loading | Error | Success |
| --- | --- | --- | --- | --- |
| S2 | No posts selected | Saving spinner on confirm | Inline field error | Updated count with undo hint |

## decisions

### d1
- status: resolved · side panel
- title: D1 — panel over inline edit

The list table has no room for a field control per row.

## a11y

- Confirm button is labelled with the field name and selected count.
- Panel traps focus and returns it to the bulk action trigger on close.
- Errors are announced in text, never by color alone.

## open

| Question | Blocks | Notes |
| --- | --- | --- |
| Does a blank value clear the field or skip it? | ss-plan | Editors expect skip. |

## nongoals

- No multi-field edit in one pass.

## handoff

1. Next command: /ss-plan
2. Seed J1 into a Behavior & Test Contract using its name and expectation.
3. Source of truth: `.harness/ux-plan.md` (HTML derived)
