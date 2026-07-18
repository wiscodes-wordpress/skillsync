# ss-ui-ux-plan

**Phase: UI/UX planning** — optional before [`ss-plan`](./ss-plan.md) when the work is UI-heavy. See [`ss-flow.md`](../harness/ss-flow.md).

Plan flows and surfaces; living **HTML** is the **plan source of truth**. Does **not** implement UI or run TDD grilling.

In **Agent** mode, follow [`ui-ux-planner`](../skills/engineering/ui-ux-planner/SKILL.md):

1. **Locate** `.harness/ux-plan.html` (or `.harness/ux-<slug>.html` / fallback path in the skill).
2. Frame the primary job, actors, success, non-goals, constraints.
3. Map efficient journeys (`step > step > outcome`); cut unnecessary steps.
4. Inventory surfaces (primary action + empty/loading/error/success).
5. Record design decisions; leave open questions tagged `blocks: ss-plan` or `defer`.
6. **Draft or rewrite** the living HTML per [`HTML-REPORT.md`](../skills/engineering/ui-ux-planner/HTML-REPORT.md). Open the file; tell the user the path. Follow-ups **rewrite the same HTML**.
7. Optionally write a **thin** markdown export to `docs/ux/ux-<slug>.md` for tracker paste — HTML remains SoT. Point `.harness/state.md` at the HTML when present.
8. **Handoff:** run **`/ss-plan`** next — seed Behavior & Test Contracts from journeys.

**Skip** when there is no product UI (API-only, infra). **After** [`ss-major-feature-roadmap`](./ss-major-feature-roadmap.md) when a capability is UI-heavy but still needs flow detail before a story-level `/ss-plan`.

Tracker-agnostic: paste-ready parent/story sections on request ([`templates.md`](../skills/engineering/ui-ux-planner/templates.md)); no required vendor workflow.

Available as `/ss-ui-ux-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
