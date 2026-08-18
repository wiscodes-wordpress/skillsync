# ss-to-issues

**Story — optional slice publish.** Follow [`ss-flow.md`](../harness/ss-flow.md). Not initiative epic publish (that is `/ss-roadmap` publish-last).

After **`/ss-plan`**, publish approved work as tracker issues before **`/ss-implement`**.

In **Agent** mode, follow [`to-issues`](../skills/engineering/to-issues/SKILL.md) and [VOICES.md](../skills/engineering/to-issues/VOICES.md). **Agent voice** (own project): vertical slices, HITL/AFK, full template. **Workplace voice** (Lifeway and similar): short human tickets, no delivery jargon. Read MCP tool schemas before Jira/GitHub calls. After human approves the list, prefer **`publish-slices-from-state.cjs`** (dry-run first, then `--publish --approved --parent KEY --voice agent|workplace`). In **Ask** mode, output paste-ready issue bodies.

**Inputs:** parent issue key, **`.harness/state.md`**, or spec in chat; consumer issue-tracker docs for assignee/types/labels.

Consumer wrappers (e.g. `qp-to-issues`) may add defaults and still point here.

Available as `/ss-to-issues` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
