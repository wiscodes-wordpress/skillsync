# `/ss-loop` — AFK implement via Paseo + Cursor

Optional **away-from-keyboard (AFK)** Story path. skillsync owns the cycle queue (`.harness/state.md`); [Paseo](https://paseo.sh/) launches a **fresh Cursor agent per Remaining cycle**. Interactive implement stays **`/ss-implement`**.

Not a fork of [snarktank/ralph](https://github.com/snarktank/ralph) — same idea (fresh context, small tasks, verify, repeat), wired to skillsync state and Cursor via Paseo.

## When to use

| Command | Use when |
|---------|----------|
| `/ss-implement` | You stay in the session; walk Remaining cycles interactively |
| `/ss-loop` | AFK: overnight / unattended Remaining walk after `/ss-plan` |

Always finish with **`/ss-review`** when Remaining is empty. `/ss-loop` does not replace the critic.

## Machine setup (once)

1. Install and run the [Paseo](https://paseo.sh/) daemon (`paseo daemon status` should show reachable).
2. Ensure the **Cursor** provider is available (`paseo` → Providers, or MCP `list_providers`).
3. Authenticate Cursor for headless/agent use on that machine (same subscription Paseo already uses).

## Per-repo setup

1. Link the command in `skillsync.config.json`:

```json
"linkedCommands": [
  "ss-implement.md",
  "ss-loop.md",
  "ss-review.md"
]
```

2. Re-run `link-commands.cjs` / `yarn skillsync:link`.
3. After `/ss-plan`, validate then loop:

```bash
node .cursor/vendor/skillsync/tools/validate-state.cjs . --mode implement
node .cursor/vendor/skillsync/tools/ss-loop.cjs .
# or from Cursor: /ss-loop
```

### Useful flags

```bash
node .cursor/vendor/skillsync/tools/ss-loop.cjs . --dry-run
node .cursor/vendor/skillsync/tools/ss-loop.cjs . --cycle 2
node .cursor/vendor/skillsync/tools/ss-loop.cjs . --through 3 --max-iterations 10
node .cursor/vendor/skillsync/tools/ss-loop.cjs . --provider cursor --model composer-2.5
node .cursor/vendor/skillsync/tools/ss-loop.cjs . --worktree --new-branch ss-loop/my-story
```

Progress log (under story scratch, usually gitignored): `.harness/loop-progress.txt`.

**One agent per cycle:** `ss-loop` spawns a single Paseo agent for each Remaining cycle. It does **not** respawn when the agent goes idle without updating `state.md` (that used to flood duplicate `ss-loop Cycle N` agents). Concurrent loops on the same repo are blocked by `.harness/ss-loop.lock`. `--max-retries` only retries when `paseo run` fails to create/start an agent (default `0`).

## Permissions (AFK without babysitting prompts)

Cursor’s **agent** mode still gates some shell/MCP calls. For unattended runs:

1. **Cursor Run Mode:** prefer **Auto-review** (or **Run Everything** only in trusted local/worktree sandboxes).
2. **Project allow / steer file** — copy [`examples/permissions.ss-loop.json`](./examples/permissions.ss-loop.json) to the consumer as **`.cursor/permissions.json`** (merge with any existing allowlists). Steer Auto-review toward Verification Plan / test / lint / typecheck; block `.env`, force-push, and prod deploys.
3. **`ss-loop.cjs`** spawns agents with `--background`, then polls **`paseo permit ls`** and allows pending requests for that agent (disable with `--no-permit-poll`).
4. Prefer **`--worktree`** so AFK edits stay off your main working tree.

Cursor provider modes exposed to Paseo are typically `agent` / `plan` / `ask` — default for `/ss-loop` is **`agent`**.

## How it works

```text
while Remaining has scoped cycles:
  1. Build a Cycle N-only prompt from state.md (plan + acceptance + verification)
  2. paseo run --provider cursor --background  (fresh agent)
  3. Poll permits → paseo wait
  4. run-verification.cjs --cycle N
  5. Fail closed if Cycle N still listed under Remaining
  6. Else continue
COMPLETE → /ss-review
```

Harness for each worker: [`harness/harness-loop.md`](../harness/harness-loop.md). Orchestrator: [`tools/ss-loop.cjs`](../tools/ss-loop.cjs).

## Consumer checklist

1. Paseo daemon running; Cursor provider available.
2. `ss-loop.md` linked; `.cursor/permissions.json` tuned for Auto-review (recommended).
3. `/ss-plan` produced Remaining cycles + Verification Plan commands that actually run.
4. `/ss-loop` (or `ss-loop.cjs`) until COMPLETE or intentional stop.
5. `/ss-review` → normal Story belt (security / PR / close).
