---
kind: security
product: Demo Plugin
status: hardening stages agreed
updated: "2026-07-25"
jira_refreshed: "2026-07-25"
task: "Primary job: every state change is capability checked and nonce verified before it touches options."
---

## phase

| Hardening stage | Jira home | Status |
| --- | --- | --- |
| H1 capability audit | DEMO-401 | In Progress |

> Read this as: capability checks land first; pull requests still run the audit gate.

## locks

**Locked**

- All write routes require an authenticated capability check.

**Handoff**

1. Close DEMO-401, then run /ss-security-audit before the pull request.

## surfaces

| Surface | Examples | Trust note |
| --- | --- | --- |
| HTTP entrypoints | REST settings route | Capability plus nonce |
| Data at rest | Plugin options | No secrets stored |
| Frontend | Admin settings panel | Escape on output |

Out of scope: multisite network settings.

## assess

| Field | Value |
| --- | --- |
| Last run | 2026-07-25 via security-assess.cjs . --write-state |
| Completeness | complete |
| Probes | surfaces ran · semgrep ran · deps ran · wordfence off |
| ERROR findings | 0 |
| WARNING findings | 0 |
| Action | Nothing to triage; re-run on the next posture pass. |

## cves

| Field | Value |
| --- | --- |
| Last run | 2026-07-25 via assess deps probe |
| Critical / high | 0 |
| Action | Re-run on the next posture pass. |

## current

One REST route checks a nonce but not a capability, so any logged-in subscriber can write settings.

## target

Every write route checks manage_options and a nonce at the same seam, with output escaped in the panel.

## decisions

### d1
- status: resolved · authenticated only
- title: D1 — settings route audience

No anonymous caller needs the settings route.

## stages

### stage-H1
- epic: DEMO-400
- story: DEMO-401
- status: In Progress
- title: Capability audit on write routes

Acceptance: no write route lacks a capability check.

## nongoals

- Accepted risk: administrators may still paste raw HTML into the notice field.

## gate

- **Command:** /ss-security-audit
- **When:** after /ss-review passes, before /ss-submit-pr
- **Phases:** A is security-audit.cjs facts; B is agent judgment on that evidence
- **Rule:** this file never passes a pull request; the Evidence section in state.md does

## status

Green

Assess is complete with nothing open, and the dependency scan is clear.

| Risk | Source | Status | Notes |
| --- | --- | --- | --- |
| Settings route missing capability check | surfaces | Open | DEMO-401 |
| Raw HTML in notice field | decisions | Accepted | See non-goals |

Completeness complete · ERROR open 0 · WARNING open 0 · Last assess 2026-07-25
