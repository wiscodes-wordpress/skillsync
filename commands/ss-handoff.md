# ss-handoff

**Phase: human code walkthrough** — follow [`ss-flow.md`](../harness/ss-flow.md) (after `/ss-review` PASS; ideally after `/ss-security-audit`; **before** `/ss-submit-pr`).

Writes a **browser HTML** brief of the branch changes so you can review without replaying the agent thread. **Does not** open a PR, merge, close Jira, or replace the critic / security gates.

In **Agent** mode, follow [`code-handoff`](../skills/engineering/code-handoff/SKILL.md) and [`HTML-REPORT.md`](../skills/engineering/code-handoff/HTML-REPORT.md):

1. **Scaffold (when missing):** if **`.harness/code-handoff.html`** is absent:

```bash
node .cursor/vendor/skillsync/tools/init-plan-html.cjs . --kind handoff --task "<issue or title>"
```

Use `--force` only when deliberately resetting chrome (overwrites content).

2. Read **`.harness/state.md`** and `git` base…HEAD (commits + diff).
3. Rewrite **`.harness/code-handoff.html`** (fill Intent, decisions, Mermaid/change map, hotspots, **`#frontend` / `#backend`** from the diff or N/A, tests, `#verify` checklist) — same path every time.
4. **Validate** (when vendored):

```bash
node .cursor/vendor/skillsync/tools/validate-plan-html.cjs . --kind handoff
```

Fix until exit 0.
5. Print the path and tell the human to **open it in a browser**. Suggest next: complete `#verify` → [`ss-submit-pr`](./ss-submit-pr.md) (security PASS required for submit).

In **Ask** mode, print the skill outline and exact tool/git commands; write the file only if asked.

**Inputs:** base branch (from `skillsync.config.json` `prBaseBranch` or ask); optional focus paths. Context from **`.harness/state.md`** is preferred over chat history.

**Not:** [`handoff`](../skills/productivity/handoff/SKILL.md) (agent→agent) or [`journal-handoff`](../skills/personal/journal-handoff/SKILL.md) (Obsidian).

Available as `/ss-handoff` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
