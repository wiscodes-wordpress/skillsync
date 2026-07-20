# journal

**Personal command** — weekly journal and standup management.

Activates [`journal-weekly`](../skills/personal/journal-weekly/SKILL.md) for Markdown weekly logs, daily standups, and dashboard refresh in the DenMercs Obsidian vault.

## Usage

| Intent | What happens |
|--------|--------------|
| `/journal` | Open/create this week's journal (Mode A) |
| `/journal` + context about work done | Fill today's entry from conversation (Mode B) |
| `/journal standup` | Generate daily standup from weekly log (Mode C) |
| `/journal` + "what did I do" | Read back this week's activity |

## Linked skills

```json
"linkedSkills": ["journal-weekly"]
```

## Quick reference

- Weekly notes: `Journal/YYYY/YYYY-MM-DD.md` (Monday date)
- Standups: `Journal/Standup/YYYY/YYYY-MM-DD.md`
- Dashboard refresh: `node tools/journal-index.cjs`
- Standup gen: `node tools/journal-standup.cjs`

See [`journal-weekly SKILL.md`](../skills/personal/journal-weekly/SKILL.md) for full modes and rules.

Available as `/journal` when linked into **`.cursor/commands/`** or **`.kiro/`**.
