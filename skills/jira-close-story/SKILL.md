---
name: jira-close-story
description: >
  Close or transition Jira issues to Done after merge (or when updating the board):
  subtasks first when closing a parent, optional assignee and fix version updates,
  then transitions via Atlassian MCP. Clears local .harness handoff files and removes pr-body.md on success.
  Use when user closes a Jira story/task, says post-merge Jira cleanup, /ss-close-story,
  or wants subtasks marked Done before the parent.
---

# Jira close story

End-to-end Jira updates for **one issue key**, then **local harness reset** when Jira succeeds.

## Principles

- **MCP first:** With **Atlassian MCP** enabled, read each tool’s **schema** (descriptor JSON under the workspace `mcps/` tree, or Cursor’s MCP tool list) **before** the first `call_mcp_tool` call. Tool names below match **`user-mcp-atlassian`**; if the enabled server id differs, use that server id and the same logical steps.
- **No invented people:** Default **assignee**, **fix version** naming, and **project** quirks live in the **consumer’s** issue-tracker / agent docs or the human’s chat instructions — not in this shared skill.
- **Fix version source:** Choose an **unreleased** Jira fix version from **Jira** (e.g. list versions for the issue’s **project key**). **Do not** copy “next version” from **`package.json`** unless the human explicitly says that file is the source of truth (it usually is not for Jira).

## Issue shape

- **Parent / story with subtasks:** Transition **open child issues to Done** (or team-equivalent terminal status) **before** transitioning the parent, unless consumer docs say otherwise.
- **Sub-task key only:** Close that issue directly (no parent transition required for the skill to succeed).
- **Ordinary story/task:** Fetch issue → apply field updates the human/docs require → transition to Done.

## MCP flow (summary)

Use tools only as their **schemas** allow (argument names, JSON strings for `fields`, etc.). Typical building blocks:

1. **`jira_get_issue`** — type, status, subtasks, project key, existing `fixVersions` / `assignee`.
2. **`jira_get_project_versions`** — `project_key` from the issue (e.g. `PROJ` from `PROJ-123`); filter **unreleased**; pick version name to set (human override wins if they gave an exact **name**).
3. **`jira_update_issue`** — set **`assignee`**, **`fixVersions`**, or other fields when required; `fields` must be valid JSON per schema.
4. **`jira_get_transitions`** then **`jira_transition_issue`** — resolve transition id for **Done** (or workflow terminal name your board uses); repeat per issue (children → parent).

If a transition requires **resolution** or other mandatory fields, supply them in the transition **`fields`** JSON per tool docs.

## After Jira succeeds (local repo)

At repository root (adjust only if consumer docs define different paths):

1. Ensure **`.harness/`** exists.
2. Write **empty** **`.harness/state.md`** and **`.harness/qa-current.md`** (normal file write — **not** via MCP).
3. **Delete** **`.harness/pr-body.md`** if it exists (PR draft artifact from **`/ss-submit-pr`**; remove — do not empty).

This clears planner/QA handoff context and PR body drafts for the next slice.

## Ask mode / no MCP / read-only

Print a **manual checklist** for the human:

- [ ] Subtasks Done before parent (if applicable).
- [ ] Assignee / fix version per team policy (Jira UI or REST).
- [ ] Transition issue(s) to Done.
- [ ] Empty `.harness/state.md` and `.harness/qa-current.md` after Jira is correct.
- [ ] Delete `.harness/pr-body.md` if present.

## Consumer wrappers

Repos like **QuickPress** keep **`qp-close-jira-story`** (thin): default assignee, project-specific fix-version heuristic, links to **`docs/agents/issue-tracker.md`**, and still **`/ss-close-story`** + this skill for the shared skeleton.
