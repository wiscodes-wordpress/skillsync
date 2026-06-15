# ss-submit-pr

**Phase: open PR** — follow [`ss-flow.md`](../harness/ss-flow.md) (after critic PASS or human sign-off).

Opens a **GitHub pull request** from the **current branch**. **Does not merge.**

In **Agent** mode, follow [`submit-github-pr`](../skills/engineering/submit-github-pr/SKILL.md) from the repo root. In **Ask** mode, print that skill’s checklist.

**Inputs:** base branch, title, body — ask if missing; may derive from diff, commits, or **`.harness/state.md`** (TDD evidence / verification plan).

Consumer wrappers (e.g. `qp-submit-pr`) may add tracker defaults and still point here.

Available as `/ss-submit-pr` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
