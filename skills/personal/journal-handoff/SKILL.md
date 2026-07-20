---
name: journal-handoff
description: >-
  Optional post-step after opening a GitHub PR or closing a Jira story: append
  a weekly Journal bullet and (on close) complete matching todos/goals in
  planning.json. Gated by skillsync.config.json journal.enabled or
  JOURNAL_HANDOFF. Use with /ss-submit-pr and /ss-close-story from any
  consumer (Lifeway, Quickpress, Cursor, or Kiro).
---

# Journal handoff

Personal journal updates after delivery-loop milestones. Invoked from
[`ss-submit-pr`](../../../commands/ss-submit-pr.md) and
[`ss-close-story`](../../../commands/ss-close-story.md) when the consumer opts in.

Weekly activity → **journal-weekly**. Goals/todos → **journal-planning**. This skill only orchestrates the handoff.

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

`/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs`

| `defaultTrack` | Daily log column | Typical consumer |
|----------------|------------------|------------------|
| `work` | Work | Lifeway |
| `business` | Business | Quickpress |
| `life` | (use Focus / Wins; ask if unclear) | Personal |

Confirm the vault directory exists before writing. If missing, report and skip.

## Modes

### `submit-pr` — after PR URL is printed

Do **not** mark todos or goals done.

1. Ensure this week’s note exists (journal-weekly Mode A): `Journal/YYYY/YYYY-MM-DD.md` (Monday).
2. Merge one verb-first bullet into **today’s** Daily log cell for the track column, e.g.:

   `Opened PR for KEY — short title (https://…)`

   Prefer issue key from branch, PR title, or `.harness/state.md`. Include PR URL when known.
3. Refresh index:

```bash
node <skillsyncToolsRoot>/tools/journal-index.cjs --vault "<vault>"
```

4. Tell the user the weekly path and that todos were left open until close-story.

### `close-story` — after Jira Done + harness reset

1. Same weekly ensure + append (Daily log **and** a short **Wins & learnings** line when the ship is noteworthy):

   `Shipped KEY — short title`

2. Read `Journal/_dashboard/planning.json`.
3. Among **open** todos (`status` `todo` \| `doing`) on `defaultTrack`, match by:
   - Title contains the **issue key** (preferred), else
   - Strong title overlap with the story/PR summary.
4. Matching:
   - **Exactly one** → set `status: "done"` (keep `googleTaskId`).
   - **Zero or multiple** → ask the user; do not guess.
5. If the completed todo has a `goalId`, and that goal has **no remaining** open todos → set goal `status: "done"` (or ask once if ambiguous).
6. Set `updatedAt` (ISO-8601). Rebundle:

```bash
node <skillsyncToolsRoot>/tools/journal-index.cjs --vault "<vault>"
node <skillsyncToolsRoot>/tools/journal-dashboard-bundle.cjs --vault "<vault>"
```

(`journal-index` already rebundles in many setups; running bundle after planning edits is safe.)

7. Remind the user to **close/reopen** `Journal/_dashboard/dashboard.obsidian.html` in Obsidian.

## Ask / read-only mode

Print the checklist (gate, vault, track, bullet text, todo match) and exact commands; do not write files.

## Related

- **journal-weekly** — Markdown weeks + standup
- **journal-planning** — goals/todos schema and rebundle rules
- **submit-github-pr** / **jira-close-story** — delivery skills that point here

## Consumer setup (Cursor / Kiro)

```json
"linkedSkills": ["journal-weekly", "journal-planning", "journal-handoff"],
"journal": {
  "enabled": true,
  "vaultPath": "/path/to/DenMercs",
  "defaultTrack": "work",
  "skillsyncToolsRoot": ".cursor/vendor/skillsync"
}
```

Lifeway: `"defaultTrack": "work"`. Quickpress: `"defaultTrack": "business"`.

## Rules

- Never run handoff when the gate is off.
- Never mark todos done on `submit-pr`.
- Merge weekly cells; do not wipe the week template.
- Goals/todos only in `planning.json`.
- Verb-first bullets. Absolute vault path when workspace ≠ vault.
