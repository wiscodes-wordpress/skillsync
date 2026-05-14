# Consuming `skillsync` in a project

## Goals

- Keep **generic** skills, **shared project rules**, **shared slash commands** (`ss-*`), and **harness skeletons** in this repository.
- Keep **product-specific** skills and commands as normal files under the consumer’s `.cursor/skills/` and `.cursor/commands/`.
- Refresh by updating the vendored checkout (`git pull` / submodule bump) and re-running the link scripts.

## Submodule (recommended)

From the **consumer** repository root:

```bash
git submodule add https://github.com/wiscodes-wordpress/skillsync.git .cursor/vendor/skillsync
```

## Consumer configuration

1. Copy `skillsync.config.example.json` from this repo into the **consumer repository root** as `skillsync.config.json`.
2. Set `linkedSkills` to folder names from `<vendorRoot>/skills/<name>/`.
3. Optionally set `linkedRules` to basenames of `.mdc` files from `<vendorRoot>/rules/` (see **Project rules** below).
4. Optionally set `linkedCommands` to basenames of `.md` files from `<vendorRoot>/commands/` (see **Slash commands** below — **`ss-*`** shared commands).
5. Optionally set `linkMode` to `copy` if symlinks are not viable on your OS.

## Link and verify

Run from the **consumer** repository root (paths assume submodule at `.cursor/vendor/skillsync`):

```bash
node .cursor/vendor/skillsync/tools/link-skills.cjs .
node .cursor/vendor/skillsync/tools/verify-skills.cjs .
node .cursor/vendor/skillsync/tools/link-rules.cjs .
node .cursor/vendor/skillsync/tools/verify-rules.cjs .
node .cursor/vendor/skillsync/tools/link-commands.cjs .
node .cursor/vendor/skillsync/tools/verify-commands.cjs .
```

You can wire these into `package.json` (chaining is typical):

```json
{
	"scripts": {
		"skillsync:link": "node ./.cursor/vendor/skillsync/tools/link-skills.cjs . && node ./.cursor/vendor/skillsync/tools/link-rules.cjs . && node ./.cursor/vendor/skillsync/tools/link-commands.cjs .",
		"skillsync:verify": "node ./.cursor/vendor/skillsync/tools/verify-skills.cjs . && node ./.cursor/vendor/skillsync/tools/verify-rules.cjs . && node ./.cursor/vendor/skillsync/tools/verify-commands.cjs ."
	}
}
```

Omit `link-rules` / `verify-rules` if `linkedRules` is empty; omit `link-commands` / `verify-commands` if `linkedCommands` is empty.

## Symlink confidence checklist

- Cursor documents discovery under `.cursor/skills/`, but does not explicitly guarantee every internal tool path follows symlinks.
- After linking, confirm skills under **Cursor Settings → Rules → Skills** (reload if needed).
- If anything looks missing, switch `linkMode` to `copy` and re-run the link scripts.

## Cursor project rules (`.mdc`)

Cursor loads **project rules** from **`.cursor/rules/`** only — not from paths under `vendor/`. Canonical `.mdc` files live in this repo under **`rules/`**; list them in **`linkedRules`** and run **`link-rules.cjs`** / **`verify-rules.cjs`**. Confirm under **Settings → Rules → Project Rules**.

## Slash commands and `ss-*`

Cursor discovers slash commands from **`.cursor/commands/*.md`** only. Shared **skillsync** commands use the **`ss-*`** prefix (**s**kill**s**ync) and live under **`commands/`** here. List basenames in **`linkedCommands`** and run **`link-commands.cjs`** / **`verify-commands.cjs`** so consumers get `/ss-workflow`, `/ss-plan`, `/ss-implement`, `/ss-review`, etc.

Product repos usually keep **thin wrappers** (e.g. `qb-*`) that add tracker-specific steps and point at these shared files or harness addenda.

## Harness

Shared planner / generator / critic skeletons live under **`harness/`**. Phase orientation: **`commands/ss-workflow.md`**.
