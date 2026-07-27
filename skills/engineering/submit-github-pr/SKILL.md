---
name: submit-github-pr
description: >
  Open a GitHub pull request from the current branch using gh: deliberate title and body
  (summary, test plan, tracker link), body via temp file, push if needed. Does not merge.
  Use when user opens a PR, /ss-submit-pr, qp-submit-pr, gh pr create, or post-review submit.
---

# Submit GitHub PR

**Phase: submit work for review** — create (open) a **pull request** from the **current branch** with a deliberate **title** and **body** (summary, how to test, risks, tracker **Browse** URL, optional screenshots). **Not** merging; hands work to reviewers.

**Typical order:** after implementation (and often after harness **critic** / review), before consumer steps that assume an open PR (QA handoff, `Fixes #n` automation, tracker updates after merge — see consumer docs and **`commands/ss-workflow.md`** in skillsync or the linked **`/ss-workflow`** command).

## Principles

- Run **`git`** and **`gh`** from the **repository root** unless consumer docs say otherwise.
- **Ask / read-only:** print the checklist and exact commands for the human; do not require `gh` to succeed in chat-only mode.
- **No Cursor attribution in PR bodies** — do not append `Made in Cursor`, `Made-with: Cursor`, or similar footers. Write only the deliberate review content (summary, test plan, risks, tracker links).

## Prerequisites

- **`gh`** authenticated (`gh auth status`).
- **Current branch pushed** to `origin` (or `gh pr create` fails). Example: `git push -u origin HEAD`.
- **No duplicate open PR** for this head unless the human prefers editing the existing PR (`gh pr view`, web UI).

## Inputs (ask if missing)

1. **Base branch** — default: repo default (often `main`). Override via consumer convention or `gh pr create --base <branch>`.
2. **PR title** — short, imperative; include **issue key** (`PROJECT-123`, etc.) when branch or tracker maps cleanly (consumer **issue-tracker** / agent docs).
3. **PR body** — what changed, how to test (commands the repo actually uses), risks, tracker link. Optional: screenshots / Loom.

## Steps (agent)

1. Confirm **remote branch** exists (`git status`; `git push -u origin HEAD` if needed).
2. Build **title** and **body** from `git diff <base>...HEAD`, commits, **`.harness/state.md`**, optional **`.harness/code-handoff.html`** (Intent / What to verify only), or human paste. Prefer **`render-pr-body.cjs`** + **`open-pr.cjs`** from vendored `tools/` when available; write narrative into **`.harness/pr-body.md`** first when prose is needed. Write body to a **temp file** (e.g. `/tmp/pr-body.md`) to avoid shell escaping issues when not using `open-pr.cjs`.
3. Create the PR:

   ```bash
   gh pr create --base <base> --title "<title>" --body-file /path/to/body.md
   ```

   Use `gh pr create --fill` **only** when the human wants GitHub’s default from a single commit and accepts a thin body; prefer an explicit body for team review.

4. **Optional —** consumer repo may ship a script to append **`Fixes #n`** (or similar) to the description without wiping narrative; follow that repo’s docs / QA-close command.

5. Print **PR URL**; suggest next steps: request review, consumer **QA handoff** / **merge** / **tracker** per policy.

## Consumer wrappers

Product-specific titles (fixed Jira project key), env vars, or `Fixes` scripts stay in thin commands (e.g. **`qp-submit-pr`**) that still invoke this skill’s flow.

## Related

**Optional journal handoff:** When the consumer enables `skillsync.config.json` → `journal` (or `JOURNAL_HANDOFF`), after a successful PR open follow **`journal-handoff`** `mode: submit-pr` — weekly Journal bullet only (see `skills/personal/journal-handoff/SKILL.md`).
