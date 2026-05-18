# ss-plan

**Phase: harness planning** (skillsync shared — grill → spec → sprint slices → verification → Next Action).

**Before this command (consumer loop):** When work is tracked per issue, finish any **tracker shaping** your repo documents, then **check out or create the story branch** so planning does not run on the wrong branch. That corresponds to phase **Branch** in [`ss-workflow`](./ss-workflow.md). Typical pattern from a **clean** working tree at the repo root: `git fetch`, checkout the default branch (often `main`), `pull --ff-only`, then `git checkout -b` using a branch name your project ties to the issue key and slug. Many consumers expose a script (for example `yarn branch:story PROJECT-123 short-slug`); use **`DRY_RUN=1`** (or the repo’s equivalent) for a **preview** that does not write to Git. Base-branch overrides, `--rename` / `--push`, and Jira ↔ Git naming rules live in the consumer’s agent / issue-tracker docs (and the script that implements them).

1. **Grill** — Read and follow [`grill-me`](../skills/grill-me/SKILL.md) end-to-end. Interview the user one question at a time until you reach shared understanding on scope, constraints, and design decisions (resolve each branch of the decision tree). Explore the codebase when a question can be answered there instead of asking the user. **Do not start harness planning until grilling is complete.**
2. Read and follow [`harness-planner`](../harness/harness-planner.md) end-to-end, using the agreed scope from step 1 (or ask for a **one-paragraph** goal only if grilling did not produce one).
3. **Persist** to **`.harness/state.md`** exactly as that harness file requires (including **`## Next Action`** after Verification Plan).

Repos that maintain `CONTEXT.md` / ADRs may substitute [`grill-with-docs`](../skills/grill-with-docs/SKILL.md) for step 1 when the consumer documents that; otherwise use **`grill-me`**.

Consumer repos with product addenda chain this command with a local `*-qb` harness file or a thin wrapper (for example `qb-plan`).

This command will be available in chat with `/ss-plan` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
