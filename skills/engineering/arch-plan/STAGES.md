# Migration stages (architecture plan)

Fixed checklist for moving from **current** to **target** shape. Put these in the living HTML `#stages` section; optionally mirror into `.harness/state.md` as `## Migration Stages`.

**Jira epic keys** are the join between each stage and the tracker. The HTML is plan SoT; on `/ss-arch-plan`, status is refreshed **from** those epics **into** the HTML (one-way).

Adapt titles to the domain; keep the **order and intent**. Skip a stage only when it does not apply (e.g. no second adapter justified) — note the skip in the HTML.

| ID | Intent | Acceptance (one line) | Epic key |
|----|--------|------------------------|----------|
| **S0** | Name the deep module(s) in glossary language | Term(s) in `CONTEXT.md` (or HTML until promoted) | after publish |
| **S1** | Define the interface; tests at the seam | Interface is the test surface; RED contracts agreed or noted for `/ss-plan` | after publish |
| **S2** | Move logic behind the seam | Implementation lives in the deep module; callers use the interface | after publish |
| **S3** | Second adapter if justified | Two adapters = real seam; otherwise skip with reason | after publish |
| **S4** | Migrate remaining callers | No leakage across the old shallow path | after publish |
| **S5** | Delete pass-through / obsolete shallow tests | Deletion test passes; locality restored | after publish |

## Epic join rules

- Prefer **one epic per stage** (compare at epic level). Stories implement under the epic; key a story on a stage only when the phase is intentionally one story.
- Publish via [`to-issues`](../to-issues/SKILL.md) / `/ss-to-issues` (or paste-ready epics); write keys into the HTML (`data-epic` + visible key).
- Empty key → no Jira refresh for that row; plan badge stays unset/`pending`.
- Never push HTML plan badges back as Jira transitions from this skill.

## Rules

- Stages are **vertical deepening / migration steps**, not a vague cleanup backlog.
- Prefer one deep module cluster per stage train; split into a second train if unrelated.
- Do not invent parallel TODO systems — HTML stages (+ epic keys) → `/ss-to-issues` → `/ss-plan` per slice.
- **S1** may hand off to `/ss-plan` for Behavior & Test Contracts before implement; that is expected.
