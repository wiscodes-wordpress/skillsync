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

Vault root: `/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs`

| Item | Path |
|------|------|
| Planning SoT | `Journal/_dashboard/planning.json` |
| Week index | `Journal/_dashboard/index.json` |
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
      "target": "YYYY-MM-DD"
    }
  ],
  "todos": [
    {
      "id": "t1",
      "goalId": "g1",
      "track": "work|business|life",
      "title": "…",
      "status": "todo|doing|done",
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
- Rebundle.

### E — List

Active goals + open todos by track (overall counts). Mention pinned `week` only if set.

### F — Refresh Obsidian snapshot

```bash
node tools/journal-dashboard-bundle.cjs
```

Also rebuilt by: `journal-index.cjs`, `journal-dashboard-server.cjs` (on write), `sync-google-tasks.cjs`.

After rebundle: tell user to **close/reopen** `dashboard.obsidian.html` in Obsidian. Reload inside Obsidian does not refresh data.

## Skillsync tools (repo root)

| Command | Purpose |
|---------|---------|
| `node tools/journal-dashboard-bundle.cjs` | Rebuild static Obsidian HTML from `planning.json` + `index.json` |
| `node tools/journal-dashboard-server.cjs` | Live private UI on `127.0.0.1`; rebuilds Obsidian snapshot on writes |
| `node tools/journal-index.cjs` | Parse weekly `.md` → `index.json` (+ rebundle) |
| `node tools/sync-google-tasks.cjs` | Push todos → Google Tasks (needs OAuth token) |

## Related

- **journal-weekly** — Markdown weeks + standup; run `journal-index` after big weekly fills
- **calendar-sync** / **summary-update** — use `Journal/` (renamed from `Log/`)

## Consumer setup (Cursor / Kiro)

```json
"linkedSkills": ["journal-weekly", "journal-planning"]
```

## Rules

- Goals/todos only in `planning.json` — never as the only copy inside a weekly note.
- Never commit `planning.json` to a public repo.
- Merge updates; verb-first titles.
- After every mutation: rebundle + remind user to reopen Obsidian snapshot.
