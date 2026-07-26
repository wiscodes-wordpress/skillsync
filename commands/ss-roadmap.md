# ss-roadmap

**Phase: initiative** — orchestrates roadmap draft → living plan lenses → Jira publish → story delivery. See [`ss-flow.md`](../harness/ss-flow.md).

One entry point for a **major feature** (e.g. an AI chatbot): draft the roadmap **without** creating tracker issues, lock the plan lenses that matter (architecture / UX / security), **then** publish epics and v1 stories so Jira matches the locked plans. Judgment stays in the skills; pack structure is scripted.

## Cadence (do not invert)

```text
draft roadmap (markdown only)
  → lens gates + feature pack
  → lock required lens HTML
  → publish Jira epics (+ v1 stories)
  → /ss-plan per story
```

**Why publish last:** lens plans change stage shape, journeys, and trust decisions. Creating epics/stories before those lock forces rewrite in Jira or ships stale implementation specs. `#phase` / finish-line get real keys on the publish pass (rewrite the same HTML).

**Read vs create:** early steps may **read** existing Jira (related epics, portfolio) for context. They must **not** create or transition issues until the publish step.

In **Agent** mode:

1. **Draft roadmap (no Jira create)** — follow [`major-feature-roadmap`](../skills/engineering/major-feature-roadmap/SKILL.md) through **synthesize → approval Q&A → write initiative spec markdown** only. Stop before “Create Jira epics / v1 stories”. Optionally **search/read** existing epics for context. Resolve or defer all `Blocks: v1` ambiguities. Note the slug from the spec path (`docs/initiatives/initiative-<slug>.md`).
2. **Lens gates** — from the draft, decide which lenses this initiative requires. Recommend, then confirm with the user:

   | Roadmap signal | Required lens |
   |----------------|---------------|
   | Structure undecided / ADR candidates / `Blocks: initiative` ambiguity | `arch` |
   | UI-heavy v1 capability or UX constraints on features | `ux` |
   | Cross-cutting security capability, new trust surface, PII/egress ambiguity | `security` |
   | None of the above | Skip pack — go to publish (step 5) with epic/story titles from the draft |

3. **Build the pack** (when ≥1 lens required):

   ```bash
   node .cursor/vendor/skillsync/tools/init-feature-pack.cjs . \
     --slug <slug> --lenses arch,ux,security
   ```

   Omit `--epics` until publish (or pass draft titles only as comments in the hub). Writes `.harness/initiatives/<slug>/index.html`. Lens files stay missing until their commands run.
4. **Run required lens commands in order** — `/ss-arch-plan` → `/ss-ui-ux-plan` → `/ss-security-plan`, each writing **into the pack** (`architecture.html` / `ux.html` / `security.html`) instead of the global `.harness/*.html`, and validating with `validate-plan-html.cjs --file`. Stages / journeys / hardening may use **draft** titles until keys exist; `#phase` can say “keys pending publish”. After each lens lands, rewrite the hub lens row (`missing → draft → locked`).
5. **Publish to Jira** — now create capability **epics** (overview from the initiative spec + locked lens decisions), then v1 **stories** (implementation specs informed by journeys / stages / trust decisions). Write keys into the hub `#keys` table and into each lens file (`data-epic` / `data-story`, finish-line). Re-run:

   ```bash
   node .cursor/vendor/skillsync/tools/validate-feature-pack.cjs . --slug <slug>
   ```

   Required lenses must exist; every `data-epic` in a lens file must be listed in the hub.
6. **Handoff** — `/ss-plan` for the first v1 story; point `.harness/state.md` at the pack (`Pack: .harness/initiatives/<slug>/index.html`). Journeys, stages, and trust decisions in the pack seed Behavior & Test Contracts.

**Skip lenses honestly** — a pure API capability with agreed seams may need `security` only, or no pack at all. Do not draft three HTML files for ceremony.

**One-pass roadmap (no lenses):** when step 2 gates require no lens, publish straight from the approved draft (step 5) — that is the whole flow; there is no separate roadmap command.

**Global vs pack:** plugin-wide posture stays in the global `.harness/architecture-plan.html` / `security-posture.html`; pack files are **initiative-scoped**. When both exist, the pack wins for stories under this initiative.

Available as `/ss-roadmap` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
