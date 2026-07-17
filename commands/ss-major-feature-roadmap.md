# ss-major-feature-roadmap

**Phase: initiative roadmap** (above `/ss-plan`) — optional; not part of the per-story delivery loop in [`ss-flow.md`](../harness/ss-flow.md).

Plan a **multi-epic, multi-release** major feature before slice-level delivery.

In **Agent** mode, follow [`major-feature-roadmap`](../skills/engineering/major-feature-roadmap/SKILL.md):

1. **Synthesize** from your feature description + repo exploration (capabilities, story map, ambiguity register, v1 slice).
2. **Present** for approval — resolve v1-blocking ambiguities via targeted Q&A.
3. **Write** initiative spec markdown (consumer path or `docs/initiatives/initiative-<slug>.md`).
4. **Publish** Jira capability **epics** (overview specs in descriptions) via Atlassian MCP.
5. **Gate** — zero open `Blocks: v1` ambiguities initiative-wide.
6. **Publish** v1 **stories** only (implementation specs in descriptions).

Read MCP tool schemas before Jira calls. Use full prose for specs (caveman planning carve-out).

**First prompt:** describe the major feature — what, who, optional v1 must-haves.

**Handoff:** Structure undecided → [`ss-arch-plan`](./ss-arch-plan.md). UI-heavy v1 story → [`ss-ui-ux-plan`](./ss-ui-ux-plan.md) then [`ss-plan`](./ss-plan.md). Otherwise [`to-prd`](../skills/engineering/to-prd/SKILL.md) or [`ss-plan`](./ss-plan.md). Future slices → re-run roadmap expansion for that slice.

Consumer wrappers (e.g. `qp-major-feature-roadmap`) may add stack constraint checklists and default Jira project; still point here.

Available as `/ss-major-feature-roadmap` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
