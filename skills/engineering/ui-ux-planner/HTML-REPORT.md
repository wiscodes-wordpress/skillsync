# UX plan — living HTML

Self-contained HTML briefing for **product UX** (flows + surfaces). This file is the **plan source of truth**. Same craft as [`arch-plan/HTML-REPORT.md`](../arch-plan/HTML-REPORT.md): sticky nav, stone/slate + emerald/sky/amber, Mermaid for journeys when helpful, sparse prose.

**Not** delivery/TDD planning — that remains [`/ss-plan`](../../../commands/ss-plan.md). This HTML answers *how the user moves through surfaces*; `/ss-plan` turns journeys into Behavior & Test Contracts.

**Lifecycle:** rewrite the **same** file after every material follow-up. Do not timestamp a new file per answer. Rejected explorations may live in a sibling archive HTML linked from the nav.

## Why HTML (not Canvas / markdown alone)

| Format | Use |
|--------|-----|
| **`.harness/ux-plan.html`** | plan source of truth — journeys, surfaces, states, decisions, open questions |
| Optional `docs/ux/ux-<slug>.md` | Thin paste/export for tracker — **not** a second source of truth |
| Cursor Canvas | Optional chat-side scratch only — **never** replace the HTML source of truth |

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>UX plan — {{short title}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      html { scroll-behavior: smooth; }
      section[id] { scroll-margin-top: 5rem; }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <nav class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 backdrop-blur px-4 py-2">
      <!-- Job · Locks · Journeys · Surfaces · States · Decisions · A11y · Open · Handoff -->
    </nav>
    <main class="max-w-5xl mx-auto px-6 py-10 space-y-14">
      <header>…</header>
      <section id="job">…</section>
      <section id="locks">…</section>
      <section id="journeys">…</section>
      <section id="surfaces">…</section>
      <section id="states">…</section>
      <section id="decisions">…</section>
      <section id="a11y">…</section>
      <section id="open">…</section>
      <section id="nongoals">…</section>
      <section id="handoff">…</section>
      <footer>…</footer>
    </main>
  </body>
</html>
```

Only scripts: Tailwind CDN + Mermaid ESM. Otherwise static.

## Sticky nav

Compact top bar (`text-xs`): product/slug label + in-page anchors. Emphasize **Journeys** (`#journeys`) and **Handoff** (`#handoff`) — those seed `/ss-plan`. Keep nav scannable — no paragraphs.

## Header

- Eyebrow: `{{repo or plugin}} · {{slug}} · {{story/epic key optional}}`
- `h1` serif: **UX plan**
- Meta row: **Status** (`draft` | `agreed`), **Updated**, optional related key
- **Primary job** — one strong sentence (user/caller outcome)
- Source-of-truth one-liner: living HTML; journeys seed `/ss-plan` Behavior & Test Contracts

## Job frame (`#job`) — required

Cards or short lists:

- **Actors**
- **Success looks like**
- **Constraints** — platform, density, existing components, accessibility bar

## At a glance (`#locks`) — when any decision is locked

Two-column grid:

| Left (emerald border) | Right (sky border) |
|----------------------|-------------------|
| **Locked** — D1, D2, … one line each | **Handoff** — numbered: agree open blockers → `/ss-plan` with journey expectations |

## Journeys (`#journeys`) — required

Priority-ordered journey cards (`id="j1"`, `j2`, …):

| Field | Rule |
|-------|------|
| **Name** | Short goal title (becomes test **name** seed) |
| **expectation** | `step > step > outcome` (becomes TDD **expectation**) |
| **Efficiency** | What was cut, merged, or defaulted |
| **Failure / recovery** | One primary path — not every edge |

Optional Mermaid flowchart for the happy path when more than ~4 steps. Prefer cards over walls of prose.

## Surfaces (`#surfaces`) — required

Table or compact cards:

| ID | Surface | Purpose | Primary action |
|----|---------|---------|----------------|
| S1 | … | … | … |

Prefer **one primary action** per surface. Flag screens that compete for two jobs (amber).

## States matrix (`#states`) — required

Per surface (or shared pattern): **empty · loading · error · success**. Short cells — one line each. Emerald tint for success definitions that are acceptance-ready.

## Decisions (`#decisions`)

- **Open** — fuller cards (options + Recommended); amber badge
- **Resolved** — compact emerald cards: title · `resolved · {choice}` · one why line
- IDs: `id="d1"`, `d2`, … for deep links

Do not append chat history. Update cards in place.

## Accessibility (`#a11y`)

Bullets: labels/roles for primary actions, keyboard path, contrast notes, “no information by color alone”. Align with [`accessible-locator-priority.md`](../../../harness/accessible-locator-priority.md) when tests will exist.

## Open questions (`#open`)

Table: Question · **Blocks** (`ss-plan` \| `defer`) · Notes. Amber for `blocks: ss-plan`.

## Non-goals (`#nongoals`)

Short bullets — flows/screens out of scope.

## Handoff (`#handoff`) — required

Sky border card:

1. Next command: **`/ss-plan`**
2. Seed from journeys: each J* → Behavior & Test Contract (`name` + `expectation`)
3. Path to this HTML source of truth
4. Optional: path to thin markdown export if written

## Footer

One-liner: status + next action + HTML path.

## Style

- Stone background, slate text, **serif headings**, generous `space-y-14`
- Emerald = locked/success; sky = handoff/current; amber = open/blocked; violet sparingly for secondary journeys
- `text-xs uppercase tracking-wider` for section labels inside cards

## Tone

Plain English. Cards and tables carry the plan. If a sentence could be a bullet, make it a bullet. No hedging. No pixel polish specs unless required by constraints. Apply [`anti-slop`](../../productivity/anti-slop/SKILL.md) — expand abbreviations on first use; no brochure voice.
