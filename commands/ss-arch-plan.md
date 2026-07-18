# ss-arch-plan

**Phase: architecture direction** — optional; above story delivery. See [`ss-flow.md`](../harness/ss-flow.md).

Set **project/plugin architecture direction**. The living HTML is the **plan source of truth**. Does **not** implement code or run TDD grilling.

In **Agent** mode, follow [`arch-plan`](../skills/engineering/arch-plan/SKILL.md):

1. **Locate** `.harness/architecture-plan.html` (or fallback path in the skill).
2. **If stages have epic/story keys** — refresh **Jira → HTML** only (fetch via Atlassian MCP; rewrite status on the same file). Never push status back to Jira.
3. If no HTML yet — explore repo, `CONTEXT.md`, ADRs; draft per [`HTML-REPORT.md`](../skills/engineering/arch-plan/HTML-REPORT.md) (sticky nav, Phase, **Start → finish**, Current|Target, decisions, stages). Open the file; tell the user the path.
4. **Follow-ups** — one decision at a time; after every material answer, **rewrite the same HTML**.
5. When stages are ready to track — `/ss-to-issues` (**fold into existing epics** + stories; Epic B table when dual-track); write keys into the HTML + finish-line.
6. On lock: offer ADRs / `CONTEXT.md`; mirror stages + keys into `.harness/state.md` when present.
7. **Handoff:** `/ss-plan` for the first stage — not `/ss-implement` until a behavior plan exists.

**Reuse:** deepening friction → [`improve-codebase-architecture`](../skills/engineering/improve-codebase-architecture/SKILL.md) vocabulary; fold into this HTML.

**Skip** when structure is already agreed and the work is behavior-only. **After** [`ss-major-feature-roadmap`](./ss-major-feature-roadmap.md) when capabilities need a structural home before stories.

Available as `/ss-arch-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
