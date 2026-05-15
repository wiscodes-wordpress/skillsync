# ss-close-story

**Phase: tracker close after merge** (or when the human wants the board updated) — transition the **Jira issue** (and children when needed) to **Done**, apply **assignee** / **fix version** only when the human or **consumer docs** say so, then **clear local harness handoff** by writing **empty** **`.harness/state.md`** and **`.harness/qa-current.md`** after Jira updates succeed.

Complements **`/ss-submit-pr`** (open PR) and consumer **QA / merge** commands. **Does not** merge GitHub PRs.

**How this runs:** This `.md` **instructs the agent**. In **Agent** mode with **Atlassian MCP** enabled, open and follow **[`jira-close-story`](../skills/jira-close-story/SKILL.md)** end-to-end. **Before** the first MCP call, read each tool’s schema (descriptor JSON under the workspace **`mcps/`** folder for the enabled server, e.g. **`user-mcp-atlassian`**). **Harness files** are cleared with a normal **empty-file** write after Jira succeeds — not via MCP. In **Ask / read-only** mode or without MCP, output the skill’s **manual checklist**.

## Inputs (ask if missing)

1. **Issue key** — e.g. `PROJECT-175` (story), `PROJECT-717` (task), `PROJECT-727` (sub-task). From the human, branch/PR, or **`.harness/state.md`** if it still holds context.
2. **Optional:** exact Jira **fix version `name`** to override the skill’s unreleased-version pick.

## Agent steps (summary)

1. Execute **[`jira-close-story`](../skills/jira-close-story/SKILL.md)** for the given key (MCP or manual list).
2. After **successful** Jira close: at repo root, ensure **`.harness/`** exists, then write **empty** **`.harness/state.md`** and **`.harness/qa-current.md`**.

## References

- Consumer issue-tracker / agent docs (assignee defaults, version naming, subtask order).
- **[`jira-close-story`](../skills/jira-close-story/SKILL.md)** — full procedure.
- [`ss-workflow.md`](./ss-workflow.md) — phase order vs PR / QA.

Consumer wrappers may add tracker-specific defaults (e.g. **`qp-close-jira-story`**) and still point here.

This command will be available in chat with `/ss-close-story` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
