# Consuming `skillsync` in a project

## Goals

- Keep **generic** skills in this repository.
- Keep **product-specific** skills as normal directories under the consumer’s `.cursor/skills/`.
- Refresh generic skills by updating the vendored checkout (`git pull` / submodule bump) and re-running the link step.

## Submodule (recommended)

From the **consumer** repository root:

```bash
git submodule add https://github.com/wiscodes-wordpress/skillsync.git .cursor/vendor/skillsync
```

## Consumer configuration

1. Copy `skillsync.config.example.json` from this repo into the **consumer repository root** as `skillsync.config.json`.
2. Set `linkedSkills` to the folder names you want from `<vendorRoot>/skills/<name>/`.
3. Optionally set `linkMode` to `copy` if symlinks are not viable on your OS.

## Link and verify

Run the scripts from this repository against the consumer root (example paths assume the submodule lives at `.cursor/vendor/skillsync`):

```bash
node .cursor/vendor/skillsync/tools/link-skills.cjs .
node .cursor/vendor/skillsync/tools/verify-skills.cjs .
```

You can wire these into `package.json`:

```json
{
	"scripts": {
		"skillsync:link": "node ./.cursor/vendor/skillsync/tools/link-skills.cjs .",
		"skillsync:verify": "node ./.cursor/vendor/skillsync/tools/verify-skills.cjs ."
	}
}
```

## Symlink confidence checklist

- Cursor documents discovery under `.cursor/skills/`, but does not explicitly guarantee every internal tool path follows symlinks.
- After linking, confirm skills appear under **Cursor Settings → Rules → Skills** (reload the window if needed).
- If anything looks missing, switch `linkMode` to `copy` and re-run `link-skills.cjs`.

## Slash commands

Cursor discovers project slash commands from **`.cursor/commands/*.md`**. Shared command bodies can live in this repository, but consumers usually keep **thin wrapper** commands locally so `/…` discovery stays stable.
