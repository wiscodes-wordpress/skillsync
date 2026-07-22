---
name: journal-handoff
description: >-
  Optional post-step after planning, opening a GitHub PR, or closing a Jira
  story: append a weekly Journal bullet and update matching todos/goals in
  planning.json (start → in progress; close → done). Gated by
  skillsync.config.json journal.enabled or JOURNAL_HANDOFF. Use with /ss-plan,
  /ss-submit-pr, and /ss-close-story from any consumer (Lifeway, Quickpress,
  Cursor, or Kiro).
---

# Journal handoff

Personal journal updates after delivery-loop milestones. Invoked from
[`ss-plan`](../../../commands/ss-plan.md),
[`ss-submit-pr`](../../../commands/ss-submit-pr.md), and
[`ss-close-story`](../../../commands/ss-close-story.md) when the consumer opts in.

Weekly activity → **journal-weekly**. Goals/todos → **journal-planning**. This skill only orchestrates the handoff.

**Status lives in `planning.json`** (`todo` → `in progress` → `done`). Weekly Markdown is narrative only (Started / Opened PR / Shipped bullets) — do not encode status in the week table.

## Gate (skip silently if off)

Run handoff only when **either**:

1. Consumer root `skillsync.config.json` has `"journal": { "enabled": true, ... }`, or
2. Env `JOURNAL_HANDOFF=1` (or `true`) **and** a vault path is available.

If neither applies → **stop** (no error, no vault writes). Non-personal consumers stay unaffected.

## Resolve config

From the **consumer repository root** (cwd for `/ss-*`):

| Value | Source (first wins) |
|-------|---------------------|
| Vault | `journal.vaultPath` → `$JOURNAL_VAULT_PATH` → fallback DenMercs path below |
| Track | `journal.defaultTrack` (`work` \| `business` \| `life`) — **required** when enabled; ask if missing |
| Tools root | `journal.skillsyncToolsRoot` → `vendorRoot` → `.cursor/vendor/skillsync` |

Fallback vault (same as other journal skills):

`$HOME/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs` (override with `$JOURNAL_VAULT_PATH` or `--vault`)

| `defaultTrack` | Daily log column | Typical consumer |
|----------------|------------------|------------------|
| `work` | Work | Lifeway |
| `business` | Business | Quickpress |
| `life` | (use Focus / Wins; ask if unclear) | Personal |

Confirm the vault directory exists before writing. If missing, report and skip.

## Ensure weekly note (all modes)

Before any weekly write, create this week’s Markdown note **if missing**:

```bash
node <skillsyncToolsRoot>/tools/journal-ensure-week.cjs --vault "<vault>"
```

Idempotent — never overwrites a filled week. Prefer this CLI over hand-writing the template (same template as journal-weekly Mode A).

## Issue key links (Jira)

Weekly bullets that mention a story/epic key must use a markdown browse link when the site is known:

`Started [KEY](https://SITE.atlassian.net/browse/KEY) — short title`

Resolve site: conversation/MCP URL → `journal.jiraBases[PREFIX]` → `JOURNAL_JIRA_BASES` / `JOURNAL_JIRA_BASE_URL` → ask once. Same rule as **journal-weekly** Mode B. Keep bare `KEY` in `planning.json` titles for matching.

## Todo status

Canonical values: `todo` \| `in progress` \| `done`.

Legacy `doing` (if present in old data) means **`in progress`** — rewrite to `in progress` when touching that todo.

Open todos = `todo` \| `in progress` (and legacy `doing`).

## Modes

### `start-story` — after `/ss-plan` persists `.harness/state.md`

Run once the planner has written state (not at the first grill question). Idempotent per issue key / week. This is the usual path that seeds the week when work starts.

1. Resolve **issue key** and short title from `.harness/state.md`, branch name, or the story under plan. If no key and no clear title → ask once; skip if still unclear.
2. **Ensure weekly note** (see above) — create blank week if none exists for this Monday.
3. Read `Journal/_dashboard/planning.json`.
4. Among **open** todos on `defaultTrack`, match by title containing the **issue key** (preferred), else strong title overlap with the story summary.
5. Matching:
   - **Exactly one** → set `status: "in progress"` (keep `googleTaskId`). Optionally pin `week` to the current ISO week if unset.
   - **Zero** → create a todo: verb-first title including the key (e.g. `Ship KEY — short title`), `track: defaultTrack`, `status: "in progress"`, `week` = current ISO week, new `t…` id.
   - **Multiple** → ask the user; do not guess.
6. Weekly Daily log (today’s cell for the track column): append **one** bullet only if this week’s note does **not** already contain a Started/Planning line for that KEY:

   `Started [KEY](https://SITE/browse/KEY) — short title`

   (Bare `Started KEY — …` also counts as already present — do not duplicate.)

7. Set `updatedAt` (ISO-8601). Refresh index/bundle, then **regenerate today’s standup** so `## Focus` picks up work-track `in progress` todos:

```bash
node <skillsyncToolsRoot>/tools/journal-index.cjs --vault "<vault>"
node <skillsyncToolsRoot>/tools/journal-dashboard-bundle.cjs --vault "<vault>"
node <skillsyncToolsRoot>/tools/journal-standup.cjs --vault "<vault>"
```

(`## Focus` is Lifeway/work only — rebuilt from `planning.json` on every standup run.)

8. Remind the user to **close/reopen** `Journal/_dashboard/dashboard.obsidian.html` in Obsidian when the snapshot changed.

Re-running `/ss-plan` for the same KEY: leave status `in progress`; do **not** duplicate the weekly bullet. Standup Focus still lists it until `done`.

### `submit-pr` — after PR URL is printed

Do **not** mark todos or goals done. Prefer leaving status `in progress` if already set.

1. **Ensure weekly note** (see above).
2. Merge one verb-first bullet into **today’s** Daily log cell for the track column, e.g.:

   `Opened PR for [KEY](https://SITE/browse/KEY) — short title (https://…)`

   Prefer issue key from branch, PR title, or `.harness/state.md`. Include PR URL when known. Link the KEY when the Jira site is known. Skip if this week already has an Opened-PR line for that KEY.
3. Refresh index:

```bash
node <skillsyncToolsRoot>/tools/journal-index.cjs --vault "<vault>"
```

4. Tell the user the weekly path and that todos stay open until close-story.

### `close-story` — after Jira Done + harness reset

1. **Ensure weekly note** (see above), then append (Daily log **and** a short **Wins & learnings** line when the ship is noteworthy):

   `Shipped [KEY](https://SITE/browse/KEY) — short title`

2. Read `Journal/_dashboard/planning.json`.
3. Among **open** todos (`status` `todo` \| `in progress`, plus legacy `doing`) on `defaultTrack`, match by:
   - Title contains the **issue key** (preferred), else
   - Strong title overlap with the story/PR summary.
4. Matching:
   - **Exactly one** → set `status: "done"` (keep `googleTaskId`).
   - **Zero or multiple** → ask the user; do not guess.
5. If the completed todo has a `goalId`, and that goal has **no remaining** open todos → set goal `status: "done"` and `completedAt` to today (`YYYY-MM-DD`) (or ask once if ambiguous). Backfill `completedAt` if the goal was already `done` without it.
6. Set `updatedAt` (ISO-8601). Rebundle, then regenerate standup so `## Focus` drops completed work todos:

```bash
node <skillsyncToolsRoot>/tools/journal-index.cjs --vault "<vault>"
node <skillsyncToolsRoot>/tools/journal-dashboard-bundle.cjs --vault "<vault>"
node <skillsyncToolsRoot>/tools/journal-standup.cjs --vault "<vault>"
```

(`journal-index` already rebundles in many setups; running bundle after planning edits is safe.)

7. Remind the user to **close/reopen** `Journal/_dashboard/dashboard.obsidian.html` in Obsidian.

## Ask / read-only mode

Print the checklist (gate, vault, track, bullet text, todo match) and exact commands; do not write files.

## Related

- **journal-weekly** — Markdown weeks + standup; Mode B may also sync goals/todos
- **journal-planning** — goals/todos schema (`completedAt` on done goals) and rebundle rules
- **submit-github-pr** / **jira-close-story** — delivery skills that point here

## Consumer setup (Cursor / Kiro)

```json
"linkedSkills": ["journal-weekly", "journal-planning", "journal-handoff"],
"journal": {
  "enabled": true,
  "vaultPath": "/path/to/DenMercs",
  "defaultTrack": "work",
  "skillsyncToolsRoot": ".cursor/vendor/skillsync",
  "jiraBases": {
    "DCD": "https://lifeway.atlassian.net",
    "QUICK": "https://YOUR-SITE.atlassian.net"
  }
}
```

Lifeway: `"defaultTrack": "work"`. Quickpress: `"defaultTrack": "business"`. Set each project prefix’s Atlassian site under `jiraBases` so journal bullets link to the right board.

## Rules

- Never run handoff when the gate is off.
- Always run `journal-ensure-week.cjs` before weekly writes (create if missing; never overwrite).
- Never mark todos done on `start-story` or `submit-pr`.
- On `start-story`, set todo status to `in progress` (never write legacy `doing`).
- Idempotent weekly bullets per KEY (no spam on re-plan).
- Link story/epic keys in weekly Markdown when the Jira site is known (`jiraBases` / env / MCP URL).
- Merge weekly cells; do not wipe the week template.
- Goals/todos only in `planning.json`.
- Verb-first bullets. Absolute vault path when workspace ≠ vault.
- **Privacy (hard):** Writes only under `Journal/**`. Do not read other DenMercs folders — see `journal-vault-privacy`.
