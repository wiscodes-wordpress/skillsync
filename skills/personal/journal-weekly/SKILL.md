---
name: journal-weekly
description: >-
  Creates and updates weekly Journal notes in the DenMercs Obsidian vault
  (Work/Lifeway, Meetings/standup, Business/Quickpress). Use when the user
  asks for a weekly log, journal week, new week, fill this week, weekly login,
  update journal, or log Work/Business for the week.
---

# Journal Weekly

Manages weekly notes under the DenMercs **Journal** vault (formerly Log).

## Paths

Vault root: `/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs`

| Item | Path |
|------|------|
| Weekly notes | `Journal/YYYY/YYYY-MM-DD.md` |
| Template | `_Templates/Weekly Log.md` |
| On Call (separate) | `Journal/On Call/` |
| On Call template | `_Templates/On Call.md` |

- Filename date = **Monday** of that week (`YYYY-MM-DD`).
- Title inside file: `# Week of YYYY-MM-DD` (same Monday).
- If the Cursor workspace is the DenMercs vault, relative paths `Journal/...` and `_Templates/...` are fine.

## Tracks

| Column / section | Meaning |
|------------------|---------|
| **Work** | Lifeway (React / React Native) |
| **Meetings** | Standups, 5on2s, talking points |
| **Business** | Quickpress |

Keep On Call out of the weekly body when possible. Link instead: `On call → [[On Call/YYYY-MM-DD]]`.

## When to use

- "new week", "weekly log", "journal for this week", "weekly login"
- "log that I merged X" / "add to Business…" / "fill this week"
- "what's in my journal this week"

## Modes

### A — Create / open this week

1. Resolve **Monday** of the target week (default: current week in local timezone).
2. Path: `Journal/YYYY/YYYY-MM-DD.md` (year folder = Monday's year).
3. If file **exists**: read it and confirm path; do not overwrite.
4. If file **missing**: create from template below (or copy `_Templates/Weekly Log.md` and replace `{{date}}` with that Monday).
5. Tell the user the full path.

### B — Fill / update from conversation

1. Open this week’s file (create first if needed).
2. Map user content into the right place:
   - Shipped eng work → **Daily log → Work** cell for that day (Mon–Fri)
   - Standup / meeting notes → **Meetings** cell
   - Quickpress → **Business** cell
   - Priorities → **Focus for the week**
   - Events → **Calendar** (calendar-sync format)
   - Highlights → **Wins & learnings**
3. **Merge, don’t wipe**: append bullets; keep existing cell text.
4. Prefer one short bullet per item; use `<br>` inside table cells when adding a second line (matches existing notes).
5. If day omitted, use **today** (Mon–Fri). Weekend input → put under Focus or Fri, and ask if unclear.

### C — Standup draft (optional)

From this week’s **Work** + **Meetings** cells, draft 3 bullets:

- Yesterday
- Today
- Blockers

Do not invent work; only use what’s in the file + what the user just said.

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
<!-- Items here sync to Google Calendar. Colors: Personal=lavender | Work=blue | Business=orange -->
<!-- Format: - [emoji] Date, time - Event title (Personal|Work|Business) -->
- 

---

## Wins & learnings
- 
```

Focus lines `Work:` / `Business:` are preferred for dual-track weeks. If an older note only has plain focus bullets, keep that style when editing.

## Calendar line format

Compatible with **calendar-sync**:

```text
- Date, time - Event title (Personal|Work|Business)
```

Examples: `Feb 10, 2pm - Meeting with Robin (Work)` · `2026-07-22 9am - Quickpress ads (Business)`

## On Call

- Do **not** dump full incident writeups into the weekly file.
- Create/update under `Journal/On Call/` from `_Templates/On Call.md` when the user is on call.
- In the weekly note, one link line is enough.

## Related skills

- **calendar-sync** — push `## Calendar` to Google Calendar (still may say `Log/`; treat as `Journal/`)
- **summary-update** — monthly Work/Business summaries from journal weeks (same path rename)

## Consumer setup (Cursor / Kiro)

Add to the consumer `skillsync.config.json`:

```json
"linkedSkills": ["journal-weekly"]
```

Then run the consumer’s skillsync link (e.g. `yarn skillsync:link`). Resolves from `skills/personal/journal-weekly`.

## Rules

- Never overwrite a filled week with a blank template.
- Never move On Call content into the daily table except a short link.
- Verb-first bullets: `Merged roku colors PR`, not long paragraphs.
- Absolute vault path above is canonical when the workspace is not DenMercs.
