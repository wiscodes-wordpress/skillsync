---
name: code-handoff
description: >
  Write a human-facing HTML walkthrough of branch code changes from
  .harness/state.md and git diff — intent vs decisions, Mermaid maps, short
  cited snippets, and a verify checklist in the browser. Use for /ss-handoff,
  human review before /ss-submit-pr, or when the user needs to understand what
  changed without replaying the agent thread. Not agent-to-agent handoff,
  journal handoff, critic PASS/FAIL, or opening a PR.
---

# Code handoff (human walkthrough)

**Phase: human understanding** — produce a durable **browser HTML** brief so a person can review the change set without the implement/review chat.

**Does:** Explain *what changed and why* using **`.harness/state.md`** + **`git diff`**, written as **`.harness/code-handoff.html`**.  
**Does not:** Replace `/ss-review`, `/ss-security-audit`, open a PR, merge, or close Jira.  
**Not the same as:** [`handoff`](../../productivity/handoff/SKILL.md) (agent→agent session dump) or [`journal-handoff`](../../personal/journal-handoff/SKILL.md) (Obsidian weekly).

Invoke via **`/ss-handoff`**. Typical order: after `/ss-review` PASS (and ideally `/ss-security-audit`), **before** `/ss-submit-pr`.

**Presentation:** follow [HTML-REPORT.md](HTML-REPORT.md) — sticky nav, Intent, Decisions, Map, Hotspots, **Frontend / Backend** (surface notes), Tests, Verify. That browser HTML is the deliverable; do **not** substitute Markdown-only or Canvas for the brief.

## Principles

- **State is the contract** — ground the story in Behavior & Test Contracts, RED→GREEN / TDD Evidence, locked decisions, and Security Evidence when present. Do not invent architecture that is not in state or the diff.
- **Diff is the evidence** — every claim about behavior should point at a path or a short snippet from the change set.
- **Surface notes** — fill `#frontend` and/or `#backend` from changed paths (UI vs PHP/WordPress); otherwise one-line N/A. Product-neutral — not Lifeway-only.
- **Human first** — open-in-browser experience; scannable sections; Mermaid when structure helps.
- **Offload context** — the HTML must stand alone in a fresh session (open the file + PR/diff; do not require replaying implement history).
- **Prose** — apply [`anti-slop`](../../productivity/anti-slop/SKILL.md): expand abbreviations on first use; no hype; cite paths instead of restating whole files.

## Inputs

1. **`.harness/state.md`** — task title, decisions, contracts, verification plan, critic/security verdicts when present.
2. **Base…HEAD diff** — default base from consumer `skillsync.config.json` → `prBaseBranch`, else repo default (`main` / `master`). Ask if unclear.
3. **Optional:** living HTML under `.harness/` (architecture / UX / security posture) — link and quote decision ids; do not dump the whole HTML.

If `state.md` is missing or empty, still write a diff-based walkthrough and note that harness context was absent (amber callout in header).

## Steps (agent)

1. Read **`.harness/state.md`** (full file if present) and [HTML-REPORT.md](HTML-REPORT.md).
2. If **`.harness/code-handoff.html`** is missing, scaffold chrome (when vendored):

   ```bash
   node .cursor/vendor/skillsync/tools/init-plan-html.cjs . --kind handoff --task "<issue or title>"
   ```

   Use `--force` only to reset the scaffold (destroys prior content).
3. Resolve base branch; collect:
   - `git log --oneline <base>..HEAD`
   - `git diff --stat <base>...HEAD`
   - `git diff --name-only <base>...HEAD` — decide `#frontend` / `#backend` fill vs N/A
   - Targeted `git diff <base>...HEAD -- <path>` for hotspots (not the entire dump in the brief).
4. Rewrite **`.harness/code-handoff.html`** (same path every time — overwrite) per HTML-REPORT scaffold and sections. Keep Tailwind + Mermaid script tags from the template. Always include `#frontend` and `#backend` (filled or N/A).
5. Validate (when vendored):

   ```bash
   node .cursor/vendor/skillsync/tools/validate-plan-html.cjs . --kind handoff
   ```

   Fix until exit 0.
6. Print the path and tell the human to **open it in a browser**. Suggest next: complete `#verify` → `/ss-submit-pr` (or `/ss-security-audit` if not done).

In **Ask** mode: print the outline and commands; do not write the file unless the human asks.

## Output: `.harness/code-handoff.html`

Required: **Intent**, **Decisions**, **Map**, **Hotspots**, **Tests**, **Verify**, **Out of scope**.  
Expected (warn if missing): **Frontend**, **Backend** — fill from diff or one-line N/A.  
Details: [HTML-REPORT.md](HTML-REPORT.md).

### Mermaid

Use when it clarifies structure (module edges, FE sequence, REST/hook flow). Skip decorative diagrams. Prefer `flowchart` / `sequenceDiagram`. Keep node labels short. Render via `<pre class="mermaid">` as in HTML-REPORT.

### Snippets

- Prefer **added/changed** lines in GitHub-style `.diff-file` blocks (`diff-line--add` / `--del` / `--ctx`) — see [HTML-REPORT.md](HTML-REPORT.md).
- Escape HTML in `<code class="diff-line__code">` cells.
- Never paste secrets, tokens, or full env files.
- Prefer path + line range references when the file is large.
- Keep **dark mode** chrome from the template (`bg-zinc-950`, Mermaid `theme: "dark"`).

## Finish line

- [ ] `.harness/code-handoff.html` rewritten; opens in a browser without chat history
- [ ] `validate-plan-html.cjs --kind handoff` exits 0 (when vendored)
- [ ] Intent and decisions tied to `state.md` (or explicit “no state”)
- [ ] Hotspots cite real paths from the diff
- [ ] `#frontend` / `#backend` filled or explicit N/A from the diff surface
- [ ] `#verify` checklist is actionable (includes FE/backend checks when those sections are filled)
- [ ] Next step named: usually `/ss-submit-pr` (after security PASS) — not merge/close

## Related

| Command / skill | Relationship |
|-----------------|--------------|
| `/ss-review` | Critic PASS/FAIL — run before handoff when following ss-flow |
| `/ss-security-audit` | PR security gate — ideally PASS before handoff or before submit |
| `/ss-submit-pr` | Open PR; may reuse Intent / What to verify from the HTML when drafting `.harness/pr-body.md` |
| `/ss-close-story` | Deletes this artifact via harness reset after Jira Done |
| `productivity/handoff` | Agent session dump — different audience |
| `journal-handoff` | Weekly journal — different audience |
