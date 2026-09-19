---
name: feature-video-evidence
description: >
  Records a paced Playwright (or the consumer’s existing browser end-to-end)
  journey of one feature with video on, then writes a human watch card and the
  clip path. Use when the user wants video evidence a feature works, a human
  check of the running UI, /ss-feature-evidence, feature-video-evidence, or a
  Playwright walkthrough recording for assessment. Not launch reels
  (/ss-release-distribution) or code walkthroughs (/ss-handoff).
---

# Feature video evidence

Produce a **watchable clip** of one feature so a human can judge it — not a CI dump, not a launch reel.

**Does:** Drive the consumer’s existing browser end-to-end (E2E) runner (Playwright first), keep video on success, copy the clip, write a watch checklist.  
**Does not:** Replace `/ss-review`, `/ss-security-audit`, unit/TDD spines, or Ship demo tags (`@release` / `@demo`).

Invoke via **`/ss-feature-evidence`**. Order: after `/ss-security-audit` PASS, **before** `/ss-handoff` and `/ss-submit-pr`, when the change has a user-visible surface.

## When to use / skip

| Use this | Skip / use something else |
|----------|---------------------------|
| Human needs to see the feature run | Backend-only / no UI → stay on tests + `/ss-handoff` |
| One story / one journey | Launch reel / What’s new → [`release-distribution`](../../productivity/release-distribution/SKILL.md) |
| Playwright (or Cypress) already in the repo | No browser E2E → stop; say what is missing. Do not invent a second framework |

## Workflow

1. **Name the feature** — from the user, or `.harness/state.md` Behavior & Test Contracts (one journey).
2. **Find the runner** — `playwright.config.*`, `e2e/`, `tests/e2e/`, or `AGENTS.md` scripts (`e2e`, `test:e2e`). Cypress only if that is what the repo already runs.
3. **Spec** — follow [RECORDING.md](RECORDING.md). Prefer tagging an existing spine `@evidence`. Else add one thin evidence spec. Locators: [accessible-locator-priority.md](../../../harness/accessible-locator-priority.md).
4. **Run** — workers 1; video on in the evidence spec (`test.use({ video: 'on' })`). App URL from consumer docs / env — do not guess production.
5. **Collect** — copy the newest clip into `.harness/evidence/`:

   ```bash
   node .cursor/skills/feature-video-evidence/scripts/collect-video.cjs . --slug <kebab-feature>
   ```

   Vendored fallback: `skills/engineering/feature-video-evidence/scripts/collect-video.cjs`.
6. **Card** — write `.harness/feature-evidence.md` from [CARD.md](CARD.md). Pointer only in `.harness/state.md` (path + spine PASS/FAIL + Human: pending).
7. **Tell the human** — card path + video path. They watch and tick **Human verdict**. Do not mark the human box yourself.

**Spine FAIL:** still collect the clip if one exists (failure is evidence). Fix the product or the journey; do not weaken assertions to force a pretty video.

## Output

| Path | Role |
|------|------|
| `.harness/feature-evidence.md` | Watch card (source of truth for the human) |
| `.harness/evidence/<slug>.webm` (or `.mp4`) | Clip — keep out of git |
| `.harness/state.md` → `## Feature video evidence` | One-line pointer |

Harness reset deletes the card and `.harness/evidence/`.

## Related

| Command / skill | Relationship |
|-----------------|--------------|
| `/ss-security-audit` | Runs first — this skill starts only after audit PASS |
| `/ss-handoff` | Code walkthrough after the clip — complementary; this is the running UI |
| `/ss-release-distribution` | Ship / marketing clips (`@release`) — not story assessment |
| `/ss-review` | Critic PASS/FAIL — still required; video does not replace it |
