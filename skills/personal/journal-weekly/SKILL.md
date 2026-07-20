---
name: journal-weekly
description: >-
  Creates and updates Markdown weekly Journal notes and daily standup notes in
  the DenMercs Obsidian vault (Work/Lifeway, Meetings, Business/Quickpress).
  Use when the user asks for a weekly log, journal week, new week, fill this
  week, weekly login, standup, daily standup, or log Work/Business for the week.
---

# Journal Weekly

Manages **Markdown** weekly activity logs and **derived** daily standup notes.

## Architecture (hybrid)

| Layer | Format | Role |
|-------|--------|------|
| Weekly / standup / on-call | **Markdown** | Notes SoT — edit in Obsidian |
| Goals / todos | `planning.json` | Overall planning via **journal-planning** (not week-bounded) |
| Dashboard | **HTML** | Overview UI — does **not** replace weekly `.md` files |

Dashboard reads weeks via `index.json` (from `journal-index.cjs`), not by converting weeks to HTML.

**Do not** create HTML weekly notes. Keep the Weekly Log markdown template.

## Paths

Vault root: `/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs`

| Item | Path |
|------|------|
| Weekly notes | `Journal/YYYY/YYYY-MM-DD.md` (Monday of week) |
| Daily standup | `Journal/Standup/YYYY/YYYY-MM-DD.md` |
| Standup template | `_Templates/Standup.md` |
| Weekly template | `_Templates/Weekly Log.md` |
| On Call | `Journal/On Call/` |
| On Call template | `_Templates/On Call.md` |
| Goals / todos | `Journal/_dashboard/planning.json` |
| Obsidian dashboard | `Journal/_dashboard/dashboard.obsidian.html` (static snapshot) |
| Live dashboard | `node tools/journal-dashboard-server.cjs` → `http://127.0.0.1:8787/dashboard.html` |

- Weekly filename = **Monday** (`YYYY-MM-DD`). Title: `# Week of YYYY-MM-DD`.
- Relative paths work when the Cursor workspace is the DenMercs vault.

## Tracks

| Column | Meaning |
|--------|---------|
| **Work** | Lifeway (React / React Native) |
| **Meetings** | Standups, 5on2s, talking points |
| **Business** | Quickpress |

On Call stays separate: `On call → [[On Call/YYYY-MM-DD]]`.

## When to use

- "new week", "weekly log", "journal for this week", "weekly login"
- "log that I merged X" / "add to Business…" / "fill this week"
- "standup", "daily standup", "generate standup"
- "what's in my journal this week"

## Modes

### A — Create / open this week

1. Resolve **Monday** of the target week (default: current week, local TZ).
2. Path: `Journal/YYYY/YYYY-MM-DD.md`.
3. If exists: read and confirm; **do not overwrite**.
4. If missing: create from template below (or `_Templates/Weekly Log.md`, replace `{{date}}`).
5. Tell the user the full path.

### B — Fill / update from conversation

1. Open this week’s file (create first if needed).
2. Map content:
   - Eng shipping → **Daily log → Work** (Mon–Fri cell)
   - Standup / meeting notes → **Meetings**
   - Quickpress → **Business**
   - Priorities → **Focus for the week**
   - Events → **Calendar**
   - Highlights → **Wins & learnings**
3. **Merge, don’t wipe.** Prefer short bullets; use `<br>` for extra lines in cells.
4. Default day = **today** (Mon–Fri). Weekend → Focus or Fri; ask if unclear.
5. After meaningful fills, refresh dashboard data:

```bash
node tools/journal-index.cjs
```

(`journal-index` also rebuilds `dashboard.obsidian.html`.)

### C — Daily standup (from weekly)

Standup is **derived** from the weekly Daily log. Weekly remains activity SoT.

1. Ensure weekly file exists (Mode A).
2. Run from skillsync:

```bash
node tools/journal-standup.cjs
node tools/journal-standup.cjs --date YYYY-MM-DD
```

3. Writes `Journal/Standup/YYYY/YYYY-MM-DD.md` (Yesterday / Today / Blockers / Talking points from Work + Meetings).
4. Preserve existing `## Notes` when regenerating.
5. Do not invent work. Report standup path + weekly link.

## Weekly template

```markdown
---
Created: "YYYY-MM-DD"
tags: [log, weekly]
country:
  - Philippines
  - United States
---
# Week of YYYY-MM-DD

## Focus for the week
- Work: 
- Business: 

---

## Daily log
| Day | Work | Meetings | Business |
|-----|-----|----------|----------|
| Mon | | | |
| Tue | | | |
| Wed | | | |
| Thu | | | |
| Fri | | | |

---

## Calendar
<!-- Sync: - [emoji] Date, time - Event title (Personal|Work|Business) -->
- 

---

## Wins & learnings
- 
```

## Calendar line format

```text
- Date, time - Event title (Personal|Work|Business)
```

## On Call

- Full writeups → `Journal/On Call/` from `_Templates/On Call.md`.
- Weekly: one link line only.

## Dashboard refresh (after weekly changes)

| View | How to update |
|------|----------------|
| Obsidian HTML | Re-run `node tools/journal-index.cjs` or `node tools/journal-dashboard-bundle.cjs`, then **reopen** `dashboard.obsidian.html` (static; Reload in Obsidian does nothing) |
| Localhost | `node tools/journal-dashboard-server.cjs` — live read of JSON; Reload works in the browser |

Obsidian does **not** live-load `planning.json`. The snapshot must be rebuilt, then reopened.

## Related

- **journal-planning** — overall goals/todos + always rebundle after edits
- **journal-handoff** — optional weekly + todo updates after `/ss-submit-pr` / `/ss-close-story`
- **calendar-sync** — `## Calendar` → Google Calendar via `sync-google-calendar.cjs` + `.env` OAuth (`Journal/YYYY/`, not `Log/`)
- **summary-update** — monthly summaries from `Journal/YYYY/`

## Consumer setup (Cursor / Kiro)

```json
"linkedSkills": ["journal-weekly", "journal-planning", "journal-handoff", "calendar-sync"]
```

Skillsync tools (from repo root): `journal-index.cjs`, `journal-standup.cjs`, `journal-dashboard-bundle.cjs`, `journal-dashboard-server.cjs`, `sync-google-calendar.cjs`.

## Rules

- Weekly notes stay **Markdown** — never migrate a week to HTML for the vault.
- Never overwrite a filled week with a blank template.
- Standup = meeting aid; lasting activity stays in the weekly log.
- Goals/todos → `planning.json` only.
- Verb-first bullets. Absolute vault path is canonical when workspace ≠ DenMercs.
