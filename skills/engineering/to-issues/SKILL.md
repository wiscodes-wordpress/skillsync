---
name: to-issues
description: >
  Break a plan, spec, PRD, or harness sprint plan into independently grabbable tracker
  issues using vertical slices (human-in-the-loop / away-from-keyboard). Quiz the user before publish.
  Use when the user wants to convert a plan into issues, create implementation tickets,
  break down work into subtasks, or run /ss-to-issues.
disable-model-invocation: true
---

# To issues

Break a plan into **independently grabbable** issues on the project **issue tracker**. Each issue is a thin **vertical slice**: one complete path through every relevant layer (data, API, UI, tests — as they apply here), not a horizontal layer (schema-only, API-only, UI-only).

**Prose:** apply [`anti-slop`](../../productivity/anti-slop/SKILL.md) to titles and bodies — expand abbreviations on first use; behavior in plain English.

**Tracker vocabulary** (project key, issue types, parent/child rules, away-from-keyboard triage labels) lives in the **consumer’s** issue-tracker / agent docs (for example `docs/agents/issue-tracker.md`) or the human’s instructions — not in this shared skill. If those docs are missing, ask before publishing.

## Relationship to planning

- After **`/ss-plan`**, slices may already exist in **`.harness/state.md`**. Prefer that file (or an agreed spec/PRD in chat) as the source of slices — do not invent a second competing breakdown unless the user asks to re-slice.
- After **`/ss-arch-plan`**, prefer **`.harness/architecture-plan.html`** stages; **fold into existing epics** when possible (stories per stage); write keys (`data-epic` / `data-story`) back into the HTML so later `/ss-arch-plan` runs can refresh status.
- After **`/ss-security-plan`**, prefer **`.harness/security-posture.html`** hardening stages; fold into existing epics when possible; write keys back into the HTML.
- This skill **publishes** approved slices to the tracker. It does **not** replace [`harness-planner`](../../../harness/harness-planner.md) for spec writing or [`arch-plan`](../arch-plan/SKILL.md) for architecture direction.

## Process

### 1. Gather context

Work from whatever is already in the conversation. Acceptable sources (in priority order when multiple exist):

1. **Parent issue** — if the user passes an issue key, URL, or path, fetch it from the tracker (MCP or `gh` per consumer docs). Read the full body and comments.
2. **Architecture plan** — **`.harness/architecture-plan.html`** migration stages (prefer fold into existing epics + stories from `/ss-arch-plan`). Write returned keys back into the HTML.
3. **Security posture** — **`.harness/security-posture.html`** hardening stages from `/ss-security-plan`. Write keys back into the HTML.
4. **Harness plan** — **`.harness/state.md`** (especially **Sprint Plan** / numbered slices and acceptance criteria).
5. **Other artifacts** — PRD, spec, plan doc, or prior chat agreement (reference by path; do not duplicate long content into every child issue).

### 2. Explore the codebase (optional)

Skip this step if **`/ss-plan`** (or equivalent exploration) just ran and context is fresh.

Otherwise, explore enough to name slices with the project’s **domain glossary** and to respect **architecture decision records (ADRs)** in the area you are touching. Issue text should describe **behavior**, not file paths (see template).

### 3. Draft vertical slices

Break the work into thin vertical-slice issues. Each issue is a complete path through **all relevant layers** end to end — not a horizontal layer (schema-only, API-only, UI-only).

Slices may be **human-in-the-loop (HITL)** or **away-from-keyboard (AFK)**:

- **Human-in-the-loop (HITL)** — needs human interaction (architectural decision, design review, product sign-off).
- **Away-from-keyboard (AFK)** — can be implemented and merged without human interaction.

Prefer **AFK** over **HITL** where possible. Map **AFK** slices to the consumer’s **ready / triage labels** when docs define them.

**Vertical slice rules:**

- Each slice delivers a narrow but **complete** path through every relevant layer (data, API, UI, tests — as applicable to this repo).
- A completed slice is **demoable or verifiable on its own**.
- Prefer **many thin slices** over few thick ones.
- Where the team’s norm is one PR per slice, size slices so they are **mergeable in one PR** when reasonable.

### 4. Quiz the user

Present the proposed breakdown as a **numbered list**. For each slice, show:

- **Title** — short descriptive name
- **Type** — human-in-the-loop (HITL) / away-from-keyboard (AFK)
- **Blocked by** — which other slices (by number or title) must complete first, or none
- **User stories covered** — if the source material has user stories

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

**Iterate until the user approves** the breakdown. Do not create tracker issues before approval.

### 5. Publish to the issue tracker

For each **approved** slice, create a new issue per **consumer issue-tracker docs** (issue type, parent link, labels).

**Order:** Publish in **dependency order** (blockers first) so real issue keys/URLs can appear in each issue’s **Blocked by** section.

**MCP:** When the consumer uses **Atlassian MCP**, read each tool’s **schema** (descriptor JSON under the workspace `mcps/` tree) **before** the first `call_mcp_tool`. Use only arguments the schema allows (JSON strings for `fields` / `additional_fields`, etc.).

**No MCP / read-only:** Output the same titles and bodies as **paste-ready** text for manual create.

**GitHub Issues:** When consumer docs say GitHub is the system of record, use `gh issue create` (and labels) per those docs — not Jira.

Use the **issue body template** below for every slice.

**Do not** close, transition, or rewrite the **parent** issue. Only create children (or peer issues) as the consumer’s workflow defines.

After publish, print a summary table: slice title → issue key/URL. Suggest **`handoff`** or the next **`/ss-implement`** slice if the user is continuing with agents.

## Issue body template

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

## Consumer wrappers

Product repos keep **thin** commands (for example `qp-to-issues`) that link **`/ss-to-issues`**, set default **project key** / **issue type** / **parent** rules, and point at **`docs/agents/issue-tracker.md`**. The shared skill stays tracker-agnostic; wrappers supply QuickPress/Jira/GitHub specifics.
