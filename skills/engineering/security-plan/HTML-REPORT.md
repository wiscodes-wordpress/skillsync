# Security posture — living HTML

Self-contained HTML briefing for **security posture**. This file is the **posture source of truth**. Same craft as [`arch-plan/HTML-REPORT.md`](../arch-plan/HTML-REPORT.md): sticky nav, stone/slate + emerald/sky/amber, Mermaid when structure helps, sparse prose.

**Not** the per-PR gate — that remains [`/ss-security-audit`](../../../commands/ss-security-audit.md). This HTML answers *how we intend to be secure* and (when assessed) *is the plugin healthy as a whole*; the audit answers *may this PR ship?*

**Lifecycle:** rewrite the **same** file after material follow-ups and after Jira→HTML refresh.

## Why HTML

| Format | Use |
|--------|-----|
| **`.harness/security-posture.html`** | posture source of truth |
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
      <!-- Phase · Locks · Surfaces · Assess · CVEs · Current · Target · Decisions · Stages · Non-goals · Gate -->
    </nav>
    <main class="max-w-5xl mx-auto px-6 py-10 space-y-14">
      <header>…</header>
      <section id="phase">…</section>           <!-- once keys exist -->
      <section id="finish-line">…</section>    <!-- optional; when hardening stories keyed -->
      <section id="locks">…</section>
      <section id="surfaces">…</section>
      <section id="assess">…</section>         <!-- whole-plugin assess snapshot when run -->
      <section id="cves">…</section>            <!-- required: dep/CVE scan snapshot -->
      <section><!-- Current | Target --></section>
      <section id="decisions">…</section>
      <section id="stages">…</section>
      <section id="nongoals">…</section>
      <section id="gate">…</section>
      <section id="status">…</section>         <!-- Red/Amber/Green + risk register — bottom -->
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
- Source-of-truth one-liner + reminder: ship gate = `/ss-security-audit`

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

## Whole-plugin assess (`#assess`) — when Stage 2 has been run

Machine **health snapshot** from `security-assess.cjs` — not a pen-test score and **not** the PR ship gate. See [`harness-security-assess.md`](../../../harness/harness-security-assess.md).

| Field | Source |
|-------|--------|
| Last run | Date + `security-assess.cjs . --write-state` |
| Completeness | `complete` \| `incomplete` (+ reasons: missing Semgrep, blocked Wordfence, etc.) |
| Probes | surfaces · semgrep · deps · wordfence — status + one-line detail |
| ERROR / WARNING | Counts from the report (link top findings; do not invent IDs) |
| Action | Confirmed → hardening stage / story; dismissed → note with evidence; incomplete → configure `securityAssess.wordpressRoot` + install CLIs |

Rules:

- Prefer **`.harness/security-assess.json`** / `## Security Assess` facts. If never run: show **Not run** + one-line next step.
- Wordfence is for a **WordPress install path** (`securityAssess.wordpressRoot`) — required for **complete** WP health by default.
- Do **not** treat completeness as “secure enough to skip `/ss-security-audit`.”

## CVE / dependency scan (`#cves`) — required

Machine **advisory snapshot** for known dependency CVEs — not a pen-test score, readiness %, or subjective “security grade.”

| Field | Source |
|-------|--------|
| Last run | Date + command (prefer assess deps probe / `security-audit.cjs . --deps`, else `npm audit` / `composer audit`) |
| Critical / high | Counts from the scanner (or “not run”) |
| Moderate / low | Optional; keep compact |
| Action | Fix before ship / accepted risk (link non-goal) / re-run on next `/ss-security-plan` or assess |

Rules:

- Prefer **facts from the last scan** over invented CVE lists. If no scan yet: show **Not run** + one-line next step — do not fabricate IDs.
- Do **not** invent a pen-test score, OWASP “maturity” %, or 1–5 posture grade.
- Full exploit write-ups belong in on-demand pen-test skills / external reports — not this HTML.
- Ship gate still uses `/ss-security-audit` (Phase A may include `--deps`).

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
- **Whole-plugin health:** `/ss-security-plan` + `security-assess.cjs` (`#assess`) — separate cadence

## Status summary (`#status`) — required when assess has been run

Bottom-of-page **at-a-glance** health — no percentage score. Derive from `#assess` + `#decisions` + `#stages` + `#nongoals`.

### Traffic light

| Status | When |
|--------|------|
| **Red** | Assess incomplete, **or** any untriaged ERROR finding |
| **Amber** | Assess complete; ERRORs dismissed or ticketed into stages; WARNING findings still open |
| **Green** | Assess complete; 0 open ERRORs; Wordfence clean (or `wordfence: off`); deps accepted or clear |

Show one large status chip (red / amber / emerald) + one sentence: *why this status*.

### Risk register

Table of confirmed risks from assess + open decisions. Keep rows short.

| Risk | Source | Status | Notes |
|------|--------|--------|-------|
| e.g. public REST write route | semgrep / surfaces | **Open** \| **Resolved** \| **Accepted** | file:line or stage/story key / non-goal link |

Rules:

- **Open** — confirmed, not fixed yet (amber row or open badge)
- **Resolved** — fixed in code or closed by ADR (emerald)
- **Accepted** — explicit non-goal (stone); must link `#nongoals`
- Drop noise: do not list dismissed false positives here — those stay only in assess triage notes if needed
- Update this section whenever assess is re-run or a risk is closed

### Snapshot strip

Compact counts under the chip (facts only):

- Completeness · ERROR open · WARNING open · Last assess date · Ship gate last PASS (if known)

## Footer

Next hardening pickup + path to the source of truth + link to `/ss-security-audit` + last assess date if any.

## Style / tone

Match arch-plan: serif headings, emerald/sky/amber, sparse bullets. No invented CVEs. No pen-test scores. No hedging. Apply [`anti-slop`](../../productivity/anti-slop/SKILL.md) — expand abbreviations on first use; keep trust decisions concrete.
