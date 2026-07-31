# ss-plan

**Phase: planning** — follow [`ss-flow.md`](../harness/ss-flow.md).

**Before:** story branch per consumer docs (see [`ss-workflow.md`](./ss-workflow.md) phase Branch). For **UI-heavy** work, run [`ss-ui-ux-plan`](./ss-ui-ux-plan.md) first and pass the living UX HTML path (`.harness/ux-plan.html`) into this session.

1. **1a — Domain grill** — [`grill-me`](../skills/productivity/grill-me/SKILL.md) or [`grill-with-docs`](../skills/engineering/grill-with-docs/SKILL.md) (per `AGENTS.md`). Honor any agreed **UX plan** (`.harness/ux-plan.html`, or legacy `docs/ux/…`) for journeys and surfaces.
2. **1b — TDD grill** — [`grill-tdd`](../skills/engineering/grill-tdd/SKILL.md) until **Behavior & Test Contracts** are agreed (per-behavior cards: **name**, **expectation** as `step > step > assertion`, **red**, **layer**, **path**). Prefer seeding **expectation** chains from UX journeys. **Optional GitNexus** (`context` on named symbols when MCP indexed — [`docs/gitnexus.md`](../docs/gitnexus.md)). No test files on disk yet.
3. **Planner** — [`harness-planner-tdd.md`](../harness/harness-planner-tdd.md) → persist **`.harness/state.md`**.

**Optional — journal handoff:** If consumer `skillsync.config.json` has `journal.enabled` (or `JOURNAL_HANDOFF=1` + vault), after `.harness/state.md` is written follow [`journal-handoff`](../skills/personal/journal-handoff/SKILL.md) with `mode: start-story`:

- Create this week’s Journal note if missing (`journal-ensure-week.cjs` — never overwrite)
- Todo → `in progress` + one weekly Started bullet (idempotent per issue key)
- Regenerate today’s standup (`journal-standup.cjs`) so `## Focus` lists work-track `in progress` todos

**Optional:** `/ss-to-issues` · **Legacy:** [`harness-planner.md`](../harness/harness-planner.md) without step 1b.

Available as `/ss-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
