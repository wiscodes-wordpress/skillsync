# ss-implement

**Phase: implementation** — follow [`ss-flow.md`](../harness/ss-flow.md).

1. [`ponytail`](../skills/engineering/ponytail/SKILL.md) — full session unless user opts out.
2. [`harness-generator.md`](../harness/harness-generator.md) — single source for workflow, TDD evidence, and state updates.
3. **Evidence (Agent, when vendored):** `node .cursor/vendor/skillsync/tools/run-verification.cjs .` · `node .cursor/vendor/skillsync/tools/re-break.cjs . --cmd "…" --paths src/…` for completed cycles.

Available as `/ss-implement` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
