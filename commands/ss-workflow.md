# ss-workflow

**Canonical delivery loop** — see [`ss-flow.md`](../harness/ss-flow.md) for harness map and context rules.

Consumer repos use **thin wrappers** (`qb-*`, etc.) for tracker-specific steps; they should still point here for phase order.

## Phase order

| # | Phase | Command |
|---|--------|---------|
| 1 | Branch | consumer wrapper |
| 2 | Architecture (structure in flux) | [`ss-arch-plan`](./ss-arch-plan.md) — optional; HTML plan source of truth; epic keys; Jira→HTML refresh on run |
| 3 | Security posture (trust model) | [`ss-security-plan`](./ss-security-plan.md) — optional; HTML posture source of truth; not the PR gate |
| 4 | UI/UX plan (UI-heavy) | [`ss-ui-ux-plan`](./ss-ui-ux-plan.md) — optional; living HTML source of truth; **before** ss-plan |
| 5 | Grill domain | step 1a of [`ss-plan`](./ss-plan.md) |
| 6 | Grill TDD | step 1b of [`ss-plan`](./ss-plan.md) |
| 7 | Plan | steps 2–3 of [`ss-plan`](./ss-plan.md) |
| 8 | Slice to issues | [`ss-to-issues`](./ss-to-issues.md) (optional) |
| 9 | Implement | [`ss-implement`](./ss-implement.md) — all Remaining cycles/slices |
| 10 | Review | [`ss-review`](./ss-review.md) |
| 11 | Security gate | [`ss-security-audit`](./ss-security-audit.md) — after review PASS, before PR |
| 12 | Human walkthrough (optional) | [`ss-handoff`](./ss-handoff.md) — `.harness/code-handoff.html` before PR |
| 13 | PR → merge → Done | [`ss-submit-pr`](./ss-submit-pr.md) → merge *(consumer)* → [`ss-close-story`](./ss-close-story.md) |
| 14 | Release / GTM (optional) | [`ss-release`](./ss-release.md) — or [`ss-release-distribution`](./ss-release-distribution.md) / [`ss-release-marketing`](./ss-release-marketing.md) |

Initiative-scale work may run [`ss-roadmap`](./ss-roadmap.md) before step 2 (draft roadmap → lens pack → Jira publish). Architecture (`/ss-arch-plan`) and security posture (`/ss-security-plan`) when shape or trust model is undecided — before UI/UX and story plan. **Every PR** still runs `/ss-security-audit`. Release/GTM is **after** ship — not a PR gate.
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
