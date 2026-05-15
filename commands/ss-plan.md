# ss-plan

**Phase: harness planning** (skillsync shared — spec → sprint slices → verification → Next Action).

**Before this command (consumer loop):** When work is tracked per issue, finish any **tracker shaping** your repo documents, then **check out or create the story branch** so planning does not run on the wrong branch. That corresponds to phase **Branch** in [`ss-workflow`](./ss-workflow.md). Typical pattern from a **clean** working tree at the repo root: `git fetch`, checkout the default branch (often `main`), `pull --ff-only`, then `git checkout -b` using a branch name your project ties to the issue key and slug. Many consumers expose a script (for example `yarn branch:story PROJECT-123 short-slug`); use **`DRY_RUN=1`** (or the repo’s equivalent) for a **preview** that does not write to Git. Base-branch overrides, `--rename` / `--push`, and Jira ↔ Git naming rules live in the consumer’s agent / issue-tracker docs (and the script that implements them).

1. Read and follow [`harness-planner`](../harness/harness-planner.md) end-to-end.
2. Use agreed scope from the prior conversation (or ask for a **one-paragraph** goal if missing).
3. **Persist** to **`.harness/state.md`** exactly as that harness file requires (including **`## Next Action`** after Verification Plan).

Consumer repos with product addenda chain this command with a local `*-qb` harness file or a thin wrapper (for example `qb-plan`).

This command will be available in chat with `/ss-plan` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
