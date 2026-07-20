# Personal

Skills tied to a specific author's setup — not promoted as generic shared defaults.

| Skill | Purpose |
|-------|---------|
| [`journal-weekly`](journal-weekly/SKILL.md) | Markdown weekly logs + standup notes derived from the week |
| [`journal-planning`](journal-planning/SKILL.md) | Overall goals/todos + Obsidian/live HTML dashboard refresh |

**Hybrid model:** notes = Markdown; dashboard = HTML; Obsidian opens a **static** `dashboard.obsidian.html` snapshot (rebuild with `journal-dashboard-bundle.cjs`). Localhost serves the live interactive UI.

Supporting tools in skillsync `tools/`: `journal-index.cjs`, `journal-standup.cjs`, `journal-dashboard-bundle.cjs`, `journal-dashboard-server.cjs`, `sync-google-tasks.cjs`.

Matt Pocock's upstream examples: `edit-article`, `obsidian-vault` ([personal/](https://github.com/mattpocock/skills/tree/main/skills/personal)).
