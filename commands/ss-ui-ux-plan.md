# ss-ui-ux-plan

**Phase: UI/UX planning** — optional before [`ss-plan`](./ss-plan.md) when the work is UI-heavy. See [`ss-flow.md`](../harness/ss-flow.md).

Plan flows and surfaces; produce a durable **UX Contract**. Does **not** implement UI or run TDD grilling.

In **Agent** mode, follow [`ui-ux-planner`](../skills/engineering/ui-ux-planner/SKILL.md):

1. Frame the primary job, actors, success, non-goals, constraints.
2. Map efficient journeys (`step > step > outcome`); cut unnecessary steps.
3. Inventory surfaces (primary action + empty/loading/error/success).
4. Record design decisions; leave open questions tagged `blocks: ss-plan` or `defer`.
5. Write **`docs/ux/ux-<slug>.md`** (or consumer UX path); optionally point `.harness/state.md` at it.
6. **Handoff:** run **`/ss-plan`** next — seed Behavior & Test Contracts from journeys.

**Skip** when there is no product UI (API-only, infra). **After** [`ss-major-feature-roadmap`](./ss-major-feature-roadmap.md) when a capability is UI-heavy but still needs flow detail before a story-level `/ss-plan`.

Tracker-agnostic: paste-ready parent/story sections on request ([`templates.md`](../skills/engineering/ui-ux-planner/templates.md)); no required vendor workflow.

Available as `/ss-ui-ux-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
