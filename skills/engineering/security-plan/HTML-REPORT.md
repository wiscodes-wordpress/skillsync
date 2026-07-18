# Security posture — living HTML

Self-contained HTML briefing for **security posture**. This file is the **posture source of truth**. Same craft as [`arch-plan/HTML-REPORT.md`](../arch-plan/HTML-REPORT.md): sticky nav, stone/slate + emerald/sky/amber, Mermaid when structure helps, sparse prose.

**Not** the per-PR gate — that remains [`/ss-security-audit`](../../../commands/ss-security-audit.md). This HTML answers *how we intend to be secure*; the audit answers *may this PR ship?*

**Lifecycle:** rewrite the **same** file after material follow-ups and after Jira→HTML refresh.

## Why HTML

| Format | Use |
|--------|-----|
| **`.harness/security-posture.html`** | Posture SoT |
| ADRs | Load-bearing *why* |
| `/ss-security-audit` + state Evidence | Ship gate |
| Chat TODO list / Canvas | Not a substitute for the HTML |

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Security posture — {{product or plugin}}</title>
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
      <!-- Phase · Locks · Surfaces · Current · Target · Decisions · Stages · Non-goals · Gate -->
    </nav>
    <main class="max-w-5xl mx-auto px-6 py-10 space-y-14">
      <header>…</header>
      <section id="phase">…</section>           <!-- once keys exist -->
      <section id="finish-line">…</section>    <!-- optional; when hardening stories keyed -->
      <section id="locks">…</section>
      <section id="surfaces">…</section>
      <section><!-- Current | Target --></section>
      <section id="decisions">…</section>
      <section id="stages">…</section>
      <section id="nongoals">…</section>
      <section id="gate">…</section>
      <footer>…</footer>
    </main>
  </body>
</html>
```

Only scripts: Tailwind CDN + Mermaid ESM.

## Header

- Eyebrow: `{{repo}} · {{Jira project}}`
- `h1` serif: **Security posture**
- Meta: Status · Updated · Last Jira refreshed
- **Primary job** — one sentence
- SoT one-liner + reminder: ship gate = `/ss-security-audit`

## Phase (`#phase`) — when tracker keys exist

Same pattern as arch-plan: delivery loop vs Jira posture, mapping table, “Read this as” callout. Point next hardening slice and note that PRs still need the audit gate.

## Start → finish (`#finish-line`) — optional

When hardening work is story-keyed: start-here card + ordered table + depends-on. Refresh statuses on `/ss-security-plan`. Prefer folding into existing security epics.

## At a glance (`#locks`)

| Locked (emerald) | Handoff (sky) |
|------------------|---------------|
| Resolved trust decisions (one line each) | Next hardening story / `/ss-plan` / remind `/ss-security-audit` before PR |

## Surfaces (`#surfaces`) — required

Inventory table or compact cards (from harness themes — product-neutral labels):

| Surface | Examples | Trust note |
|---------|----------|------------|
| HTTP entrypoints | REST, ajax, admin_post | Authz / CSRF |
| Privileged actions | settings, deletes, imports | Capability |
| Data at rest | options, meta, files | Secrets / PII |
| Outbound | remote fetch, webhooks | SSRF / secrets |
| Frontend | admin UI, public scripts | XSS / open redirect |

Mark **in scope** vs **accepted / out of scope**. Do not paste a full pen-test report.

## Current | Target — required

Side-by-side:

- **Current** — where trust is weak or unclear (leakage of privilege, public-by-mistake, missing seams)
- **Target** — intended posture (authz at seam, nonce on state change, escape/prepare discipline, no secrets in client)

Mermaid optional (e.g. actor → entrypoint → capability → data). Keep diagrams short.

## Decisions (`#decisions`)

- **Open** — fuller cards (options + Recommended); amber
- **Resolved** — compact emerald: choice + one-line why
- Typical topics: public vs authenticated REST, capability model, secret storage, upload policy, FE trust

When none open: “No open security posture decisions. See handoff / gate.”

## Stages (`#stages`)

Hardening phases per [STAGES.md](STAGES.md). Cards with `data-epic` / `data-story` when published. Refresh status on command run only.

## Non-goals (`#nongoals`)

Accepted risks and out-of-scope (explicit). Better an honest non-goal than a fake “secure everything” stage.

## Ship gate (`#gate`) — required

Short card (not a checklist dump):

- **Command:** `/ss-security-audit`
- **When:** after `/ss-review` PASS, before `/ss-submit-pr`
- **Phases:** A = `security-audit.cjs` (facts); B = agent judgment on evidence
- **Rule:** this HTML does not PASS a PR; Evidence in `.harness/state.md` does

## Footer

Next hardening pickup + path to SoT + link to `/ss-security-audit`.

## Style / tone

Match arch-plan: serif headings, emerald/sky/amber, sparse bullets. No invented CVEs. No hedging.
