# ss-ui-ux-plan

**Phase: UI/UX planning** — optional before [`ss-plan`](./ss-plan.md) when the work is UI-heavy. See [`ss-flow.md`](../harness/ss-flow.md).

Plan flows and surfaces; living **HTML** is the **plan source of truth**. Does **not** implement UI or run TDD grilling.

In **Agent** mode, follow [`ui-ux-planner`](../skills/engineering/ui-ux-planner/SKILL.md):

1. **Locate** `.harness/ux-plan.html` (or `.harness/ux-<slug>.html` / fallback path in the skill). **Initiative pack:** when working under `/ss-roadmap` (`.harness/initiatives/<slug>/` exists for this feature), read and rewrite `ux.html` **inside the pack** instead, then update the hub lens row.
2. **If missing (global harness):** `node .cursor/vendor/skillsync/tools/init-plan-html.cjs . --kind ux --product "…" --task "…"`.
3. Frame the primary job, actors, success, non-goals, constraints.
4. Map efficient journeys (`step > step > outcome`); cut unnecessary steps.
5. Inventory surfaces (primary action + empty/loading/error/success).
6. Record design decisions; leave open questions tagged `blocks: ss-plan` or `defer`.
7. **Draft or rewrite** the living HTML per [`HTML-REPORT.md`](../skills/engineering/ui-ux-planner/HTML-REPORT.md). Include **`#phase`** once story/epic keys exist. Open the file; tell the user the path. Follow-ups **rewrite the same HTML**.
8. **Validate structure** (when vendored): `node .cursor/vendor/skillsync/tools/validate-plan-html.cjs . --kind ux` — fix until exit 0.
9. Optionally write a **thin** markdown export to `docs/ux/ux-<slug>.md` for tracker paste — HTML remains the source of truth. Point `.harness/state.md` at the HTML when present.
10. **Handoff:** run **`/ss-plan`** next — seed Behavior & Test Contracts from journeys.

**Skip** when there is no product UI (API-only, infra). **After** the [`ss-roadmap`](./ss-roadmap.md) draft step when a capability is UI-heavy but still needs flow detail before a story-level `/ss-plan`.

Tracker-agnostic: paste-ready parent/story sections on request ([`templates.md`](../skills/engineering/ui-ux-planner/templates.md)); no required vendor workflow.

Available as `/ss-ui-ux-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
