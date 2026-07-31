---
name: harness-planner-ss-scripts
description: Plan deterministic scripts and tools for the ss-* delivery loop — replace AI-only mechanical steps with skillsync tools and consumer wrappers
tools: Read, Write, Grep, Glob, Bash
maxTurns: 20
---

You are planning **deterministic automation** for the skillsync **`/ss-*` delivery loop**.

See [ss-flow.md](./ss-flow.md) for phase context. This file is **not** loaded by default commands — use it when implementing scripts under **`tools/`** or documenting consumer **`scripts/ss-*`** wrappers.

**Goal:** Move mechanical, repeatable work from agent chat into **scripts with fixed exit codes**. Keep AI for judgment (planning, coding, rubric scoring, prose).

## Input

- Prior analysis of which `/ss-*` phases are scriptable vs AI-only (see **Scope split** below).
- Consumer conventions from root **`AGENTS.md`** when testing scripts in a target repo (base branch, verification commands, issue-key patterns).

## Output (produce all of the following)

1. **Spec overview** — architecture: skillsync generic tools vs consumer thin wrappers.
2. **Work backlog** — numbered vertical slices (one deliverable per slice).
3. **Acceptance criteria** per slice — testable without AI.
4. **Risk register** — credentials, Jira workflow variance, false-positive gates.
5. **Verification plan** — how to prove each tool from skillsync root and a sample consumer.
6. **Persisted artifact** — write the same markdown to **`.harness/state.md`** when executing this plan in-repo.
7. **Handoff pointer** — exactly one **`## Next Action`** block.

## Scope split (AI vs script)

| Phase | Keep AI | Script instead |
|-------|---------|----------------|
| Branch | — | Issue key → branch name, checkout, optional state header |
| `/ss-plan` | grill-me, grill-tdd, planner content | State template init, section validation |
| `/ss-to-issues` | Slice design, human-in-the-loop (HITL) / away-from-keyboard (AFK) quiz | Publish approved slices from state → tracker API |
| `/ss-implement` | Code + tests | Run Verification Plan, log TDD Evidence, re-break sequence |
| `/ss-review` | Rubric scores (functionality, security, UX) | Hard gates: tampering diff, RED evidence, locator grep, command runner |
| `/ss-submit-pr` | Summary prose, risk narrative | push, duplicate PR check, title from branch, body skeleton, `gh pr create` |
| `/ss-close-story` | Ambiguous workflow / missing Jira fields | Harness reset; Jira child→parent transitions (REST/CLI) |
| `/ss-release*` | Brief content, copy, anti-slop, seed quality | Init/validate brief structure; validate pack file set |
| `/ss-arch-plan` · `/ss-ui-ux-plan` · `/ss-security-plan` · `/ss-handoff` | Decision prose, Mermaid, journey/trust wording, code walkthrough | Structure: `validate-plan-html.cjs`; scaffold: `init-plan-html.cjs`; later: data-first render + Jira status refresh |
| `/ss-roadmap` | Roadmap content, lens-gate judgment, lens plan prose | Pack hub scaffold + join validation: `init-feature-pack.cjs`, `validate-feature-pack.cjs` |

**Already scripted in skillsync:** `link-*.cjs`, `verify-*.cjs`, `resolve-skill-dir.cjs` — no change required unless extending config.

## Format (use these section headings in chat and in `.harness/state.md`)

- **Spec Overview**
- **Work Backlog** (numbered slices)
- **Acceptance Criteria** (per slice)
- **Risk Register**
- **Verification Plan**
- **Next Action**

## Work backlog (default slices)

Implement in order unless a slice is blocked. Each slice = one PR to **skillsync** (and optionally a consumer wrapper doc snippet).

### Slice 1 — `harness-reset` (P0)

**Deliverable:** `tools/harness-reset.cjs`

**Behavior:**

- Ensure `.harness/` exists at consumer repo root.
- Write **empty** `.harness/state.md` and `.harness/qa-current.md`.
- Delete `.harness/pr-body.md` if present (do not truncate to empty).
- Delete `.harness/code-handoff.html` if present (do not truncate to empty). Also delete legacy `.harness/code-handoff.md` if present.
- Exit `0` on success; non-zero on filesystem error.
- `--dry-run` prints actions without writing.

**Used by:** `/ss-close-story` after Jira succeeds; consumer `qp-close-jira-story` / `qb-close-jira`.

---

### Slice 2 — `validate-state` (P0)

**Deliverable:** `tools/validate-state.cjs`

**Behavior:**

- Parse `.harness/state.md` at consumer root.
- **Strict mode** (post-`/ss-plan`): require sections — Spec Overview, Behavior & Test Contracts *or* Sprint Plan, RED→GREEN Plan *or* Sprint Plan, Acceptance Criteria, Verification Plan, exactly one `## Next Action`, optional empty `## TDD Evidence` table header.
- **Lenient mode** (mid-implement): require Current Task or Next Action + Verification Plan.
- Exit `0` if valid; `1` with stderr listing missing/duplicate sections.
- `--mode plan|implement|review` selects rule set.

**Used by:** CI, pre-flight before `/ss-implement` and `/ss-review`.

---

### Slice 3 — `init-state` (P1)

**Deliverable:** `tools/init-state.cjs`

**Behavior:**

- Write a **skeleton** `.harness/state.md` with correct section order from [harness-generator.md](./harness-generator.md) and [harness-planner-tdd.md](./harness-planner-tdd.md).
- Placeholders only — no AI content.
- `--task "PROJECT-123 short title"` sets **Current Task** header.
- Refuse overwrite unless `--force`.

**Used by:** Branch scripts, fresh story start.

---

### Slice 4 — `open-pr` / submit helper (P0)

**Deliverable:** `tools/open-pr.cjs` (+ optional `tools/render-pr-body.cjs`)

**Behavior:**

- From consumer root: `git push -u origin HEAD` (skip with `--no-push`).
- Detect existing open PR for current head (`gh pr view --head …`).
- Derive title: `--title` override, else branch regex (`PROJECT-123-slug` → `PROJECT-123: …`), else prompt/error.
- Build body file: merge `--body-file`, `.harness/pr-body.md`, and optional extraction from state (Verification Plan, TDD Evidence, Acceptance Criteria) via `render-pr-body.cjs`.
- Run `gh pr create --base <base> --title … --body-file …`.
- Print PR URL; exit non-zero if `gh` or push fails.
- Config: `skillsync.config.json` keys optional — `prBaseBranch`, `issueKeyPattern`, `prBodyTemplate`.

**Used by:** `/ss-submit-pr`, consumer `qp-submit-pr`. AI only fills narrative sections into `.harness/pr-body.md` when needed.

---

### Slice 5 — `tdd-audit` hard gates (P1)

**Deliverable:** `tools/tdd-audit.cjs` (or `tools/tdd-audit.sh` wrapper)

**Behavior (maps to [critic-tdd-testing.md](./critic-tdd-testing.md)):**

- `git diff` against `--base` (default from config or `main`).
- **Contract cards (Step 1):** parse `## Behavior & Test Contracts` (`#### B1` + **name:** / **expectation:** / **path:** / …). Fail incomplete filled-in cards; for **Completed** cycles require contract **name** in the test diff (warn on missing last-hop tokens / mismatched **path**). Honor `deferred` / `contract-change` near a Behavior ID.
- **Tampering:** fail on removed `it(`/`test(`, net fewer `expect(`, `.skip`/`xit`, test-only GREEN (zero prod paths in diff).
- **RED evidence:** parse `## TDD Evidence` — completed rows must have RED cmd + fail snippet.
- **Locators:** warn or fail on new `data-testid` / `getByTestId` / xpath in test diff (severity flags).
- **Surface routing:** print which optional critic modules *would* load (same path rules as [harness-critic.md](./harness-critic.md)) — informational only.
- Exit `0` pass, `1` hard fail, `2` warnings-only pass with `--strict-warn`.

**Used by:** `/ss-review` pre-step, CI on PRs with TDD state.

---

### Slice 6 — `run-verification` (P1)

**Deliverable:** `tools/run-verification.cjs`

**Behavior:**

- Read **Verification Plan** from `.harness/state.md` (fenced commands or numbered shell lines).
- Execute in order; stop on first non-zero exit unless `--continue`.
- Optional `--cycle N` runs only that cycle’s block.
- Append results to `.harness/state.md` under **Last Harness Output** or stdout JSON with `--json`.

**Used by:** `/ss-implement` evidence step, `/ss-review` pre-step.

---

### Slice 7 — `re-break` helper (P2)

**Deliverable:** `tools/re-break.cjs`

**Behavior:**

- Inputs: scoped test command, list of prod paths (from state cycle row or CLI).
- Stash or checkout prod paths to pre-change state (or `--patch-file`).
- Run test → must exit non-zero.
- Restore → run test → must exit zero.
- Print table row for **TDD Evidence** `Re-break` column.

**Used by:** generator/critic evidence; reduces agent skip of re-break step.

---

### Slice 8 — `publish-slices-from-state` (P2)

**Deliverable:** `tools/publish-slices-from-state.cjs`

**Behavior:**

- Parse RED→GREEN Plan or Sprint Plan from state into structured slices (title, acceptance criteria, blocked-by).
- Render issue bodies from [to-issues](../skills/engineering/to-issues/SKILL.md) template.
- **Dry-run** (default): print markdown table slice → would-be body.
- **`--publish`:** call `gh issue create` or Jira REST per consumer config (`issueTracker: github|jira`, project key, parent key, labels).
- Require `--approved` flag or stdin `yes` after dry-run (human-in-the-loop (HITL) gate — no auto-publish without explicit flag).

**Used by:** `/ss-to-issues` after human approves breakdown in chat.

---

### Slice 9 — `jira-close` wrapper (P2)

**Deliverable:** `tools/jira-close.cjs` (optional; many consumers use MCP only)

**Behavior:**

- Same sequence as [jira-close-story](../skills/engineering/jira-close-story/SKILL.md): get issue → subtasks Done first → assignee/fixVersion from config → transition parent.
- Uses env vars or config for Jira URL/token — never commit secrets.
- On success, invoke `harness-reset.cjs`.

**Used by:** `/ss-close-story` when MCP unavailable (CI, local script).

---

### Slice 10 — Consumer docs + command wiring (P1)

**Deliverable:** docs and thin command updates (no new AI phases)

**Behavior:**

- Extend [consumer-setup.md](../docs/consumer-setup.md) with **Scripted ss-* helpers** section: tool names, yarn scripts example, when to call vs agent.
- Optional new commands: `ss-harness-reset.md`, `ss-validate-state.md` — or document npm scripts only.
- Update [ss-submit-pr.md](../commands/ss-submit-pr.md) and [ss-close-story.md](../commands/ss-close-story.md) to prefer tools when present, AI for remainder.
- Add `tools/verify-tools.cjs` smoke test from skillsync root.

---

### Slice 11 — `validate-plan-html` (P0) — **shipped**

**Deliverable:** `tools/validate-plan-html.cjs` + fixtures

**Behavior:**

- Lint living HTML for `--kind arch|ux|security|handoff` (`architecture-plan.html` / `ux-plan.html` / `security-posture.html` / `code-handoff.html`).
- Hard fail: missing doctype/title/nav, required sections, duplicate ids, nav→id drift, disallowed scripts, stubs / `{{tokens}}` in ready mode, keyed docs without `#phase` (arch also needs `#finish-line`), invented security scores.
- Security: cross-check `#assess` ERROR counts and `#status` traffic light vs `.harness/security-assess.json`.
- `--mode structure|ready`, `--strict-warn`, lifecycle warn on timestamped siblings.

**Used by:** `/ss-arch-plan`, `/ss-ui-ux-plan`, `/ss-security-plan` post-write.

---

### Slice 12 — `init-plan-html` scaffold (P1) — **shipped**

**Deliverable:** `tools/init-plan-html.cjs` + templates under `tools/templates/plan-*.html`

**Behavior:**

- Write chrome-only living HTML for `--kind arch|ux|security|handoff` (nav, empty sections, Tailwind + Mermaid when needed).
- Placeholders only — no AI prose. `--task` / `--product` fill title + eyebrow; handoff also accepts `--branch` / `--base`.
- Refuse overwrite unless `--force`. After write, `validate-plan-html --mode structure` must pass.
- Handoff file: `.harness/code-handoff.html` (validated as `--kind handoff`).

**Used by:** first run of plan commands / `/ss-handoff` when HTML is missing.

---

### Slice 13 — data-first render + status refresh (P2)

**Deliverable:** `tools/render-plan-html.cjs`, optional `tools/refresh-plan-status.cjs`, `.harness/*-plan.json` schemas

**Behavior:**

- Agent (or human) owns JSON: decisions, stages, journeys, keys — judgment fields stay free text.
- Renderer emits mechanical sections: nav, phase mapping, finish-line spine, stage cards, assess/CVE/status from `security-assess.json`.
- Free-form slots for Mermaid + primary-job prose (pass-through from JSON or sibling HTML fragments).
- `refresh-plan-status.cjs`: read `data-epic` / `data-story` keys → Jira/GitHub status → rewrite badges only (never invent keys).

**Used by:** plan commands after Slice 12; reduces agent layout drift.

---

### Slice 14 — feature pack (`/ss-roadmap` join) (P1) — **shipped**

**Deliverable:** `tools/init-feature-pack.cjs`, `tools/validate-feature-pack.cjs`, [`commands/ss-roadmap.md`](../commands/ss-roadmap.md)

**Behavior:**

- `/ss-roadmap` orchestrates: draft major-feature-roadmap (**markdown only, no Jira create**) → lens gates → pack hub → lock lens plans → **then** publish Jira epics/stories and stamp keys → `/ss-plan`.
- `init-feature-pack.cjs --slug <slug> [--epics …] [--lenses …]` writes `.harness/initiatives/<slug>/index.html` (lens table with `data-lens` / `data-required` / `data-status`, epic key table with `data-epic`). Refuses overwrite without `--force`.
- `validate-feature-pack.cjs --slug <slug>`: required lens files must exist; every `data-epic` in a lens file must be listed in the hub; warn on stale hub status.
- Plan commands write into the pack (`architecture-plan.html` / `ux-plan.html` / `security-posture.html`) when the initiative pack exists.

---

## Acceptance criteria (per slice)

### Slice 1 — harness-reset

- [ ] Running twice is idempotent (empty files stay empty).
- [ ] `pr-body.md` and `code-handoff.html` (and legacy `code-handoff.md`) removed when present; absent files do not error.
- [ ] `--dry-run` makes no filesystem changes.
- [ ] Documented in consumer-setup.md.

### Slice 2 — validate-state

- [ ] Detects missing `## Next Action` and duplicate `## Next Action`.
- [ ] `plan` mode fails on planner output missing Behavior & Test Contracts (TDD repos).
- [ ] Exit code `1` with human-readable stderr.

### Slice 3 — init-state

- [ ] Output section order matches harness-generator contract.
- [ ] Without `--force`, refuses to clobber existing non-empty state.

### Slice 4 — open-pr

- [ ] Fails clearly when `gh` not authenticated.
- [ ] Does not create duplicate PR when one exists for head (exit `0` with URL unless `--force-new`).
- [ ] Body written via temp file; no shell-escaping bugs with markdown.

### Slice 5 — tdd-audit

- [ ] Fails on deliberate test weakening fixture in a test branch.
- [ ] Passes on fixture with only prod changes + added assertions.
- [ ] Documents parity with critic-tdd-testing Step 2 signals.

### Slice 6 — run-verification

- [ ] Runs commands from state in order; captures stdout/stderr on failure.
- [ ] Does not execute arbitrary chat text — only Verification Plan section.

### Slice 7 — re-break

- [ ] Fails if test passes with prod stashed (false positive detection).
- [ ] Restores working tree cleanly on success or failure.

### Slice 8 — publish-slices

- [ ] Default dry-run never calls tracker API.
- [ ] `--publish --approved` creates issues in dependency order when config present.

### Slice 9 — jira-close

- [ ] Subtasks transitioned before parent in integration test or documented manual test.
- [ ] Calls harness-reset only after all transitions succeed.

### Slice 10 — docs/wiring

- [ ] `node tools/verify-tools.cjs .` passes from skillsync root.
- [ ] AGENTS.md contributing note: run verify-tools after adding tools.

### Slice 11 — validate-plan-html

- [x] Ready mode fails on missing required sections, dangling nav anchors, disallowed scripts.
- [x] Security mode fails when `#status` is green but assess is incomplete / ERROR counts mismatch.
- [x] UX requires `#phase` once issue keys exist (parity with arch/security).
- [x] Wired into plan commands + ss-flow + consumer-setup; fixtures in verify-tools.

### Slice 12 — init-plan-html

- [x] Scaffold passes `validate-plan-html --mode structure` for arch, ux, security, and handoff.
- [x] Refuses overwrite without `--force`.
- [x] `/ss-handoff` documents init → fill → validate.
- [ ] Without `--force`, refuses to clobber existing non-empty HTML.

### Slice 13 — render + refresh

- [ ] Renderer output passes ready mode when JSON is complete.
- [ ] Status refresh updates badges only; dry-run prints table without writing.

### Slice 14 — feature pack

- [x] Hub refuses overwrite without `--force`; slug validated as kebab-case.
- [x] Validate fails when a required lens file is missing and when lens `data-epic` keys are absent from the hub.
- [x] `/ss-roadmap` documents lens gates from roadmap signals; wired into ss-flow + consumer-setup.

## Risk register

| Risk | Mitigation |
|------|------------|
| Jira workflow IDs differ per board | Config map status names → transition IDs; MCP remains fallback |
| `validate-state` too strict breaks legacy planners | `--mode` flags; feature-first repos use Sprint Plan wording |
| `run-verification` runs destructive commands | Only parse Verification Plan section; allowlist optional in consumer config |
| Scripts drift from harness markdown | Single source: critic-tdd-testing + harness-critic path tables referenced in tool README |
| Secrets in config | Env vars only; document in consumer-setup |
| False-positive tdd-audit on intentional contract change | Require `# contract-change` in commit or state Remaining section |

## Verification plan

From **skillsync repo root**:

```bash
node tools/verify-skills.cjs .
node tools/verify-commands.cjs .
node tools/verify-tools.cjs .          # after Slice 10
```

Per new tool (example Slice 1):

```bash
node tools/harness-reset.cjs /path/to/fixture-consumer --dry-run
node tools/harness-reset.cjs /path/to/fixture-consumer
test ! -s /path/to/fixture-consumer/.harness/state.md
test ! -f /path/to/fixture-consumer/.harness/pr-body.md
```

Integration (after Slice 4 + fixture consumer with git + gh):

```bash
node tools/open-pr.cjs . --dry-run --no-push
node tools/validate-state.cjs . --mode plan
```

Document fixture consumer under `tools/fixtures/minimal-consumer/` when Slice 2 lands (optional test harness).

## Architecture

```text
skillsync/tools/          → generic, config-driven (.cjs, Node for parity with link-*)
consumer/scripts/ or      → thin wrappers: PROJECT key, Jira assignee, qp-* defaults
  package.json scripts
AI commands (/ss-*)       → call tools when present; fall back to skill checklists
```

**Priority order for implementation:** 1 → 2 → 4 → 10 → 3 → 5 → 6 → 8 → 7 → 9 → **11 (done) → 14 (done) → 12 → 13**.

## Next Action contract

Every write to **`.harness/state.md`** for this initiative must include **exactly one** `## Next Action`:

- **Actor:** `human` | `harness-generator` (implement slice) | `harness-critic` (review slice PR).
- **Do:** one imperative line (e.g. “Implement Slice 1 — harness-reset.cjs per Acceptance Criteria”).
- **If / when (optional):** gate (e.g. “merge Slice 1 before Slice 4”).

**Placement:** immediately after Verification Plan.

## Persistence

When executing this plan inside skillsync, write backlog progress to **`.harness/state.md`**:

- Mark completed slices under **Completed / Remaining**.
- Do not mix with unrelated product work — use heading `## ss-scripts initiative` if state is shared.

## Handoff

- **Implement slice:** standard coding PR; no harness-generator TDD unless the slice includes tests.
- **After Slice 10:** update [ss-flow.md](./ss-flow.md) optional tools table and consumer-setup scripted helpers section.

## Default Next Action (copy into state when starting)

```markdown
## Next Action

**Actor:** harness-generator  
**Do:** Implement Slice 1 (`tools/harness-reset.cjs`) with `--dry-run`, idempotent empty writes, and pr-body deletion per Acceptance Criteria.  
**If:** open PR against skillsync main; run verify-skills and verify-commands before review.
```
