---
name: code-handoff
description: >
  Write a human-facing walkthrough of branch code changes from .harness/state.md
  and git diff — intent vs decisions, Mermaid maps, short cited snippets, and a
  verify checklist. Use for /ss-handoff, human review before /ss-submit-pr, or
  when the user needs to understand what changed without replaying the agent
  thread. Not agent-to-agent handoff, journal handoff, critic PASS/FAIL, or
  opening a PR.
---

# Code handoff (human walkthrough)

**Phase: human understanding** — produce a durable brief so a person can review the change set without the implement/review chat.

**Does:** Explain *what changed and why* using **`.harness/state.md`** + **`git diff`**.  
**Does not:** Replace `/ss-review`, `/ss-security-audit`, open a PR, merge, or close Jira.  
**Not the same as:** [`handoff`](../../productivity/handoff/SKILL.md) (agent→agent session dump) or [`journal-handoff`](../../personal/journal-handoff/SKILL.md) (Obsidian weekly).

Invoke via **`/ss-handoff`**. Typical order: after `/ss-review` PASS (and ideally `/ss-security-audit`), **before** `/ss-submit-pr`.

## Principles

- **State is the contract** — ground the story in Behavior & Test Contracts, RED→GREEN / TDD Evidence, locked decisions, and Security Evidence when present. Do not invent architecture that is not in state or the diff.
- **Diff is the evidence** — every claim about behavior should point at a path or a short snippet from the change set.
- **Human first** — write for a reviewer who was not in the session. Prefer scannable sections over a transcript.
- **Offload context** — the brief must stand alone in a fresh chat (open the file + PR/diff; do not require replaying implement history).
- **Prose** — apply [`anti-slop`](../../productivity/anti-slop/SKILL.md): expand abbreviations on first use; no hype; cite paths instead of restating whole files.

## Inputs

1. **`.harness/state.md`** — task title, decisions, contracts, verification plan, critic/security verdicts when present.
2. **Base…HEAD diff** — default base from consumer `skillsync.config.json` → `prBaseBranch`, else repo default (`main` / `master`). Ask if unclear.
3. **Optional:** living HTML under `.harness/` (architecture / UX / security posture) — link and quote decision ids; do not dump the whole HTML.

If `state.md` is missing or empty, still write a diff-based walkthrough and note that harness context was absent.

## Steps (agent)

1. Read **`.harness/state.md`** (full file if present).
2. Resolve base branch; collect:
   - `git log --oneline <base>..HEAD`
   - `git diff --stat <base>...HEAD`
   - `git diff --name-only <base>...HEAD`
   - Targeted `git diff <base>...HEAD -- <path>` for hotspots (not the entire dump in the brief).
3. Rewrite **`.harness/code-handoff.md`** (same path every time — overwrite). Follow the outline below.
4. Print the path and a 3–5 line “how to read this” for the human. Suggest next: human verify checklist → `/ss-submit-pr` (or `/ss-security-audit` if not done).

In **Ask** mode: print the outline and commands; do not write the file unless the human asks.

## Output: `.harness/code-handoff.md`

Use this structure (omit a section only when truly N/A; say why in one line):

```markdown
# Code handoff — <issue key or short title>

**Branch:** … · **Base:** … · **Generated:** <ISO date>

## Intent
One short paragraph: what this slice was supposed to do (from state / commits).

## Decisions used
Bullet list mapped to state (and ADR / arch-plan ids when referenced). If none locked: say so.

## Change map
Mermaid (flowchart or sequence) when modules/data flow help; otherwise a tight bullet map of areas touched. Keep diagrams small.

## Hotspots
For each important change (usually 2–6):
- **Path** — one-line why it matters
- Short fenced snippet (prefer ≤20 lines) or “see `path` lines …” — enough to orient, not a paste of the whole file

## Tests and evidence
Pointer table from state: Behavior / contract → test path or TDD Evidence row. Note Verification Plan commands.

## What to verify (human)
Checklist of concrete checks (UI path, CLI, edge case) — not “looks good.” Prefer commands and acceptance from state.

## Out of scope / follow-ups
Only items already parked in state or clearly not in the diff. No new roadmap inventing.
```

### Mermaid

Use when it clarifies structure (module edges, request flow, before→after state). Skip decorative diagrams. Prefer `flowchart` / `sequenceDiagram`. Keep node labels short.

### Snippets

- Prefer **added/changed** lines that embody the decision.
- Never paste secrets, tokens, or full env files.
- Prefer path + line range references when the file is large.

## Finish line

- [ ] `.harness/code-handoff.md` rewritten and openable without chat history
- [ ] Intent and decisions tied to `state.md` (or explicit “no state”)
- [ ] Hotspots cite real paths from the diff
- [ ] Human verify checklist is actionable
- [ ] Next step named: usually `/ss-submit-pr` (after security PASS) — not merge/close

## Related

| Command / skill | Relationship |
|-----------------|--------------|
| `/ss-review` | Critic PASS/FAIL — run before handoff when following ss-flow |
| `/ss-security-audit` | PR security gate — ideally PASS before handoff or before submit |
| `/ss-submit-pr` | Open PR; may reuse Intent / What to verify when drafting `.harness/pr-body.md` |
| `/ss-close-story` | Deletes this artifact via harness reset after Jira Done |
| `productivity/handoff` | Agent session dump — different audience |
| `journal-handoff` | Weekly journal — different audience |
