# Agent instructions — skillsync

This repository is the **shared home** for portable Cursor **Agent Skills**, **project rules** (`.mdc`), **slash commands** (`ss-*`), and **harness skeleton** markdown used by consumer repos (WordPress plugins, apps, libraries).

## What belongs here

- **Generic** skills under **`skills/`** with a **`SKILL.md`** entry point. Workflow and stack skills live in category folders: **`skills/engineering/`** (includes WordPress `wordpress-*` / `wp-*` packs), **`skills/productivity/`**, **`skills/personal/`**.
- **Shared rules** under **`rules/`** (ss-* delivery voice, TypeScript, React, frontend testing conventions).
- **Product-neutral commands** under **`commands/`** using the **`ss-*`** prefix (**s**kill**s**ync). Consumers symlink these into **`.cursor/commands/`** so Cursor discovers **`/ss-flow`** (Story: Plan → Implement → Done), **`/ss-finish`**, **`/ss-plan`**, **`/ss-implement`**, **`/ss-loop`**, **`/ss-workflow`** (belt index), Initiative/Ship commands, etc.
- **Harness skeletons** under **`harness/`** — **`harness/ss-flow.md`** is the belt map + context budget (distinct from slash **`/ss-flow`**); planner, generator, critic referenced by **`ss-*`** commands.

## What does *not* belong here

- Product-specific Jira keys, repo paths, or slash commands named for one product (**`qp-*`**, **`qb-*`**). Keep those as **thin wrappers** in each consumer repository.

## Optional tooling

- **GitNexus** (code knowledge graph + Cursor MCP) — optional beside `ss-*`; see **`docs/gitnexus.md`**. Commercial product use needs a commercial license from Akon Labs.
- **`/ss-loop`** (AFK Remaining cycles via Paseo + Cursor) — optional beside interactive `/ss-implement`; see **`docs/ss-loop.md`**. When spawning Cursor agents through Paseo, enable Auto Accept at create (skill **`paseo-cursor-auto-accept`**); `/ss-loop` does this in code when Paseo is installed.
- **App map** — `.harness/app-map.html` via `tools/render-app-map.cjs` (deterministic grand plan; Initiative belt).
- **Living plans** — Markdown SoT + `tools/render-plan-html.cjs` → derived HTML for humans (arch / UX / security / wayfinder / handoff). Optional IDE safety net: `tools/watch-plan-html.cjs` / `yarn plans:watch` (not default Story `yarn dev`).

## Delivery belts

Type **`ss`** in Cursor to filter delivery commands. Default path is **Story** via **`/ss-flow`** (three fresh agents). **Initiative** (`/ss-roadmap`) and **Ship** (`/ss-release*`) are enter-when-needed — **`commands/ss-workflow.md`**.

## Consumer setup

See **`docs/consumer-setup.md`**. Typical flow:

1. Add this repo as a **git submodule** at e.g. **`.cursor/vendor/skillsync`**.
2. Copy **`skillsync.config.example.json`** to the consumer root as **`skillsync.config.json`** and set **`linkedSkills`**, **`linkedRules`**, **`linkedCommands`**.
3. Run **`link-skills.cjs`**, **`link-rules.cjs`**, **`link-commands.cjs`** (and matching **`verify-*.cjs`**) from the consumer root — often wired as **`yarn skillsync:link`** / **`yarn skillsync:verify`**.

## Contributing to skillsync

1. Keep additions **reusable** across consumers; push product flavor into consumer wrappers or harness addenda.
2. After changing skills, commands, or **`tools/`** ss-* helpers, run **`yarn preflight`** before commit and **`yarn preflight:full`** before opening a PR (or **`node tools/preflight-local.cjs . [--full]`**) — catch failures locally so GitHub Actions is confirmation, not discovery.
3. Prefer **symlink** `linkMode` in consumers unless the platform cannot create directory symlinks.
4. Link **`ss-delivery-voice.mdc`** in `linkedRules` (always-on) so chat stays **simple, concise, and human** (problem → fix → next) without relying on the agent to open a skill.
5. **Prose** — follow [`skills/productivity/anti-slop`](skills/productivity/anti-slop/SKILL.md): expand abbreviations on first use (architecture decision record (ADR), end-to-end (E2E), source of truth, human-in-the-loop (HITL), away-from-keyboard (AFK), …); cut AI-marker density and empty hype; prefer concrete paths and behaviors over jargon.

## Naming

- **`ss-*`** — skillsync-hosted slash commands.
- Consumers use their own prefix for local commands (e.g. **`qb-*`**, **`qp-*`**) that point at **`ss-*`** or local harness files. Workplace PR checklists (e.g. Lifeway DCD) stay in those consumer wrappers — not in this repo.
