# `/ss-loop` — AFK implement via Paseo + Cursor

Optional **away-from-keyboard (AFK)** Story path. skillsync owns the cycle queue (`.harness/state.md`); [Paseo](https://paseo.sh/) launches a **fresh Cursor agent per Remaining cycle**. Interactive implement stays **`/ss-implement`**.

Not a fork of [snarktank/ralph](https://github.com/snarktank/ralph) — same idea (fresh context, small tasks, verify, repeat), wired to skillsync state and Cursor via Paseo.

## When to use

| Command | Use when |
|---------|----------|
| `/ss-implement` | You stay in the session; walk Remaining cycles interactively |
| `/ss-loop` | AFK: overnight / unattended Remaining walk after `/ss-plan` |

Always finish with **`/ss-finish`** (or at least **`/ss-review`**) when Remaining is empty. `/ss-loop` does not replace the critic.

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
node .cursor/vendor/skillsync/tools/ss-loop.cjs . --worktree --new-branch ss-loop/my-story
# Cost overrides (default is already cursor + composer-2.5):
node .cursor/vendor/skillsync/tools/ss-loop.cjs . --model gpt-5.4-mini   # API-credit pool — avoid for AFK
node .cursor/vendor/skillsync/tools/ss-loop.cjs . --model default        # inherit Cursor/Paseo account default
```

**Default model:** `cursor` + **`composer-2.5`** (Cursor Models pool). Do not omit `--model` and rely on account default — that often inherits the parent tab’s `gpt-5.4-mini` + medium thinking and burns Other Models credits. **Auto-review** (permissions) is unrelated to Auto Cost / model routing.

**Preflight:** before the first agent, `ss-loop` checks that every scoped Remaining cycle has a `### Cycle N` Verification Plan block with at least one runnable command (`1. \`cmd\`` or a bash fence). Empty plans fail immediately — no Paseo agent is spawned.

**Postflight (deterministic agent check):** after each agent goes idle, before continuing:
1. Paseo agent status is not `error`
2. Verification Plan commands for that cycle **PASS** (`run-verification.cjs`)
3. `state.md` changed vs pre-agent snapshot
4. Cycle N is under **Completed** and not under **Remaining**
5. If RED→GREEN Plan has Cycle N → `## TDD Evidence` must mention that cycle

These gates are code, not LLM judgment — soft “agent said done” is not enough.

Progress log (under story scratch, usually gitignored): `.harness/loop-progress.txt`.

**One agent per cycle:** `ss-loop` spawns a single Paseo agent for each Remaining cycle. It does **not** respawn when the agent goes idle without updating `state.md` (that used to flood duplicate `ss-loop Cycle N` agents). Concurrent loops on the same repo are blocked by `.harness/ss-loop.lock`. `--max-retries` only retries when `paseo run` fails to create/start an agent (default `0`).

## Permissions (AFK without babysitting prompts)

Cursor does **not** expose a setting to make the permission dialog default to **Allow once**. For **Paseo + Cursor**, use these instead:

1. **Auto Accept (best, conditional on Paseo + Cursor)** — Enable at spawn:
   - MCP `create_agent` / `update_agent`: `settings.features.auto_accept: true` (see skill [`paseo-cursor-auto-accept`](../skills/engineering/paseo-cursor-auto-accept/SKILL.md)).
   - `/ss-loop`: after each `paseo run`, calls `paseo-set-feature.cjs` for Cursor agents (soft-skips if Paseo is not installed).
   - Desktop: toggle **Auto Accept** (green shield) on the agent controls.
2. **Cursor Run Mode** — prefer **Auto-review** (or **Run Everything** only in trusted local/worktree sandboxes) so fewer prompts are raised.
3. **Project allow / steer file** — copy [`examples/permissions.ss-loop.json`](./examples/permissions.ss-loop.json) (AFK Remaining) or [`examples/permissions.ss-delivery.json`](./examples/permissions.ss-delivery.json) (broader Story/tools) to **`.cursor/permissions.json`**, and optionally layer **`.cursor/cli.json`** `permissions.allow` (see skillsync’s committed copies under `.cursor/`). Merge with any existing allowlists. Steer Auto-review toward Verification Plan / test / lint / typecheck / `preflight`; block `.env`, force-push, and prod deploys.
4. **`ss-loop.cjs`** also polls **`paseo permit ls`** and **`paseo permit allow <agent> --all`** (disable with `--no-permit-poll`). Poll interval is ~2s so cards clear quickly if Auto Accept did not apply.
5. **Side watcher (any Paseo agent)** — if you spawn agents from the Paseo UI (not only `/ss-loop`):

```bash
node .cursor/vendor/skillsync/tools/paseo-permit-watch.cjs
# or once: node .../paseo-permit-watch.cjs --once
# or one agent: node .../paseo-permit-watch.cjs --agent <id-or-prefix>
```

6. Prefer **`--worktree`** so AFK edits stay off your main working tree.

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
5. `/ss-finish` (or `/ss-review` → …) → normal Story Done path (security / PR / close).
