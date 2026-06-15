# Shared Agent Skills

Portable Cursor Agent Skills live under `skills/`, each in a folder with a `SKILL.md` entry point (see [Cursor Agent Skills](https://cursor.com/docs/skills)).

## Layout

Follows [Matt Pocock's skills repo](https://github.com/mattpocock/skills) category folders:

| Folder | Purpose |
|--------|---------|
| **`engineering/`** | Code work — TDD, triage, PR/issue workflow, React/TS review, **WordPress pack** (`wordpress-*`, `wp-*`) |
| **`productivity/`** | Grilling, handoff, teaching, communication |
| **`personal/`** | Author-specific skills (not linked by default) |

Consumers link by **skill name only** in `skillsync.config.json` (e.g. `"tdd"`, `"wp-block-development"`). `link-skills.cjs` resolves `engineering/<name>`, `productivity/<name>`, etc. automatically.

**`ss-*` delivery loop:** see [`harness/ss-flow.md`](../harness/ss-flow.md) and [`docs/consumer-setup.md`](../docs/consumer-setup.md) for minimal `linkedSkills` vs optional stack skills.

```bash
node .cursor/vendor/skillsync/tools/link-skills.cjs .
node .cursor/vendor/skillsync/tools/verify-skills.cjs .
```

Linked skills appear in the consumer's `.cursor/skills/<name>/`.
