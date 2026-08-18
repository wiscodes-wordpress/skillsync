---
name: to-issues
description: >
  Break a plan, spec, PRD, or harness sprint plan into tracker issues. Own projects
  get agent-ready vertical slices; workplace boards (e.g. Lifeway) get short human
  tickets. Quiz the user before publish. Use when the user wants to convert a plan
  into issues, create implementation tickets, break down work into subtasks, or
  run /ss-to-issues.
disable-model-invocation: true
---

# To issues

Break a plan into tracker issues. **Who reads the ticket** decides the voice — load [VOICES.md](VOICES.md) after you have a source, before you draft.

| Voice | Who reads it | Shape |
|-------|----------------|-------|
| **Agent** | An agent on your own project | Thin vertical slices; HITL / AFK; full template |
| **Workplace** | A teammate (Lifeway Jira and similar) | Short plain tickets; no delivery jargon |

**Prose:** apply [`anti-slop`](../../productivity/anti-slop/SKILL.md). Agent voice expands abbreviations on first use. Workplace voice skips the abbreviations — write the idea in ordinary words or leave it out.

**Tracker vocabulary** (project key, issue types, parent/child rules, labels) lives in the **consumer’s** issue-tracker / agent docs (for example `docs/agents/issue-tracker.md`) or the human’s instructions — not in this shared skill. If those docs are missing, ask before publishing.

## Relationship to planning

- After **`/ss-plan`**, slices may already exist in **`.harness/state.md`**. Prefer that file (or an agreed spec/PRD in chat) as the source — do not invent a second competing breakdown unless the user asks to re-slice.
- After **`/ss-arch-plan`**, prefer the resolved **`architecture-plan.md`** stages (pack or root); **fold into existing epics** when possible (stories per stage); write keys (`epic:` / `story:` meta) back into the Markdown, then `render-plan-html.cjs --kind arch`.
- After **`/ss-security-plan`**, prefer the resolved **`security-posture.md`** hardening stages (pack or root); fold into existing epics when possible; write keys back into the Markdown, then re-render.
- This skill **publishes** approved work to the tracker. It does **not** replace [`harness-planner`](../../../harness/harness-planner.md) for spec writing or [`arch-plan`](../arch-plan/SKILL.md) for architecture direction.

## Process

### 1. Gather context

Work from whatever is already in the conversation. Acceptable sources (in priority order when multiple exist):

1. **Parent issue** — if the user passes an issue key, URL, or path, fetch it from the tracker (MCP or `gh` per consumer docs). Read the full body and comments.
2. **Architecture plan** — resolved **`architecture-plan.md`** migration stages (prefer fold into existing epics + stories from `/ss-arch-plan`). Write returned keys back into the Markdown, then re-render HTML.
3. **Security posture** — resolved **`security-posture.md`** hardening stages from `/ss-security-plan`. Write keys back into the Markdown, then re-render.
4. **Harness plan** — **`.harness/state.md`** (especially **Sprint Plan** / numbered slices and acceptance criteria).
5. **Other artifacts** — PRD, spec, plan doc, or prior chat agreement (reference by path; do not duplicate long content into every child issue).

### 2. Pick a voice

Follow [VOICES.md](VOICES.md). One line in chat: which voice and why (remote, config, or they named it).

### 3. Explore the codebase (optional)

Skip this step if **`/ss-plan`** (or equivalent exploration) just ran and context is fresh.

Otherwise, explore enough to name work in the project’s **domain glossary** and to respect **architecture decision records (ADRs)** in the area you are touching. Issue text should describe **behavior**, not file paths.

### 4. Draft the breakdown

**Agent voice:** thin vertical-slice issues. Each issue is a complete path through **all relevant layers** end to end — not a horizontal layer (schema-only, API-only, UI-only). A completed slice is demoable on its own. Prefer many thin slices. Where the team’s norm is one PR per slice, size them so they are mergeable in one PR when reasonable.

Slices may be **human-in-the-loop (HITL)** (needs a decision or sign-off) or **away-from-keyboard (AFK)** (implement and merge without a person). Prefer AFK where possible.

**Workplace voice:** same source material, but write tickets a teammate would actually open. Prefer fewer tickets when three cards would just repeat one change. Do not classify HITL/AFK on the card.

### 5. Quiz the user

Present a **numbered list**. Fields depend on voice — see [VOICES.md](VOICES.md).

Ask:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any items be merged or split further?
- (Agent voice only) Are the correct slices marked HITL and AFK?

**Iterate until the user approves.** Do not create tracker issues before approval.

### 6. Publish to the issue tracker

For each **approved** item, create a new issue per **consumer issue-tracker docs** (issue type, parent link, labels). Use the **matching voice template** from [VOICES.md](VOICES.md).

**Order:** Publish in **dependency order** (blockers first) so real issue keys/URLs can appear in **Blocked by** (agent) or `Depends on KEY.` (workplace).

**MCP:** When the consumer uses **Atlassian MCP**, read each tool’s **schema** (descriptor JSON under the workspace `mcps/` tree) **before** the first `call_mcp_tool`. Use only arguments the schema allows (JSON strings for `fields` / `additional_fields`, etc.).

**No MCP / read-only:** Output the same titles and bodies as **paste-ready** text for manual create.

**GitHub Issues:** When consumer docs say GitHub is the system of record, use `gh issue create` (and labels) per those docs — not Jira. After human approves the list, prefer **`publish-slices-from-state.cjs`** (dry-run first, then `--publish --approved --parent KEY --voice agent|workplace`).

**Do not** close, transition, or rewrite the **parent** issue. Only create children (or peer issues) as the consumer’s workflow defines.

After publish, print a summary table: title → issue key/URL. Suggest **`handoff`** or the next **`/ss-implement`** slice if the user is continuing with agents.

## Consumer wrappers

Product repos keep **thin** commands (for example `qp-to-issues`) that link **`/ss-to-issues`**, set default **project key** / **issue type** / **parent** rules, and point at **`docs/agents/issue-tracker.md`**. Optionally set **`toIssuesVoice`** in `skillsync.config.json`. The shared skill stays tracker-agnostic; wrappers supply QuickPress/Jira/GitHub specifics.
