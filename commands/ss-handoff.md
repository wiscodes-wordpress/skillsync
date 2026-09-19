# ss-handoff

**Phase: human code walkthrough** — follow [`harness/ss-flow.md`](../harness/ss-flow.md) (after `/ss-security-audit` PASS and `/ss-feature-evidence`; **before** `/ss-submit-pr`). Usually via [`/ss-finish`](./ss-finish.md).

Writes **Markdown SoT** + derived **browser HTML** of the branch changes so you can review without replaying the agent thread. **Does not** open a PR, merge, close Jira, or replace the critic / security gates.

In **Agent** mode, follow [`code-handoff`](../skills/engineering/code-handoff/SKILL.md) and [`HTML-REPORT.md`](../skills/engineering/code-handoff/HTML-REPORT.md):

1. **Scaffold (when missing):** if **`.harness/code-handoff.md`** is absent:

```bash
node .cursor/vendor/skillsync/tools/init-plan-html.cjs . --kind handoff --task "<issue or title>"
```

Use `--force` only when deliberately resetting (overwrites content).

2. Read **`.harness/state.md`** and `git` base…HEAD (commits + diff).
3. Rewrite **`.harness/code-handoff.md`** (Intent, decisions, Mermaid/change map, hotspots, frontend/backend, tests, verify) — same path every time. **Do not hand-edit** `.html`.
4. **Render + validate** (when vendored):

```bash
node .cursor/vendor/skillsync/tools/render-plan-html.cjs . --kind handoff --validate
node .cursor/vendor/skillsync/tools/validate-plan-html.cjs . --kind handoff
```

Fix the Markdown until exit 0.
5. Print the **`.html`** path and tell the human to **open it in a browser**. Suggest next: complete `#verify` → [`ss-submit-pr`](./ss-submit-pr.md) (security PASS required for submit).

In **Ask** mode, print the skill outline and exact tool/git commands; write the file only if asked.

**Inputs:** base branch (from `skillsync.config.json` `prBaseBranch` or ask); optional focus paths. Context from **`.harness/state.md`** is preferred over chat history.

**Not:** [`handoff`](../skills/productivity/handoff/SKILL.md) (agent→agent) or [`journal-handoff`](../skills/personal/journal-handoff/SKILL.md) (Obsidian).

**Voice:** print the HTML path and next step only. Keep chat short; the handoff file carries the walkthrough ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md)).

Available as `/ss-handoff` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
