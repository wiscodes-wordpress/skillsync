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

`#intent` · `#decisions` · `#map` · `#hotspots` · `#tests` · `#verify` · `#out`

## Sticky nav

Compact top bar (`text-xs`): issue/branch label + in-page anchors. Emphasize **Verify** (`#verify`, `text-sky-400`). Keep scannable — no paragraphs.

## Header

- Eyebrow: `{{repo or plugin}} · {{issue key}}`
- `h1` serif: **Code handoff**
- Meta row: **Branch** · **Base** · **Updated** (ISO date)
- One strong sentence: what this slice delivers
- Next-step callout (sky border): open `#verify` then `/ss-submit-pr`

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

### Tests and evidence (`#tests`)

Table: Behavior / contract → test path or TDD Evidence row. Note Verification Plan commands from state.

### What to verify — human (`#verify`)

Checklist of concrete checks (UI path, CLI, edge case). Not “looks good.” Prefer commands and acceptance from state. Sky border callout: **Do this before `/ss-submit-pr`**.

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
