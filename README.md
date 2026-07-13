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
| `harness/*.md` | Shared harness skeletons — **`harness/ss-flow.md`** is the delivery-loop map. |
| `tools/resolve-skill-dir.cjs` | Resolve skill name → folder (flat or category). |
| `tools/link-skills.cjs` | Symlink or copy selected skills → `.cursor/skills/`. |
| `tools/verify-skills.cjs` | Verify linked skills. |
| `tools/link-rules.cjs` | Symlink or copy selected rules → `.cursor/rules/`. |
| `tools/verify-rules.cjs` | Verify linked rules. |
| `tools/link-commands.cjs` | Symlink or copy selected commands → `.cursor/commands/`. |
| `tools/verify-commands.cjs` | Verify linked commands. |
| `tools/harness-reset.cjs` | Clear `.harness/` handoff files after story close. |
| `tools/validate-state.cjs` | Validate `.harness/state.md` section contract. |
| `tools/init-state.cjs` | Write skeleton harness state for a new story. |
| `tools/render-pr-body.cjs` / `open-pr.cjs` | Build PR body and open via `gh`. |
| `tools/tdd-audit.cjs` | TDD hard gates (contract cards, tampering, RED evidence) before critic. |
| `tools/run-verification.cjs` | Run Verification Plan commands from state. |
| `tools/re-break.cjs` | Re-break evidence helper for TDD cycles. |
| `tools/publish-slices-from-state.cjs` | Dry-run or publish plan slices to tracker. |
| `tools/jira-close.cjs` | Jira REST close + harness reset (optional). |
| `tools/verify-tools.cjs` | Smoke-test ss-* tools and fixtures. |
| `skillsync.config.example.json` | Example consumer config. |
| `docs/consumer-setup.md` | Submodule + `package.json` + `ss-*` naming. |

## Consumer quick start

See [`docs/consumer-setup.md`](docs/consumer-setup.md).

## Cursor references

- [Agent Skills](https://cursor.com/docs/skills)
