# Review handoff evidence card

Write **`.harness/review-handoff-evidence.md`** after every critic **PASS** (same path every run). Humans tick **Accept**; agents do **not** tick human boxes.

```markdown
# Review handoff evidence

- **Critic:** PASS (see `.harness/state.md` → Last Critic Verdict)
- **Walkthrough:** `.harness/code-handoff.html`
- **Recorded:** <ISO date>

## Human checks

- [ ] Read **Last Critic Verdict** in `.harness/state.md`
- [ ] Opened **code-handoff.html** and spot-checked hotspots / verify checklist

## Human verdict

- [ ] Accept — continue to `/ss-security-audit`
- [ ] Block — notes:

## Notes

If the human explicitly waives walkthrough (backend-only, already reviewed live), record waiver in **state** only — see SKILL.md.
```

## State pointer

Append or replace this block on **`.harness/state.md`**:

```markdown
## Review handoff evidence

- Card: `.harness/review-handoff-evidence.md`
- Walkthrough: `.harness/code-handoff.html`
- Human: pending
```

When waived (human said skip):

```markdown
## Review handoff evidence

- Human: waived — <one-line reason>
```
