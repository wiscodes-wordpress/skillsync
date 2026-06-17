# ss-close-story

**Phase: tracker close + harness reset** — follow [`ss-flow.md`](../harness/ss-flow.md) (after PR merge or when updating the board).

Transitions the **Jira issue** (and children when needed) to **Done** per consumer docs. **Does not merge** GitHub PRs.

In **Agent** mode with **Atlassian MCP**, follow [`jira-close-story`](../skills/engineering/jira-close-story/SKILL.md). Read MCP tool schemas before calling. In **Ask** mode or without MCP, output the skill’s manual checklist.

**After successful Jira close** — at repo root, prefer:

```bash
node .cursor/vendor/skillsync/tools/harness-reset.cjs .
```

(or `yarn ss:harness-reset`). Without MCP, optional `jira-close.cjs --issue PROJECT-123` when `JIRA_*` env vars are set — it runs harness reset on success. Manual equivalent: empty **`.harness/state.md`** and **`.harness/qa-current.md`**; **delete** **`.harness/pr-body.md`** if present.

**Inputs:** issue key (e.g. `PROJECT-175`); optional fix version override. From human, branch/PR, or **`.harness/state.md`** if context remains.

Consumer wrappers (e.g. `qp-close-jira-story`, `qb-close-jira`) may add defaults and still point here.

Available as `/ss-close-story` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
