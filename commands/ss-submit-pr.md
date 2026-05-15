# ss-submit-pr

**Phase: submit work for review** — open a **GitHub pull request** from the **current branch** with a deliberate **title** and **body** (summary, test plan, tracker link, screenshots if useful). **Not** merging the PR; hands the slice to reviewers.

**Typical order:** after **`/ss-implement`** (and often after **`/ss-review`**), before consumer steps that assume an open PR (QA handoff, `Fixes #n` automation, tracker “Done” after merge — see consumer docs and [`ss-workflow`](./ss-workflow.md)).

**How this runs:** This `.md` file **instructs the agent**. In **Agent** mode, use the **terminal** from the **repository root** (`gh`, `git`). In **Ask / read-only** mode, print the checklist and exact commands for the human.

## Prerequisites

- **`gh`** authenticated for this repo (`gh auth status`).
- **Current branch pushed** to `origin` (or `gh pr create` fails). Example: `git push -u origin HEAD`.
- **No duplicate open PR** for this head branch unless the human prefers editing the existing PR (`gh pr view`, web UI).

## Inputs (ask if missing)

1. **Base branch** — default: repo default (often `main`). Override via consumer convention or `gh pr create --base <branch>`.
2. **PR title** — short, imperative; include **issue key** (`PROJECT-123`, etc.) when branch or tracker maps cleanly (consumer **issue-tracker** / agent docs).
3. **PR body** — what changed, how to test (commands the repo actually uses), risks, link to tracker ticket **Browse** URL if applicable. Optional: screenshots / Loom.

## Agent steps (summary)

1. Confirm **remote branch** exists (`git status`; `git push -u origin HEAD` if needed).
2. Build **title** and **body** from `git diff <base>...HEAD`, commits, **`.harness/state.md`**, or human paste. Write body to a **temp file** (e.g. `/tmp/pr-body.md`) to avoid shell escaping issues.
3. Create the PR:

   ```bash
   gh pr create --base <base> --title "<title>" --body-file /path/to/body.md
   ```

   Use `gh pr create --fill` **only** when the human wants GitHub’s default from a single commit and accepts a thin body; prefer an explicit body for team review.

4. **Optional —** consumer repo may ship a script to append **`Fixes #n`** (or similar) to the description without wiping narrative; follow that repo’s docs / QA-close command.

5. Print **PR URL**; next steps: request review, run consumer **QA handoff** / **merge** / **tracker** commands per policy.

## References

- [`ss-workflow.md`](./ss-workflow.md) — phase order (PR open vs merge vs QA).
- Consumer wrappers may chain **`/ss-submit-pr`** with tracker-specific names (e.g. `qp-submit-pr`).

This command will be available in chat with `/ss-submit-pr` when this file is linked into the consumer **`.cursor/commands/`** directory (see `docs/consumer-setup.md`).
