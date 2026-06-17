# ss-to-issues

**Phase: slice → tracker** (optional) — follow [`ss-flow.md`](../harness/ss-flow.md).

After **`/ss-plan`**, publish approved RED→GREEN cycles (or slices) as tracker issues before **`/ss-implement`**.

In **Agent** mode, follow [`to-issues`](../skills/engineering/to-issues/SKILL.md). Read MCP tool schemas before Jira/GitHub calls. After human approves the slice list, prefer **`publish-slices-from-state.cjs`** (dry-run first, then `--publish --approved --parent KEY`). In **Ask** mode, output paste-ready issue bodies.

**Inputs:** parent issue key, **`.harness/state.md`**, or spec in chat; consumer issue-tracker docs for assignee/types/labels.

Consumer wrappers (e.g. `qp-to-issues`) may add defaults and still point here.

Available as `/ss-to-issues` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
