# App map — living HTML (grand plan)

Browser-openable **plugin mind map**. Agents must not freehand this file — use `tools/render-app-map.cjs`.

**Craft:** Tailwind sticky nav, stone/slate; Mind-elixir canvas in `#mindmap`.

## Required sections

| Id | Role |
|----|------|
| `#mindmap` | Mind-elixir mount (min-height ~24rem) |
| `#mindmap-data` | `<script type="application/json" id="mindmap-data">` — schema in mindmap.schema.json |
| `#spine` | Legend for status labels |
| `#initiatives` | Table of packs + lens strip |
| `#now` | In-flight story from `.harness/state.md` (or “none”) |
| `#wayfinder` | Links to active wayfinder maps (or “none”) |
| `#keys` | Jira keys from pack hubs (empty until publish) |

## Scripts allowed

- Tailwind CDN
- Mind-elixir CSS + JS from `cdn.jsdelivr.net/npm/mind-elixir`
- One inline initializer that reads `#mindmap-data` and mounts Mind-elixir (no other inline logic)

## Status vocabulary

Initiative node: `wayfinding` | `lenses` | `shipping` | `done`  
Lens leaf: `missing` | `draft` | `locked` | `optional`
