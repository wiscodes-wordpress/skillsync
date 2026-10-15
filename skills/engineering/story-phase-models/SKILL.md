---
name: story-phase-models
description: >
  Maps Story belt phases (plan, implement/cycle, review, fix) to Cursor model ids from
  skillsync.config.json storyPhaseModels. Use when starting /ss-plan, /ss-implement,
  /ss-review, /ss-finish, /ss-flow, or when the human asks which model to pick.
---

# Story phase models

**Policy:** one **fresh agent** per Story phase ([`/ss-flow`](../../../commands/ss-flow.md)). Pick the model **before** running the slash command.

## Consumer config

In repo-root `skillsync.config.json`:

```json
"storyPhaseModels": {
  "provider": "cursor",
  "plan": "cursor-grok-4.6-high-fast",
  "cycle": "composer-2.5",
  "review": "cursor-grok-4.6-high-fast",
  "fix": "composer-2.5",
  "default": "composer-2.5"
}
```

| Phase | Slash commands | Model role |
|-------|----------------|------------|
| **plan** | `/ss-plan`, `/ss-ui-ux-plan`, `/ss-arch-plan` (story-sized) | Reasoning / scope / TDD contracts — **Grok latest** in QuickPress |
| **cycle** | `/ss-implement`, `/ss-loop` | Code + tests — **Composer latest** |
| **review** | `/ss-review` (critic-only or inside `/ss-finish`) | Adversarial read — **Grok latest** |
| **fix** | Critic FAIL remediation, CI fix commits inside `/ss-finish` | Patch diff — **Composer latest** |

**Aliases (QuickPress pins):** “Grok latest” → `cursor-grok-4.6-high-fast`; “Composer latest” → `composer-2.5`. Bump ids when Cursor ships newer defaults; keep config in sync.


## Fresh session policy (required)

**Every phase = new session / new agent.** Pass **`.harness/state.md`** and the branch — never the prior chat.

| Agent # | When | Command | Model |
|---------|------|---------|-------|
| 1 | After branch / slice ready | `/ss-plan` | `storyPhaseModels.plan` |
| 2 | Plan locked | `/ss-implement` or `/ss-loop` | `storyPhaseModels.cycle` |
| 3 | Remaining empty | `/ss-review` | `storyPhaseModels.review` |
| 4 | Critic FAIL or CI red | fix scoped to findings | `storyPhaseModels.fix` |
| 5 | Fixes pushed | `/ss-review` again | `storyPhaseModels.review` |
| 6 | Review PASS | `/ss-security-audit` → `/ss-submit-pr` | `fix` or `default` (Composer) |

When `storyPhaseModels` is set in `skillsync.config.json`, **do not** run `/ss-finish` as one mega-session across model boundaries — use **leaf** commands in **separate** chats (steps 3–6). `/ss-finish` remains OK for a **single-model** consumer with no phase routing.

**Paseo / AFK:** `/ss-loop` = one new agent per Remaining cycle. Epic loop = one new agent per `plan` / `cycle` / `review` / `fix` phase.

## Human workflow (Cursor UI)

1. **New chat** → select model from table → run phase command.
2. Do **not** continue plan → implement in the same chat.
3. Orchestrator / human opening the next agent must pass **`.harness/state.md`**, not prior thread.

## Automated workflow

- **`/ss-loop`:** uses `storyPhaseModels.cycle` when `--model` is omitted (still `cursor` provider unless `--provider` overrides).
- **`epicLoop.agent.model`:** same phase keys for epic-loop (`plan`, `cycle`, `review`, `fix`) when using Paseo — can mirror `storyPhaseModels` values.

## Rule

When `ss-story-model-routing.mdc` is linked, agents must state the phase model at session start and refuse to run the wrong phase in a chat that started on the wrong model (ask human to open a fresh chat).
