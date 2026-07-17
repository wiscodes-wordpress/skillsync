# ss-workflow

**Canonical delivery loop** — see [`ss-flow.md`](../harness/ss-flow.md) for harness map and context rules.

Consumer repos use **thin wrappers** (`qb-*`, etc.) for tracker-specific steps; they should still point here for phase order.

## Phase order

| # | Phase | Command |
|---|--------|---------|
| 1 | Branch | consumer wrapper |
| 2 | Architecture (structure in flux) | [`ss-arch-plan`](./ss-arch-plan.md) — optional; HTML plan SoT; epic keys; Jira→HTML refresh on run |
| 3 | UI/UX plan (UI-heavy) | [`ss-ui-ux-plan`](./ss-ui-ux-plan.md) — optional; **before** ss-plan |
| 4 | Grill domain | step 1a of [`ss-plan`](./ss-plan.md) |
| 5 | Grill TDD | step 1b of [`ss-plan`](./ss-plan.md) |
| 6 | Plan | steps 2–3 of [`ss-plan`](./ss-plan.md) |
| 7 | Slice to issues | [`ss-to-issues`](./ss-to-issues.md) (optional) |
| 8 | Implement | [`ss-implement`](./ss-implement.md) — all Remaining cycles/slices |
| 9 | Review | [`ss-review`](./ss-review.md) |
| 10 | Security | [`ss-security-audit`](./ss-security-audit.md) — after review PASS, before PR |
| 11 | PR → merge → Done | [`ss-submit-pr`](./ss-submit-pr.md) → merge *(consumer)* → [`ss-close-story`](./ss-close-story.md) |

Initiative-scale work may run [`ss-major-feature-roadmap`](./ss-major-feature-roadmap.md) before step 2. Architecture direction (`/ss-arch-plan`) when plugin/project shape is undecided — before UI/UX and story plan.
## Harness skeleton (skillsync)

| File | Role |
|------|------|
| [`ss-flow.md`](../harness/ss-flow.md) | Phase map · context budget |
| [`harness-planner-tdd.md`](../harness/harness-planner-tdd.md) | Default planner |
| [`harness-planner.md`](../harness/harness-planner.md) | Legacy feature-first |
| [`harness-generator.md`](../harness/harness-generator.md) | Implement |
| [`harness-critic.md`](../harness/harness-critic.md) | Review |
| [`critic-tdd-testing.md`](../harness/critic-tdd-testing.md) | TDD audit (auto-loaded) |
| [`harness-security-audit.md`](../harness/harness-security-audit.md) | Security gate (scripts + agent) |
| [`accessible-locator-priority.md`](../harness/accessible-locator-priority.md) | UI query priority |

Local addenda: **`.cursor/harness/`** per consumer.

## `ss-*` prefix

**s**kill**s**ync-hosted, product-neutral commands. Link via `link-commands.cjs` (`docs/consumer-setup.md`).

Available as `/ss-workflow` when linked into **`.cursor/commands/`**.
