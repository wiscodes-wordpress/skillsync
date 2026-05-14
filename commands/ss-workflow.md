# ss-workflow

**Shared delivery workflow** (skillsync). Use this as the canonical phase list for Matt-style planner → implement → critic loops. Consumer repos keep **thin wrappers** (for example `qb-*` in Quick Builder) that add tracker-specific steps and still point here for the generic model.

## Orientation

1. Read the consumer’s **`AGENTS.md`** and **`CONTEXT.md`** (or equivalent) at the repository root for issue tracker, harness paths, and domain docs.
2. Follow the **phase order** below. Do not skip ahead unless the user explicitly overrides (for example: do not implement on `main` when a story branch is expected).

## Canonical phase order

| # | Phase | Purpose | Shared `ss-*` command (when linked) |
|---|--------|---------|-------------------------------------|
| 1 | **Branch** | Traceable branch from default; clean tree. | *(consumer wrapper — e.g. branch script)* |
| 2 | **Grill / align** | 1:1 story alignment before technical planning. | *(consumer / skill — e.g. grill-me)* |
| 3 | **Harness planner** | Spec → slices → verification → **`.harness/state.md`** + **`## Next Action`**. | **`/ss-plan`** → [`ss-plan.md`](./ss-plan.md) |
| 4 | **Slice to issues** | Tracker-ready stories/subtasks (optional if solo). | *(consumer wrapper)* |
| 5 | **Implement** | One slice; generator harness; run planner checks. | **`/ss-implement`** → [`ss-implement.md`](./ss-implement.md) |
| 6 | **Critic** | Quality gate; state + verdict. | **`/ss-review`** → [`ss-review.md`](./ss-review.md) |
| 7 | **Close / merge** | PR + tracker hygiene per consumer docs. | *(consumer wrapper)* |
| 8 | **QA handoff** | Next QA item / snapshot per consumer scripts. | *(consumer wrapper)* |

## Harness files (shared skeleton)

- **Planner:** [`harness/harness-planner.md`](../harness/harness-planner.md)
- **Generator:** [`harness/harness-generator.md`](../harness/harness-generator.md)
- **Critic:** [`harness/harness-critic.md`](../harness/harness-critic.md)

Consumers may add **local** files under `.cursor/harness/` (for example `critic-backend.md`) and chain them from wrappers or addenda.

## Naming: `ss-*`

- **`ss`** = **skillsync**-hosted, **product-neutral** slash commands.
- Link these files into the consumer **`.cursor/commands/`** with `link-commands.cjs` (see `docs/consumer-setup.md`) so Cursor discovers `/ss-workflow`, `/ss-plan`, `/ss-implement`, `/ss-review`.

This command will be available in chat with `/ss-workflow` when this file is linked into the consumer **`.cursor/commands/`** directory.
