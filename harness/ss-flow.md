# ss-flow — harness belt map

**Not** the slash command [`/ss-flow`](../commands/ss-flow.md) (Story: three fresh agents). This file maps **belts** → harness → skills and **context budget**.

Slash commands are thin entry points. Type **`ss`** in Cursor’s command palette. Consumers document **branch**, **verification commands**, and **stack skills** in root **`AGENTS.md`** and **`skillsync.config.json`**.

## Belts

### Bug (broken / regression)

**Agent policy:** one session for fix + Done tail, or resume for review/PR. Pass **`.harness/state.md`**, not chat history.

| Phase | Command | Harness (read one) | Skills |
|-------|---------|-------------------|--------|
| Branch | consumer wrapper | — | — |
| **Fix** | `/ss-bug-fix` | [`harness-bug-fix.md`](./harness-bug-fix.md) | [`diagnose`](../skills/engineering/diagnose/SKILL.md) · [`ponytail`](../skills/engineering/ponytail/SKILL.md) on the fix diff |
| **Done** | `/ss-review` → `/ss-security-audit` → `/ss-submit-pr` | [`harness-critic.md`](./harness-critic.md) · [`harness-security-audit.md`](./harness-security-audit.md) | — |

**Enter Bug belt when:** reported defect, failing test, throw, or regression — not a new feature.

**Skip Story plan/implement:** no `/ss-plan`, `/ss-implement`, or `/ss-feature-evidence` unless the user asks.

**State:** `init-state.cjs --mode bug` · validate `validate-state.cjs --mode bug-fix`.

**Investigation:** tagged `[DEBUG-*]` logs at hypothesis boundaries; capture console snippets in **Investigation Evidence**; remove debug before review.

### Story (default daily path)

**Agent policy:** three fresh agents — see slash command [`/ss-flow`](../commands/ss-flow.md). Pass `.harness/state.md` (and evidence), not chat history.

| Phase | Command | Harness (read one) | Skills (only when applicable) |
|-------|---------|-------------------|-------------------------------|
| Branch | consumer wrapper | — | — |
| **Plan** (agent 1) | `/ss-plan` | [`harness-planner-tdd.md`](./harness-planner-tdd.md) | 1a: [`grill-me`](../skills/productivity/grill-me/SKILL.md) or [`grill-with-docs`](../skills/engineering/grill-with-docs/SKILL.md) · 1b: [`grill-tdd`](../skills/engineering/grill-tdd/SKILL.md) |
| Slice to issues | `/ss-to-issues` (optional; same plan agent) | — | [`to-issues`](../skills/engineering/to-issues/SKILL.md) — agent vs workplace voice |
| **Implement** (agent 2) | `/ss-implement` | [`harness-generator.md`](./harness-generator.md) | [`ponytail`](../skills/engineering/ponytail/SKILL.md) · [`tdd`](../skills/engineering/tdd/SKILL.md) when state has RED→GREEN Plan |
| Implement (AFK) | `/ss-loop` | [`harness-loop.md`](./harness-loop.md) | Same TDD skills; one fresh Paseo Cursor agent per Remaining cycle — [`docs/ss-loop.md`](../docs/ss-loop.md) |
| **Done** (agent 3) | `/ss-finish` | orchestrates leaves below | — |
| → Review (+ fix) | `/ss-review` (via finish) | [`harness-critic.md`](./harness-critic.md) | auto: [`critic-tdd-testing.md`](./critic-tdd-testing.md) when state has TDD contracts |
| → Security gate | `/ss-security-audit` | [`harness-security-audit.md`](./harness-security-audit.md) | optional: linked `wordpress-security-validation`; DB: `postgresql-security-best-practices`, `supabase-security`; FE: [fallow](https://github.com/fallow-rs/fallow) when installed |
| → Feature video | `/ss-feature-evidence` | — | [`feature-video-evidence`](../skills/engineering/feature-video-evidence/SKILL.md) — after audit PASS; clip + `.harness/feature-evidence.md`; skip if no UI / no browser E2E |
| → Human walkthrough (optional) | `/ss-handoff` | — | [`code-handoff`](../skills/engineering/code-handoff/SKILL.md) — `.harness/code-handoff.html`; before `/ss-submit-pr` |
| → PR | `/ss-submit-pr` | — | linked PR skills; watch head-branch CI and push fix commits; **stop for merge** |
| → Close (after merge) | `/ss-close-story` | — | linked Jira/close skills; harness reset |

**Legacy:** feature-first planning only → [`harness-planner.md`](./harness-planner.md) (skip grill-tdd).

### Inbound review (someone else's pull request)

| Phase | Command | Skill |
|-------|---------|-------|
| Peer review | `/ss-peer-review` | [`peer-review`](../skills/engineering/peer-review/SKILL.md) — reconstruct intent, read code around the diff, severity-ranked line comments, post only on human go |
| Rubric upkeep (occasional) | `/ss-review-patterns` | [`review-patterns`](../skills/engineering/review-patterns/SKILL.md) — mine merged-PR reviews into anonymous team principles for the peer-review rubric |

**Off the belts entirely** — no `.harness/state.md`, no PASS/FAIL, no branch of your own. `/ss-review` grades **your** generator output against a contract you wrote; `/ss-peer-review` reviews a colleague's change whose intent you must reconstruct. Never approves and never writes to the author's branch. Entry point with no argument: [`list-prs.cjs`](../tools/list-prs.cjs).

### Epic (one epic, many stories)

**Agent policy:** one Paseo orchestrator. Each story still uses the Story belt (fresh plan / implement / done). Pass **`.harness/epics/current.json`**, not chat history. Per-story contract stays that worktree’s `.harness/state.md`.

| Phase | Command | Notes |
|-------|---------|--------|
| Orchestrate | `/ss-epic-orchestrator` | One epic at a time. Max two non-overlapping implementers. One localhost preview before each `/ss-submit-pr`. |
| Story phases | `/ss-plan` → … → `/ss-close-story` | Unchanged. Do **not** run `/ss-loop` on the epic (AFK is one-story). |

**Enter Epic when:** the human named a tracker epic and wants Paseo to walk its stories. **Skip** and stay on Story when there is only one issue.

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

### Reference import (overlay — third-party builder → native output)

**Enter when:** rebuilding an external builder (Bricks, etc.) as native blocks/markup; REA or bundle evidence lives outside the product repo.

**Do not replace Story belt** — this is an extra lane discipline on top of Initiative + Story.

| Phase | Command / skill | Notes |
|-------|-----------------|-------|
| Orient + phase pick | [`/ss-reference-import-flow`](../commands/ss-reference-import-flow.md) | Skill: [`reference-import-flow`](../skills/engineering/reference-import-flow/SKILL.md) |
| Evidence (per slice) | REA / manual in **evidence checkout only** | Hints + deferred list; no mapper code in REA repo |
| Product implement | `/ss-plan` → `/ss-implement` → `/ss-finish` | TDD **inside** implement ([`tdd`](../skills/engineering/tdd/SKILL.md)); consumer addendum names worktree + URLs |

Consumer repos ship a thin addendum skill (Quick Builder: `qb-bricks-import-workflow`).

### Ship (enter after merge)

| Phase | Command | Skills |
|-------|---------|--------|
| Release / GTM | `/ss-release`, `/ss-release-distribution`, `/ss-release-marketing` | [`anti-slop`](../skills/productivity/anti-slop/SKILL.md) · [`release-distribution`](../skills/productivity/release-distribution/SKILL.md) · [`release-marketing`](../skills/productivity/release-marketing/SKILL.md) |
| Prod pulse (optional) | `/ss-prod-pulse` | [`production-pulse`](../skills/engineering/production-pulse/SKILL.md) — Sentry if connected; Findings / Things to note / Potential actions |

**Enter Ship when:** post-merge go-to-market. Does **not** block `/ss-submit-pr`.

**Human walkthrough order:** inside `/ss-finish` after review + security PASS → `/ss-feature-evidence` → `/ss-handoff` → human opens `.harness/code-handoff.html` → `/ss-submit-pr`. Handoff is optional and does **not** replace critic or security. Skip handoff when the human already understands the diff.

**Feature video:** `/ss-feature-evidence` runs **after audit PASS**. Playwright `@evidence` clip + `.harness/feature-evidence.md`. Skip when there is no UI or no browser E2E. Not Ship `@release` demos.

## Context budget rules

`/ss-flow` is **context-efficient** (fresh agents + artifact handoff), not always minimum total tokens — each phase re-reads harness + state. The win is dropping dead chat and keeping the durable contract on disk.

1. **Fresh agent per Story phase** — Plan / Implement / Done (`/ss-flow`). Do not carry plan grill into implement, or implement chat into critic.
2. **One harness file per command** — do not chain duplicate harnesses. `/ss-finish` loads critic first; PR/close skills only after PASS.
3. **Stack skills on demand** — read `jest-react-testing`, `bulletproof-react`, `wordpress-testing-qa`, `postgresql-security-best-practices`, `supabase-security`, etc. only when `AGENTS.md` / diff surface says that stack; not on every implement/review.
4. **No `testing-expert` in this loop** — encyclopedic reference; use `tdd` + stack skill instead.
5. **Locators** — [accessible-locator-priority.md](./accessible-locator-priority.md) when writing or reviewing **UI / end-to-end (E2E)** tests only.
6. **State is the contract** — after plan, `Behavior & Test Contracts` and `RED→GREEN Plan` in **`.harness/state.md`** replace re-reading `grill-tdd` at review. Hand off artifacts between agents, not threads.
7. **Prose & chat** — all `/ss-*` agent replies and written artifacts follow [`anti-slop`](../skills/productivity/anti-slop/SKILL.md): simple, concise, full sentences, no hype. Chat shape: problem → fix → next. Expand abbreviations on first use. Skip for pure code and mechanical evidence tables. Marketing packs still finish with a full anti-slop pass. This is **not** [`caveman`](../skills/productivity/caveman/SKILL.md) unless the user asked.

### Further savings

1. **Keep `.harness/state.md` tight** — contracts, Remaining, evidence tables, one Next Action. Cut narrative dumps, grill paste-ins, and full diff dumps; every later agent re-reads this file.
2. **Prefer `/ss-loop` on long Remaining lists** — interactive `/ss-implement` is fine for a few cycles; for many Remaining cycles, one fresh agent per cycle usually beats one long implement chat. See [`docs/ss-loop.md`](../docs/ss-loop.md).
3. **Scope Implement when blocked** — `only Cycle N` / `through Cycle N` / `stop after Cycle N` instead of burning later cycles while stuck.
4. **Prefer one `/ss-finish` over five leaf agents** — review → fix → security → handoff → PR in one Done session unless re-running a single gate.
5. **Skip optional work** — no `/ss-to-issues` unless slicing; no `/ss-handoff` when the human already knows the diff; no `/ss-feature-evidence` when there is no UI or no browser E2E; no Initiative / Ship when the story is already clear; call GitNexus tools when needed, do not load GitNexus skill docs every turn.
6. **Pointed tools over re-exploration** — prefer vendored `run-verification.cjs`, `tdd-audit.cjs`, `security-audit.cjs`, etc. over asking the model to re-walk the tree.
7. **Point at paths; do not paste large artifacts** — `.harness/state.md`, plan HTML, diffs. Pasting full docs into chat double-pays.
8. **Keep consumer `AGENTS.md` short** — branch, verification commands, which stack skills apply. Long always-on rules are re-read every agent.

11. **Phase models + fresh sessions** — when `storyPhaseModels` is in `skillsync.config.json`, each phase uses a **new agent** and the matching model ([`story-phase-models`](../skills/engineering/story-phase-models/SKILL.md), rule `ss-story-model-routing.mdc`). Done tail = separate review (Grok) and fix (Composer) chats, not one `/ss-finish` thread.

9. **Re-run leaves, not the whole spine** — failed security → `/ss-security-audit` only; do not re-plan or re-implement from scratch.

## TDD loop (implement)

One **`/ss-implement`** session walks **all Remaining** RED→GREEN cycles (or sprint slices) **in order** — each cycle still vertical (RED→GREEN→re-break before the next). Details: `harness-generator.md` + `tdd/SKILL.md`. Override with `only Cycle N` / `through Cycle N` when needed.

**AFK alternative:** **`/ss-loop`** (`ss-loop.cjs`) spawns a **fresh Paseo Cursor agent per Remaining cycle** using `harness-loop.md`. Same evidence rules; hand off to `/ss-review` when Remaining is empty. Setup: [`docs/ss-loop.md`](../docs/ss-loop.md).

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
| Arch / UX / Security / wayfinder / handoff | `init-plan-html.cjs` (MD + HTML); `render-plan-html.cjs` (MD→HTML); `watch-plan-html.cjs` (optional IDE watch); `validate-plan-html.cjs --kind arch\|ux\|security\|wayfinder\|app-map\|handoff` |
| Initiative pack (`/ss-roadmap`) | `init-feature-pack.cjs --slug … --lenses …`, `validate-feature-pack.cjs --slug …` |
| Grand plan / mind map | `render-app-map.cjs` (deterministic; do not freehand mind-map JSON) |
| Plan (post-write) | `validate-state.cjs --mode plan` |
| New story | `init-state.cjs --task "KEY title"` |
| Bug fix state | `init-state.cjs --mode bug --task "KEY title"` |
| Bug fix validate | `validate-state.cjs --mode bug-fix` |
| Implement / review | `run-verification.cjs`, `tdd-audit.cjs`, `re-break.cjs` |
| AFK implement | `ss-loop.cjs` (Paseo + Cursor; see [`docs/ss-loop.md`](../docs/ss-loop.md)) |
| Security (PR gate) | `security-audit.cjs` (`--write-state`, `--set-phase-b`, `--check-state`) |
| Security (whole plugin) | `security-assess.cjs` (`--write-state` → `#assess` / `security-assess.json`) |
| Submit PR | `render-pr-body.cjs`, `open-pr.cjs` (requires Security Evidence PASS) |
| Human walkthrough | `init-plan-html.cjs --kind handoff` → edit `.md` → `render-plan-html.cjs --kind handoff --validate` |
| To issues (post-approve) | `publish-slices-from-state.cjs` |
| Close story | `harness-reset.cjs`, optional `jira-close.cjs` |
| Release / GTM | `init-release-brief.cjs`, `validate-release-brief.cjs`, `validate-release-pack.cjs` |

Planner for this tooling backlog: [`harness-planner-ss-scripts.md`](./harness-planner-ss-scripts.md).

## Further reading (not loaded by default)

- [`testing-expert`](../skills/engineering/testing-expert/SKILL.md) — optional deep reference
- [Playwright walkthrough](https://denmercs.com/playwright-e2e-testing-and-agent-verification) — example of accessible-locator philosophy
