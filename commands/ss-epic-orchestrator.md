---
description: Deliver one tracker epic via Paseo worktrees and skillsync story phases. Preview localhost before each PR.
argument-hint: EPIC-123
---

# ss-epic-orchestrator

**REQUIRED voice:** simple, concise teammate chat ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md): problem → fix → next).

**Belt: Epic** — Paseo babysits **one epic**. Story phases stay on the Story belt ([`/ss-flow`](./ss-flow.md) · map [`harness/ss-flow.md`](../harness/ss-flow.md)).

Do **not** invent a parallel Phase 1–4 pipeline. Do **not** run [`/ss-loop`](./ss-loop.md) while this command is driving (`/ss-loop` is AFK for **one** story).

**Paseo** owns the loop, worktrees, concurrency, and the story-local preview.

**Skillsync** owns each story:

`/ss-plan` → `/ss-implement` → `/ss-review` → `/ss-security-audit` → `/ss-feature-evidence` (UI only) → `/ss-submit-pr` → `/ss-close-story`

If slash commands are missing (Claude / Paseo / second laptop), **open the matching `.md` under `.claude/commands/` or `.cursor/commands/` and execute it**.

**Epic source:** `$ARGUMENTS` (epic key or URL). If empty, ask before creating worktrees.

## Rules

- One active epic. Refuse a second until the ledger is `idle` or `done`.
- Never implement in the main checkout. One Paseo **worktree per story**.
- At most **two** stories in implement/review/security when `allowedScope` does not overlap and neither is in the consumer **hot zone** (`AGENTS.md`).
- At most **one** localhost preview at a time. Human click-through **before** `/ss-submit-pr` when the story has UI.
- Do not merge or push to protected branches unless the current command is `/ss-submit-pr` and the human accepted preview (or said no UI).
- Unclear product/security/architecture → `waiting_for_human` and one concrete question.

Consumer docs (`AGENTS.md`, `docs/agents/domain.md`) own tracker keys, branch pattern, preview command, and extra hot-zone paths.

## Ledger

| What | Where | Who writes |
|------|--------|------------|
| Active epic + story queue | `.harness/epics/current.json` (usually gitignored) | **this orchestrator only** |
| Human table | `.harness/epics/progress.md` (usually gitignored) | this orchestrator |
| Per-story contract | that worktree’s `.harness/state.md` | the worker running `/ss-*` |

Copy a consumer template into `current.json` if needed. Implementation worktrees do **not** own the ledger. Tracker (Jira/GitHub) stays planning source of truth; the JSON is execution (workspace, branch, session, phase, preview).

Story fields: `id`, `title`, `status`, `phase`, `dependencies`, `allowedScope`, `conflictScope`, `workspace`, `branch`, `implementationSession`, `reviewSession`, `preview`, `attempts`, `result`.

Statuses: `planned` · `ready` · `running` · `review` · `preview` · `waiting_for_human` · `blocked` · `done` · `failed` · `cancelled`.

## Router (one `/ss-*` per worker)

| Story state | In that story’s worktree |
|-------------|--------------------------|
| next child ready | `/ss-plan` (then fill `allowedScope`) |
| plan present | `/ss-implement` |
| impl claims done | `/ss-review` in a **fresh** agent |
| review PASS | `/ss-security-audit` |
| security PASS + UI | `/ss-feature-evidence` |
| evidence PASS (or no UI) | start consumer preview; wait for the human |
| human OK | `/ss-submit-pr` |
| PR merged | `/ss-close-story` |

Prefer sequential for schema → API → UI. Unknown scope → run that story alone.

### Worker prompt

> Story `<ID>`: `<TITLE>` in this worktree only. Run `/<SS_COMMAND>` (or read the command `.md` if slash is missing). Follow `AGENTS.md` + vendor `harness/ss-flow.md`. Edit only `<allowedScope>`. Do not merge, push to protected branches, or open a PR unless this command is submit-pr. Write `.harness/state.md`. Report next `/ss-*` and blockers.

## Preview

Start the consumer preview **in that worktree** (e.g. `yarn epic:preview` or `paseo.json` script `preview`). One stack at a time. `/ss-feature-evidence` does not replace the human pass. Stop preview before starting another story’s stack.

## Paseo loop

Each iteration: read `current.json` → collect finished workers → repair if `attempts` < 2 → start at most two eligible workers → if one story is preview-ready, start preview and **stop for the human** → print the table. Exit when every story is `done` / `waiting_for_human` / `blocked`.

Worktree: isolation `worktree`, `branch-off` from the consumer default remote (`origin/main` unless `prBaseBranch` says otherwise). Branch pattern from consumer docs.

`current.json` does **not** sync across laptops. Rebuild from the tracker if you switch machines. Heal vendor with the consumer’s `skillsync:heal` / `ensure-skillsync`.

## Status table

| Story | Status | Phase | Workspace | Tests | Review | Preview | Next / blocker |
|---|---|---|---|---|---|---|---|

## Initial action

1. Resolve the epic key or ask.
2. Write `current.json` + list children as `planned` (`phase`: `ss-plan`).
3. Show the table and which two (if any) can run in parallel. **Do not** create implementation worktrees until that plan is shown.
4. After the human says go, start the Paseo loop.

Available as `/ss-epic-orchestrator` when linked into **`.cursor/commands/`** and **`.claude/commands/`** (`docs/consumer-setup.md`).
