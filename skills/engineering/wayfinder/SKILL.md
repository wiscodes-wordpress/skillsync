---
name: wayfinder
description: >
  Chart a foggy major-feature destination as a local living map of decision
  tickets (grill / prototype / research / task) until the route is clear. Map
  SoT is map.md; HTML derived via render-plan-html. Invoked as /ss-roadmap
  phase 0. Never creates Jira issues. disable-model-invocation via roadmap
  only — not a peer slash command.
disable-model-invocation: true
---

# Wayfinder

Plan work that is **too foggy for lenses** — find the way to a destination as a **shared map** of **decision tickets**, then resolve them one at a time until the route is clear enough for `/ss-roadmap` draft → arch / UX / security.

Adapted from [mattpocock/skills wayfinder](https://github.com/mattpocock/skills/tree/main/skills/engineering/wayfinder) for skillsync: **local living map only**, no issue-tracker create.

**Prose:** apply [`anti-slop`](../../productivity/anti-slop/SKILL.md) to map copy.

## Hard rules

- **No Jira / tracker create** in this skill. Tracker work starts at `/ss-roadmap` **publish** after lenses lock.
- **One ticket per session** (except parallel research tickets during chart).
- Rewrite the **same** `map.md` after every material step, then `render-plan-html.cjs --kind wayfinder --slug <slug>` — do not spawn timestamped copies. **Do not hand-edit** `map.html`.
- Refer to tickets by **title**, not bare ids.

## Paths

```text
.harness/wayfinder/<slug>/
  map.md                   ← source of truth index
  map.html                 ← derived (human browser)
  tickets/t<n>-<slug>.html ← one decision each (ticket briefs may stay HTML)
  assets/                  ← prototypes, research dumps
```

Scaffold: copy `tools/templates/plan-wayfinder.md` or write sections from [HTML-REPORT.md](HTML-REPORT.md). Render + validate:

```bash
node .cursor/vendor/skillsync/tools/render-plan-html.cjs . --kind wayfinder --slug <slug> --validate
```

## Ticket types

| Type | Mode | Resolve with |
|------|------|----------------|
| `grilling` | HITL | [`grill-me`](../../productivity/grill-me/SKILL.md) or [`grill-with-docs`](../grill-with-docs/SKILL.md) — one question at a time; never answer for the human |
| `prototype` | HITL | Cheap stub under `assets/`; link from the ticket |
| `research` | AFK | Read docs / codebase; write findings under `assets/`; close with a gist |
| `task` | HITL or AFK | Unblocks a decision (access, signup) — not delivery of the destination |

## Chart the map (roadmap phase 0)

1. **Name the destination** — grill until one or two lines of “what done looks like.”
2. **Breadth-first fog** — surface open decisions; if the way is already clear and small enough for one session, **skip** wayfinder and continue roadmap draft.
3. Write **`map.md`**: Destination, Notes, empty Decisions so far, Not yet specified, Out of scope, Frontier — then render HTML.
4. Create **ticket HTML** files you can specify now; wire blockers (list blocked-by titles on each ticket + Mermaid on the map).
5. Fire research tickets in parallel when useful; stop — charting does not hand-resolve grilling tickets.

## Work through the map

1. Load `map.md` (low-res).
2. Pick the first **frontier** ticket (open, unblocked, unclaimed) or the one the user named. Set claimed on the ticket page.
3. Resolve via type; record the answer on the ticket; mark closed.
4. Append one Decisions-so-far line on `map.md` (title + gist + link); re-render HTML.
5. Graduate fog into new tickets; close mis-scoped tickets into Out of scope.

## Handoff

When no open tickets remain (or the user declares the route clear enough): continue `/ss-roadmap` draft initiative markdown. Optionally run `render-app-map.cjs` so the grand plan shows status `wayfinding` / clear.

## Boundaries

| Use this | Use something else |
|----------|-------------------|
| Foggy major feature before lenses | Clear story → [`/ss-plan`](../../../commands/ss-plan.md) |
| Decision tickets (local map) | Jira epics/stories → roadmap publish |
| Chart / work fog | Locked direction → arch / UX / security Markdown |
