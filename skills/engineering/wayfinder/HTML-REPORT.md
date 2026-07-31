# Wayfinder map — living HTML

Self-contained HTML briefing for a **foggy initiative**. The map is an **index** of decision tickets; each ticket is its own HTML file. **Never create Jira issues** from this template.

**Craft:** same family as arch-plan — Tailwind CDN, Mermaid, sticky nav, stone/slate + emerald/sky/amber accents. Sparse prose.

**Lifecycle:** rewrite **`map.html`** and the active ticket file after every material step.

## Paths

| File | Role |
|------|------|
| `.harness/wayfinder/<slug>/map.html` | Map source of truth |
| `.harness/wayfinder/<slug>/tickets/tN-<slug>.html` | One decision |
| `.harness/wayfinder/<slug>/assets/` | Linked prototypes / research |

## Map scaffold (`map.html`)

Required sections: `#destination`, `#decisions`, `#fog`, `#frontier`. Expected: `#notes`, `#outofscope`, `#graph`.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Wayfinder — {{destination short name}}</title>
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
    <nav class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 px-4 py-2 text-xs">
      <a href="#destination">Destination</a>
      <a href="#notes">Notes</a>
      <a href="#decisions">Decisions</a>
      <a href="#fog">Fog</a>
      <a href="#outofscope">Out of scope</a>
      <a href="#frontier">Frontier</a>
      <a href="#graph">Graph</a>
      <a href="../../app-map.html">App map</a>
    </nav>
    <main class="max-w-5xl mx-auto px-6 py-10 space-y-14">
      <header>
        <p class="text-xs uppercase tracking-wider">Wayfinder · <span class="font-mono">{{slug}}</span></p>
        <h1 class="font-serif text-3xl">Wayfinder</h1>
        <p class="text-sm">Local decisions only — no Jira until /ss-roadmap publish.</p>
      </header>
      <section id="destination">
        <h2 class="font-serif text-2xl">Destination</h2>
        <p>{{one or two lines}}</p>
      </section>
      <section id="notes">
        <h2 class="font-serif text-2xl">Notes</h2>
        <p>{{domain; skills; preferences}}</p>
      </section>
      <section id="decisions">
        <h2 class="font-serif text-2xl">Decisions so far</h2>
        <ul>
          <!-- <li><a href="tickets/t1-….html">Title</a> — gist</li> -->
        </ul>
      </section>
      <section id="fog">
        <h2 class="font-serif text-2xl">Not yet specified</h2>
        <ul><!-- in-scope fog --></ul>
      </section>
      <section id="outofscope">
        <h2 class="font-serif text-2xl">Out of scope</h2>
        <ul><!-- ruled out --></ul>
      </section>
      <section id="frontier">
        <h2 class="font-serif text-2xl">Frontier</h2>
        <table>
          <tr><th>Ticket</th><th>Type</th><th>Status</th><th>Blocked by</th></tr>
          <!-- open / unblocked / unclaimed rows -->
        </table>
      </section>
      <section id="graph">
        <h2 class="font-serif text-2xl">Blocking graph</h2>
        <pre class="mermaid">flowchart TD
  t1[Ticket one]
  t2[Ticket two]
  t1 --> t2
</pre>
      </section>
    </main>
  </body>
</html>
```

## Ticket scaffold (`tickets/tN-<slug>.html`)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Wayfinder ticket — {{title}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <nav class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 px-4 py-2 text-xs">
      <a href="../map.html">Map</a>
    </nav>
    <main class="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <header>
        <p class="text-xs">Type: {{grilling|prototype|research|task}} · Status: {{open|claimed|closed}}</p>
        <h1 class="font-serif text-2xl">{{title}}</h1>
        <p>Claimed by: {{name or —}}</p>
        <p>Blocked by: {{titles or none}}</p>
      </header>
      <section id="question">
        <h2 class="font-serif text-xl">Question</h2>
        <p>{{decision this ticket resolves}}</p>
      </section>
      <section id="resolution">
        <h2 class="font-serif text-xl">Resolution</h2>
        <p>{{empty until closed}}</p>
      </section>
    </main>
  </body>
</html>
```
