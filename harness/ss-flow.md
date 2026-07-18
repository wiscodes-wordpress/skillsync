# ss-flow — canonical delivery loop

**Product-neutral** harness workflow for consumer repos. Slash commands are thin entry points; this file is the single map of phases → harness → skills.

Consumers document **branch**, **verification commands**, and **stack skills** in root **`AGENTS.md`** and **`skillsync.config.json`**.

## Phase map

| Phase | Command | Harness (read one) | Skills (only when applicable) |
|-------|---------|-------------------|-------------------------------|
| Branch | consumer wrapper | — | — |
| Initiative (optional) | `/ss-major-feature-roadmap` | — | [`major-feature-roadmap`](../skills/engineering/major-feature-roadmap/SKILL.md) |
| Architecture (optional) | `/ss-arch-plan` | — | [`arch-plan`](../skills/engineering/arch-plan/SKILL.md) — living HTML plan SoT; Jira epic keys join stages; refresh status on run |
| Security posture (optional) | `/ss-security-plan` | — | [`security-plan`](../skills/engineering/security-plan/SKILL.md) — living HTML posture SoT; hardening stages; does not replace `/ss-security-audit` |
| UI/UX plan (optional) | `/ss-ui-ux-plan` | — | [`ui-ux-planner`](../skills/engineering/ui-ux-planner/SKILL.md) — before `/ss-plan` when UI-heavy |
| Plan | `/ss-plan` | [`harness-planner-tdd.md`](./harness-planner-tdd.md) | 1a: [`grill-me`](../skills/productivity/grill-me/SKILL.md) or [`grill-with-docs`](../skills/engineering/grill-with-docs/SKILL.md) · 1b: [`grill-tdd`](../skills/engineering/grill-tdd/SKILL.md) |
| Slice to issues | `/ss-to-issues` | — | [`to-issues`](../skills/engineering/to-issues/SKILL.md) |
| Implement | `/ss-implement` | [`harness-generator.md`](./harness-generator.md) | [`ponytail`](../skills/engineering/ponytail/SKILL.md) · [`tdd`](../skills/engineering/tdd/SKILL.md) when state has RED→GREEN Plan |
| Review | `/ss-review` | [`harness-critic.md`](./harness-critic.md) | auto: [`critic-tdd-testing.md`](./critic-tdd-testing.md) when state has TDD contracts |
| Security | `/ss-security-audit` | [`harness-security-audit.md`](./harness-security-audit.md) | optional: linked `wordpress-security-validation`; FE: [fallow](https://github.com/fallow-rs/fallow) when installed |
| PR / close | `/ss-submit-pr`, `/ss-close-story` | — | linked PR/Jira skills per consumer |

**Legacy:** feature-first planning only → [`harness-planner.md`](./harness-planner.md) (skip grill-tdd).

**UI-heavy story order:** `/ss-ui-ux-plan` → `/ss-plan` (UX Contract seeds Behavior & Test Contracts). Skip UI/UX plan for non-UI work.

**Structure-in-flux order:** `/ss-arch-plan` (living HTML → lock stages) → optional `/ss-ui-ux-plan` → `/ss-plan` per stage. Skip arch-plan when module shape is already agreed.

**Security posture order:** `/ss-security-plan` (living HTML → hardening stages) when trust model is unclear; **every PR** still runs `/ss-security-audit` after review. Do not fold the audit into the posture HTML.
## Context budget rules

1. **One harness file per command** — do not chain duplicate harnesses.
2. **Stack skills on demand** — read `jest-react-testing`, `wordpress-testing-qa`, etc. only when `AGENTS.md` / diff surface says that stack; not on every implement/review.
3. **No `testing-expert` in this loop** — encyclopedic reference; use `tdd` + stack skill instead.
4. **Locators** — [accessible-locator-priority.md](./accessible-locator-priority.md) when writing or reviewing **UI/E2E** tests only.
5. **State is the contract** — after plan, `Behavior & Test Contracts` and `RED→GREEN Plan` in **`.harness/state.md`** replace re-reading `grill-tdd` at review.

## TDD loop (implement)

One **`/ss-implement`** session walks **all Remaining** RED→GREEN cycles (or sprint slices) **in order** — each cycle still vertical (RED→GREEN→re-break before the next). Details: `harness-generator.md` + `tdd/SKILL.md`. Override with `only Cycle N` / `through Cycle N` when needed.

Evidence table: **`## TDD Evidence`** in state.md. Review gates: `critic-tdd-testing.md`.

## Optional consumer modules

Under **`.cursor/harness/`** when present: `critic-backend.md`, `critic-frontend.md`, `critic-e2e-testing.md`, generator/critic addenda.

## Optional deterministic tools

Run from vendored **`tools/`** (see [`docs/consumer-setup.md`](../docs/consumer-setup.md)). Agents use these for mechanical steps; skills/harness files stay authoritative for judgment.

| Phase | Tool |
|-------|------|
| Plan (post-write) | `validate-state.cjs --mode plan` |
| New story | `init-state.cjs --task "KEY title"` |
| Implement / review | `run-verification.cjs`, `tdd-audit.cjs`, `re-break.cjs` |
| Security | `security-audit.cjs` (`--write-state`, `--set-phase-b`, `--check-state`) |
| Submit PR | `render-pr-body.cjs`, `open-pr.cjs` (requires Security Evidence PASS) |
| To issues (post-approve) | `publish-slices-from-state.cjs` |
| Close story | `harness-reset.cjs`, optional `jira-close.cjs` |

Planner for this tooling backlog: [`harness-planner-ss-scripts.md`](./harness-planner-ss-scripts.md).

## Further reading (not loaded by default)

- [`testing-expert`](../skills/engineering/testing-expert/SKILL.md) — optional deep reference
- [Playwright walkthrough](https://denmercs.com/playwright-e2e-testing-and-agent-verification) — example of accessible-locator philosophy
