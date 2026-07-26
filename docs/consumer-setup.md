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
2. Set `linkedSkills` to skill **names** (e.g. `"tdd"`, `"wp-block-development"`). Names resolve from `engineering/`, `productivity/`, `personal/`, or `misc/` — omit entries you do not need.
3. Optionally set `linkedRules` to basenames of `.mdc` files from `<vendorRoot>/rules/` (see **Project rules** below).
4. Optionally set `linkedCommands` to basenames of `.md` files from `<vendorRoot>/commands/` (see **Slash commands** below).
5. Optionally set `linkMode` to `copy` if symlinks are not viable on your OS.

### Minimal `linkedSkills` for the **`ss-*` delivery loop**

| Skill | Used by |
|-------|---------|
| `arch-plan` | `/ss-arch-plan` (optional; architecture plan source of truth + epic-keyed stages) |
| `security-plan` | `/ss-security-plan` (optional; posture HTML + whole-plugin assess; not the PR gate) |
| `improve-codebase-architecture` | Optional with `/ss-arch-plan` when deepening existing friction |
| `ui-ux-planner` | `/ss-ui-ux-plan` (optional; living HTML UX source of truth before `/ss-plan`) |
| `grill-tdd` | `/ss-plan` (step 1b) |
| `tdd` | `/ss-implement` when state has RED→GREEN Plan |
| `ponytail` | `/ss-implement` |
| `submit-github-pr` | `/ss-submit-pr` |
| `jira-close-story` | `/ss-close-story` |
| `to-issues` | `/ss-to-issues` (optional) |

Add **`grill-with-docs`** when the repo uses `CONTEXT.md` / ADRs (substitute for `grill-me` in plan step 1a — productivity skill, link if desired). Add stack skills only when needed (e.g. `jest-react-testing`, `wordpress-testing-qa`) — not required for the generic loop. Do **not** link **`testing-expert`** for the loop; it is an optional encyclopedia.

### Full `linkedCommands` (typical)

```json
"linkedCommands": [
  "ss-workflow.md",
  "ss-roadmap.md",
  "ss-arch-plan.md",
  "ss-security-plan.md",
  "ss-ui-ux-plan.md",
  "ss-plan.md",
  "ss-to-issues.md",
  "ss-implement.md",
  "ss-review.md",
  "ss-security-audit.md",
  "ss-submit-pr.md",
  "ss-close-story.md",
  "ss-release.md",
  "ss-release-distribution.md",
  "ss-release-marketing.md"
]
```

For post-ship go-to-market, also link productivity skills **`anti-slop`**, **`release-distribution`**, and **`release-marketing`** (see [`skills/productivity/README.md`](../skills/productivity/README.md)).

Link **`anti-slop`** even when you skip release marketing: the delivery loop uses it for plan / HTML / issue prose (see [`harness/ss-flow.md`](../harness/ss-flow.md) context budget rule 6).

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

For personal journal privacy, also link **`journal-vault-privacy.mdc`** and keep DenMercs **`.cursorignore`** allowlisting only `Journal/` + `_Templates/` (skills alone are soft; ignore is the hard filesystem gate when the vault is in Cursor’s scope).

## Slash commands and `ss-*`

Cursor discovers slash commands from **`.cursor/commands/*.md`** only. Shared commands use the **`ss-*`** prefix and live under **`commands/`** here. List basenames in **`linkedCommands`** and run **`link-commands.cjs`** / **`verify-commands.cjs`**.

| Command | Phase |
|---------|--------|
| `/ss-workflow` | Orientation — phase index |
| `/ss-roadmap` | Initiative orchestrator — draft roadmap (story map + spec) → lens pack (arch / UX / security) → **then** publish Jira epics/stories → `/ss-plan` |
| `/ss-arch-plan` | Architecture plan source of truth (living HTML); epic keys join Jira; refresh status on run — before `/ss-plan` when structure is in flux |
| `/ss-security-plan` | Security posture source of truth (living HTML); optional whole-plugin **assess** (Semgrep + deps + Wordfence) — does **not** replace `/ss-security-audit` |
| `/ss-ui-ux-plan` | UX plan source of truth (living HTML; flows + surfaces) — before `/ss-plan` when UI-heavy |
| `/ss-plan` | Grill + TDD plan → `.harness/state.md` |
| `/ss-to-issues` | Publish slices to tracker (optional) |
| `/ss-implement` | All Remaining RED→GREEN cycles (or sprint slices), sequential |
| `/ss-review` | Critic / quality gate |
| `/ss-security-audit` | Security gate (scripts + agent) — after review, before PR |
| `/ss-submit-pr` | Open GitHub PR (does not merge; requires Security Evidence PASS) |
| `/ss-close-story` | Tracker Done + clear harness files |
| `/ss-release` | Post-ship go-to-market — brief → demo proof → channel pack → anti-slop (optional; not a PR gate). **`anti-slop`** also applies to delivery-loop prose (plans, HTML, issues) per ss-flow rule 6. |
| `/ss-release-distribution` | Legit seed + tagged E2E clips/screenshots → proof on brief |
| `/ss-release-marketing` | Email / social / YouTube / SEO blog pack from brief |

Product repos usually keep **thin wrappers** (e.g. `qb-*`, `qp-close-jira-story`) that add tracker-specific steps and point at these shared files.

## Harness and delivery loop

**Start here:** [`harness/ss-flow.md`](harness/ss-flow.md) — canonical phase map, which harness file each command loads, and **context budget** rules (avoid loading huge skills on every step).

| Harness file | Role |
|--------------|------|
| `harness/ss-flow.md` | Phase map · context budget |
| `harness/harness-planner-tdd.md` | Default planner (`/ss-plan`) |
| `harness/harness-planner.md` | Legacy feature-first (local wrappers only) |
| `harness/harness-generator.md` | `/ss-implement` |
| `harness/harness-critic.md` | `/ss-review` |
| `harness/critic-tdd-testing.md` | Auto-loaded when state has TDD contracts |
| `harness/harness-security-audit.md` | `/ss-security-audit` (every PR) |
| `harness/harness-security-assess.md` | `/ss-security-plan` whole-plugin health (not every PR) |
| `harness/accessible-locator-priority.md` | UI/E2E query priority (when applicable) |

Orientation command: **`commands/ss-workflow.md`**. Consumer-specific critic/generator addenda live under **`.cursor/harness/`** on the consumer repo.

### Typical phase order

```text
branch (consumer) → /ss-arch-plan? → /ss-security-plan? → /ss-ui-ux-plan? → /ss-plan → /ss-to-issues? → /ss-implement → /ss-review
  → /ss-security-audit → /ss-submit-pr → merge (consumer) → /ss-close-story
  → /ss-release? (or /ss-release-distribution / /ss-release-marketing)
```

Major feature (initiative) entry: `/ss-roadmap` → roadmap + lens gates → feature pack lenses → the same per-story loop above.


Document **branch scripts**, **verification commands**, and **stack skills** in the consumer root **`AGENTS.md`**.

## Scripted `ss-*` helpers

Mechanical steps from the delivery loop live in **`tools/`** (run from the vendored skillsync path). Agents still handle judgment; scripts handle fixed exit codes.

| Tool | Phase | Purpose |
|------|-------|---------|
| `harness-reset.cjs` | `/ss-close-story` | Empty `state.md` / `qa-current.md`; delete `pr-body.md` |
| `validate-state.cjs` | pre-implement / pre-review / CI | Assert `.harness/state.md` section contract (`--mode plan\|implement\|review`) |
| `init-state.cjs` | branch / new story | Skeleton `state.md` (`--task`, `--force`) |
| `render-pr-body.cjs` | `/ss-submit-pr` | Merge draft + harness sections → PR body file |
| `open-pr.cjs` | `/ss-submit-pr` | Push, duplicate check, `gh pr create` (`--no-push`, `--dry-run`) |
| `tdd-audit.cjs` | `/ss-review` | Hard TDD gates (contract cards, tampering, RED evidence, locators) |
| `security-audit.cjs` | `/ss-security-audit`, `/ss-submit-pr` | Phase A inventory/patterns; `--set-phase-b`; `--check-state` before PR |
| `security-assess.cjs` | `/ss-security-plan` (assess) | Whole-plugin Semgrep + deps + Wordfence; writes `security-assess.json` / `## Security Assess` |
| `run-verification.cjs` | `/ss-implement`, `/ss-review` | Run Verification Plan commands from state |
| `re-break.cjs` | TDD evidence | Stash prod paths → test FAIL → restore → PASS |
| `publish-slices-from-state.cjs` | `/ss-to-issues` | Dry-run or publish slices (`--publish --approved`) |
| `jira-close.cjs` | `/ss-close-story` | Jira REST close + harness reset (env auth; MCP remains alternative) |
| `init-release-brief.cjs` | `/ss-release*` | Scaffold `.harness/release-brief.md` (`--version`, `--force`) |
| `validate-release-brief.cjs` | `/ss-release*` | Assert brief sections (`--mode structure\|ready`) |
| `validate-release-pack.cjs` | `/ss-release*` | Assert channel pack files exist and are non-empty |
| `validate-plan-html.cjs` | `/ss-arch-plan`, `/ss-ui-ux-plan`, `/ss-security-plan` | Structural lint for living HTML (`--kind arch\|ux\|security`; `--mode structure\|ready`) |
| `init-feature-pack.cjs` | `/ss-roadmap` | Scaffold initiative hub `.harness/initiatives/<slug>/index.html` (`--slug`, `--epics`, `--lenses`) |
| `validate-feature-pack.cjs` | `/ss-roadmap` | Assert required lenses exist + hub/lens epic-key parity (`--slug`) |
| `verify-tools.cjs` | skillsync CI | Smoke-test tools + fixtures |

Optional **`skillsync.config.json`** keys for tools / journal handoff:

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
		"ss:open-pr": "node ./.cursor/vendor/skillsync/tools/open-pr.cjs .",
		"ss:init-release-brief": "node ./.cursor/vendor/skillsync/tools/init-release-brief.cjs .",
		"ss:validate-release-brief": "node ./.cursor/vendor/skillsync/tools/validate-release-brief.cjs . --mode ready",
		"ss:validate-release-pack": "node ./.cursor/vendor/skillsync/tools/validate-release-pack.cjs ."
	}
}
```

From **skillsync repo root** after changing tools:

```bash
node tools/verify-tools.cjs .
```
