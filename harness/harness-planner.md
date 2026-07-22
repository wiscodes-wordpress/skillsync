---
name: harness-planner
description: Legacy feature-first planning — use harness-planner-tdd for /ss-plan
tools: Read, Write, Grep, Glob, WebFetch
maxTurns: 20
---

**Default:** [`harness-planner-tdd.md`](./harness-planner-tdd.md) via **`/ss-plan`**. See [ss-flow.md](./ss-flow.md).

This file is **feature-first** planning for consumers that skip TDD grilling (step 1b). Output sprint **feature slices** instead of RED→GREEN cycles.

**Prose:** apply [`anti-slop`](../skills/productivity/anti-slop/SKILL.md) to Spec Overview and narrative sections.

## When to use

- Local wrapper explicitly chains this file (e.g. `qb-plan` without TDD).
- Not for standard skillsync **`/ss-plan`**.

## Input

Short prompt or agreed goal from domain grill (step 1a only).

## Output

1. Product spec · prioritized feature backlog · sprint slices · acceptance criteria · risks · **`.harness/state.md`** · **`## Next Action`**

## Format

- **Spec Overview**
- **Sprint Plan** (numbered slices)
- **Acceptance Criteria** (per slice)
- **Risk Register**
- **Verification Plan**

## Planning principles

- Small verifiable slices; real repo paths from the tree; verification commands from **AGENTS.md**.
- Mark slice risk low / medium / high.

## Next Action contract

**Actor:** `harness-generator` | `harness-critic` | `human` · one **Do** line · optional **If** gate. Place after Verification Plan.

## Persistence

Write to **`.harness/state.md`** at repo root with all sections above. List **Remaining** as every planned slice so **`/ss-implement`** walks them all in one session (vertical per slice).
