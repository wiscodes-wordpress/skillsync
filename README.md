# skillsync

Shared **Cursor Agent Skills**, **project rules**, **`ss-*` slash commands**, **harness skeletons**, and **consumer tooling** so multiple repositories can vendor one Git source of truth.

## Repository layout

| Path | Purpose |
|------|---------|
| `skills/<name>/SKILL.md` | Portable skills. |
| `rules/*.mdc` | Shared Cursor project rules (materialize into `.cursor/rules/`). |
| `commands/ss-*.md` | Shared **skillsync** slash commands (materialize into `.cursor/commands/`). |
| `harness/*.md` | Shared harness skeletons (planner, generator, critic). |
| `tools/link-skills.cjs` | Symlink or copy selected skills → `.cursor/skills/`. |
| `tools/verify-skills.cjs` | Verify linked skills. |
| `tools/link-rules.cjs` | Symlink or copy selected rules → `.cursor/rules/`. |
| `tools/verify-rules.cjs` | Verify linked rules. |
| `tools/link-commands.cjs` | Symlink or copy selected commands → `.cursor/commands/`. |
| `tools/verify-commands.cjs` | Verify linked commands. |
| `skillsync.config.example.json` | Example consumer config. |
| `docs/consumer-setup.md` | Submodule + `package.json` + `ss-*` naming. |

## Consumer quick start

See [`docs/consumer-setup.md`](docs/consumer-setup.md).

## Cursor references

- [Agent Skills](https://cursor.com/docs/skills)
