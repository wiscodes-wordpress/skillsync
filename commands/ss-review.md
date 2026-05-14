# ss-review

**Phase: harness critic** (skillsync shared — quality gate).

1. Read and follow [`harness-critic`](../harness/harness-critic.md) end-to-end.
2. Prefer evidence from the same commands the generator used; call out gaps honestly.
3. Update **`.harness/state.md`** per that harness file’s contracts (verdict, evidence, next action) when the critic expects it.

Consumer repos with product addenda chain this command with a local harness addendum or a thin wrapper (for example `qb-review`).

This command will be available in chat with `/ss-review` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
