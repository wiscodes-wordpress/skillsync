# skillsync Story delivery (Paseo plugin)

One-tap **Story belt** buttons for Paseo **0.9+**: spawn a **fresh agent** with `/ss-plan`, `/ss-implement`, `/ss-loop`, `/ss-review`, `/ss-security-audit`, or `/ss-finish` instead of typing slash commands on mobile.

## What you get

| UI | Action |
|----|--------|
| Composer **Story** pill (chat box track) | Plan · Implement · Loop · Review · Fix findings · Audit · Finish · Close |
| Command Center (⌘K / Ctrl+K) | Same eight actions when a workspace is focused |
| Settings → Plugins → **Story delivery** | Provider, model, mode, Cursor Auto Accept |

| Surface | Behavior |
|---------|----------|
| Composer **Story** pill | Sends the phase prompt **in this chat** (you see it run here) |
| Command Center (⌘K) | Spawns a **fresh agent** per phase ([`/ss-flow`](../commands/ss-flow.md)) |

## Prerequisites

1. Paseo **0.9.0+** (tested target: 0.9.2) with **Enable plugins** on the daemon.
2. Consumer repo links **`ss-*`** commands into `.cursor/commands/` (`yarn skillsync:link`).
3. **Cursor** provider configured on the daemon (default). All phases except Plan turn on **Auto Accept** when provider id starts with `cursor`.

## Install

From the machine that runs the Paseo daemon:

```bash
cd plugins/paseo-delivery
npm install
npm run typecheck

# skillsync checkout or consumer vendor path:
paseo plugin install /absolute/path/to/skillsync/plugins/paseo-delivery
paseo plugin ls
```

Or in the app: **Settings → Plugins → Plugin source** → paste the absolute path → **Install plugin**.

Reload after edits:

```bash
npm run typecheck
paseo plugin reload skillsync-delivery
```

## Configure

**Settings → Plugins → skillsync-delivery → Story delivery**

| Field | Default | Notes |
|-------|---------|--------|
| Provider | `cursor` | Any Paseo provider id |
| Model | empty | Daemon default when blank |
| Mode | `agent` | Passed to new agents |
| Auto Accept | on | Cursor only; skipped for Plan |

## Belt map

| Button | Prompt | Auto Accept (Cursor) |
|--------|--------|----------------------|
| Plan | `/ss-plan` | off |
| Implement | `/ss-implement` | on |
| Loop (AFK) | `/ss-loop` | on |
| Review | `/ss-review` | on |
| Fix findings | direct prompt (no `/ss-*`) | on |
| Audit | `/ss-security-audit` | on |
| Finish | `/ss-finish` | on |
| Close | `/ss-close-story` (Jira Done + harness reset) | on |

## Troubleshooting

- **Story pill missing** — Enable plugins; confirm `paseo plugin ls` shows `skillsync-delivery` as `running`; open an agent chat (pill sits in the composer track beside Tasks).
- **Tapped a phase but this chat stayed quiet** — Before this build, composer spawned a sibling agent off-screen. Reload the plugin and restart Paseo; composer now sends the prompt here. For a **fresh** agent, use Command Center instead.
- **Agent ignores `/ss-plan`** — Link commands in the consumer repo; reload Cursor/Paseo agent after `link-commands.cjs`.
- **Permission cards block AFK** — Confirm provider is `cursor` and Auto Accept is on; see [`paseo-cursor-auto-accept`](../skills/engineering/paseo-cursor-auto-accept/SKILL.md).

Logs: **Settings → Plugins → skillsync-delivery → Logs**, or `paseo plugin logs skillsync-delivery`.
