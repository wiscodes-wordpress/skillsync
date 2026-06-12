# ss-implement

**Phase: implementation** (skillsync shared — generator harness + minimal-code discipline).

1. Read and follow [`ponytail`](../skills/engineering/ponytail/SKILL.md) for this session — apply the YAGNI ladder and shortest working diff while implementing. Default intensity: **full**. Opt out only if the user says **"stop ponytail"** or **"normal mode"**.
2. Read and follow [`harness-generator`](../harness/harness-generator.md) end-to-end.
3. Treat **`.harness/state.md`** as the source of truth for **Current Task**, **Next Action**, and acceptance criteria unless the user overrides in chat.
4. Run the verification commands the planner listed; do not claim done without command results the harness expects.

**Requires:** link **`ponytail`** in the consumer's `linkedSkills` (see `skillsync.config.example.json`) so Cursor resolves `.cursor/skills/ponytail/SKILL.md`.

Consumer repos with product addenda chain this command with a local harness addendum or a thin wrapper (for example `qb-implement`).

This command will be available in chat with `/ss-implement` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
