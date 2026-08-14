# ss-submit-pr

**REQUIRED:** terse PR body + writing rules in [`submit-github-pr`](../skills/engineering/submit-github-pr/SKILL.md); preflight `--full` before open. No harness dumps.

**Phase: open PR** — follow [`harness/ss-flow.md`](../harness/ss-flow.md) (after critic PASS, **security PASS**, optional [`/ss-handoff`](./ss-handoff.md), or human sign-off). Usually via [`/ss-finish`](./ss-finish.md).

Opens a **GitHub pull request** from the **current branch**. **Does not merge.**

In **Agent** mode:

1. **Local preflight (required when vendored):** go green *before* the PR so GitHub Actions is confirmation, not discovery:

```bash
# PR gate — full suite incl. full E2E when the repo has e2e/test:e2e/playwright/cypress
node .cursor/vendor/skillsync/tools/preflight-local.cjs . --full
# skillsync repo root:
yarn preflight:full
```

Commit/push hooks use scoped preflight (story/diff E2E only). Do not open the PR until `--full` passes (override only with explicit human `--skip-preflight` / `--skip-full-e2e`).

2. **Security gate (required when vendored):** ensure `/ss-security-audit` completed with overall PASS:

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --check-state
```

If this fails, stop and run [`ss-security-audit`](./ss-security-audit.md) (or fix findings) before opening a PR.

3. Prefer deterministic helpers when vendored: `node .cursor/vendor/skillsync/tools/render-pr-body.cjs .` then `node .cursor/vendor/skillsync/tools/open-pr.cjs .` (or `yarn ss:open-pr` if wired in consumer `package.json`). `open-pr.cjs` runs **preflight `--full`** + security unless `--skip-preflight` / `--skip-full-e2e` / `--skip-security`. Use `--dry-run` / `--no-push` when checking only.

4. **Body** — follow [`submit-github-pr`](../skills/engineering/submit-github-pr/SKILL.md): write a **terse** `.harness/pr-body.md` (Purpose · Changes Made · optional Visual checks · Screenshot). One fact per bullet; no setup throat-clearing; no file inventory; no harness/test dumps. Reread and cut before open. When **`.harness/code-handoff.html`** exists, reuse **Intent** only.

5. **Optional GitNexus** (when MCP indexed — [`docs/gitnexus.md`](../docs/gitnexus.md)): may inform risk judgment; it does **not** go in the PR body and does **not** replace the security gate.

In **Ask** mode, print the skill checklist and exact tool commands.

**Inputs:** base branch, title, body — ask if missing; derive Purpose / Changes from diff, commits, or **`.harness/state.md`** intent (not evidence dumps).

Consumer wrappers (e.g. `qp-submit-pr` on Lifeway) add workplace extras (DCD checklist, draft, Jira `Ready for Review`) **after** this shared flow — see [`docs/consumer-setup.md`](../docs/consumer-setup.md) → **Product PR wrappers**.

**Optional — journal handoff:** If consumer `skillsync.config.json` has `journal.enabled` (or `JOURNAL_HANDOFF=1` + vault), after the PR URL is printed follow [`journal-handoff`](../skills/personal/journal-handoff/SKILL.md) with `mode: submit-pr` (weekly note only; do not mark todos done).

Available as `/ss-submit-pr` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
