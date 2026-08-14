---
name: grill-with-docs
description: >
  Domain grill against CONTEXT.md / ADRs: major hard-to-reverse decisions one at a time,
  then minor defaults as assumption→answer batches. Sharpens terminology and updates docs
  inline. Use for /ss-plan 1a when the project uses documented domain language.
---

<what-to-do>

**REQUIRED:** majors one-at-a-time; minors as assumption→default batches; explore code/docs instead of asking; short plain chat ([`anti-slop`](../../productivity/anti-slop/SKILL.md); rule `ss-delivery-voice.mdc`).

Reach shared understanding of the plan without drowning in obvious Q&A.

**Major forks (interactive):** Ask **one at a time**. For each, give your recommended answer and wait for feedback before continuing.

**Minor defaults (batch):** After majors for the current branch (or at a natural pause), post a short checklist of assumption → recommended answer (about **5–10** items). The human only corrects what is wrong.

If the codebase or docs can answer something, **explore instead of asking**.

| Major (grill one-by-one) | Minor (list + default) |
|--------------------------|------------------------|
| Hard to reverse; shapes scope, domain boundaries, ownership, or surprising trade-offs | Easy to reverse; one sensible answer from CONTEXT.md, ADRs, or code |
| Glossary conflicts or overloaded terms that change meaning | “Same term / same pattern as the rest of the repo” |
| Reasonable people would disagree | Autopilot confirmations |

When unsure, treat it as **major**. Do **not** interview relentlessly about every aspect.

**How to talk:** [`anti-slop`](../../productivity/anti-slop/SKILL.md) `/ss-*` chat voice — short, plain, no hype. Major = three lines (question, recommend, why). Minors = numbered assumption → default. No essay between turns.

</what-to-do>

<supporting-info>

## Domain awareness

During codebase exploration, also look for existing documentation:

### File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer architecture decision records (ADRs) sparingly

Only offer to create an architecture decision record (ADR) when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).

</supporting-info>
