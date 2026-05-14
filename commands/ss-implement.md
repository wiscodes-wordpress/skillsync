# ss-implement

**Phase: implementation** (skillsync shared — generator harness).

1. Read and follow [`harness-generator`](../harness/harness-generator.md) end-to-end.
2. Treat **`.harness/state.md`** as the source of truth for **Current Task**, **Next Action**, and acceptance criteria unless the user overrides in chat.
3. Run the verification commands the planner listed; do not claim done without command results the harness expects.

Consumer repos with product addenda chain this command with a local harness addendum or a thin wrapper (for example `qb-implement`).

This command will be available in chat with `/ss-implement` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
