# Code handoff — living HTML

Self-contained HTML briefing for a **human code walkthrough**. This file is the **review brief** — open in a browser, survive sessions, understand the branch without the agent chat.

**Presentation:** same craft as [`arch-plan/HTML-REPORT.md`](../arch-plan/HTML-REPORT.md) — sticky nav, stone/slate + emerald/sky/amber, Mermaid when structure helps, sparse prose. Tailored for *what this branch changed*, not long-term architecture.

**Lifecycle:** Prefer `init-plan-html.cjs --kind handoff` for chrome when the file is missing; rewrite **`.harness/code-handoff.html`** on every `/ss-handoff`; validate with `validate-plan-html.cjs --kind handoff`. Do not timestamp a new file per run. Harness reset deletes it after story close.

## Why HTML

| Format | Use |
|--------|-----|
| **`.harness/code-handoff.html`** | Human walkthrough — open in browser |
| `.harness/state.md` | Contracts / evidence source (do not duplicate whole state) |
| Chat / Canvas | Scratch only — never replace the HTML brief |

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Code handoff — {{issue key or short title}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      html { scroll-behavior: smooth; }
      section[id] { scroll-margin-top: 5rem; }
      pre.code { overflow-x: auto; font-size: 0.75rem; line-height: 1.4; }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <nav class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 backdrop-blur px-4 py-2">
      <!-- Intent · Decisions · Map · Hotspots · Tests · Verify · Out of scope -->
    </nav>
    <main class="max-w-5xl mx-auto px-6 py-10 space-y-14">
      <header>…</header>
      <section id="intent">…</section>
      <section id="decisions">…</section>
      <section id="map">…</section>
      <section id="hotspots">…</section>
      <section id="tests">…</section>
      <section id="verify">…</section>
      <section id="out">…</section>
      <footer>…</footer>
    </main>
  </body>
</html>
```

Only scripts: Tailwind CDN + Mermaid ESM. Otherwise static.

## Sticky nav

Compact top bar (`text-xs`): issue/branch label + in-page anchors. Emphasize **Verify** (`#verify`) — that is what the human does next. Keep scannable — no paragraphs.

## Header

- Eyebrow: `{{repo or plugin}} · {{issue key}}`
- `h1` serif: **Code handoff**
- Meta row: **Branch** · **Base** · **Updated** (ISO date)
- One strong sentence: what this slice delivers
- Next-step chip (sky): usually open `#verify` then `/ss-submit-pr`

## Sections (required unless N/A — one line why skipped)

### Intent (`#intent`)

One short paragraph from `state.md` / commits. Not a changelog dump.

### Decisions used (`#decisions`)

Bullets mapped to state (and ADR / arch-plan ids when referenced). Emerald chips for locked. If none: one amber line.

### Change map (`#map`)

Mermaid (`flowchart` / `sequenceDiagram`) when modules or data flow help; otherwise a tight list of areas touched. Keep diagrams small.

```html
<pre class="mermaid">
flowchart LR
  A[Entry] --> B[Changed module]
</pre>
```

### Hotspots (`#hotspots`)

Usually 2–6 cards. Each:

- Path + one-line why it matters
- `<pre class="code">` with ≤20 lines of the changed gist (escape HTML), or “see `path` …” when large
- Never secrets / tokens / full env files

### Tests and evidence (`#tests`)

Table: Behavior / contract → test path or TDD Evidence row. Note Verification Plan commands from state.

### What to verify — human (`#verify`)

Checklist of concrete checks (UI path, CLI, edge case). Not “looks good.” Prefer commands and acceptance from state. Sky border card at top: **Do this before `/ss-submit-pr`**.

### Out of scope / follow-ups (`#out`)

Only items already parked in state or clearly not in the diff.

## Colour

- Emerald = locked / done / evidence PASS  
- Sky = current / verify / next  
- Amber = missing state / open risk  
- Slate = paths and meta  

## Footer

One line: path to this file · path to `state.md` · next command (`/ss-submit-pr` after security PASS).

## Anti-slop

Apply [`anti-slop`](../../productivity/anti-slop/SKILL.md) to narrative. Expand abbreviations on first use. Cite paths instead of restating whole files.
