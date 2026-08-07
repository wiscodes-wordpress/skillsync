# ss-arch-plan

**Phase: architecture direction** — optional; above story delivery. See [`ss-flow.md`](../harness/ss-flow.md).

Set **project/plugin architecture direction**. **Markdown is the plan source of truth**; HTML is derived for humans. Does **not** implement code or run TDD grilling.

In **Agent** mode, follow [`arch-plan`](../skills/engineering/arch-plan/SKILL.md):

1. **Locate** the living Markdown via `docs/agents/domain.md`, then `.harness/initiatives/<slug>/architecture-plan.md` (active pack / `--slug`), then legacy `.harness/architecture-plan.md` — see `tools/lib/plan-paths.cjs` (`resolvePlanMdPath`). Rewrite that file; update the pack hub lens row when present. **Do not hand-edit** derived `.html`.
2. **If missing:** scaffold with `node .cursor/vendor/skillsync/tools/init-plan-html.cjs . --kind arch [--slug <slug>] --product "…" --task "…"` (writes `.md` + renders `.html`; refuse overwrite unless `--force`).
3. **If stages have epic/story keys** — refresh **Jira → Markdown** only (fetch via Atlassian MCP; rewrite status on the `.md`). Then re-render. Never push status back to Jira.
4. If no filled content yet — explore repo, `CONTEXT.md`, ADRs; **optional GitNexus** (`query` / `context` when MCP indexed — [`docs/gitnexus.md`](../docs/gitnexus.md)); draft Markdown sections per [`HTML-REPORT.md`](../skills/engineering/arch-plan/HTML-REPORT.md) (`## phase`, `## finish-line`, Current|Target Mermaid fences, decisions, stages).
5. **Render for humans:**

```bash
node .cursor/vendor/skillsync/tools/render-plan-html.cjs . --kind arch [--slug <slug>] --validate
```

Open the `.html`; tell the user the path.
6. **Follow-ups** — one decision at a time; after every material answer, **rewrite the same `.md`**, then re-render.
7. When stages are ready to track — `/ss-to-issues` (**fold into existing epics** + stories); write keys into the Markdown + finish-line, then re-render.
8. **Validate** (when vendored): `validate-plan-html.cjs . --kind arch` on the derived HTML — fix MD until exit 0.
9. On lock: offer ADRs / `CONTEXT.md`; mirror stages + keys into `.harness/state.md` when present.
10. **Handoff:** `/ss-plan` for the first stage — not `/ss-implement` until a behavior plan exists.

**Reuse:** deepening friction → [`improve-codebase-architecture`](../skills/engineering/improve-codebase-architecture/SKILL.md) vocabulary; fold into the Markdown SoT.

**Skip** when structure is already agreed and the work is behavior-only. **After** the [`ss-roadmap`](./ss-roadmap.md) draft step when capabilities need a structural home before stories.

Available as `/ss-arch-plan` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
