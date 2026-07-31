# ss-flow — canonical delivery loop

**Product-neutral** harness workflow for consumer repos. Slash commands are thin entry points; this file is the single map of **belts** → harness → skills.

Type **`ss`** in Cursor’s command palette to filter delivery commands. Consumers document **branch**, **verification commands**, and **stack skills** in root **`AGENTS.md`** and **`skillsync.config.json`**.

## Belts

### Story (default daily path)

| Phase | Command | Harness (read one) | Skills (only when applicable) |
|-------|---------|-------------------|-------------------------------|
| Branch | consumer wrapper | — | — |
| Plan | `/ss-plan` | [`harness-planner-tdd.md`](./harness-planner-tdd.md) | 1a: [`grill-me`](../skills/productivity/grill-me/SKILL.md) or [`grill-with-docs`](../skills/engineering/grill-with-docs/SKILL.md) · 1b: [`grill-tdd`](../skills/engineering/grill-tdd/SKILL.md) |
| Slice to issues | `/ss-to-issues` (optional) | — | [`to-issues`](../skills/engineering/to-issues/SKILL.md) |
| Implement | `/ss-implement` | [`harness-generator.md`](./harness-generator.md) | [`ponytail`](../skills/engineering/ponytail/SKILL.md) · [`tdd`](../skills/engineering/tdd/SKILL.md) when state has RED→GREEN Plan |
| Review | `/ss-review` | [`harness-critic.md`](./harness-critic.md) | auto: [`critic-tdd-testing.md`](./critic-tdd-testing.md) when state has TDD contracts |
| Security gate | `/ss-security-audit` | [`harness-security-audit.md`](./harness-security-audit.md) | optional: linked `wordpress-security-validation`; FE: [fallow](https://github.com/fallow-rs/fallow) when installed |
| Human walkthrough (optional) | `/ss-handoff` | — | [`code-handoff`](../skills/engineering/code-handoff/SKILL.md) — `.harness/code-handoff.html` for human review; after review (ideally after security), before `/ss-submit-pr` |
| PR / close | `/ss-submit-pr`, `/ss-close-story` | — | linked PR/Jira skills per consumer |

**Legacy:** feature-first planning only → [`harness-planner.md`](./harness-planner.md) (skip grill-tdd).

### Initiative (enter when major / foggy)

| Phase | Command | Skills / tools |
|-------|---------|----------------|
| Initiative entry | `/ss-roadmap` | [`wayfinder`](../skills/engineering/wayfinder/SKILL.md) (phase 0, local HTML, **no Jira**) → [`major-feature-roadmap`](../skills/engineering/major-feature-roadmap/SKILL.md) draft → lens gates → feature pack → publish Jira → [`render-app-map.cjs`](../tools/render-app-map.cjs) |
| Resume architecture | `/ss-arch-plan` | [`arch-plan`](../skills/engineering/arch-plan/SKILL.md) |
| Resume UX | `/ss-ui-ux-plan` | [`ui-ux-planner`](../skills/engineering/ui-ux-planner/SKILL.md) |
| Resume trust posture | `/ss-security-plan` | [`security-plan`](../skills/engineering/security-plan/SKILL.md); [`harness-security-assess.md`](./harness-security-assess.md) when whole-plugin health |

**Enter Initiative when:** multi-epic feature, destination foggy, or structure/UX/trust still undecided before stories. **Skip** and stay on Story when the story is already clear.

**Roadmap cadence:** 0 wayfind (optional) → 1 draft markdown (**no Jira**) → 2 pack → 3 lock required lenses → 4 publish Jira → 5 `render-app-map.cjs` → 6 `/ss-plan` per v1 story. Global plan HTML stays plugin-wide; pack files are initiative-scoped. Grand plan: `.harness/app-map.html` ([`app-map`](../skills/engineering/app-map/SKILL.md)).

**Posture vs audit:** `/ss-security-plan` does not replace `/ss-security-audit` on every PR.

### Ship (enter after merge)

| Phase | Command | Skills |
|-------|---------|--------|
| Release / GTM | `/ss-release`, `/ss-release-distribution`, `/ss-release-marketing` | [`anti-slop`](../skills/productivity/anti-slop/SKILL.md) · [`release-distribution`](../skills/productivity/release-distribution/SKILL.md) · [`release-marketing`](../skills/productivity/release-marketing/SKILL.md) |

**Enter Ship when:** post-merge go-to-market. Does **not** block `/ss-submit-pr`.

**Human walkthrough order:** after `/ss-review` PASS (and ideally `/ss-security-audit`) → `/ss-handoff` → human opens `.harness/code-handoff.html` in a browser → `/ss-submit-pr`. Optional; does **not** replace critic or security. Skip when the human already understands the diff.

## Context budget rules

1. **One harness file per command** — do not chain duplicate harnesses.
2. **Stack skills on demand** — read `jest-react-testing`, `wordpress-testing-qa`, etc. only when `AGENTS.md` / diff surface says that stack; not on every implement/review.
3. **No `testing-expert` in this loop** — encyclopedic reference; use `tdd` + stack skill instead.
4. **Locators** — [accessible-locator-priority.md](./accessible-locator-priority.md) when writing or reviewing **UI / end-to-end (E2E)** tests only.
5. **State is the contract** — after plan, `Behavior & Test Contracts` and `RED→GREEN Plan` in **`.harness/state.md`** replace re-reading `grill-tdd` at review.
6. **Prose** — when writing plans, living HTML briefings, issue text, PR bodies, or skill docs, apply [`anti-slop`](../skills/productivity/anti-slop/SKILL.md) (expand abbreviations on first use; no hype filler). Skip for pure code and mechanical evidence tables. Marketing packs still finish with a full anti-slop pass.

## TDD loop (implement)

One **`/ss-implement`** session walks **all Remaining** RED→GREEN cycles (or sprint slices) **in order** — each cycle still vertical (RED→GREEN→re-break before the next). Details: `harness-generator.md` + `tdd/SKILL.md`. Override with `only Cycle N` / `through Cycle N` when needed.

Evidence table: **`## TDD Evidence`** in state.md. Review gates: `critic-tdd-testing.md`.

## Optional consumer modules

Under **`.cursor/harness/`** when present: `critic-backend.md`, `critic-frontend.md`, `critic-e2e-testing.md`, generator/critic addenda.

## Optional GitNexus (code knowledge graph)

When the **gitnexus** MCP server is available and the repo is indexed, use it for **structural** context — not as a substitute for harness files or verification scripts. Full setup and license notes: [`docs/gitnexus.md`](../docs/gitnexus.md).

| Phase | Prefer |
|-------|--------|
| `/ss-arch-plan`, `/ss-plan` | `query`, `context` |
| `/ss-implement` | `impact` before shared-symbol edits |
| `/ss-review`, `/ss-submit-pr` | `detect_changes` on the diff |
| Missing MCP / stale index | Skip — continue the `ss-*` loop |

Do not load GitNexus skills or dump large graph dumps on every turn (context budget). One targeted tool call beats a full schema dump.

## Optional deterministic tools

Run from vendored **`tools/`** (see [`docs/consumer-setup.md`](../docs/consumer-setup.md)). Agents use these for mechanical steps; skills/harness files stay authoritative for judgment.

| Phase | Tool |
|-------|------|
| Arch / UX / Security / wayfinder / app-map / handoff | `validate-plan-html.cjs --kind arch\|ux\|security\|wayfinder\|app-map\|handoff`; scaffold: `init-plan-html.cjs --kind …` |
| Initiative pack (`/ss-roadmap`) | `init-feature-pack.cjs --slug … --lenses …`, `validate-feature-pack.cjs --slug …` |
| Grand plan / mind map | `render-app-map.cjs` (deterministic; do not freehand mind-map JSON) |
| Plan (post-write) | `validate-state.cjs --mode plan` |
| New story | `init-state.cjs --task "KEY title"` |
| Implement / review | `run-verification.cjs`, `tdd-audit.cjs`, `re-break.cjs` |
| Security (PR gate) | `security-audit.cjs` (`--write-state`, `--set-phase-b`, `--check-state`) |
| Security (whole plugin) | `security-assess.cjs` (`--write-state` → `#assess` / `security-assess.json`) |
| Submit PR | `render-pr-body.cjs`, `open-pr.cjs` (requires Security Evidence PASS) |
| Human walkthrough | `init-plan-html.cjs --kind handoff` (if missing) → agent fill → `validate-plan-html.cjs --kind handoff` |
| To issues (post-approve) | `publish-slices-from-state.cjs` |
| Close story | `harness-reset.cjs`, optional `jira-close.cjs` |
| Release / GTM | `init-release-brief.cjs`, `validate-release-brief.cjs`, `validate-release-pack.cjs` |

Planner for this tooling backlog: [`harness-planner-ss-scripts.md`](./harness-planner-ss-scripts.md).

## Further reading (not loaded by default)

- [`testing-expert`](../skills/engineering/testing-expert/SKILL.md) — optional deep reference
- [Playwright walkthrough](https://denmercs.com/playwright-e2e-testing-and-agent-verification) — example of accessible-locator philosophy
