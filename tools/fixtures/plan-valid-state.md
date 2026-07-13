# Harness state — plan-valid fixture

## Spec Overview

Example feature for verify-tools.

## Behavior & Test Contracts

#### B1
- **name:** Feature: Save, when draft valid, shows confirmation
- **expectation:** open editor > edit title > click Save > see confirmation toast
- **red:** fails — Save handler not wired
- **layer:** unit
- **path:** `save.test.ts`
- **guard:** would fail if Save no-ops or toast never appears

## RED→GREEN Plan

### Cycle 1 — B1

| Field | Content |
|-------|---------|
| **Behavior ID** | B1 |
| **name** | Feature: Save, when draft valid, shows confirmation |
| **expectation** | open editor > edit title > click Save > see confirmation toast |
| **RED** | `save.test.ts` / name above — fails without handler |
| **GREEN** | wire save handler |
| **layer** | unit |
| **Risk** | low |

## Acceptance Criteria

### Cycle 1

- [ ] Named test fails before implementation

## Verification Plan

### Cycle 1

1. `yarn test save.test.ts` → expect **FAIL** (RED)
2. (implement GREEN)
3. `yarn test save.test.ts` → expect **PASS** (GREEN)

## Next Action

**Actor:** harness-generator  
**Do:** Implement all Remaining RED→GREEN cycles.

## Completed / Remaining

**Completed:** (none)  
**Remaining:** Cycle 1

## TDD Evidence

| Cycle | Behavior ID | RED cmd | RED fail snippet | GREEN cmd | GREEN | Test Δ | Re-break |
|-------|-------------|---------|------------------|-----------|-------|--------|----------|
