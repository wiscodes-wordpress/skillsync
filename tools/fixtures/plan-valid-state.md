# Harness state — plan-valid fixture

## Spec Overview

Example feature for verify-tools.

## Behavior & Test Contracts

| Behavior ID | Layer | Observable outcome | RED expectation |
|-------------|-------|-------------------|-----------------|
| B1 | unit | User sees save confirmation | Missing handler → test fails |

## RED→GREEN Plan

### Cycle 1

| Field | Content |
|-------|---------|
| **Behavior ID** | B1 |
| **Behavior** | Save shows confirmation |
| **RED** | test fails without handler |
| **GREEN** | wire save handler |
| **Layer** | unit |
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
**Do:** Implement Cycle 1 RED→GREEN.

## TDD Evidence

| Cycle | Behavior ID | RED cmd | RED fail snippet | GREEN cmd | GREEN | Test Δ | Re-break |
|-------|-------------|---------|------------------|-----------|-------|--------|----------|
