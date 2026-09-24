---
name: peer-review
description: >
  Review someone else's pull request as a careful colleague — reconstruct the
  author's intent, read the code around the diff, and produce severity-ranked
  line-anchored comments that get posted only after you approve them. Use when
  asked to review a teammate's PR, critique another person's PR, "review PR #N",
  or /ss-peer-review. Not for your own branch (that is /ss-review) and it never
  approves, never pushes to the author's branch.
---

# Peer review (someone else's pull request)

**Phase: inbound review** — you are a reviewer on a change **you did not write**.

**Does:** reconstruct intent, read the real code, rank findings by severity, draft line-anchored comments, and post them **only on the human's explicit go**.
**Does not:** review your own branch (that is [`/ss-review`](../../../harness/harness-critic.md)), approve a PR, push commits to the author's branch, resolve their threads, or merge.

## Why this is a different skill from `/ss-review`

`/ss-review` grades **your** generator output against **`.harness/state.md`** — a contract you wrote, with a PASS/FAIL that gates your own next step. None of that holds here:

| | `/ss-review` (self) | `/ss-peer-review` (theirs) |
|---|---|---|
| Intent source | `.harness/state.md` | PR body, linked ticket, commits — often incomplete |
| Verdict | PASS / IN_PROGRESS / FAIL in state | comment / request changes; **approval stays with the human** |
| Audience | the next agent turn | a colleague who will read every word |
| Failure mode | missing a defect | **nit spam and confident wrong claims** |
| Write surface | your branch, your state file | comments only — their branch is off-limits |

The two failure modes in that table drive most of the rules below. A reviewer who leaves 30 style nits and one wrong assertion about a bug costs the author more time than they save.

## Hard rules

1. **Never write to the author's branch.** No commit, push, force-push, rebase, or `gh pr merge`. Suggested edits go inside comments as GitHub ```suggestion blocks.
2. **Never approve.** Recommend `approve` / `comment` / `request changes` and let the human cast the vote. Approval is a signature.
3. **Never post without a go.** Draft everything, show it, wait. See [Phase 5](#phase-5--gate-then-post).
4. **Never resolve or dismiss someone else's thread.**
5. **Every blocking finding names a concrete failure:** inputs or state → wrong output, crash, or regression. If you cannot state how it breaks, it is not blocking — downgrade it to a question.
6. **Do not claim a check failed unless you ran it or read the CI log.** "This probably breaks the build" is not review, it is noise.
7. **Review the change as submitted.** "Rewrite this a different way" is only blocking if the current way is actually broken; otherwise it is a question about intent.

## Phase 1 — Pick up the PR and its intent

If the human named a PR (number or URL), use it. If not, list what is waiting:

```bash
node <skillsync>/tools/list-prs.cjs        # teammates' open, ready-for-review PRs
```

That reads `Journal/_dashboard/github-prs.json` for the people and repo scopes to watch, and hides PRs you already reviewed. If the config is missing, fall back to `gh pr list --search "is:open -author:@me draft:false"` in the current repo and say which repo you scoped to.

Then gather:

```bash
gh pr view <n> --json title,body,author,baseRefName,headRefName,isDraft,additions,deletions,changedFiles,labels
gh pr diff <n>
gh pr view <n> --json commits --jq '.commits[].messageHeadline'
gh pr checks <n>
gh api repos/{owner}/{repo}/pulls/<n>/comments --paginate   # existing line threads
gh pr view <n> --json reviews,comments                       # existing reviews + top-level
```

**Reconstruct intent before reading code.** Write, for yourself, one sentence: *this PR claims to do X so that Y*. Sources in order of authority: linked ticket → PR body → commit messages → the diff itself.

If you cannot recover the intent, **that is finding #1** and it is a question, not an accusation: the reviewer cannot verify a change whose goal is unstated. Ask for it and keep reviewing what you can verify (correctness, tests, conventions) rather than stalling.

**Ticket:** if the branch or title carries an issue key (`^[A-Z][A-Z0-9]+-\d+`), read the ticket — acceptance criteria are the real specification and PR bodies routinely omit them. Use the Atlassian MCP when connected; if it exposes no tools, read via Jira REST v2.

**Existing threads:** read them now, before forming your own opinions. If a human already raised a point, do **not** restate it in your own words — that fragments the conversation. At most add one short `+1` with new evidence, or stay silent.

## Phase 2 — Read the code, not only the diff

A diff is a keyhole. It hides callers, the behavior you replaced, and the code that should have changed and didn't. Check the branch out and read around every hunk:

```bash
gh pr checkout <n>          # detached local branch; you still never push
git diff --stat <base>...HEAD
git diff <base>...HEAD -- <path>
```

For each changed area:

- **Read the whole function and its file**, not the hunk. Context lines lie about scope.
- **Grep for callers** of every signature, prop, export, or route that changed — `grep -rn "<symbol>"`. Unmigrated callers are the single most common real defect a diff review misses.
- **Read the code that was deleted.** Ask what depended on it.
- **Diff the behavior, not the text.** For a changed conditional, enumerate the input cases and check each one against old and new.

**Then ask what is absent.** The highest-value reviewer contribution is almost always about code that is *not* in the diff:

- tests for the changed risk surface — and whether they would actually fail if the change were reverted
- the error, empty, loading, and offline paths for a new happy path
- feature-flag or capability guard, when the repo releases behind flags
- a matching migration, schema, or generated-type update when a contract moved
- localization keys for new user-facing strings
- the second platform, package, or app that shares the touched module

**If the PR is large** (roughly >40 files or >1500 changed lines), review in passes by surface and say plainly in the output which surfaces you covered and which you did not. Never let a partial read read as a complete one.

## Phase 3 — Apply the rubric

Load [REVIEW-RUBRIC.md](REVIEW-RUBRIC.md) for the severity ladder, the comment budget, and the per-dimension checklist.

Load [PROFILES.md](PROFILES.md) to resolve repo-specific conventions and verification commands from the checked-out repo (it detects the repo and carries known profiles, including Lifeway's).

Beyond that, the repo tells you its own rules — read what exists, skip what doesn't: root `AGENTS.md` / `CLAUDE.md`, `.cursor/rules/*.mdc`, `.github/PULL_REQUEST_TEMPLATE/`, linked skills under `.cursor/skills/`. Cite the file when a finding rests on a documented convention; a convention finding without a citation is just your preference.

## Phase 4 — Verify what you can

Run the repo's own checks on the checked-out branch — the commands come from the profile or the repo's `AGENTS.md`. Start minimal (format/lint → typecheck → unit tests for the touched workspace), expand only when something fails or the risk surface warrants it.

Read CI rather than re-running it when it already covers the change:

```bash
gh pr checks <n>
gh run view <run-id> --log-failed
```

**If CI is green but omits the changed surface, that is a finding.** Say which check is missing and why the surface needs one.

Record what you ran and what you skipped. Unverified is a legitimate state; pretending is not.

## Phase 5 — Gate, then post

Present the review **in chat first**, in this shape:

```markdown
## Peer review: <repo>#<n> — <title>
**Author:** <login> · **Intent:** <one sentence> · **Ticket:** <key or none>

### Findings
| # | Severity | File:line | Finding | Suggested fix |
|---|----------|-----------|---------|---------------|

### Draft comments
<each comment exactly as it would post, with its file:line anchor>

### Verification
- Ran: <commands + result>
- CI: <status, missing coverage>
- Not verified: <what and why>
- Coverage: <surfaces reviewed / not reviewed on large PRs>

### Recommendation
**<approve | comment | request changes>** — <one line of reasoning>
**Post these <k> comments to GitHub?**
```

Findings first, change summary last or not at all — the author already knows what they wrote.

Stop there. On an explicit go, post:

```bash
# line-anchored comments, one review
gh api repos/{owner}/{repo}/pulls/<n>/reviews \
  -f event=COMMENT -f body="<summary>" \
  -f 'comments[][path]=<file>' -F 'comments[][line]=<line>' -f 'comments[][body]=<text>'

# or a single summary review
gh pr review <n> --comment --body-file <tmp>/review.md
gh pr review <n> --request-changes --body-file <tmp>/review.md
```

Write bodies via a temp file, never inline heredocs with unescaped backticks. Post as **one review**, not a burst of separate comments. If the human edits or drops findings, post the edited set and nothing else.

`--approve` is not yours to run, even on a go for the others: if the human wants an approval, tell them to click it or run `gh pr review <n> --approve` themselves.

## Tone

You are a colleague, not a gate. Concretely:

- Ask about intent where you suspect a mistake but can't prove one: *"Was the `null` case meant to fall through here? A caller in `x.ts:88` passes undefined."* Never *"you forgot to handle null."*
- Attack the code, never the author. No "sloppy", "obviously", "as anyone knows".
- Prefix optional things with `nit:` so they are visibly ignorable, and honor the budget in the rubric.
- Praise at most once, specifically, and only for something non-obvious. Generic "great work!" reads as filler.
- Prose follows [`anti-slop`](../../productivity/anti-slop/SKILL.md): concrete paths and behaviors, abbreviations expanded on first use, no hype.
