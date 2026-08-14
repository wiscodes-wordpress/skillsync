---
name: paseo-cursor-auto-accept
description: >-
  When using Paseo with the Cursor provider (MCP create_agent, handoff, loop,
  /ss-loop, or /ss-implement in a Paseo session), enable Auto Accept so ACP
  permission cards do not block tool use. Skip for plain Cursor IDE chats and
  non-Cursor providers.
---

# Paseo + Cursor: Auto Accept on spawn / implement

## When this applies

**Yes — do this first** when **all** are true:

1. Work runs through **Paseo** (MCP `create_agent` / `update_agent`, `paseo run`, `/ss-loop`, `/ss-implement` in a Paseo Cursor tab, handoff, committee workers), and
2. Provider is **Cursor** (`cursor` or `cursor/…`), and
3. The agent will run tools (implement / AFK / handoff execute) — not a read-only ask you want to babysit.

**No — skip** when:

- The user is only chatting in the Cursor IDE (no Paseo spawn), or
- Provider is Claude / Codex / other (different permission models), or
- The user explicitly wants to approve every prompt, or
- Mode is plan/ask and they asked to keep prompts.

## MCP (create / update)

On `create_agent` for Cursor implement workers, pass:

```json
{
  "settings": {
    "modeId": "agent",
    "features": {
      "auto_accept": true
    }
  }
}
```

If the agent already exists without it, call `update_agent` immediately after create:

```json
{
  "agentId": "<id>",
  "settings": {
    "features": {
      "auto_accept": true
    }
  }
}
```

Only set feature IDs returned by `inspect_provider` for that provider.

## `/ss-implement` (current Paseo session)

Before cycles, if this tab is a Paseo Cursor agent:

```bash
node .cursor/vendor/skillsync/tools/paseo-set-feature.cjs --for-cwd .
# skillsync root: node tools/paseo-set-feature.cjs --for-cwd .
```

Soft-skips when Paseo is missing or no running Cursor agent matches cwd. Prefer MCP `update_agent` with `auto_accept: true` when you already know the agent id.

## CLI / `/ss-loop`

`paseo run` cannot pass features today. After spawn:

```bash
node .cursor/vendor/skillsync/tools/paseo-set-feature.cjs <agentId> auto_accept true
```

`ss-loop.cjs` does this automatically for Cursor agents when Paseo is available.

## Fallback

If Auto Accept cannot be set: `paseo-permit-watch.cjs` or `/ss-loop` permit polling. See [`docs/ss-loop.md`](../../docs/ss-loop.md).
