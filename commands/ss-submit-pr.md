# ss-submit-pr

**Phase: open PR** — follow [`ss-flow.md`](../harness/ss-flow.md) (after critic PASS, **security PASS**, optional [`/ss-handoff`](./ss-handoff.md), or human sign-off).

Opens a **GitHub pull request** from the **current branch**. **Does not merge.**

In **Agent** mode:

1. **Security gate (required when vendored):** ensure `/ss-security-audit` completed with overall PASS:

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --check-state
```

If this fails, stop and run [`ss-security-audit`](./ss-security-audit.md) (or fix findings) before opening a PR.

2. Prefer deterministic helpers when vendored: `node .cursor/vendor/skillsync/tools/render-pr-body.cjs .` then `node .cursor/vendor/skillsync/tools/open-pr.cjs .` (or `yarn ss:open-pr` if wired in consumer `package.json`). Use `--dry-run` / `--no-push` when checking only.
3. For title/body prose the script cannot infer, follow [`submit-github-pr`](../skills/engineering/submit-github-pr/SKILL.md) — write narrative into `.harness/pr-body.md` before `open-pr.cjs`. When **`.harness/code-handoff.md`** exists, reuse its Intent and What to verify (do not paste the whole handoff into the PR).

In **Ask** mode, print the skill checklist and exact tool commands.

**Inputs:** base branch, title, body — ask if missing; may derive from diff, commits, or **`.harness/state.md`** (TDD evidence / verification plan / Security Evidence).

Consumer wrappers (e.g. `qp-submit-pr`) may add tracker defaults and still point here.

**Optional — journal handoff:** If consumer `skillsync.config.json` has `journal.enabled` (or `JOURNAL_HANDOFF=1` + vault), after the PR URL is printed follow [`journal-handoff`](../skills/personal/journal-handoff/SKILL.md) with `mode: submit-pr` (weekly note only; do not mark todos done).

Available as `/ss-submit-pr` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
