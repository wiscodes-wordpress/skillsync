# Code handoff — living HTML

Self-contained HTML briefing for a **human code walkthrough**. This file is the **review brief** — open in a browser, survive sessions, understand the branch without the agent chat.

**Presentation:** **dark mode** (zinc-950 chrome, GitHub-like diff blocks). Sticky nav, emerald/sky/amber accents, Mermaid (`theme: "dark"`) when structure helps, sparse prose. Prefer scaffolding from `tools/templates/plan-handoff.html` via `init-plan-html.cjs`.

**Lifecycle:** Prefer `init-plan-html.cjs --kind handoff` for chrome when the file is missing; rewrite **`.harness/code-handoff.html`** on every `/ss-handoff`; validate with `validate-plan-html.cjs --kind handoff`. Do not timestamp a new file per run. Harness reset deletes it after story close.

## Why HTML

| Format | Use |
|--------|-----|
| **`.harness/code-handoff.html`** | Human walkthrough — open in browser |
| `.harness/state.md` | Contracts / evidence source (do not duplicate whole state) |
| Chat / Canvas | Scratch only — never replace the HTML brief |

## Theme (required)

- Body: `bg-zinc-950 text-zinc-100` (dark). Do **not** use stone/light page chrome.
- Mermaid: `theme: "dark"`.
- Keep Tailwind CDN + Mermaid ESM only.

Copy chrome/CSS from `tools/templates/plan-handoff.html` (includes `.diff-file` styles). When rewriting content, **preserve** the `<style>` block and dark classes.

## Scaffold

Start from the template (or keep its head/nav/CSS). Sections:

`#intent` · `#decisions` · `#map` · `#hotspots` · `#frontend` · `#backend` · `#tests` · `#verify` · `#out`

Surface sections are **always present**. Fill from the diff, or one line **N/A**.

## Sticky nav

Compact top bar (`text-xs`): issue/branch label + in-page anchors. Include Frontend / Backend. Emphasize **Verify** (`#verify`, `text-sky-400`). Keep scannable — no paragraphs.

## Header

- Eyebrow: `{{repo or plugin}} · {{issue key}}`
- `h1` serif: **Code handoff**
- Meta row: **Branch** · **Base** · **Updated** (ISO date)
- One strong sentence: what this slice delivers
- Next-step callout (sky border): open `#verify` then `/ss-submit-pr`

## Surface detection (agent)

From `git diff --name-only` (product-neutral — not Lifeway vs Quickpress):

| Paths suggest | Fill |
|---------------|------|
| `*.tsx` / `*.jsx` / `*.vue` / app `src/` UI / CSS modules that own interaction | **`#frontend`** checklist below |
| `*.php` / `includes/` / REST / WP-CLI / cron / plugin bootstrap | **`#backend`** checklist below (WordPress flavor when stack is WP) |
| Both | Both sections |
| Neither | Both: one line each — `N/A — no UI` / `N/A — no PHP` |

## Sections (required unless N/A — one line why skipped)

### Intent (`#intent`)

One short paragraph from `state.md` / commits. Not a changelog dump.

### Decisions used (`#decisions`)

Bullets mapped to state (and ADR / arch-plan ids when referenced). Emerald text for locked. If none: one amber line.

### Change map (`#map`)

Mermaid (`flowchart` / `sequenceDiagram`) when modules or data flow help; otherwise a tight list of areas touched. Keep diagrams small.

```html
<pre class="mermaid">
flowchart LR
  A[Entry] --> B[Changed module]
</pre>
```

### Hotspots (`#hotspots`) — GitHub-style code changes

Usually 2–6 files. Each hotspot is a **diff file block**, not a plain `<pre class="code">`.

```html
<article>
  <p class="text-sm text-zinc-400">One-line why it matters</p>
  <div class="diff-file">
    <div class="diff-file__header">
      <span class="diff-file__badge">Code changes</span>
      <span>path/to/File.ext</span>
      <span class="diff-file__meta">+3 −1</span>
    </div>
    <div class="diff-file__body">
      <div class="diff-line diff-line--ctx">
        <span class="diff-line__num">10</span>
        <span class="diff-line__mark"> </span>
        <code class="diff-line__code">unchanged context</code>
      </div>
      <div class="diff-line diff-line--del">
        <span class="diff-line__num">11</span>
        <span class="diff-line__mark">-</span>
        <code class="diff-line__code">removed line</code>
      </div>
      <div class="diff-line diff-line--add">
        <span class="diff-line__num">11</span>
        <span class="diff-line__mark">+</span>
        <code class="diff-line__code">added line</code>
      </div>
    </div>
  </div>
</article>
```

Rules:

- Prefer real diff hunks (context + deletions + additions). Escape HTML in code.
- ≤20 lines per file block; otherwise summarize and point at the path.
- Line classes: `diff-line--add` (green), `diff-line--del` (red), `diff-line--ctx` (neutral).
- Badge text: **Code changes**. Meta: optional `+n −n` from the hunk.
- Never secrets, tokens, or full env files.

### Frontend (`#frontend`) — when UI is in the diff

Path-tied notes for a frontend reviewer. Use a compact definition list or short bullets + optional Mermaid sequence. **Do not** paste a React encyclopedia.

| Block | Cover |
|-------|--------|
| **Interaction / process flow** | User action → state update → UI result (+ failure). Mermaid `sequenceDiagram` when it helps |
| **Render triggers** | What re-renders (props, store select, context, parent). Flag accidental wide subscriptions |
| **Mount / unmount** | Effects, subscriptions, listeners, AbortController, timers — what cleans up |
| **Timing** | Fetch on mount vs on interaction; races; debounce/throttle |
| **State ownership** | Local vs data store vs URL — single writer |
| **Async UI states** | Loading / empty / error / success |
| **A11y focus** | Focus on open/close panel/dialog; keyboard path |
| **Perf** | Only when real (hot list, expensive render) — skip empty “we memoized” |

If no UI paths: `<p>N/A — no UI in this diff.</p>`

### Backend (`#backend`) — when PHP / server is in the diff

Path-tied notes for a backend / WordPress reviewer. Product-neutral name; use WP vocabulary when the stack is WordPress.

| Block | Cover |
|-------|--------|
| **Request / hook flow** | Hook or REST → classes → response/side effect (Mermaid when helpful) |
| **Capabilities & authz** | Who can hit it; `permission_callback` / `current_user_can` |
| **Data writes** | Options, post meta, custom tables — sanitize / validate / escape touchpoints |
| **Queries** | New SQL / `WP_Query`; N+1; cache (`wp_cache_*`, transients) when relevant |
| **Lifecycle** | Activation, cron, shutdown, uninstall register/unregister |
| **REST / WP-CLI** | Routes, args schema, idempotency |
| **Multisite / roles** | Only when the change cares |

If no PHP/server paths: `<p>N/A — no PHP in this diff.</p>`

### Tests and evidence (`#tests`)

Table: Behavior / contract → test path or TDD Evidence row. Note Verification Plan commands from state.

### What to verify — human (`#verify`)

Checklist of concrete checks. Pull FE and backend checks from `#frontend` / `#backend` (UI path, REST 403 as subscriber, double-submit, etc.). Not “looks good.” Sky border callout: **Do this before `/ss-submit-pr`**.

### Out of scope / follow-ups (`#out`)

Only items already parked in state or clearly not in the diff.

## Colour

- Page: zinc dark chrome  
- Emerald = locked / done / evidence PASS  
- Sky = current / verify / next  
- Amber = missing state / open risk  
- Diff green / red = add / delete lines (GitHub-like)

## Footer

One line: path to this file · path to `state.md` · next command (`/ss-submit-pr` after security PASS).

## Anti-slop

Apply [`anti-slop`](../../productivity/anti-slop/SKILL.md) to narrative. Expand abbreviations on first use. Cite paths instead of restating whole files.
