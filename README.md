# skillsync

Shared **Cursor Agent Skills** and small **consumer tooling** so multiple repositories (WordPress plugins, Supabase apps, and so on) can vendor one Git source of truth.

## Repository layout

| Path | Purpose |
|------|---------|
| `skills/<name>/SKILL.md` | Portable skills (add new folders here). |
| `tools/link-skills.cjs` | Symlink or copy selected skills into a consumer’s `.cursor/skills/`. |
| `tools/verify-skills.cjs` | Verify linked skills resolve to a real `SKILL.md`. |
| `skillsync.config.example.json` | Example consumer config (copy to a consumer repo as `skillsync.config.json`). |
| `docs/consumer-setup.md` | Submodule + `package.json` wiring. |

## Consumer quick start

See [`docs/consumer-setup.md`](docs/consumer-setup.md).

## Cursor references

- [Agent Skills](https://cursor.com/docs/skills)
