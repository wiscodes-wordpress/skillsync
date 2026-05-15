# ss-workflow

**Shared delivery workflow** (skillsync). Use this as the canonical phase list for Matt-style planner → implement → critic loops. Consumer repos keep **thin wrappers** (for example `qb-*` in Quick Builder) that add tracker-specific steps and still point here for the generic model.

## Orientation

1. Read the consumer’s **`AGENTS.md`** and **`CONTEXT.md`** (or equivalent) at the repository root for issue tracker, harness paths, and domain docs.
2. Follow the **phase order** below. Do not skip ahead unless the user explicitly overrides (for example: do not implement on `main` when a story branch is expected).

## Canonical phase order

| # | Phase | Purpose | Shared `ss-*` command (when linked) |
|---|--------|---------|-------------------------------------|
| 1 | **Branch** | **Story / issue branch** from default: clean tree, `git fetch`, checkout default, `pull --ff-only`, `git checkout -b` with a name tied to the tracker key + slug (consumer script or docs). | *(consumer wrapper — e.g. `yarn branch:story PROJECT-123 short-slug`; `DRY_RUN=1` preview)* |
| 2 | **Grill / align** | 1:1 story alignment before technical planning. | *Prerequisite on [`ss-plan`](./ss-plan.md); [`grill-me`](../skills/grill-me/SKILL.md), [`grill-with-docs`](../skills/grill-with-docs/SKILL.md), or consumer wrapper* |
| 3 | **Harness planner** | Spec → slices → verification → **`.harness/state.md`** + **`## Next Action`**. | **`/ss-plan`** → [`ss-plan.md`](./ss-plan.md) |
| 4 | **Slice to issues** | Tracker-ready stories/subtasks (optional if solo). | *(consumer wrapper)* |
| 5 | **Implement** | One slice; generator harness; run planner checks. | **`/ss-implement`** → [`ss-implement.md`](./ss-implement.md) |
| 6 | **Critic** | Quality gate; state + verdict. | **`/ss-review`** → [`ss-review.md`](./ss-review.md) |
| 7 | **PR open → merge → tracker** | Open PR (**`/ss-submit-pr`**); merge; **Jira Done** + harness reset (**`/ss-close-story`** + [`jira-close-story`](../skills/jira-close-story/SKILL.md) when using Jira/MCP). Rest per consumer docs. | **`/ss-submit-pr`**, **`/ss-close-story`** → [`ss-submit-pr.md`](./ss-submit-pr.md), [`ss-close-story.md`](./ss-close-story.md); merge / non-Jira tracker *(consumer wrapper)* |
| 8 | **QA handoff** | Next QA item / snapshot per consumer scripts. | *(consumer wrapper)* |

## Phase 1 — Branch (detail)

When the repo ties Git to Jira (or another tracker), complete any **shaping** the consumer documents, then **check out or create the story branch** before **`/ss-plan`**. From a **clean** working tree at the repo root, follow the consumer’s branch recipe (often the same sequence as the table: fetch → default branch → fast-forward pull → new branch). Many repos ship a helper such as **`yarn branch:story PROJECT-123 short-slug`**; use **`DRY_RUN=1`** (or equivalent) for a **no-git-write preview**. Base-branch env overrides, **`--rename` / `--push`**, and naming ↔ traceability rules belong in the consumer’s issue-tracker / agent docs. See also the prerequisite on [`ss-plan.md`](./ss-plan.md).

## Harness files (shared skeleton)

- **Planner:** [`harness/harness-planner.md`](../harness/harness-planner.md)
- **Generator:** [`harness/harness-generator.md`](../harness/harness-generator.md)
- **Critic:** [`harness/harness-critic.md`](../harness/harness-critic.md)

Consumers may add **local** files under `.cursor/harness/` (for example `critic-backend.md`) and chain them from wrappers or addenda.

## Naming: `ss-*`

- **`ss`** = **skillsync**-hosted, **product-neutral** slash commands.
- Link these files into the consumer **`.cursor/commands/`** with `link-commands.cjs` (see `docs/consumer-setup.md`) so Cursor discovers `/ss-workflow`, `/ss-plan`, `/ss-implement`, `/ss-review`, `/ss-submit-pr`, `/ss-close-story`.

This command will be available in chat with `/ss-workflow` when this file is linked into the consumer **`.cursor/commands/`** directory.
