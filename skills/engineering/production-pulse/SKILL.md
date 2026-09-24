---
name: production-pulse
description: >
  After a production deploy (or when asked to check prod / Sentry), gather a
  short window of evidence and write a human briefing: Findings, Things to note,
  Potential actions, plus a human repro and a FullStory/Sentry replay link when
  the event has one. Use when the user says production pulse, prod check, check
  Sentry, FullStory, reproduce prod, post-deploy, work prod, lifeway-discipleship, lifeway-discipleship-tv,
  lifeway-discipleship-roku, “anything blowing up in prod”, or /ss-prod-pulse.
  Not for local bugfix loops (use bugfix) or hard diagnosis with no runtime path
  (use diagnose).
---

# Production pulse

A **read-only** briefing after a ship, or when someone asks “is prod okay?” Slack-pasteable. You do **not** patch, roll back, file tickets, or page people unless they ask.

**Does not:** [`bugfix`](../bugfix/SKILL.md), [`diagnose`](../diagnose/SKILL.md), [`/ss-release`](../../../commands/ss-release.md).

Load [PROFILES.md](PROFILES.md) (which products) and [QUERY.md](QUERY.md) (how to query) before gathering.

## Hard rules

1. **Never invent Sentry or GitHub data.** 401/404 = not connected. Empty config keys = unset.
2. **Never print tokens, `.env`, stacks, or PII** (emails, names, account ids). One user-facing sentence per finding. Never invent a FullStory URL or a repro the event does not support.
3. **Users beat event counts.** A retry loop is not an outage.
4. **Same bug on two products is one finding** (list the products). GraphQL/schema pain is usually this.
5. **This skillsync repo has no production.** From here, or on “work”, scan the Lifeway set — do not pulse skillsync.

## Window

Per **product**, not one SHA for the whole set (TV/Roku store builds lag git).

1. Named release / SHA / issue URL → that.
2. Else that product’s latest GitHub **release or production deploy** → now.
3. Else **last 24 hours** for that product.

Name each window in the brief. Missing deploy → say so, use 24h.

## Gather

Query **each** product in the set ([QUERY.md](QUERY.md)). Skip what is missing.

Sentry, this window only: new issues, count **jumps** vs the prior window of the same length, regressions on this **release**, crash-free % only if release health actually returned.

Cap **5 issue IDs total**. Prefer playback / auth / pay over device noise.

Also: Actions failures on that product’s default branch (`master` on Lifeway). No `git log` unless that repo is the cwd.

## Investigate (light)

For each kept issue: first-seen, ~users, ~events, release, ours-frame (skip vendor), `new` / `rising` / `known`. What the **user** hits.

Then pull the **latest event** ([QUERY.md](QUERY.md)) for repro + watch — not a second investigation:

- **Repro (human):** 2–4 steps a teammate can try. Source: request URL, screen/route, breadcrumbs, device/OS, release. If that is not in the event, write `Repro: not enough in the event (missing <what>)` — do not guess.
- **FullStory:** on the latest event, read `contexts.fullstory.sessionUrl`. If that string is a URL, Watch is that URL (ahead of Sentry replay). Missing/empty → `FullStory: none on this event`. TV/Roku: `n/a` unless that field is actually set.
- **Sentry replay:** only if there is no FullStory URL.

Stop. Next loop is `/ss-bugfix` or diagnose — not a speculative patch.

**Rank:** more users → new → rising → known. Drop known-and-flat unless the user named that issue.

## Brief (chat only)

Hard caps: **5 findings · 3 notes · 3 actions**. Empty: `None.` No hype.

```markdown
## Production pulse — <env> · <windows>
**Products:** <scanned> · **Sentry:** <connected | mixed | not connected>
**Release:** <per product if they differ>

### Findings
- <product(s)> · <new | rising | known> — <what the user hits> (<id>; ~N events / ~M users)
  - Repro: <2–4 human steps, or “not enough in the event”>
  - Watch: FullStory <contexts.fullstory.sessionUrl> · else Sentry replay · else <none on this event | n/a>

### Things to note
- <quiet product, store lag, ignored noise, what you could not query>

### Potential actions
- <verb>: <concrete next> — <why>

### Evidence
- <2–4 sources actually queried — not a command dump>
```

- Prefer **flag off / rollback / watch a named issue** over “investigate further”.
- “Monitor” needs **what** and **until when**.
- All-clear: one finding `Nothing new in this window.` No fake actions.
- Do not post to Slack / Jira / GitHub unless asked. If they want it in standup, paste this same brief — do not rewrite it.

## Modes

| User says | Do |
|-----------|-----|
| `/ss-prod-pulse` / “check prod” / “work” | Resolved set (Lifeway: all three) |
| `tv` / `roku` / `discipleship` | That product only |
| Sentry issue URL | That issue is Finding #1; still scan siblings |
| “since v1.4” / SHA | That window (that product, or all if unnamed) |
