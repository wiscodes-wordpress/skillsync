# Demo E2E for release proof

Capture **watchable** journeys for launch — not a full CI suite replay.

## Tags

Prefer Playwright (or equivalent) tags:

- `@release` — included in the release reel set
- `@demo` — alias / subset for marketing demos

Example:

```ts
test.describe('Release demo: filters @release @demo', () => {
  // …
});
```

If the consumer already uses different tags, document them on the brief and use those.

## Config for recording

When running the demo set:

- **Video:** on (retain on success for demo tags)
- **Screenshot:** on key steps (hero UI after each feature beat)
- **Trace:** optional; prefer video for marketing
- **Workers:** 1 (stable pacing, less flake on demos)
- **Slow motion / delays:** small intentional pauses so UI settles for the viewer — do not spam `waitForTimeout` in CI spines; keep pauses in `@demo` specs only

Point at the consumer’s existing E2E tree (`e2e/`, `tests/e2e/`, Playwright config). Do not invent a second framework.

## Journey design

- One tagged spec (or describe) per **brief feature bullet** when possible
- **Spine assertions only** — landed on the right screen, primary control worked, result visible
- Do **not** re-assert every validation branch already covered in unit tests
- Locators: role / label / text first — see [`accessible-locator-priority.md`](../../../harness/accessible-locator-priority.md)

## Pacing for humans

| Do | Don’t |
|----|--------|
| Open → act → show result | Race through clicks with no settle |
| Stable viewport (document in brief, e.g. 1280×720) | Random window sizes per clip |
| Same persona/login for the reel | Switch accounts mid-feature without reason |

## Output artifacts

After the run, collect from Playwright’s output dir (or consumer equivalent):

- Video files per test
- Screenshots you explicitly captured

Index them on the Release Brief **Proof assets** table with **suggested stitch order** matching the brief’s feature list.

## Suggested run shape

Document the exact command the consumer uses, for example:

```bash
npx playwright test --grep @release
# or
yarn e2e:release
```

If no demo script exists, propose a `e2e:release` script that greps `@release` with video enabled — do not invent product-specific paths beyond what the repo already uses.

## Stitch (manual, v1)

List clips in order on the brief. Consumer edits in CapCut (or similar). Skillsync does **not** ship FFmpeg stitch scripts in v1.
