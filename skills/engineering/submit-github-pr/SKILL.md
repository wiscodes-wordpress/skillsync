---
name: submit-github-pr
description: >
  Open a GitHub pull request from the current branch using gh: deliberate title and
  terse body (Purpose, Changes Made, optional visual checks + screenshot), body via
  temp file, push if needed. Does not merge. Use when user opens a PR, /ss-submit-pr,
  qp-submit-pr, gh pr create, or post-review submit.
---

# Submit GitHub PR

**Phase: submit work for review** — create (open) a **pull request** from the **current branch** with a deliberate **title** and **terse body** for human reviewers. **Not** merging.

**Typical order:** after implementation, prefer **`/ss-finish`** (critic → security → optional handoff → open PR). See **`commands/ss-finish.md`** / **`/ss-flow`**.

## Principles

- Run **`git`** and **`gh`** from the **repository root** unless consumer docs say otherwise.
- **Ask / read-only:** print the checklist and exact commands for the human; do not require `gh` to succeed in chat-only mode.
- **No AI / Cursor attribution** in PR bodies — no `Made in Cursor`, `Made-with: Cursor`, “generated with AI”, or similar.
- **Body stays short** — written for a human scanning the PR page. Verification lives in CI / local preflight / the diff — not pasted into the body.

## Writing rules (body)

Apply [`anti-slop`](../../productivity/anti-slop/SKILL.md). Then tighten further:

- **One fact per bullet.** If a bullet needs a semicolon or a second sentence, split it or cut it.
- **Cut the setup.** No “This PR…”, “In order to…”, “As part of PROJECT-123…”. Start with the fact.
- **No file inventory.** Files Changed already lists them. Name a file only when the reviewer must open that one.
- **Honest about risk** — at most one `**Risk:**` line, and only when the risk is real. Do not invent one.
- **No tracker workflow in the body** — link the ticket; do not paste `Status: Ready for Review` (that lives in the tracker).
- **No** harness dumps, test-command lists, `git diff --stat`, commit logs, or “how has this been tested” essays in the shared template.

Before writing the body to the temp file, **reread it** and delete any sentence a reviewer could skip without losing information.

## Prerequisites

- **`gh`** authenticated (`gh auth status`).
- **Current branch pushed** to `origin` (or `gh pr create` fails). Example: `git push -u origin HEAD`.
- **No duplicate open PR** for this head unless the human prefers editing the existing PR (`gh pr view`, web UI).
- **Local preflight passed** — go green *before* Actions spends minutes:
  - **Commit / push:** scoped — `yarn preflight` / `node …/preflight-local.cjs .`
  - **Open PR:** full — `yarn preflight:full` / `node …/preflight-local.cjs . --full`. Prefer **`open-pr.cjs`** (runs `--full` by default).

## Inputs (ask if missing)

1. **Base branch** — default: repo default (often `main`). Override via consumer convention or `gh pr create --base <branch>`.
2. **PR title** — short, imperative; include **issue key** when branch or tracker maps cleanly (consumer convention).
3. **PR body** — write **`.harness/pr-body.md`** using the template below.

## PR body template

Keep bullets short. Skip empty optional sections rather than writing “(none)”.

```markdown
## Purpose of PR

(1–2 sentences: why this change)

## Changes Made

- (concrete what landed)

## Visual changes to check in review (optional)

- (screens / flows reviewer should look at — omit whole section if no UI)

## Screenshot

(embed or link image when UI changed; omit section if no UI)
```

Optional single lines only when warranted:

- `**Risk:**` …
- Tracker browse link under Purpose (e.g. `**Jira:** https://…/browse/KEY-123`) — consumer wrappers may require a fixed label.

Do **not** add: Test plan, test results, harness evidence, recent commits, or “how to verify” command lists. Verification stays in CI / local preflight / the diff.

## Steps (agent)

1. Run **local preflight** for the action (scoped vs `--full`). On failure: fix; do not open the PR.
2. Confirm **remote branch** exists (`git push -u origin HEAD` if needed).
3. Draft **title** and fill the body template from `git diff <base>...HEAD`, commits, **`.harness/state.md`** (intent only — do not paste sections), optional **`.harness/code-handoff.html`** (Intent only), or human paste. Prefer **`render-pr-body.cjs`** + **`open-pr.cjs`**; write narrative into **`.harness/pr-body.md`** first. Reread and cut. Body via temp file when not using `open-pr.cjs`.
4. Create the PR:

   ```bash
   gh pr create --base <base> --title "<title>" --body-file /path/to/body.md
   ```

   Prefer explicit body over `gh pr create --fill`.

5. **Optional —** consumer may append **`Fixes #n`**, open as **draft**, assign reviewer, or transition the tracker — follow that repo’s wrapper (e.g. **`qp-submit-pr`**). Do not invent board states in this shared skill.
6. Print **PR URL**; next steps per consumer policy.

## Consumer wrappers

**Shared (`/ss-submit-pr` + this skill):** terse Purpose / Changes body, writing rules, preflight `--full`, security gate, `open-pr.cjs`.

**Consumer-owned (Lifeway / work / product boards):** thin slash commands (e.g. `qp-submit-pr`, `dcd-submit-pr`) that **call the shared flow first**, then add workplace rules. Do **not** put those rules in skillsync.

| Shared | Consumer wrapper (example: DCD / Lifeway) |
|--------|---------------------------------------------|
| Purpose · Changes · optional Visual · Screenshot | Same sections, plus workplace checklist if required |
| Writing rules (one fact / bullet, no file inventory) | Keep those rules |
| Optional `**Risk:**` / ticket browse link | Title prefix `[DCD-####]`; Jira link under Purpose |
| `gh pr create` (ready or as consumer prefers) | Often `--draft`; assignee; board transition e.g. `Ready for Review` |
| No tracker status line in the body | Transition Jira via API / manual; status stays in Jira |

Pattern for a consumer command file (lives in the **product repo**, not here):

```markdown
# qp-submit-pr

1. Follow vendored `/ss-submit-pr` (preflight --full, security, terse `.harness/pr-body.md`).
2. Apply workplace extras: title prefix, draft flag, checklist, Jira transition, assignees.
3. Do not weaken the shared writing rules.
```

See [`docs/consumer-setup.md`](../../../docs/consumer-setup.md) → **Product PR wrappers**.

## Related

**Optional journal handoff:** When the consumer enables `skillsync.config.json` → `journal` (or `JOURNAL_HANDOFF`), after a successful PR open follow **`journal-handoff`** `mode: submit-pr` — weekly Journal bullet only (see `skills/personal/journal-handoff/SKILL.md`).
