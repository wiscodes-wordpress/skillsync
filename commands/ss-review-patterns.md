# ss-review-patterns

**Phase: rubric upkeep** — mine merged pull-request reviews into anonymous, portable review principles and refresh the **Team review patterns** section that [`/ss-peer-review`](./ss-peer-review.md) reviews against.

Read and follow [`review-patterns`](../skills/engineering/review-patterns/SKILL.md) end-to-end. The deterministic parts are [`mine-review-patterns.cjs`](../tools/mine-review-patterns.cjs) (`mine`, then `check`).

**Argument:** repos as `owner/name`, optionally with paths to exclude. With no argument, ask which repos and whether any monorepo paths are out of scope.

**Non-negotiable:** no person is identifiable in any output; every principle passes the gate (3+ PRs, 2+ reviewers, no names, links, keys or repo terms); nothing is written to the rubric without an explicit go; scratch data in `.tmp/review-patterns/` is deleted at the end.

Available as `/ss-review-patterns` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`) or copied into `~/.claude/commands/`.
