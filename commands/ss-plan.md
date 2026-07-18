# ss-plan

**Phase: planning** — follow [`ss-flow.md`](../harness/ss-flow.md).

**Before:** story branch per consumer docs (see [`ss-workflow.md`](./ss-workflow.md) phase Branch). For **UI-heavy** work, run [`ss-ui-ux-plan`](./ss-ui-ux-plan.md) first and pass the living UX HTML path (`.harness/ux-plan.html`) into this session.

1. **1a — Domain grill** — [`grill-me`](../skills/productivity/grill-me/SKILL.md) or [`grill-with-docs`](../skills/engineering/grill-with-docs/SKILL.md) (per `AGENTS.md`). Honor any agreed **UX plan** (`.harness/ux-plan.html`, or legacy `docs/ux/…`) for journeys and surfaces.
2. **1b — TDD grill** — [`grill-tdd`](../skills/engineering/grill-tdd/SKILL.md) until **Behavior & Test Contracts** are agreed (per-behavior cards: **name**, **expectation** as `step > step > assertion`, **red**, **layer**, **path**). Prefer seeding **expectation** chains from UX journeys. No test files on disk yet.
3. **Planner** — [`harness-planner-tdd.md`](../harness/harness-planner-tdd.md) → persist **`.harness/state.md`**.

**Optional:** `/ss-to-issues` · **Legacy:** [`harness-planner.md`](../harness/harness-planner.md) without step 1b.

Available as `/ss-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
