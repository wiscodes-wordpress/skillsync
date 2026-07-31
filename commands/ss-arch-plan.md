# ss-arch-plan

**Phase: architecture direction** — optional; above story delivery. See [`ss-flow.md`](../harness/ss-flow.md).

Set **project/plugin architecture direction**. The living HTML is the **plan source of truth**. Does **not** implement code or run TDD grilling.

In **Agent** mode, follow [`arch-plan`](../skills/engineering/arch-plan/SKILL.md):

1. **Locate** `.harness/architecture-plan.html` (or fallback path in the skill). **Initiative pack:** when working under `/ss-roadmap` (`.harness/initiatives/<slug>/` exists for this feature), read and rewrite `architecture.html` **inside the pack** instead, then update the hub lens row.
2. **If missing (global harness):** scaffold chrome with `node .cursor/vendor/skillsync/tools/init-plan-html.cjs . --kind arch --product "…" --task "…"` (refuse overwrite unless `--force`). Pack lenses still start from agent draft into the pack path.
3. **If stages have epic/story keys** — refresh **Jira → HTML** only (fetch via Atlassian MCP; rewrite status on the same file). Never push status back to Jira.
4. If no filled content yet — explore repo, `CONTEXT.md`, ADRs; **optional GitNexus** (`query` / `context` when MCP indexed — [`docs/gitnexus.md`](../docs/gitnexus.md)); draft per [`HTML-REPORT.md`](../skills/engineering/arch-plan/HTML-REPORT.md) (sticky nav, Phase, **Start → finish**, Current|Target, decisions, stages). Open the file; tell the user the path.
5. **Follow-ups** — one decision at a time; after every material answer, **rewrite the same HTML**.
6. When stages are ready to track — `/ss-to-issues` (**fold into existing epics** + stories; Epic B table when dual-track); write keys into the HTML + finish-line.
7. **Validate structure** (when vendored): `node .cursor/vendor/skillsync/tools/validate-plan-html.cjs . --kind arch` — fix until exit 0.
8. On lock: offer ADRs / `CONTEXT.md`; mirror stages + keys into `.harness/state.md` when present.
9. **Handoff:** `/ss-plan` for the first stage — not `/ss-implement` until a behavior plan exists.

**Reuse:** deepening friction → [`improve-codebase-architecture`](../skills/engineering/improve-codebase-architecture/SKILL.md) vocabulary; fold into this HTML.

**Skip** when structure is already agreed and the work is behavior-only. **After** the [`ss-roadmap`](./ss-roadmap.md) draft step when capabilities need a structural home before stories.

Available as `/ss-arch-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
