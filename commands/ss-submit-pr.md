# ss-submit-pr

**Phase: submit work for review** — open a **GitHub pull request** from the **current branch** (title + body); **not** merge. Complements consumer **QA / merge / tracker** steps (see [`ss-workflow`](./ss-workflow.md)).

**How this runs:** This `.md` **instructs the agent**. In **Agent** mode, follow **[`submit-github-pr`](../skills/submit-github-pr/SKILL.md)** end-to-end from the **repository root** (`gh`, `git`). In **Ask / read-only** mode, print that skill’s checklist and exact commands for the human.

## Inputs

Same as the skill — ask if missing: **base branch**, **PR title**, **PR body** (or derive from diff / commits / **`.harness/state.md`**).

## References

- **[`submit-github-pr`](../skills/submit-github-pr/SKILL.md)** — prerequisites, steps, `gh pr create` pattern.
- [`ss-workflow.md`](./ss-workflow.md) — phase order.
- Consumer wrappers (e.g. **`qp-submit-pr`**) may add tracker-specific defaults and still point here.

This command will be available in chat with `/ss-submit-pr` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
