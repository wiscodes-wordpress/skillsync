# Issue voices

Read from [SKILL.md](SKILL.md) after gathering context. A voice is **who reads the ticket**, not which tracker you publish to.

> **Convention note.** [`AGENTS.md`](../../../AGENTS.md) keeps product-specific keys and paths out of skillsync. The two voices are generic. Lifeway is named only as a detection hint.

## Pick a voice

Resolve in this order and stop at the first hit:

1. The human named it: **work**, **Lifeway**, **human tickets**, **teammates** → **workplace**. **Own project**, **agent**, **AFK slices**, **GitHub for agents** → **agent**.
2. Parent issue, story key, branch, or title starts with `DCD-` → **workplace**.
3. `git remote get-url origin` contains `LifewayIT` → **workplace**.
4. `skillsync.config.json` → `toIssuesVoice` is `workplace` or `agent`.
5. Else → **agent**.

Say the chosen voice in one line at the start of the quiz so they can flip it.

`--voice` on `publish-slices-from-state.cjs` must match.

---

## Agent (own project)

Tickets an **agent** will pick up. Thin vertical slices, human-in-the-loop (HITL) vs away-from-keyboard (AFK), full template.

**Quiz each slice with:** title · HITL or AFK · blocked by · user stories covered (if the source has them).

**Body:**

```markdown
## Parent

Reference to the parent issue (key or URL). Omit if there is no parent.

## What to build

Concise description of this vertical slice — **end-to-end behavior**, not layer-by-layer implementation.

Avoid specific file paths or code snippets — they go stale quickly. Exception: if a **prototype** produced a snippet that encodes a decision more precisely than prose (state machine, reducer, schema, type shape), inline it here and note that it came from a prototype. Trim to decision-rich parts only.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- Issue key or URL of blocking ticket(s)

Or: **None — can start immediately**
```

Map AFK slices to the consumer’s ready / triage labels when docs define them.

---

## Workplace (human teammates)

Tickets a **person on the team** will read on the board — including Lifeway Jira. Short. Plain English. No delivery jargon.

**Do not write:** human-in-the-loop, HITL, away-from-keyboard, AFK, vertical slice, RED→GREEN, Remaining, harness, source of truth, architecture decision record (ADR).

**Quiz each ticket with:** title + one-line what it does. Skip HITL/AFK. Skip user-story numbering unless the source already uses that language.

**Prefer fewer tickets** when a teammate would have to open three cards to understand one change. Still wait for approval before publish.

**Body** — nothing else. No Parent / What to build / Blocked by headings.

```markdown
A catalog item that fails to parse should be skipped so the rest of the row still shows.

**Acceptance criteria**

- [ ] A bad item is skipped
```

Second ticket in the same breakdown would look like:

```markdown
The row should keep showing its loading state until at least one item is ready, instead of flashing empty.

**Acceptance criteria**

- [ ] Spinner stays up until the first good item is in
```

Rules:

- One short paragraph: what changes and why it matters. Not a spec.
- **Acceptance criteria** — one checkbox is enough when the ticket is that small. Add a second only if a teammate would miss it. No file paths.
- Do **not** write `Part of DCD-123.` (or any parent line). Parent is the Jira link / epic field, not body text.
- If something must wait on another ticket, one extra line after the paragraph: `Depends on KEY.` Omit when nothing blocks.
- Do not paste `.harness/state.md`, cycle tables, or implementation sections into the body.

**Labels:** do not apply agent triage labels (`ready-for-agent`, and the like) unless the human asked.
