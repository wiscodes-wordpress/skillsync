# ss-to-issues

**Phase: slice plan → tracker issues** (optional when a team uses an issue tracker for sprint slices; skip when working solo without subtasks).

Turn an approved plan into **tracer-bullet** issues on the project tracker: vertical slices, **HITL / AFK** typing, user quiz, then publish in dependency order.

**Typical placement:** after **`/ss-plan`** (harness slices in **`.harness/state.md`**) and before **`/ss-implement`**. See [`ss-workflow.md`](./ss-workflow.md) phase **Slice to issues**.

**How this runs:** This `.md` instructs the agent. In **Agent** mode, open and follow **[`to-issues`](../skills/engineering/to-issues/SKILL.md)** end-to-end. **Before** the first MCP call for Jira (or equivalent), read each tool’s schema under the workspace **`mcps/`** folder for the enabled server. In **Ask / read-only** mode or without MCP, output paste-ready issue titles and bodies per the skill.

## Inputs (ask if missing)

1. **Source** — parent issue key/URL, **`.harness/state.md`**, spec/PRD path, or a one-paragraph goal in chat.
2. **Parent issue** (when creating subtasks) — tracker key the new issues roll up under (for example `PROJECT-123`).
3. **Consumer issue-tracker docs** — if not already in context, read the repo’s issue-tracker / agent doc (assignee defaults, issue types, AFK labels, Jira vs GitHub).

## Agent steps (summary)

1. Gather context per **[`to-issues`](../skills/engineering/to-issues/SKILL.md)** (parent issue, harness plan, or spec).
2. Draft vertical slices; **quiz the user** until they approve granularity, dependencies, and HITL/AFK labels.
3. Publish issues per consumer docs (MCP or `gh` or manual paste). **Do not** close or modify the parent issue.
4. Print slice → issue key/URL summary; suggest **`/ss-implement`** for the first unblocked AFK slice when appropriate.

## References

- Consumer issue-tracker / agent docs (project key, subtask vs story, triage labels).
- **[`to-issues`](../skills/engineering/to-issues/SKILL.md)** — full procedure and issue body template.
- [`ss-plan.md`](./ss-plan.md) — produces harness slices; often the input to this command.
- [`ss-workflow.md`](./ss-workflow.md) — canonical phase order.

Consumer wrappers may add tracker-specific defaults (for example **`qp-to-issues`**) and still point here.

This command will be available in chat with `/ss-to-issues` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
