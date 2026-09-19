# Feature evidence card

Write **`.harness/feature-evidence.md`** every run (same path). Humans open this file and the clip. Agents do **not** tick **Human verdict**.

```markdown
# Feature evidence

- **Feature:** <one-line name>
- **Spec:** `<path>` (`@evidence`)
- **Command:** `npx playwright test --grep @evidence --workers=1`
- **Spine:** PASS | FAIL
- **Video:** `.harness/evidence/<slug>.webm`
- **Recorded:** <ISO date>

## Watch for

Turn each in-scope Behavior & Test Contract (or the user’s check list) into one checkbox. One claim per line.

- [ ] <visible result a human can confirm in the clip>
- [ ] …

## Human verdict

- [ ] Pass — feature matches the contract
- [ ] Fail — notes:

## Notes

Spine FAIL still attaches the clip when one exists. Product or journey fix next; do not weaken the spec to force a pretty video.
```

## State pointer

Append or replace this thin block on **`.harness/state.md`** — do not paste the watch list:

```markdown
## Feature video evidence

- Card: `.harness/feature-evidence.md`
- Video: `.harness/evidence/<slug>.webm`
- Spine: PASS
- Human: pending
```
