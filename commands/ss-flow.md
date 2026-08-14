# ss-flow

**REQUIRED voice:** every Story phase — plain, short, human ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md)). Consumers: link `rules/ss-delivery-voice.mdc` (`alwaysApply: true`).

**Story spine — three fresh agents.** Daily path only (not Initiative / Ship). Belt map and context budget: [`harness/ss-flow.md`](../harness/ss-flow.md). Full belt index: [`ss-workflow`](./ss-workflow.md).

Start a **new agent** at each phase. Pass **artifacts** (especially `.harness/state.md`), not the prior chat.

| Phase | Fresh agent runs | Notes |
|-------|------------------|-------|
| **Plan** | [`/ss-plan`](./ss-plan.md) | Optional [`/ss-to-issues`](./ss-to-issues.md) in the same plan agent if slicing |
| **Implement** | [`/ss-implement`](./ss-implement.md) or [`/ss-loop`](./ss-loop.md) | Interactive vs AFK; loop = one agent per Remaining cycle |
| **Done** | [`/ss-finish`](./ss-finish.md) | Review → fix → security → handoff → submit; close after merge |

## How to use

1. Human (or orchestrator): open a **new** agent → `/ss-plan` until `.harness/state.md` is locked.
2. **New** agent → `/ss-implement` or `/ss-loop` until Remaining is empty. If that agent is created via **Paseo + Cursor**, enable Auto Accept at create (`settings.features.auto_accept`) or let `/ss-implement` run `paseo-set-feature.cjs --for-cwd .` first.
3. **New** agent → `/ss-finish` through PR open; after merge, same or new light agent → close via `/ss-finish` resume or [`/ss-close-story`](./ss-close-story.md).

Do **not** keep one mega-session from plan through Done. Do **not** split Plan into separate grill agents unless the plan is unusually large.

**Enter Initiative** (`/ss-roadmap`, lenses) or **Ship** (`/ss-release*`) only when needed — see [`ss-workflow`](./ss-workflow.md).

**Context budget:** three fresh agents + `.harness/state.md` handoff. Practical savings (thin state, `/ss-loop` for long Remaining, skip optional phases, re-run leaves only): [`harness/ss-flow.md`](../harness/ss-flow.md) → **Context budget rules** / **Further savings**.

**Voice:** keep chat human and short — [`anti-slop`](../skills/productivity/anti-slop/SKILL.md) `/ss-*` chat voice (all Story phases).

Available as `/ss-flow` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
