# ss-ui-ux-plan

**Phase: UX direction** — optional; above story delivery. See [`ss-flow.md`](../harness/ss-flow.md).

Plan **product UX** (flows + surfaces). **Markdown is the plan source of truth**; HTML is derived for humans. Does **not** write production UI or replace `/ss-plan`.

In **Agent** mode, follow [`ui-ux-planner`](../skills/engineering/ui-ux-planner/SKILL.md):

1. **Locate** the living Markdown via `docs/agents/domain.md`, then `.harness/initiatives/<slug>/ux-plan.md`, then legacy `.harness/ux-plan.md` — see `tools/lib/plan-paths.cjs`. Do not create new flat `.harness/ux-<slug>.html` files. **Do not hand-edit** derived `.html`.
2. **If missing:** `node .cursor/vendor/skillsync/tools/init-plan-html.cjs . --kind ux [--slug <slug>] --product "…" --task "…"`.
3. Read repo surfaces, any arch plan MD, and grill context as needed.
4. **Draft or rewrite** the Markdown sections per [`HTML-REPORT.md`](../skills/engineering/ui-ux-planner/HTML-REPORT.md) (`## job`, `## journeys`, …). Include **`## phase`** once story/epic keys exist.
5. **Render:**

```bash
node .cursor/vendor/skillsync/tools/render-plan-html.cjs . --kind ux [--slug <slug>] --validate
```

Open the `.html`; tell the user the path. Follow-ups **rewrite the same `.md`**, then re-render.
6. **Validate:** `validate-plan-html.cjs . --kind ux`.
7. **Handoff:** `/ss-plan` — seed Behavior & Test Contracts from journeys in the Markdown.

Tracker-agnostic: paste-ready parent/story sections on request ([`templates.md`](../skills/engineering/ui-ux-planner/templates.md)); no required vendor workflow.

Available as `/ss-ui-ux-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
