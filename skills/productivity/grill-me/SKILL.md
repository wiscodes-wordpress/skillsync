---
name: grill-me
description: >
  Stress-test a plan by grilling major hard-to-reverse decisions one at a time, then
  batching minor defaults as assumption→answer for quick pushback. Use when the user
  wants to be grilled, mentions "grill me", or /ss-plan domain grill (1a).
---

# Grill me

**REQUIRED:** majors one-at-a-time (Q + Recommend + why); minors as assumption→default list; look up code/docs instead of asking; plain short chat — see [`anti-slop`](../anti-slop/SKILL.md) and rule `ss-delivery-voice.mdc`.

Reach shared understanding of the plan without drowning in obvious Q&A.

## Mode

1. **Major forks (interactive)** — Ask **one at a time**. For each, give your recommended answer and wait.
2. **Minor defaults (batch)** — After majors for the current branch (or at a natural pause), post a short checklist of assumption → recommended answer. The human only corrects what is wrong.
3. Cap the minor list at about **5–10** items per batch. Prefer more batches over one huge dump.

If the codebase or docs can answer something, **explore instead of asking**.

## What counts as major vs minor

| Major (grill one-by-one) | Minor (list + default) |
|--------------------------|------------------------|
| Hard to reverse later | Easy to reverse |
| Two or more plausible options | One sensible answer from code, conventions, or already-agreed scope |
| Shapes scope, API, data model, auth, migrations, ownership, or user journey | Naming, plumbing, boilerplate, “same as the rest of the repo” |
| Reasonable people on the team would disagree | Autopilot “yes, obviously” |

When unsure, treat it as **major**.

## Session shape

1. Resolve **major** forks along the decision tree (dependencies first).
2. Dump **minor** defaults for that area as a checklist.
3. Human replies “all good except …” or edits specific lines.
4. Continue to the next major branch, or stop when majors are settled and minors are accepted.

Do **not** interview relentlessly about every aspect. Assert defaults for the rest and keep grilling only where the wrong call is costly.

## How to talk

Follow [`anti-slop`](../anti-slop/SKILL.md) **`/ss-*` chat voice**. Plain English. Short. No hype, no “Great question!”, no essay before the ask.

**Major turn** — three lines max before you wait:

```markdown
**Major:** <one decision>
**Recommend:** <your answer>
Why: <one short reason>
```

**Minor batch** — after majors for that branch:

```markdown
**Minors** (reply “all good” or correct a line):
1. <assumption> → <default>
2. …
```

Do not restate the whole plan between questions.
