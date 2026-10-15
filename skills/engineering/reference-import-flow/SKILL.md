---
name: reference-import-flow
description: >
  Two-lane delivery for rebuilding a third-party builder or app as native output:
  evidence in a reverse-engineering workspace, mapping and UI in the product repo,
  then Story belt RED→GREEN per vertical slice. Use when importing Bricks/Elementor-like
  behavior, REA evidence passes, reference-builder initiatives, or the user asks
  not to get lost between REA and implementation.
---

# Reference import flow

**Problem:** Teams split work across an **evidence repo** (REA, bundle, live UI) and a **product repo** (mapper, shell, saved native blocks). Chat drifts into coding in the wrong tree or skipping harness gates.

**Solution:** Run **one overlay** on top of skillsync belts — do not replace [`/ss-flow`](../../../commands/ss-flow.md).

## Two lanes (never merge)

| Lane | Where code/docs land | Allowed work |
|------|----------------------|--------------|
| **Evidence** | REA checkout / reference theme or plugin on disk | Captures, PHP/class reads, bundle notes, live UI traces, coverage limits |
| **Product** | Consumer app repo (plugin, theme, app) | Initiative markdown, arch plan, mappers, React shell, tests, `post_content` / native serialization |

**Rule:** Evidence informs mapping; **only the product repo ships**. No “temporary” parallel document models in the product repo.

## Phase map (overlay on belts)

Use this **phase number** when orienting (`/ss-reference-import-flow` prints the same table). Stay on one phase until its exit criteria pass.

| Phase | Belt | What to do | Exit criteria |
|-------|------|------------|---------------|
| **0 — Orient** | — | Read consumer addendum (if any), initiative doc, normative ADR/map. Confirm **product workspace** root. | You can name reference URL, product editor URL, first vertical slice |
| **1 — Evidence** | Evidence lane | REA (or manual) pass for **current slice only**: settings → observed behavior → mapping **hints**. Record evidence ids + deferred controls (no native field). | Slice note updated; deferred list explicit |
| **2 — Initiative / arch** | Initiative | Living arch plan under `.harness/initiatives/<slug>/` (local). Optional [`/ss-roadmap`](../../../commands/ss-roadmap.md), [`/ss-arch-plan`](../../../commands/ss-arch-plan.md). | Slice order + AC for v1 agreed |
| **3 — Story plan** | Story | Consumer grill if present (e.g. `/qb-grill`) → [`/ss-plan`](../../../commands/ss-plan.md) → `.harness/state.md` with Behavior & Test Contracts ([`grill-tdd`](../grill-tdd/SKILL.md)). Seed contracts from slice evidence. | `state.md` validates; RED commands listed |
| **4 — Implement** | Story | [`/ss-implement`](../../../commands/ss-implement.md) — **TDD inside this phase** ([`tdd`](../tdd/SKILL.md)): RED → GREEN per cycle. Mapping + UI only in **product** repo. | All Remaining cycles GREEN; verification cmds pass |
| **5 — Done** | Story | [`/ss-finish`](../../../commands/ss-finish.md) or leaves: [`/ss-review`](../../../commands/ss-review.md) → [`/ss-security-audit`](../../../commands/ss-security-audit.md) → PR command | Critic + security PASS |
| **6 — Next slice** | — | Repeat **1→5** for next element; widen evidence only when opening a new control or element | — |

**TDD is not a separate phase after implement.** It runs inside **phase 4** per `state.md`.

**Do not skip:** phase 1 before first implement of a new element; phase 3 before phase 4 unless the user explicitly overrides.

## Agent checklist (start of session)

1. Which **phase** (0–6) are we in?
2. Which **repo root** is open — evidence or product?
3. Which **slice** (one element or mapper unit)?
4. Where is the **slice note** (initiative + `.harness/initiatives/...` or story comment)?

If evidence is stale or missing for this slice → **phase 1** in evidence lane, then return to product root.

## Consumer addendum

Product-specific paths (editor URLs, initiative file, REA repo name, worktree) live in the **consumer skill** — e.g. Quick Builder: `qb-bricks-import-workflow` under the plugin’s `.cursor/skills/`.

Read that skill **after** this one when both exist.

## Related

- Belt map: [`harness/ss-flow.md`](../../../harness/ss-flow.md) — **Reference import overlay** section
- Slash entry: [`/ss-reference-import-flow`](../../../commands/ss-reference-import-flow.md)
- Daily Story spine: [`/ss-flow`](../../../commands/ss-flow.md)
