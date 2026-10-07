# `/ss-epic-loop` — deliver a local epic story by story

Runs the Story belt (plan → implement → review → PR) for each story in an epic, one at a time, with fresh agents per phase. It runs locally, while you're in a session or the machine is on. It needs no tracker: the epic is a folder of Markdown files, and GitHub (`gh`) is the only outside service.

You stay in charge of two steps: **approving each plan** and **merging each PR**.

Each phase's agent runs as a [Paseo](https://paseo.sh/) session by default, so you can open any of them in the Paseo app (desktop or phone), read what it is doing, and message it. See [Read and talk to a session](#read-and-talk-to-a-session).

## Epic folder

The layout is defined by the Orchestrator Paseo plugin (`server/harness-layout.ts` in github.com/denmercs/Orchestrator), which creates it: **Harness plan → Initiatives → New initiative** (or **New phase** on an existing one). It numbers epics `E1`, `E2`, … per initiative and writes `epic.md` with `id` / `title` frontmatter. **Open** puts an epic on the plugin's board. That choice lives in the plugin, so on the command line pass `--epic` or set `epicLoop.epic` yourself. Stories are written by `/ss-roadmap` or `epic-loop --file`.

To run stories from the plugin's board, set its **Runner** to `tools/lib/epic-dashboard.cjs` in this repo. It exports `createHarnessRunner`, which drives this loop for the epic the board has open.

```
.harness/initiatives/<slug>/epics/<epic-id>/
  epic.md            # frontmatter id + title; free-form body; the loop regenerates the table between its markers
  stories/*.md       # one file per story, frontmatter below (file order = priority)
  state/<id>.md      # written by the loop: each story's harness state (plan, evidence, verdict)
```

Story frontmatter:

```yaml
---
id: E1-S2
title: API reference module
status: todo            # todo | planning | awaiting-approval | implementing | reviewing | pr-open | merged | blocked
depends_on: E1-S0, E1-S1   # must be merged before this story starts
blocked_by: backend API keys   # optional external blocker; skipped while set
branch: feature/e1-s2-api-reference   # filled in by the loop if empty
pr: 42                  # filled in by the loop
---
```

The loop also writes `attempts`, `blocked_reason`, `fix_attempts` and `fixed_sha`. To retry a blocked story, set `status` back to the phase you want and clear `blocked_reason`.

## Run

```bash
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic .harness/initiatives/<slug>/epics/<epic-id> --status
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic … --dry-run --json   # next step, no side effects
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic …                    # run until nothing is ready
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic … --once             # one step (for /loop or cron)
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic … --approve E1-S2    # after reviewing the plan
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic … --release E1-S2    # done talking to a held session
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic … --ready [--json]   # what can start now, what waits on what
```

While waiting (plan approval, CI running, PR waiting for merge) the loop polls every `intervalSec`. It exits when every story is merged, or when nothing is ready (all remaining stories blocked or waiting on dependencies) and no `--story` loop is still running. While one is, it waits, because that story's merge may make more work ready.

Before the first story, the loop sends one tiny prompt for each distinct model in `agent.model` and stops if the installed `claude` CLI can't run one (for example, the CLI is older than the model). Fix it with `claude update` or a different model. Without this check, every story would use up its attempts in seconds.

To stop the loop, press Ctrl-C or run `kill <pid>`. With the Paseo runner, the agent's session keeps going in Paseo (stop it there if you want it stopped), and the next loop run reattaches to it instead of starting a second one. With `claude -p`, stopping the loop also stops the agent, and the phase runs again from the start next time. Either way, the attempt doesn't count against the story.

### Two stories at once

Set `"parallel": 2` (or pass `--parallel 2`) and the default loop starts a `--story` loop for another ready story whenever fewer than two stories are running, its own included. `--dry-run` shows which stories it would start (`parallel` in the JSON). Each `--story` loop's output goes to `.harness/epic-loop/logs/story-loop-<id>.out`.

You can also start one by hand when a second story is ready (its dependencies are merged):

```bash
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --story E1-S5   # second terminal
```

Each process claims the story it is working on (`.harness/epic-loop/claims/<id>.pid`), and the other loops skip it. You can run one default loop per repo and one `--story` loop per story. A `--story` loop exits when its story merges, or right away if the story isn't ready. Each story still has its own worktree, branch and PR. Its plan still waits for `--approve`.

Plan for conflicts between open PRs. Keep each story's new code in its own folder, and limit shared files (routes, nav, global styles) to one-line additions. Don't let two open PRs both add dependencies: lockfile conflicts have to be regenerated, not merged.

### Work found along the way

Every phase's agent is told not to do work outside its story. When it finds some (a bug elsewhere, missing groundwork, a follow-up), it files a new story instead, the way beads agents file "discovered from" issues:

```bash
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --epic … --file "Fix nav focus ring" --from E1-S2 --depends-on E1-S0 --note "Focus ring hidden on dark theme"
```

The story gets the epic's next id (`E1-S11` after `E1-S10`) and `discovered_from: E1-S2` in its frontmatter, and starts as `todo`. It still needs its plan approved, so nothing ships that you haven't seen. Filing the same title twice returns the first story. A story can file at most `maxFiledPerStory` (default 3); after that the agent notes the work in its state file instead. You can file stories yourself the same way. The dashboard shows a filed story in **Epic updates**, and its drawer shows the story it came from.

## Read and talk to a session

Each phase (plan, each cycle, review, each CI fix) is its own Paseo chat, titled like `E1-S2 cycle3 — API reference module` and labelled `epicLoop=<epic>`, `story=<id>`, `phase=<phase>`. Open it from the Paseo app, from the dashboard's **Open session** button, or with `paseo agent open <id>`. The progress log prints each session's id when it starts.

You can message any running session to ask why it chose something or to steer it. The loop notices that a message came from you and not from the loop:

- **It holds the phase.** When the agent goes idle after you've talked to it, the loop doesn't take that as "finished". It waits until the phase's own check passes: the plan validates, the cycle moves to Completed, the review writes its verdict, or the CI fix changes something. Then it carries on as usual.
- **The phase timeout stops counting** once you've joined; the session is yours until you're done.
- **Release it** when you're done talking but the check hasn't passed (say you told it to stop): `--release <id>` or the dashboard's **Release** button. The loop then runs its normal checks, which may count a failed attempt.
- You get a macOS notification when a session is held for you, and when an agent is waiting on a permission card in Paseo. The phase timeout pauses while a card is open.

**Planning with the planner.** The plan session stays open while the story waits for approval. Ask it about its `## Open Decisions`, and tell it to change the plan; it edits the worktree's `.harness/state.md`. Use **Ask the planner** on the dashboard to open it. `--approve` (or **Approve plan**) takes the newer of that file and `<epic>/state/<id>.md`, so changes made either way count. It refuses a plan that no longer validates.

Sessions stay in Paseo after their phase so you can read them back, and are archived when the story merges. Archived chats are still readable in Paseo, under archived.

Talk to the session that's running. An older session (the plan or an earlier cycle) shares the worktree with the current one, so changes it makes can collide.

## Watch it work

```bash
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --dashboard   # http://127.0.0.1:4747 (--port to change)
```

A live page, refreshed every 2 seconds, with:
- **Start epic / Stop epic:** runs the default loop (each ready story in turn) detached, output in `.harness/epic-loop/loop.out`. It still waits for you to approve each plan and merge each PR. Stop kills the loop and its running agent; the story picks up where it left off on the next start.
- **Stories:** the dependency graph is the board. Columns are dependency steps; arrows go from a dependency to the stories that need it, solid once it is merged. Each story shows its status, cycle progress and PR, a badge when it needs you (**Approve plan**, **Your turn**, **Merge**, **Blocked**, **Ready**) and a pulsing dot while an agent works on it. Click a story for its drawer: **Approve plan**, **Start planning**, **Retry**, **Open session**, **Release**, **Preview**, what it depends on and its history. On a narrow screen the graph becomes a list grouped by step. Merging stays on GitHub.
- **Epic updates:** milestones only (started, filed, plan ready, approved, PR opened, merged, blocked), with a toast when one lands while the page is open.
- **Agent feed:** the running agent's tool calls and errors (with Paseo, refreshed every 10 seconds from the session; the live view is the chat itself).
- **Loop timeline.**

It reads the same files as the loop, so it can run with the loop running or stopped. It listens on 127.0.0.1 only.

### Start and Retry

**Start planning** and **Retry** each launch an `epic-loop --story <id>` process for that story, detached so it keeps running after the dashboard stops. The output goes to `.harness/epic-loop/logs/story-loop-<id>.out`. The button doesn't appear while another loop is working on the story. A story started this way is planned, then waits for your approval as usual. The `--story` loop exits once the story merges, so start the default loop again to continue with the next stories.

**Retry** resets the story's attempts and CI-fix count and sends it back to the status it was blocked from (`blocked_from`, which the loop records when it blocks a story). A story blocked before that was recorded goes back to planning if no cycle was done, to implementing if some were, and to review if all were. Fix the cause first: a story blocked for the same reason will just be blocked again.

### Try the change before you merge

The review agent writes a `## Preview` section in the story's state. It lists each app route the story changed, with what to look at, or `none — <why>` when there's nothing visible (a library-only story, for example). The drawer of a story in **Review** or **PR open** shows that list and a **Preview** button. The button starts the app's dev server in the story's worktree, waits until it answers, and opens the first route in a new tab. The routes then become links. **Stop** shuts the server down, and so does stopping the dashboard.

Turn it on with the command that starts your dev server. `{port}` is replaced with the story's port (`basePort` plus the story's position in the epic, so each story keeps the same URL):

```json
"preview": { "command": "cd frontend && npm run dev -- --port {port} --strictPort", "basePort": 5180 }
```

Server output goes to `.harness/epic-loop/previews/<id>.log`.

In a terminal instead:

```bash
node .cursor/vendor/skillsync/tools/epic-loop.cjs . --tail
```

This follows the loop's steps (`[loop] …`) and the running agent's tool calls as they happen, for example `→ Bash: npm test -- src/App.test.tsx`, and ends each agent with its time and cost. Run it in a second terminal while the loop runs.

Raw files: `.harness/epic-loop/progress.log` (loop steps) and `.harness/epic-loop/logs/<story>-<phase>-<time>.log` (each agent's prompt plus its `stream-json` output, written live). macOS notifications fire when a plan is ready, a PR opens, a story merges or blocks.

## What runs where

- **Worktree per story** at `.harness/worktrees/<id>`, on the story branch, created from `origin/<base>`. Your main checkout is never touched.
- **Agents** are Claude Code in auto permission mode: the classifier approves routine work (chained shell commands, temp files, the TDD re-break steps) and blocks risky actions. The loop commits and pushes; agents never do.
  - **Paseo runner (default):** `paseo run --provider claude --mode auto --model <phase model>` in the story worktree. `paseo run` can't pass Claude flags, so the loop writes the same rules into the worktree's `.claude/settings.local.json`: `git commit` / `git push` denied (deny rules beat auto mode), routine tools allowed, the skillsync and epic folders readable. The file is git-excluded and never committed. A CI fix that runs in your own checkout (`pr-watch --fix`) puts your settings file back as it was afterwards.
  - **Fallback:** if the Paseo daemon isn't reachable when a phase starts, that phase runs headless with `claude -p` and the progress log says why. The next phase checks again.
  - **`claude -p` runner:** `claude -p --output-format stream-json --verbose --permission-mode auto`, prompt on stdin, `git commit` / `git push` denied with `--disallowedTools`. Nobody can step in.
- **`.harness/` never ships:** the loop adds it to the shared `.git/info/exclude` and leaves it out of every commit, even when the base branch's `.gitignore` doesn't list it.
- **The loop commits** each completed cycle (`<id>: Cycle N — <name>`) as a local checkpoint, so a later cycle's re-break (`git stash`, `git checkout --`) can't wipe earlier work. Before the first push it squashes the cycles and review fixes into one commit (`<id>: <title>`), pushes the story branch, and opens the PR with `gh pr create`. Once the branch is on origin nothing is rewritten: CI fixes are their own commits.
- **CI fixes:** a failing check on the PR's head commit gets one fix agent with the failed-step log. The loop commits `Fix CI: …` and pushes. This is capped by `maxFixes`, then the story blocks.

## Config (`skillsync.config.json`)

```json
"epicLoop": {
  "epic": ".harness/initiatives/api-docs-portal/epics/E1-api-docs-portal",
  "base": "master",
  "setup": ["cd frontend && npm ci"],
  "maxAttempts": 2,
  "maxFixes": 3,
  "intervalSec": 60,
  "notify": true,
  "parallel": 1,
  "maxFiledPerStory": 3,
  "preview": { "command": "cd frontend && npm run dev -- --port {port} --strictPort", "basePort": 5180 },
  "agent": {
    "runner": "paseo",
    "timeoutMin": 45,
    "model": { "plan": "claude-opus-5-5", "review": "claude-opus-5-5", "default": "claude-sonnet-5-5" }
  }
}
```

`agent.runner` is `paseo` (the default) or `claude`. Setting `agent.command` or `agent.args` without a `runner` means `claude`. Paseo-only options: `agent.paseo` (path to the CLI when it isn't on PATH; the default falls back to the one inside `/Applications/Paseo.app`) and `agent.mode` (Paseo permission mode, default `auto`).

For `claude`, `agent.args` replaces the default list entirely, including the git commit/push deny, so keep `--disallowedTools` if you override it. The prompt is always sent on stdin.

`agent.model` is passed as `--model` (to `paseo run` or `claude`). It's either one id for every phase, or one per phase: `plan`, `cycle` (every implementation cycle), `review`, `fix` (CI fixes), and `default` for any phase you leave out. Without it, agents run on the CLI's default model. It's skipped when `agent.args` already has `--model`.

## PR watch without an epic

```bash
node .cursor/vendor/skillsync/tools/pr-watch.cjs .                 # PR for the current branch; exits on merge/close
node .cursor/vendor/skillsync/tools/pr-watch.cjs . --pr 42 --fix   # fix agent on failure (needs a clean checkout on the PR branch)
node .cursor/vendor/skillsync/tools/pr-watch.cjs . --once --json   # one check, machine-readable
```

## Limits

- One story per loop process (`parallel` or `--story` runs more processes). A story starts only after its dependencies are merged, so there are no stacked PRs.
- Planning doesn't wait for you: the agent picks its recommended option for each major decision and lists them under `## Open Decisions`. Push back at approval, by editing the state file or by talking to the planner session.
- Held sessions are detected from Paseo's agent record (`~/.paseo/agents/…/<id>.json`, `lastUserMessageAt`), which the Paseo CLI doesn't expose. If a Paseo update moves it, the loop stops noticing your messages and treats idle as finished, as `claude -p` does.
- Local only: if the machine sleeps, the loop pauses. Restart it with the same command; it resumes from the story files.
