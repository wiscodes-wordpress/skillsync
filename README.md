# skillsync

Shared **Cursor Agent Skills**, **project rules**, **`ss-*` slash commands**, **harness skeletons**, and **consumer tooling** so multiple repositories can vendor one Git source of truth.

## Repository layout

| Path | Purpose |
|------|---------|
| `skills/engineering/<name>/` | Code work, TDD, triage, PR/issue workflow, WordPress pack, review skills. |
| `skills/productivity/<name>/` | Grilling, handoff, teach, communication (Matt-style). |
| `skills/personal/` | Author-specific skills (placeholder; not linked by default). |
| `rules/*.mdc` | Shared Cursor project rules (materialize into `.cursor/rules/`). |
| `commands/ss-*.md` | Shared **skillsync** slash commands (materialize into `.cursor/commands/`). |
| `harness/*.md` | Shared harness skeletons — **`harness/ss-flow.md`** is the belt map (slash **`/ss-flow`** is the Story 3-agent command). |
| `tools/resolve-skill-dir.cjs` | Resolve skill name → folder (flat or category). |
| `tools/link-skills.cjs` | Symlink or copy selected skills → `.cursor/skills/`. |
| `tools/verify-skills.cjs` | Verify linked skills. |
| `tools/link-rules.cjs` | Symlink or copy selected rules → `.cursor/rules/`. |
| `tools/verify-rules.cjs` | Verify linked rules. |
| `tools/link-commands.cjs` | Symlink or copy selected commands → `.cursor/commands/`. |
| `tools/verify-commands.cjs` | Verify linked commands. |
| `tools/harness-reset.cjs` | Clear `.harness/` handoff files after story close. |
| `tools/validate-state.cjs` | Validate `.harness/state.md` section contract. |
| `tools/init-state.cjs` | Write skeleton harness state for a new story (`--mode story`) or bug fix (`--mode bug`). |
| `tools/render-pr-body.cjs` / `open-pr.cjs` | Build PR body and open via `gh`. |
| `tools/tdd-audit.cjs` | TDD hard gates (contract cards, tampering, RED evidence) before critic. |
| `tools/run-verification.cjs` | Run Verification Plan commands from state. |
| `tools/ss-loop.cjs` | AFK Remaining-cycle walker (Paseo + Cursor). |
| `tools/re-break.cjs` | Re-break evidence helper for TDD cycles. |
| `tools/publish-slices-from-state.cjs` | Dry-run or publish plan slices to tracker. |
| `tools/jira-close.cjs` | Jira REST close + harness reset (optional). |
| `tools/verify-tools.cjs` | Smoke-test ss-* tools and fixtures. |
| `tools/preflight-local.cjs` | Local CI gate: scoped on commit; `--full` before PR (`yarn preflight` / `preflight:full`). |
| `skillsync.config.example.json` | Example consumer config. |
| `docs/consumer-setup.md` | Submodule + `package.json` + `ss-*` naming. |

## Consumer quick start

See [`docs/consumer-setup.md`](docs/consumer-setup.md).

## Journal dashboard (personal)

Live goals/todos UI for the DenMercs vault. Checkbox writes and **Sync Google** need the local server (Obsidian’s HTML snapshot is static).

Prefer **yarn** (same as consumer `skillsync:*` scripts). `npm run` works too — no install required.

```bash
# from skillsync root
cp .env.example .env   # once: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
yarn google:auth       # once: Tasks + Calendar token

yarn dashboard
# optional: yarn dashboard -- --vault "/path/to/DenMercs" --port 8787
```

Open [http://127.0.0.1:8787/dashboard.html](http://127.0.0.1:8787/dashboard.html).

| Script | What it does |
|--------|----------------|
| `yarn dashboard` | Live UI + checkbox writes + **Sync Google** |
| `yarn google:auth` | One-time OAuth (`--calendar`) |
| `yarn google:sync` | CLI Tasks + Calendar push (same as the button) |
| `yarn google:sync:dry` | Dry-run both syncs |
| `yarn meetings` | Pull today’s agenda from Google Calendar |
| `yarn jira:sprint` | DCD active sprint: mine + unassigned (needs `JIRA_*` env) |
| `yarn dashboard:bundle` | Rebuild Obsidian `dashboard.obsidian.html` |

| Action | What it does |
|--------|----------------|
| Checkboxes / edits | Write `Journal/_dashboard/planning.json` |
| **Sync Google** | Todos → Google Tasks + `## Calendar` → Google Calendar (push) |
| **Meetings** | Pull today’s agenda from Google Calendar |
| **Sprint (DCD)** | Active sprint: assigned to me + unassigned (Jira REST) |
| Obsidian | Open `Journal/_dashboard/dashboard.obsidian.html` (rebuilt on server writes; reopen to refresh) |

Details: [`skills/personal/`](skills/personal/README.md) (`journal-planning`, `calendar-sync`).

## Cursor references

- [Agent Skills](https://cursor.com/docs/skills)
