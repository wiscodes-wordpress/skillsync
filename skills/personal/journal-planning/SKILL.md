---
name: journal-planning
description: >-
  Creates and updates overall goals and todos in DenMercs
  Journal/_dashboard/planning.json (Work/Lifeway, Business/Quickpress, Life),
  and refreshes the Obsidian HTML dashboard snapshot. Use when the user asks to
  add a goal, todo, task, mark done, list goals, open the journal dashboard,
  or rebundle the Obsidian dashboard.
---

# Journal Planning

Manages **overall** (not week-bounded) goals and todos for the Journal dashboard.

Weekly activity = Markdown via **journal-weekly**. Planning = `planning.json` only.

## Architecture (hybrid)

| Layer | Format | Role |
|-------|--------|------|
| Goals / todos | `planning.json` | SoT — overall; optional `week`/`due` are pins only |
| Weekly / standup notes | Markdown | Activity SoT — dashboard indexes weeks, does not store goals there |
| `dashboard.html` + assets | HTML | Live UI (localhost server) |
| `dashboard.obsidian.html` | Static HTML | Obsidian day-to-day — **pre-rendered**; no JS in Obsidian |

```text
planning.json  ──►  localhost dashboard.html   (live fetch / Reload works)
       │
       └── bundle ──►  dashboard.obsidian.html  (frozen; reopen after rebuild)
```

Obsidian HTML plugins do **not** run JavaScript and do **not** live-read JSON. After every planning change, rebuild the snapshot and tell the user to reopen `dashboard.obsidian.html`.

## Paths

Vault root: `$HOME/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs` (override with `$JOURNAL_VAULT_PATH` or `--vault`)

| Item | Path |
|------|------|
| Planning SoT | `Journal/_dashboard/planning.json` |
| Week index | `Journal/_dashboard/index.json` |
| Open PRs config | `Journal/_dashboard/github-prs.json` (people + LifewayIT/Quickpress scopes; see `tools/fixtures/github-prs.example.json`) |
| Sprint config | `Journal/_dashboard/jira-sprint.json` (DCD active unassigned + next sprint; see `tools/fixtures/jira-sprint.example.json`) |
| Live shell | `Journal/_dashboard/dashboard.html` + `assets/` |
| Obsidian snapshot | `Journal/_dashboard/dashboard.obsidian.html` |

If `_dashboard/` or `planning.json` is missing, seed empty `goals` / `todos` and `updatedAt` (ISO-8601), then ensure live HTML/assets exist (from vault or prior setup).

## Schema

```json
{
  "goals": [
    {
      "id": "g1",
      "track": "work|business|life",
      "title": "…",
      "horizon": "week|month|quarter",
      "status": "active|done|dropped",
      "target": "YYYY-MM-DD",
      "completedAt": "YYYY-MM-DD"
    }
  ],
  "todos": [
    {
      "id": "t1",
      "goalId": "g1",
      "track": "work|business|life",
      "title": "…",
      "status": "todo|in progress|done",
      "due": "YYYY-MM-DD",
      "week": "YYYY-Www",
      "googleTaskId": null
    }
  ],
  "updatedAt": "ISO-8601"
}
```

| track | Meaning |
|-------|---------|
| `work` | Lifeway |
| `business` | Quickpress |
| `life` | Personal / admin |

IDs: `g…` / `t…` unique; prefer `done`/`dropped` over delete. Keep `googleTaskId` when completing.

Optional `completedAt` on goals: set to today (`YYYY-MM-DD`) whenever a goal becomes `done`. Used by the dashboard to show **Done this week**. Backfill to today when touching a bare `done` goal that lacks it.

## Modes

### A — Ensure dashboard

1. Ensure `planning.json` (and `_dashboard/` layout) exists.
2. Point user to:
   - Obsidian: `dashboard.obsidian.html`
   - Live: `node tools/journal-dashboard-server.cjs` → `http://127.0.0.1:8787/dashboard.html`

### B — Add / update goal

1. Read/write `planning.json` (merge; defaults `status: active`, `horizon: month`).
2. Set `updatedAt`.
3. **Always** rebundle (see below).

### C — Add / update todo

1. Merge todo; default `status: todo`. **Do not require `week`** — overall list.
2. Set `week` only if user asks to pin an ISO week.
3. Set `updatedAt`; **always** rebundle.

### D — Complete / drop

- Todo → `done`; goal → `done` or `dropped`.
- When a goal becomes `done`, set `completedAt` to today (`YYYY-MM-DD`). Clear or omit `completedAt` if reopening a goal to `active`.
- Backfill `completedAt` to today if updating a goal that is already `done` but missing the field.
- Rebundle.

### E — List

Active goals + **done this week** (via `completedAt` in current Mon–Sun) + open todos by track. Mention pinned `week` only if set.

### F — Refresh Obsidian snapshot

```bash
node tools/journal-dashboard-bundle.cjs
```

Also rebuilt by: `journal-index.cjs`, `journal-dashboard-server.cjs` (on write), `sync-google-tasks.cjs`.

After rebundle: tell user to **close/reopen** `dashboard.obsidian.html` in Obsidian. Reload inside Obsidian does not refresh data.

## Skillsync tools (repo root)

| Command | Purpose |
|---------|---------|
| `node tools/journal-ensure-week.cjs` | Create this week’s Markdown note if missing (never overwrite) |
| `node tools/journal-dashboard-bundle.cjs` | Rebuild static Obsidian HTML from `planning.json` + `index.json` |
| `node tools/journal-dashboard-server.cjs` | Live private UI on `127.0.0.1`; **Sync Google** runs Tasks + Calendar; **Open PRs** via `gh` + `github-prs.json`; **Sprint** via Jira + `jira-sprint.json` |
| `node tools/list-prs.cjs` | CLI: open ready-for-review PRs for configured people/scopes |
| `node tools/list-jira-sprint.cjs` | CLI: DCD active unassigned + next/future sprint (`yarn jira:sprint`) |
| `node tools/journal-index.cjs` | Parse weekly `.md` → `index.json` (+ rebundle) |
| `node tools/sync-google-tasks.cjs` | Push todos → Google Tasks (needs OAuth token) |
| `node tools/sync-google-calendar.cjs` | Push `## Calendar` → Google Calendar (needs OAuth with `--calendar`) |
| `node tools/google-oauth-setup.cjs --calendar` | One-time Desktop OAuth (Tasks + Calendar scopes) |

## Related

- **journal-weekly** — Markdown weeks + standup; Mode B may sync matching goals/todos; run `journal-index` after big weekly fills
- **journal-handoff** — optional weekly + todo updates after `/ss-plan` / `/ss-submit-pr` / `/ss-close-story`
- **calendar-sync** — Journal `## Calendar` → Google via CLI (not Cursor MCP)
- **summary-update** — use `Journal/` (renamed from `Log/`)

## Consumer setup (Cursor / Kiro)

```json
"linkedSkills": ["journal-weekly", "journal-planning", "journal-handoff", "calendar-sync"]
```

## Rules

- Goals/todos only in `planning.json` — never as the only copy inside a weekly note.
- Never commit `planning.json` to a public repo.
- Merge updates; verb-first titles.
- After every mutation: rebundle + remind user to reopen Obsidian snapshot.
- **Privacy (hard):** Only `Journal/_dashboard/**` (and related `Journal/**` reads for index/standup). Never browse other DenMercs folders (`Private/`, `Workspace/`, etc.) — see `journal-vault-privacy`.
