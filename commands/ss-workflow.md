# ss-workflow

**Canonical delivery loop** — see [`ss-flow.md`](../harness/ss-flow.md) for harness map and context rules.

Type **`ss`** in Cursor’s command palette to filter skillsync delivery commands (and not every linked skill).

Consumer repos use **thin wrappers** (`qb-*`, `qp-*`, etc.) for tracker-specific steps; they should still point here for belt order.

## Belts (not one flat checklist)

Three altitudes. **Most days use Story only.** Initiative and Ship are enter-when-needed.

### Story (default)

| Step | Command |
|------|---------|
| Branch | consumer wrapper |
| Plan | [`ss-plan`](./ss-plan.md) — domain grill + TDD grill + `.harness/state.md` |
| Slice (optional) | [`ss-to-issues`](./ss-to-issues.md) — publish story slices from state; **not** initiative epic publish |
| Implement | [`ss-implement`](./ss-implement.md) |
| Review | [`ss-review`](./ss-review.md) |
| PR security gate | [`ss-security-audit`](./ss-security-audit.md) — every PR; not the trust-posture plan |
| Human walkthrough (optional) | [`ss-handoff`](./ss-handoff.md) — `.harness/code-handoff.html` before PR |
| PR → Done | [`ss-submit-pr`](./ss-submit-pr.md) → merge *(consumer)* → [`ss-close-story`](./ss-close-story.md) |

### Initiative (major / foggy feature)

**Entry:** [`ss-roadmap`](./ss-roadmap.md) — wayfind (local HTML) → draft initiative markdown → lens gates + pack → lock lenses → **publish Jira** → regenerate app map → hand off to `/ss-plan`.

Lens commands are **sub-steps or resume/edit**, not daily Story steps:

| Resume / edit | Command |
|---------------|---------|
| Architecture | [`ss-arch-plan`](./ss-arch-plan.md) |
| UX | [`ss-ui-ux-plan`](./ss-ui-ux-plan.md) |
| Trust posture | [`ss-security-plan`](./ss-security-plan.md) — not the PR gate |

**Posture vs audit:** `/ss-security-plan` = living trust posture. `/ss-security-audit` = Story PR gate. **to-issues vs roadmap publish:** `/ss-to-issues` slices a story plan; roadmap publish creates initiative epics/v1 stories after lenses lock.

### Ship (after merge)

Not a PR gate. [`ss-release`](./ss-release.md), or partial [`ss-release-distribution`](./ss-release-distribution.md) / [`ss-release-marketing`](./ss-release-marketing.md).

## Harness skeleton (skillsync)

| File | Role |
|------|------|
| [`ss-flow.md`](../harness/ss-flow.md) | Belt map · context budget |
| [`harness-planner-tdd.md`](../harness/harness-planner-tdd.md) | Default planner |
| [`harness-planner.md`](../harness/harness-planner.md) | Legacy feature-first |
| [`harness-generator.md`](../harness/harness-generator.md) | Implement |
| [`harness-critic.md`](../harness/harness-critic.md) | Review |
| [`critic-tdd-testing.md`](../harness/critic-tdd-testing.md) | TDD audit (auto-loaded) |
| [`harness-security-audit.md`](../harness/harness-security-audit.md) | Security gate (scripts + agent) |
| [`accessible-locator-priority.md`](../harness/accessible-locator-priority.md) | UI query priority |

Local addenda: **`.cursor/harness/`** per consumer.

## Optional GitNexus

Structural MCP (`impact`, `detect_changes`, …) during arch / implement / review — see [`docs/gitnexus.md`](../docs/gitnexus.md) and [`ss-flow.md`](../harness/ss-flow.md). Not required for the loop.

## `ss-*` prefix

**s**kill**s**ync-hosted, product-neutral commands. Link via `link-commands.cjs` (`docs/consumer-setup.md`). Linking a **skill** is not the same as a slash command — `ss-*` is the filterable command set.

Available as `/ss-workflow` when linked into **`.cursor/commands/`**.
