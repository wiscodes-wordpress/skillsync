# Agent instructions — skillsync

This repository is the **shared home** for portable Cursor **Agent Skills**, **project rules** (`.mdc`), **slash commands** (`ss-*`), and **harness skeleton** markdown used by consumer repos (WordPress plugins, apps, libraries).

## What belongs here

- **Generic** skills under **`skills/`** with a **`SKILL.md`** entry point. Workflow and stack skills live in category folders: **`skills/engineering/`** (includes WordPress `wordpress-*` / `wp-*` packs), **`skills/productivity/`**, **`skills/personal/`**.
- **Shared rules** under **`rules/`** (TypeScript, React, frontend testing conventions).
- **Product-neutral commands** under **`commands/`** using the **`ss-*`** prefix (**s**kill**s**ync). Consumers symlink these into **`.cursor/commands/`** so Cursor discovers **`/ss-plan`**, **`/ss-arch-plan`**, **`/ss-security-plan`**, **`/ss-ui-ux-plan`**, **`/ss-workflow`**, **`/ss-security-audit`**, **`/ss-submit-pr`**, **`/ss-close-story`**, etc.
- **Harness skeletons** under **`harness/`** — start with **`harness/ss-flow.md`** (phase map + context budget); planner, generator, critic referenced by **`ss-*`** commands.

## What does *not* belong here

- Product-specific Jira keys, repo paths, or slash commands named for one product (**`qp-*`**, **`qb-*`**). Keep those as **thin wrappers** in each consumer repository.

## Consumer setup

See **`docs/consumer-setup.md`**. Typical flow:

1. Add this repo as a **git submodule** at e.g. **`.cursor/vendor/skillsync`**.
2. Copy **`skillsync.config.example.json`** to the consumer root as **`skillsync.config.json`** and set **`linkedSkills`**, **`linkedRules`**, **`linkedCommands`**.
3. Run **`link-skills.cjs`**, **`link-rules.cjs`**, **`link-commands.cjs`** (and matching **`verify-*.cjs`**) from the consumer root — often wired as **`yarn skillsync:link`** / **`yarn skillsync:verify`**.

## Contributing to skillsync

1. Keep additions **reusable** across consumers; push product flavor into consumer wrappers or harness addenda.
2. After changing skills, commands, or **`tools/`** ss-* helpers, run **`node tools/verify-skills.cjs .`**, **`node tools/verify-commands.cjs .`**, and **`node tools/verify-tools.cjs .`** from this repo root (`.` = skillsync root).
3. Prefer **symlink** `linkMode` in consumers unless the platform cannot create directory symlinks.

## Naming

- **`ss-*`** — skillsync-hosted slash commands.
- Consumers use their own prefix for local commands (e.g. **`qb-*`**, **`qp-*`**) that point at **`ss-*`** or local harness files.
