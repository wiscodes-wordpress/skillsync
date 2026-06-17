# ss-submit-pr

**Phase: open PR** — follow [`ss-flow.md`](../harness/ss-flow.md) (after critic PASS or human sign-off).

Opens a **GitHub pull request** from the **current branch**. **Does not merge.**

In **Agent** mode:

1. Prefer deterministic helpers when vendored: `node .cursor/vendor/skillsync/tools/render-pr-body.cjs .` then `node .cursor/vendor/skillsync/tools/open-pr.cjs .` (or `yarn ss:open-pr` if wired in consumer `package.json`). Use `--dry-run` / `--no-push` when checking only.
2. For title/body prose the script cannot infer, follow [`submit-github-pr`](../skills/engineering/submit-github-pr/SKILL.md) — write narrative into `.harness/pr-body.md` before `open-pr.cjs`.

In **Ask** mode, print the skill checklist and exact tool commands.

**Inputs:** base branch, title, body — ask if missing; may derive from diff, commits, or **`.harness/state.md`** (TDD evidence / verification plan).

Consumer wrappers (e.g. `qp-submit-pr`) may add tracker defaults and still point here.

Available as `/ss-submit-pr` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
