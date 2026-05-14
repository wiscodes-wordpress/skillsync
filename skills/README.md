# Shared Agent Skills

Place portable Cursor Agent Skills in subfolders of `skills/`, each containing a `SKILL.md` file (see [Cursor Agent Skills](https://cursor.com/docs/skills)).

Consumers link selected folder names into their own `.cursor/skills/<name>/` using `tools/link-skills.cjs` and `skillsync.config.json` in the consumer repository.
