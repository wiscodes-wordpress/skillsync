# ss-plan

**Phase: harness planning** (skillsync shared — spec → sprint slices → verification → Next Action).

1. Read and follow [`harness-planner`](../harness/harness-planner.md) end-to-end.
2. Use agreed scope from the prior conversation (or ask for a **one-paragraph** goal if missing).
3. **Persist** to **`.harness/state.md`** exactly as that harness file requires (including **`## Next Action`** after Verification Plan).

Consumer repos with product addenda chain this command with a local `*-qb` harness file or a thin wrapper (for example `qb-plan`).

This command will be available in chat with `/ss-plan` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
