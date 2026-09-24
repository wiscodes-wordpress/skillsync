# Consuming `skillsync` in a project

## Goals

- Keep **generic** skills, **shared project rules**, **shared slash commands** (`ss-*`), and **harness skeletons** in this repository.
- Keep **product-specific** skills and commands as normal files under the consumer’s `.cursor/skills/` and `.cursor/commands/`.
- Refresh by updating the vendored checkout (`git pull` / submodule bump) and re-running the link scripts.

**Optional — GitNexus:** local code knowledge graph + Cursor MCP for blast-radius tools during `ss-*`. Setup, license (commercial products need a paid grant), and phase table: [`gitnexus.md`](./gitnexus.md).

**Optional — `/ss-loop`:** AFK Remaining-cycle implement via Paseo + Cursor. Setup: [`ss-loop.md`](./ss-loop.md).

**Permissions popups:** When using **Paseo + Cursor**, enable Auto Accept at spawn (`settings.features.auto_accept` on MCP create, or `ss-loop` / `paseo-set-feature.cjs`). Skill: `paseo-cursor-auto-accept`. Fallback: `paseo-permit-watch.cjs`. Plain Cursor IDE chats skip this. Details: [`ss-loop.md` Permissions](./ss-loop.md#permissions-afk-without-babysitting-prompts).

## Delivery belts (type `ss` to filter)

Linking a **skill** is not the same as a slash command. **`ss-*`** is the filterable command set in Cursor.

| Belt | When | Commands |
|------|------|----------|
| **Story** (default) | Most days | `/ss-plan` → `/ss-implement` or `/ss-loop` → `/ss-review` → `/ss-security-audit` → `/ss-feature-evidence` → `/ss-submit-pr` → `/ss-close-story` (+ optional `/ss-to-issues`, `/ss-handoff`) |
| **Initiative** | Major / foggy feature | **`/ss-roadmap`** entry (wayfind → draft → lenses → publish Jira → `render-app-map.cjs`). Resume lenses via `/ss-arch-plan`, `/ss-ui-ux-plan`, `/ss-security-plan` |
| **Ship** | After merge | `/ss-release` (+ distribution / marketing partials) |

Fog lives in roadmap (local wayfinder HTML); **Jira only at publish**; grand plan `.harness/app-map.html` is **script-generated** (`render-app-map.cjs`).

## Harness layout (living plans)

Living architecture / UX / security plans use **Markdown as source of truth** under **`.harness/`**, with **HTML derived** for humans (`render-plan-html.cjs`). Prefer **one folder per initiative** — do not leave multi-train plans as flat root siblings with long suffixes.

```text
.harness/
  README.md                         # optional consumer layout note
  app-map.html                      # plugin grand plan (script-generated)
  state.md / qa-current.md          # delivery-loop scratch (usually gitignored)
  code-handoff.md                   # optional PR walkthrough SoT (scratch)
  code-handoff.html                 # derived — open in browser
  feature-evidence.md               # optional human watch card (scratch)
  evidence/                         # Playwright/Cypress clips (gitignored)
  specs/                            # epic / story AC markdown (optional)
  release/                          # channel packs (optional / gitignored)
  initiatives/<slug>/
    initiative.md                   # product scope
    architecture-plan.md            # Arch lens SoT
    architecture-plan.html          # derived (human)
    ux-plan.md / ux-plan.html
    security-posture.md / .html     # Security lens SoT (+ ## gate when this train owns it)
    assets/                         # optional mockups
    index.html                      # optional lens status hub (from init-feature-pack)
```

**Path resolve** for `/ss-arch-plan`, `/ss-ui-ux-plan`, `/ss-security-plan` and `init-plan-html.cjs` / `render-plan-html.cjs` / `validate-plan-html.cjs`:

1. `docs/agents/domain.md` (consumer path table) when documented  
2. `.harness/initiatives/<slug>/…` (`--slug`, or the only pack)  
3. Legacy single-file `.harness/architecture-plan.md` (etc.) for simple one-plan repos  
4. Optional `skillsync.config.json` → `planMd.{arch,ux,security}` / `planHtml.*`

Scaffold a pack: `init-feature-pack.cjs --slug <slug> --lenses arch,ux,security`. Document consumer paths in **`docs/agents/domain.md`**.

**Hard rule:** agents edit `.md` only; run `render-plan-html.cjs` for `.html`. Never hand-edit derived HTML (same family as `app-map.html`).

**Optional watcher** (IDE edits while planning — not part of default Story `yarn dev`):

```bash
yarn ss:watch-plans
# or one-shot: yarn ss:render-plans
```

Compose with app `dev` only when you want one terminal:

```json
"dev": "concurrently -k \"webpack --watch\" \"yarn ss:watch-plans\""
```

## Submodule (recommended)

From the **consumer** repository root:

```bash
git submodule add https://github.com/wiscodes-wordpress/skillsync.git .cursor/vendor/skillsync
```

## Consumer configuration

1. Copy `skillsync.config.example.json` from this repo into the **consumer repository root** as `skillsync.config.json`.
2. Set `linkedSkills` to skill **names** (e.g. `"tdd"`, `"wp-block-development"`). Names resolve from `engineering/`, `productivity/`, `personal/`, or `misc/` — omit entries you do not need.
3. Optionally set `linkedRules` to basenames of `.mdc` files from `<vendorRoot>/rules/` (see **Project rules** below).
4. Optionally set `linkedCommands` to basenames of `.md` files from `<vendorRoot>/commands/` (see **Slash commands** below).
5. Optionally set `linkMode` to `copy` if symlinks are not viable on your OS.

### Minimal `linkedSkills` for the **`ss-*` delivery loop**

| Skill | Used by |
|-------|---------|
| `grill-tdd` | `/ss-plan` (step 1b) |
| `tdd` | `/ss-implement` when state has RED→GREEN Plan |
| `ponytail` | `/ss-implement` |
| `submit-github-pr` | `/ss-submit-pr` |
| `code-handoff` | `/ss-handoff` (optional; human walkthrough before PR) |
| `feature-video-evidence` | `/ss-feature-evidence` (after `/ss-security-audit`; Playwright clip + watch card) |
| `jira-close-story` | `/ss-close-story` |
| `to-issues` | `/ss-to-issues` (optional Story slice publish) |
| `major-feature-roadmap` | `/ss-roadmap` draft |
| `wayfinder` | `/ss-roadmap` phase 0 (fog; local HTML; no Jira) |
| `app-map` | `/ss-roadmap` + `render-app-map.cjs` (grand plan) |
| `arch-plan` | `/ss-arch-plan` (resume under Initiative) |
| `security-plan` | `/ss-security-plan` (trust posture; not PR gate) |
| `ui-ux-planner` | `/ss-ui-ux-plan` |
| `improve-codebase-architecture` | Optional with `/ss-arch-plan` |
| `bugfix` | `/ss-bugfix` (optional; runtime-log bug loop, not Story implement) |

Add **`anti-slop`** for chat + plan prose (always; see context budget rule 7). Add **`grill-with-docs`** when the repo uses `CONTEXT.md` / ADRs (substitute for `grill-me` in plan step 1a — productivity skill, link if desired). Add stack skills only when needed (e.g. `jest-react-testing`, `bulletproof-react`, `wordpress-testing-qa`) — not required for the generic loop. Do **not** link **`testing-expert`** for the loop; it is an optional encyclopedia.

### `linkedCommands` (typical — Story spine + Initiative + Ship)

Prefer this order so the palette reads by belt. Daily Story entry is **`/ss-flow`**; leaf Done commands stay linked for partial re-runs. Lens commands are optional if the team always enters via `/ss-roadmap`:

```json
"linkedCommands": [
  "ss-flow.md",
  "ss-workflow.md",
  "ss-plan.md",
  "ss-to-issues.md",
  "ss-implement.md",
  "ss-bugfix.md",
  "ss-loop.md",
  "ss-finish.md",
  "ss-review.md",
  "ss-security-audit.md",
  "ss-feature-evidence.md",
  "ss-handoff.md",
  "ss-submit-pr.md",
  "ss-close-story.md",
  "ss-roadmap.md",
  "ss-arch-plan.md",
  "ss-security-plan.md",
  "ss-ui-ux-plan.md",
  "ss-release.md",
  "ss-release-distribution.md",
  "ss-release-marketing.md",
  "ss-prod-pulse.md"
]
```

For post-ship go-to-market, also link productivity skills **`anti-slop`**, **`release-distribution`**, and **`release-marketing`** (see [`skills/productivity/README.md`](../skills/productivity/README.md)).

Link **`anti-slop`** even when you skip release marketing: the delivery loop uses it for chat and plan / HTML / issue prose (see [`harness/ss-flow.md`](../harness/ss-flow.md) context budget rule 7).

### Personal journal handoff (optional)

After `/ss-plan`, `/ss-submit-pr`, and `/ss-close-story`, agents can update a personal Obsidian journal (weekly notes + `planning.json` todos/goals) when the consumer opts in. Works from **Cursor** or **Kiro** in any consumer (e.g. Lifeway → `work`, Quickpress → `business`) as long as the same vault path is configured. Todo status: `todo` → `in progress` (on plan) → `done` (on close). Missing weekly notes are created via `journal-ensure-week.cjs` (never overwritten).

1. Link personal skills: `journal-weekly`, `journal-planning`, `journal-handoff`.
2. Add a `journal` block to `skillsync.config.json` (see example below). Set `defaultTrack` per product.
3. Re-run `link-skills` / `link-commands` (and the Kiro equivalent if commands live under `.kiro/`).
4. Optionally set `$JOURNAL_VAULT_PATH` / `$JOURNAL_HANDOFF=1` instead of (or in addition to) `vaultPath` / `enabled`.

```json
"journal": {
  "enabled": true,
  "vaultPath": "/path/to/DenMercs",
  "defaultTrack": "work",
  "skillsyncToolsRoot": ".cursor/vendor/skillsync",
  "jiraBases": {
    "DCD": "https://lifeway.atlassian.net",
    "QUICK": "https://YOUR-SITE.atlassian.net"
  }
}
```

- Missing or `"enabled": false` → handoff is skipped (no errors for other consumers).
- Vault is always the Obsidian vault — **not** the consumer repo root.
- `jiraBases` maps issue **project prefix** → Atlassian site root so `/journal` and handoff bullets link stories/epics (`[KEY](https://site/browse/KEY)`). Override with `JOURNAL_JIRA_BASES` (JSON) or `JOURNAL_JIRA_BASE_URL` if needed.
- Protocol: [`skills/personal/journal-handoff/SKILL.md`](../skills/personal/journal-handoff/SKILL.md).

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

**Strongly recommended:** include **`ss-delivery-voice.mdc`** in `linkedRules` (it is `alwaysApply: true`). That forces **simple, concise, human** chat (problem → fix → next) and major/minor grilling — skills alone are easy to skip.

For personal journal privacy, also link **`journal-vault-privacy.mdc`** and keep DenMercs **`.cursorignore`** allowlisting only `Journal/` + `_Templates/` (skills alone are soft; ignore is the hard filesystem gate when the vault is in Cursor’s scope).

## Slash commands and `ss-*`

Cursor discovers slash commands from **`.cursor/commands/*.md`** only. Shared commands use the **`ss-*`** prefix and live under **`commands/`** here. List basenames in **`linkedCommands`** and run **`link-commands.cjs`** / **`verify-commands.cjs`**.

| Command | Phase |
|---------|--------|
| `/ss-flow` | **Story spine** — three fresh agents: Plan → Implement → Done |
| `/ss-bug-fix` | **Bug belt** — repro → root cause → investigate → fix → regression → review → security → PR |
| `/ss-workflow` | Belt index — Bug / Initiative / Ship entry; points at `/ss-flow` for daily Story |
| `/ss-roadmap` | Initiative orchestrator — draft roadmap (story map + spec) → lens pack (arch / UX / security) → **then** publish Jira epics/stories → `/ss-plan` |
| `/ss-arch-plan` | Architecture plan SoT (Markdown; HTML derived); epic keys join Jira; refresh status on run — before `/ss-plan` when structure is in flux |
| `/ss-security-plan` | Security posture SoT (Markdown; HTML derived); optional whole-plugin **assess** — does **not** replace `/ss-security-audit` |
| `/ss-ui-ux-plan` | UX plan SoT (Markdown; HTML derived; flows + surfaces) — before `/ss-plan` when UI-heavy |
| `/ss-plan` | Grill + TDD plan → `.harness/state.md` (Story Plan agent) |
| `/ss-to-issues` | Publish slices to tracker (optional) |
| `/ss-implement` | All Remaining RED→GREEN cycles (or sprint slices), sequential (interactive) |
| `/ss-bugfix` | Ad-hoc — instrument likely files, run repro if possible, inspect logs, wait to apply (not a Story phase) |
| `/ss-loop` | AFK Remaining walk — fresh Paseo Cursor agent per cycle ([`docs/ss-loop.md`](./ss-loop.md)) |
| `/ss-finish` | **Done agent** — review → fix → security → handoff → submit; close after merge |
| `/ss-review` | Critic / quality gate (leaf; usually via `/ss-finish`) |
| `/ss-security-audit` | Security gate (scripts + agent) — after review, before PR |
| `/ss-handoff` | Human code walkthrough → `.harness/code-handoff.md` + derived `.html` (optional; before PR) |
| `/ss-feature-evidence` | Human feature check after audit PASS → Playwright `@evidence` clip + `.harness/feature-evidence.md` (before handoff / PR) |
| `/ss-submit-pr` | Open GitHub PR (does not merge; requires Security Evidence PASS) |
| `/ss-close-story` | Tracker Done + clear harness files (after merge) |
| `/ss-release` | Post-ship go-to-market — brief → demo proof → channel pack → anti-slop (optional; not a PR gate). **`anti-slop`** also applies to delivery-loop prose (plans, HTML, issues) per harness ss-flow rule 7. |
| `/ss-release-distribution` | Legit seed + tagged E2E clips/screenshots → proof on brief |
| `/ss-release-marketing` | Email / social / YouTube / SEO blog pack from brief |

Product repos usually keep **thin wrappers** (e.g. `qb-*`, `qp-close-jira-story`) that add tracker-specific steps and point at these shared files.

### Product PR wrappers (Lifeway / work / etc.)

Use shared **`/ss-submit-pr`** for the green path and terse body. Put **workplace** PR rules in a **consumer-only** command (not in skillsync):

| In skillsync | In the product repo wrapper |
|--------------|----------------------------|
| Preflight `--full`, security PASS, `open-pr.cjs` | Title prefix (`[DCD-####]`), `--draft`, assignees |
| Purpose / Changes / optional Visual / Screenshot | Extra checklist blocks if the board requires them |
| One-fact bullets, no file inventory, no AI footers | Jira transition after open (e.g. `Ready for Review`) — look up transitions; do not invent states |
| Ticket **link** in the body (optional) | Ticket **workflow status** stays in Jira — never a `Status:` line in the PR |

Example consumer command (create under **`.cursor/commands/`** on the Lifeway repo; do not add to this submodule):

```markdown
# qp-submit-pr

Lifeway / DCD submit. Runs shared skillsync submit, then workplace extras.

1. `/ss-submit-pr` (or `yarn ss:open-pr`) — terse `.harness/pr-body.md`, preflight --full, security.
2. Ensure title has `[DCD-####]` matching the Jira link in Purpose.
3. Open as draft if team policy says so; set assignee.
4. Transition Jira to `Ready for Review` (confirm transitions via API first).
5. Apply any DCD checklist the team keeps in this repo’s agent docs — not in skillsync.
```

## Harness and delivery loop

**Start here:** slash **`/ss-flow`** for daily Story (three agents). Map + context budget: [`harness/ss-flow.md`](harness/ss-flow.md) (file is not the slash command). Belt index: **`/ss-workflow`**.

| Harness file | Role |
|--------------|------|
| `harness/ss-flow.md` | Phase map · Story agent policy · context budget |
| `harness/harness-planner-tdd.md` | Default planner (`/ss-plan`) |
| `harness/harness-planner.md` | Legacy feature-first (local wrappers only) |
| `harness/harness-generator.md` | `/ss-implement` |
| `harness/harness-loop.md` | `/ss-loop` (AFK; Paseo + Cursor) |
| `harness/harness-critic.md` | `/ss-review` |
| `harness/critic-tdd-testing.md` | Auto-loaded when state has TDD contracts |
| `harness/harness-security-audit.md` | `/ss-security-audit` (every PR) |
| `harness/harness-security-assess.md` | `/ss-security-plan` whole-plugin health (not every PR) |
| `harness/accessible-locator-priority.md` | UI/E2E query priority (when applicable) |

Orientation: **`/ss-flow`** (Story) · **`commands/ss-workflow.md`** (all belts). Consumer-specific critic/generator addenda live under **`.cursor/harness/`** on the consumer repo.

### Typical phase order

**Story (default):**

```text
branch (consumer) → /ss-plan → /ss-to-issues? → /ss-implement | /ss-loop → /ss-review
  → /ss-security-audit → /ss-feature-evidence → /ss-handoff? → /ss-submit-pr → merge (consumer) → /ss-close-story
```

`/ss-loop` is the away-from-keyboard (AFK) alternative to `/ss-implement` — see [`ss-loop.md`](./ss-loop.md).

**Initiative (when major / foggy):** `/ss-roadmap` (wayfind? → draft → lenses → publish → `render-app-map.cjs`) → then Story loop per v1 story.

**Ship (after merge):** `/ss-release?` (or distribution / marketing partials).


Document **branch scripts**, **verification commands**, and **stack skills** in the consumer root **`AGENTS.md`**.

## Scripted `ss-*` helpers

Mechanical steps from the delivery loop live in **`tools/`** (run from the vendored skillsync path). Agents still handle judgment; scripts handle fixed exit codes.

| Tool | Phase | Purpose |
|------|-------|---------|
| `harness-reset.cjs` | `/ss-close-story` | Empty `state.md` / `qa-current.md`; delete `pr-body.md` |
| `validate-state.cjs` | pre-implement / pre-review / CI | Assert `.harness/state.md` section contract (`--mode plan\|implement\|review`) |
| `init-state.cjs` | branch / new story | Skeleton `state.md` (`--task`, `--force`) |
| `render-pr-body.cjs` | `/ss-submit-pr` | Terse PR skeleton (or `.harness/pr-body.md` draft) — no harness dump |
| `open-pr.cjs` | `/ss-submit-pr` | Push, duplicate check, `gh pr create` (`--no-push`, `--dry-run`) |
| `tdd-audit.cjs` | `/ss-review` | Hard TDD gates (contract cards, tampering, RED evidence, locators) |
| `security-audit.cjs` | `/ss-security-audit`, `/ss-submit-pr` | Phase A inventory/patterns; `--set-phase-b`; `--check-state` before PR |
| `security-assess.cjs` | `/ss-security-plan` (assess) | Whole-plugin Semgrep + deps + Wordfence; writes `security-assess.json` / `## Security Assess` |
| `run-verification.cjs` | `/ss-implement`, `/ss-loop`, `/ss-review` | Run Verification Plan commands from state |
| `ss-loop.cjs` | `/ss-loop` | AFK Remaining walker via Paseo + Cursor |
| `re-break.cjs` | TDD evidence | Stash prod paths → test FAIL → restore → PASS |
| `publish-slices-from-state.cjs` | `/ss-to-issues` | Dry-run or publish slices (`--publish --approved`) |
| `jira-close.cjs` | `/ss-close-story` | Jira REST close + harness reset (env auth; MCP remains alternative) |
| `init-release-brief.cjs` | `/ss-release*` | Scaffold `.harness/release-brief.md` (`--version`, `--force`) |
| `validate-release-brief.cjs` | `/ss-release*` | Assert brief sections (`--mode structure\|ready`) |
| `validate-release-pack.cjs` | `/ss-release*` | Assert channel pack files exist and are non-empty |
| `validate-plan-html.cjs` | lenses / wayfinder / app-map / handoff | Structural lint on derived HTML (`--kind`; `--slug` / `--file`; `--mode structure\|ready`) |
| `init-plan-html.cjs` | same plan / handoff commands | Scaffold MD SoT + render HTML (`--kind`; `--slug` → pack; `--force`) |
| `render-plan-html.cjs` | after MD edits | Derive `.html` from `.md` (`--kind`; `--validate`) |
| `watch-plan-html.cjs` | optional IDE safety net | Watch `.harness/**/*.md` plans → re-render (debounce; `--once`) |
| `init-feature-pack.cjs` | `/ss-roadmap` | Scaffold `.harness/initiatives/<slug>/` (`initiative.md`, `index.html`, `assets/`; `--epics`, `--lenses`) |
| `validate-feature-pack.cjs` | `/ss-roadmap` | Assert required lenses exist + hub/lens epic-key parity (`--slug`) |
| `render-app-map.cjs` | `/ss-roadmap` | Deterministic `.harness/app-map.html` (Mind-elixir; `--title`) |
| `verify-tools.cjs` | skillsync CI | Smoke-test tools + fixtures |
| `preflight-local.cjs` | before commit / PR | Scoped by default (story/diff E2E); `--full` before PR open (full E2E when present). `open-pr.cjs` uses `--full`. |

Optional **`skillsync.config.json`** keys for tools / journal handoff. **`toIssuesVoice`:** optional override (`agent` or `workplace`). Skip it when you can: a `DCD-` story/parent or a `LifewayIT` remote already picks workplace.

```json
{
	"prBaseBranch": "main",
	"issueKeyPattern": "^([A-Z][A-Z0-9]+-\\d+)[-/_.]?(.*)$",
	"issueTracker": "github",
	"githubIssueLabels": "ready-for-agent",
	"securityAssess": {
		"wordpressRoot": "../wordpress",
		"wordfence": "required",
		"semgrepExtraConfigs": []
	},
	"journal": {
		"enabled": true,
		"vaultPath": "/path/to/DenMercs",
		"defaultTrack": "work",
		"skillsyncToolsRoot": ".cursor/vendor/skillsync",
		"jiraBases": {
			"DCD": "https://lifeway.atlassian.net",
			"QUICK": "https://YOUR-SITE.atlassian.net"
		}
	}
}
```

**`securityAssess`** (whole-plugin health via `security-assess.cjs` / `/ss-security-plan`):

| Key | Meaning |
|-----|---------|
| `wordpressRoot` | Path to a WordPress install for Wordfence `vuln-scan` (absolute or relative to consumer root). Empty → Wordfence blocked → health **incomplete** when `wordfence` is `required`. |
| `wordfence` | `required` (default for WP) or `off` |
| `semgrepExtraConfigs` | Extra Semgrep `--config` values beyond skillsync local rules + `p/php` |

Install for Stage 2: `pipx install semgrep`, `pip install wordfence` (license may be required). Stage 1 PR gate does **not** need these.

Example **`package.json`** scripts (consumer root):

```json
{
	"scripts": {
		"ss:harness-reset": "node ./.cursor/vendor/skillsync/tools/harness-reset.cjs .",
		"ss:validate-state": "node ./.cursor/vendor/skillsync/tools/validate-state.cjs . --mode implement",
		"ss:preflight": "node ./.cursor/vendor/skillsync/tools/preflight-local.cjs .",
		"ss:preflight:full": "node ./.cursor/vendor/skillsync/tools/preflight-local.cjs . --full",
		"ss:open-pr": "node ./.cursor/vendor/skillsync/tools/open-pr.cjs .",
		"ss:app-map": "node ./.cursor/vendor/skillsync/tools/render-app-map.cjs . --title \"Product\"",
		"ss:watch-plans": "node ./.cursor/vendor/skillsync/tools/watch-plan-html.cjs .",
		"ss:render-plans": "node ./.cursor/vendor/skillsync/tools/watch-plan-html.cjs . --once",
		"ss:init-release-brief": "node ./.cursor/vendor/skillsync/tools/init-release-brief.cjs .",
		"ss:validate-release-brief": "node ./.cursor/vendor/skillsync/tools/validate-release-brief.cjs . --mode ready",
		"ss:validate-release-pack": "node ./.cursor/vendor/skillsync/tools/validate-release-pack.cjs ."
	}
}
```

`ss:preflight` = scoped (commit/push). `ss:preflight:full` = full E2E when present (before PR). `ss:open-pr` already runs preflight `--full`.

From **skillsync repo root** before commit or PR (also run after changing tools):

```bash
yarn preflight          # commit / push (scoped)
yarn preflight:full     # before opening a PR (full E2E when present)
# or: node tools/preflight-local.cjs . [--full]
```

`open-pr.cjs` runs preflight `--full` unless `--skip-preflight` / `--skip-full-e2e`. Cursor hooks: scoped on `git commit` / `git push`; `--full` on `gh pr create`.