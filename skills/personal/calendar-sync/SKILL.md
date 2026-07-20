---
name: calendar-sync
description: >-
  Reads the ## Calendar section from Journal/YYYY/*.md weekly notes, parses
  event entries, and creates them in Google Calendar via skillsync CLI
  (sync-google-calendar.cjs + .env OAuth). Use when the user asks to sync
  calendar, push logs to calendar, add calendar items from journal notes, or
  update Google Calendar from Obsidian (Journal, formerly Log).
---

# Calendar Sync

Syncs events from the `## Calendar` section in **weekly Journal** notes to Google Calendar using **skillsync `.env` OAuth** (not Cursor MCP).

## When to Use

- "sync my calendar", "push my logs to calendar", "add calendar items from my journal"
- Create Google Calendar events from Obsidian Journal weeks

## Paths

Vault root (if not using DenMercs as workspace):  
`$HOME/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs` (override with `$JOURNAL_VAULT_PATH` or `--vault`)

- Weekly notes: `Journal/YYYY/YYYY-MM-DD.md` (Monday-dated weeks)
- Formerly named `Log/` — treat any old `Log/` references as `Journal/`

## One-time Google auth

1. Google Cloud: Desktop OAuth client; enable **Google Tasks API** + **Google Calendar API**.
2. OAuth consent screen: set user type to **External** (Internal → `403: org_internal` for personal accounts). Add your Google account as a **test user**.
3. Copy `.env.example` → `.env` in skillsync; set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. From skillsync root:

```bash
node tools/google-oauth-setup.cjs --calendar
```

Token lands at `tools/.secrets/google-tasks-token.json` (or `$JOURNAL_GOOGLE_TOKEN_PATH`). A `google-calendars.json` stub is written beside it.

## Format in Journal

```text
- Date, time - Event title (Personal|Work|Business)
```

Examples:

- `🚀 Feb 7, 8pm - Folder Structure Implementation (Business)`
- `Feb 10, 2pm - Meeting with Robin (Work)`
- `2026-02-12 9am - Quickpress launch (Business)`
- `Feb 14, 3pm - Dentist (Personal)`

Optional emoji labels (ignored when parsing): Personal | Work | Business

## Workflow

1. Ensure OAuth token exists (`google-oauth-setup.cjs --calendar`).
2. From skillsync root, run:

```bash
node tools/sync-google-calendar.cjs --dry-run
node tools/sync-google-calendar.cjs
# optional: --week 2026-07-20 --vault "/path/to/DenMercs"
```

Or use the dashboard **Sync Google** button (`journal-dashboard-server.cjs`) — that runs Tasks + Calendar together.

3. Script: scan `Journal/YYYY/`, extract `## Calendar` bullets, parse date/time/title/track, create events via Calendar API, skip duplicates (same date + title).

Do **not** use Cursor MCP `create-event` for this flow.

## Pull (Meetings agenda)

Dashboard **Meetings** + CLI read today’s schedule from **Google Calendar** (does not write calendars):

```bash
yarn meetings
# or: node tools/list-meetings.cjs --day 2026-07-20
```

Live UI: `GET /api/meetings` on `journal-dashboard-server.cjs`.

Uses the same OAuth token as push. Map calendars in `google-calendars.json` (`personal` / `work` / `business`). Join links come from Google Meet / conference data when present.

## Calendar Mapping

Optional `google-calendars.json` next to the token:

```json
{
  "personal": "primary",
  "work": "primary",
  "business": "primary"
}
```

Replace `primary` with real calendar IDs when you use separate calendars.

Color IDs set by the script:

- **Personal** → colorId `1` (lavender)
- **Work** → colorId `9` (blue)
- **Business** → colorId `6` (orange)

Timezone: `JOURNAL_TIMEZONE` or default `America/Chicago`. Timed events default to 1 hour duration; no time → all-day.

## Date Parsing

- `Feb 10, 2pm` / `Feb 10 2pm`
- `2026-02-10 14:00`
- `Feb 10` (all-day if no time)
- Year for named months comes from the week file’s year folder

## Related

- **journal-weekly** — owns the Markdown weekly note + Calendar section
- **journal-planning** — goals/todos (not calendar events); Tasks sync via `sync-google-tasks.cjs`

## Consumer setup (Cursor / Kiro)

```json
"linkedSkills": ["journal-weekly", "journal-planning", "journal-handoff", "calendar-sync"]
```

## Rules

- Auth via skillsync `.env` + token file — not Cursor Google Calendar MCP.
- Never commit `.env` or `tools/.secrets/*` tokens.
- Dedupe before create; do not delete or rewrite existing Google events.
