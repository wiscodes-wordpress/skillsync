# ss-handoff

**Phase: human code walkthrough** — follow [`ss-flow.md`](../harness/ss-flow.md) (after `/ss-review` PASS; ideally after `/ss-security-audit`; **before** `/ss-submit-pr`).

Writes a **human-facing** brief of the branch changes so you can review without replaying the agent thread. **Does not** open a PR, merge, close Jira, or replace the critic / security gates.

In **Agent** mode, follow [`code-handoff`](../skills/engineering/code-handoff/SKILL.md):

1. Read **`.harness/state.md`** and `git` base…HEAD (commits + diff).
2. Rewrite **`.harness/code-handoff.md`** (Intent, decisions, Mermaid/change map, hotspots with short snippets, test evidence, human verify checklist).
3. Print the path and suggest next: complete the checklist → [`ss-submit-pr`](./ss-submit-pr.md) (security PASS required for submit).

In **Ask** mode, print the skill outline and exact git commands; write the file only if asked.

**Inputs:** base branch (from `skillsync.config.json` `prBaseBranch` or ask); optional focus paths. Context from **`.harness/state.md`** is preferred over chat history.

**Not:** [`handoff`](../skills/productivity/handoff/SKILL.md) (agent→agent) or [`journal-handoff`](../skills/personal/journal-handoff/SKILL.md) (Obsidian).

Available as `/ss-handoff` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
