# Architecture plan — living HTML

Self-contained HTML briefing for **project/plugin direction**. This file is the **plan source of truth**. Tailwind + Mermaid via CDN. Same craft as [`improve-codebase-architecture/HTML-REPORT.md`](../improve-codebase-architecture/HTML-REPORT.md): diagrams carry weight; prose is sparse; glossary terms from [`LANGUAGE.md`](../improve-codebase-architecture/LANGUAGE.md).

**Lifecycle:** rewrite this **same file** after every material follow-up and after every Jira status refresh. Do not timestamp a new file per answer.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture plan — {{repo or plugin name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="current">...</section>
      <section id="target">...</section>
      <section id="decisions">...</section>
      <section id="stages">...</section>
      <section id="nongoals">...</section>
    </main>
  </body>
</html>
```

Only scripts: Tailwind CDN + Mermaid ESM. Otherwise static.

## Header

- Repo or plugin name, date, **Status:** `draft` | `agreed`
- **Last refreshed** — ISO or local datetime of last Jira→HTML status pull (or `—` if never)
- Compact legend: solid box = module, dashed = seam, red = leakage, thick dark = deep module
- One-line **Primary job** of this architecture
- Short SoT note: _Architecture plan source of truth — epic keys join Jira; status refreshed on `/ss-arch-plan`_
- No long intro — straight into Current / Target

## Current shape (`#current`)

Diagram-first: how the system is structured **now** (entrypoints, modules, seams, leakage).

- Prefer Mermaid flowchart / graph for call and dependency shape
- Hand-built boxes when you need editorial weight (shallow vs deep)
- Short bullets only if the diagram cannot carry a fact (≤5)

## Target shape (`#target`)

Same visual language as Current — **before/after** side by side when helpful.

- Name deep modules with `CONTEXT.md` vocabulary
- Show justified seams (two adapters) vs hypothetical ones
- Keep ~320px diagram height so Current | Target sits without endless scroll

## Open decisions (`#decisions`)

Each decision is one `<article>`:

| Element | Rule |
|---------|------|
| **Title** | Short question (e.g. "Where does pricing logic live?") |
| **Badge** | `open` (amber) or `resolved` (emerald) |
| **Options** | 2–4 bullets; mark **Recommended** on the default |
| **Resolved as** | Only when closed — one line, option chosen |
| **Why** | ≤1 sentence when resolved |

Update in place on follow-up. Do not append a chat changelog.

Order decisions by impact (seams / public API / storage first).

## Phased stages (`#stages`)

Ordered list from [STAGES.md](STAGES.md). Each stage is one row/card with a stable join to Jira:

| Field | Rule |
|-------|------|
| **ID** | `S0`, `S1`, … |
| **Title** | verb + module |
| **Acceptance** | one observable line |
| **Epic key** | e.g. `PROJ-123` — empty until published; use `data-epic="PROJ-123"` on the card for refresh parsing |
| **Jira status** | filled/updated **only** on `/ss-arch-plan` refresh from Jira; show raw status name |
| **Plan badge** | optional coarse `pending` \| `in-progress` \| `done` derived from Jira for scanning — never invent without a key |

Example card shape:

```html
<article id="stage-S2" data-epic="PROJ-123" class="rounded-lg border border-slate-200 bg-white p-4">
  <div class="flex flex-wrap items-center gap-2">
    <span class="font-mono text-sm">S2</span>
    <h3 class="font-serif text-lg">Move logic behind the seam</h3>
    <a class="font-mono text-sm text-emerald-800" href="{{jira browse url}}">PROJ-123</a>
    <span class="rounded bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wider">In Progress</span>
  </div>
  <p class="mt-2 text-sm text-slate-600">Acceptance: …</p>
</article>
```

When a decision resolves, rewrite stages that depended on it. When publishing epics, write keys into `data-epic` and the visible link — leave status blank until the next refresh.

**Do not** use the HTML to drive Jira transitions. Keys are the join; Jira owns workflow; HTML displays the last refreshed picture.

## Non-goals / ADR conflicts (`#nongoals`)

- Non-goals as short bullets
- ADR conflict: amber callout — _"contradicts ADR-0007 — reopen because…"_ only when friction warrants it
- Optional list of ADR paths that authorize this plan

## Style

- Editorial, not dashboard: stone/slate, generous whitespace; serif optional on headings
- Colour sparingly: emerald (resolved/done), amber (open/ADR), slate (in progress), red (leakage)
- `text-xs uppercase tracking-wider` for module labels inside diagrams
- Wins / stage acceptance in glossary terms — not "cleaner" / "easier to maintain"

## Tone

Plain English. Use **module / interface / seam / adapter / depth / locality / leverage**. Never substitute boundary/service/API-for-interface when you mean those terms.

No hedging. If a sentence could be a bullet, make it a bullet.
