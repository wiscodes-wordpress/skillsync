# ss-epic-loop

**Phase: epic delivery (AFK)** — runs the Story belt for every story in a local epic, one story at a time. Map: [`harness/ss-flow.md`](../harness/ss-flow.md). Setup and file format: [`docs/epic-loop.md`](../docs/epic-loop.md).

**Voice:** short status only — story, phase, waiting on what. Detail lives in the story files and `.harness/epic-loop/progress.log`.

The epic folder (`epic.md` + `stories/*.md` with frontmatter) is the orchestrator. Every phase's agent is a **Paseo session** (Claude Code provider) the human can open, read and message; a session they message is held until its check passes or they release it. Per story the loop:

1. Creates a worktree + story branch from the base branch.
2. Runs a fresh **plan** agent (`ss-plan`, majors recorded under `## Open Decisions`) → **waits for your approval**. The planner session stays open so you can question it first.
3. Runs a fresh agent per **Remaining** cycle (`ss-implement`, one cycle each) and commits each completed cycle locally (squashed into one commit before the PR is pushed).
4. Runs a fresh **review** agent (`ss-review` + `ss-security-audit`, writes `pr-body.md`) → pushes and opens the PR.
5. Watches CI: on a failing check, a fresh agent fixes it and the loop pushes (capped). **You merge.**
6. After the merge, starts the next story whose dependencies are merged.

With `epicLoop.parallel` above 1, ready stories run side by side, each in its own `--story` loop. Agents file work they find outside their story as new `todo` stories (`--file … --from <id>`) instead of doing it.

In **Agent** mode:

1. Status: `node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic <epic dir> --status` (or `--ready --json` for what can start now and what each waiting story waits on)
2. If a story is `awaiting-approval`: show its `## Open Decisions` from `<epic>/state/<id>.md`. The human edits it or asks the planner session in Paseo (its id is the story's `session` field), then `--approve <id>` (takes the newer copy, refuses an invalid plan).
   If a story has `session_held: yes`: the human is talking to that session. Leave it alone; when they say they're done, `--release <id>`.
3. Otherwise start (or resume) the loop in the background: `node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic <epic dir>`
   — `--once` advances one step; `--dry-run --json` shows the next step without doing it.
4. To watch it: `node .cursor/vendor/skillsync/tools/epic-loop.cjs . --dashboard` (live page at http://127.0.0.1:4747) or `--tail` (terminal).
5. Report the progress lines; do not run phases by hand while the loop holds `.harness/epic-loop.lock`.
6. To read or talk to a phase: open its session in Paseo (`paseo agent open <id>`, or **Open session** on the dashboard). If the Paseo daemon is down, phases fall back to headless `claude -p`; set `epicLoop.agent.runner: "claude"` to always run headless.

**PR watch on its own** (any branch, no epic): `node .cursor/vendor/skillsync/tools/pr-watch.cjs . [--pr N] [--fix]`.

**Never:** merge PRs, push to the base branch, or commit outside the loop's story worktrees.

Available as `/ss-epic-loop` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
