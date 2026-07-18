# Migration stages (architecture plan)

Fixed checklist for moving from **current** to **target** shape. Put these in the living HTML `#stages` section; optionally mirror into `.harness/state.md` as `## Migration Stages`.

**Tracker join:** prefer one **stage-home epic** (shared `data-epic` on S0–S5) plus **stories** per stage (`data-story`). Fold into existing epics when they already own the work — do not spawn six new stage epics by default. On `/ss-arch-plan`, refresh status **from** those keys **into** the HTML (one-way).

Adapt titles to the domain; keep the **order and intent**. Skip a stage only when it does not apply — note the skip in the HTML.

| ID | Intent | Acceptance (one line) | Typical join |
|----|--------|------------------------|--------------|
| **S0** | Name the deep module(s) in glossary language | Term(s) in `CONTEXT.md` (or HTML until promoted) | home epic |
| **S1** | Define the interface; tests at the seam | Interface is the test surface; RED contracts for `/ss-plan` | story under home epic |
| **S2** | Move logic behind the seam | Implementation in the deep module; callers use the interface | story |
| **S3** | Second adapter if justified | Two adapters = real seam; otherwise skip with reason | story or skip |
| **S4** | Migrate remaining callers | No leakage across the old shallow path | story |
| **S5** | Delete pass-through / obsolete shallow tests | Deletion test passes; locality restored; ADR/CONTEXT if needed | story |

**Dual-track rule:** Epic A = stage/platform spine (S0–S5 cards in `#stages`). Epic B (optional) = secondary capability train under its own epic — ordered in `#finish-line` / `#epic-b`, not a second S0–S5 list.

## Epic / story join rules

- **Default:** update/retitle an existing epic as the stage home; publish **stories** for S1–S5 (and S0 if needed).
- **Alternate:** one epic per stage only when no suitable home epic exists.
- Secondary tracks use a **second epic** + story table (violet) — say so in Phase, finish-line, and Stages intro.
- Empty key → no Jira refresh for that row.
- Never push HTML badges back as Jira transitions from this skill.

## Rules

- Stages are **vertical deepening / migration steps**, not a vague cleanup backlog.
- Prefer one deep module cluster per stage train; split into a second train if unrelated.
- HTML stages (+ epic/story keys) → `/ss-to-issues` → `/ss-plan` per slice.
- **S1** may hand off to `/ss-plan` for Behavior & Test Contracts before implement; that is expected.
