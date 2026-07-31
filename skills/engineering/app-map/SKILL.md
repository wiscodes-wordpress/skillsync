---
name: app-map
description: >
  Plugin grand plan — .harness/app-map.html with a Mind-elixir mind map. Agents
  must regenerate via render-app-map.cjs (deterministic scan); do not freehand
  mind-map JSON. Invoked from /ss-roadmap milestones, not a peer slash command.
---

# App map (grand plan)

Living HTML at **`.harness/app-map.html`** — the single **where are we** view for the plugin. Hero is a **MindNode-style** interactive map ([Mind-elixir](https://github.com/SSShooter/mind-elixir)); tables below hold links and lens status.

## Hard rules

- **Regenerate with the script** — never hand-edit `#mindmap-data` unless fixing `render-app-map.cjs`.

```bash
node .cursor/vendor/skillsync/tools/render-app-map.cjs . --title "Product name"
```

- Run after wayfinder chart, after lenses lock, after Jira publish, and optionally after `/ss-close-story`.
- No `/ss-app-map` slash command — `/ss-roadmap` owns the cadence.
- Jira keys appear only after roadmap publish (script reads pack hub `#keys`).

## Schema

See [mindmap.schema.json](mindmap.schema.json). Scaffold notes: [HTML-REPORT.md](HTML-REPORT.md).

Validate: `validate-plan-html.cjs --kind app-map`.

## Boundaries

| Use this | Use something else |
|----------|-------------------|
| Plugin-wide progress mind map | Initiative fog → [`wayfinder`](../wayfinder/SKILL.md) |
| Status board after roadmap steps | Story delivery → `/ss-plan` … |
| Deterministic HTML from disk | Freehand Mermaid in chat |
