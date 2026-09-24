# ss-workflow

**Belt index** — Initiative and Ship entry points, plus pointers into the daily Story spine.

**Daily Story:** use [`/ss-flow`](./ss-flow.md) (three fresh agents: Plan → Implement → Done). Harness map and context budget: [`harness/ss-flow.md`](../harness/ss-flow.md).

Type **`ss`** in Cursor’s command palette to filter skillsync delivery commands.

Consumer repos use **thin wrappers** (`qb-*`, `qp-*`, etc.) for tracker-specific steps; they should still point here for belt order.

**Voice:** every `/ss-*` reply — simple, concise, human ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md): problem → fix → next). Not caveman unless asked.

## Belts (not one flat checklist)

Four altitudes. **Most days use Story** via `/ss-flow`. **Bug** when something is broken. Initiative and Ship are enter-when-needed.

### Bug — `/ss-bug-fix`

| Phase | Command | Notes |
|-------|---------|-------|
| Branch | consumer wrapper | — |
| **Fix** | [`ss-bug-fix`](./ss-bug-fix.md) | Repro → root cause → investigate → fix → regression — [`diagnose`](../skills/engineering/diagnose/SKILL.md) + [`harness-bug-fix.md`](../harness/harness-bug-fix.md) |
| **Done** | review → security → PR (same session or resume) | Skip plan, feature evidence, handoff by default |

Lighter than Story — no grill-tdd unless the bug needs multi-cycle contracts.

### Story (default) — `/ss-flow`

| Phase | Command | Agent |
|-------|---------|-------|
| Branch | consumer wrapper | — |
| **Plan** | [`ss-plan`](./ss-plan.md) (+ optional [`ss-to-issues`](./ss-to-issues.md)) | Fresh |
| **Implement** | [`ss-implement`](./ss-implement.md) or [`ss-loop`](./ss-loop.md) | Fresh (loop = per Remaining cycle) |
| **Done** | [`ss-finish`](./ss-finish.md) | Fresh: review → fix → security → feature evidence → handoff? → submit; close after merge |

Leaf Done commands ([`ss-review`](./ss-review.md), [`ss-security-audit`](./ss-security-audit.md), [`ss-handoff`](./ss-handoff.md), [`ss-feature-evidence`](./ss-feature-evidence.md), [`ss-submit-pr`](./ss-submit-pr.md), [`ss-close-story`](./ss-close-story.md)) remain for partial re-runs.

**Ad-hoc bug:** [`ss-bugfix`](./ss-bugfix.md) — instrument likely files, run the repro if the agent can, inspect logs, wait for apply. Not a Story phase.

**Post-ship pulse:** [`ss-prod-pulse`](./ss-prod-pulse.md) — Sentry (if connected) + recent deploy → Findings / Things to note / Potential actions. Read-only.

### Initiative (major / foggy feature)

**Entry:** [`ss-roadmap`](./ss-roadmap.md) — wayfind (local HTML) → draft initiative markdown → lens gates + pack → lock lenses → **publish Jira** → regenerate app map → hand off to `/ss-plan`.

Lens commands are **sub-steps or resume/edit**, not daily Story steps:

| Resume / edit | Command |
|---------------|---------|
| Architecture | [`ss-arch-plan`](./ss-arch-plan.md) |
| UX | [`ss-ui-ux-plan`](./ss-ui-ux-plan.md) |
| Trust posture | [`ss-security-plan`](./ss-security-plan.md) — not the PR gate |

**Posture vs audit:** `/ss-security-plan` = living trust posture. `/ss-security-audit` = Story PR gate (inside `/ss-finish`). **to-issues vs roadmap publish:** `/ss-to-issues` slices a story plan; roadmap publish creates initiative epics/v1 stories after lenses lock.

### Ship (after merge)

Not a PR gate. [`ss-release`](./ss-release.md), or partial [`ss-release-distribution`](./ss-release-distribution.md) / [`ss-release-marketing`](./ss-release-marketing.md).

## Harness skeleton (skillsync)

| File | Role |
|------|------|
| [`ss-flow.md`](../harness/ss-flow.md) | Belt map · context budget · Story agent policy |
| [`harness-planner-tdd.md`](../harness/harness-planner-tdd.md) | Default planner |
| [`harness-planner.md`](../harness/harness-planner.md) | Legacy feature-first |
| [`harness-bug-fix.md`](../harness/harness-bug-fix.md) | Bug fix (`/ss-bug-fix`) |
| [`harness-generator.md`](../harness/harness-generator.md) | Implement |
| [`harness-loop.md`](../harness/harness-loop.md) | AFK implement (`/ss-loop`) |
| [`harness-critic.md`](../harness/harness-critic.md) | Review (via `/ss-finish` or `/ss-review`) |
| [`critic-tdd-testing.md`](../harness/critic-tdd-testing.md) | TDD audit (auto-loaded) |
| [`harness-security-audit.md`](../harness/harness-security-audit.md) | Security gate (scripts + agent) |
| [`accessible-locator-priority.md`](../harness/accessible-locator-priority.md) | UI query priority |

Local addenda: **`.cursor/harness/`** per consumer.

## Optional GitNexus

Structural MCP (`impact`, `detect_changes`, …) during arch / implement / review — see [`docs/gitnexus.md`](../docs/gitnexus.md) and [`harness/ss-flow.md`](../harness/ss-flow.md). Not required for the loop.

## Optional AFK loop (Paseo + Cursor)

After `/ss-plan`, use [`/ss-loop`](./ss-loop.md) instead of interactive `/ss-implement` to walk Remaining cycles unattended. Setup: [`docs/ss-loop.md`](../docs/ss-loop.md). Then `/ss-finish`.

## `ss-*` prefix

**s**kill**s**ync-hosted, product-neutral commands. Link via `link-commands.cjs` (`docs/consumer-setup.md`). Linking a **skill** is not the same as a slash command — `ss-*` is the filterable command set.

Available as `/ss-workflow` when linked into **`.cursor/commands/`**.
