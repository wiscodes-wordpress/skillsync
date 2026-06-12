---
name: pr-review
description: >
    Review a pull request for QuickPress convention compliance, WordPress
    security patterns, React/TypeScript quality, styling token usage, test
    coverage, and triage existing review comments. Use when asked to "review
    this PR", "review PR #N", "check the PR", or "look at the PR feedback".
---

# PR Review

## Overview

This skill provides a structured workflow for reviewing pull requests against
QuickPress conventions. It prioritizes bugs, security risks, behavioral
regressions, and missing tests across the WordPress PHP backend and
React/TypeScript admin UI.

## Prerequisites

-   GitHub CLI (`gh`) authenticated

## Workflow

### Phase 1 - Gather Context

1. Get the PR diff: `gh pr diff <number>` or use GitHub MCP `get_diff`
2. Get all review threads: use GitHub MCP `get_review_comments`
3. Get PR check status: `gh pr checks <number>`
4. Identify changed areas and map them to architecture:
    - Backend services/routes: `includes/**`
    - Frontend/admin UI: `src/**`
    - Build/config/testing: `package.json`, `tests/**`, `e2e/**`, `webpack.config.js`

### Phase 2 - Automated Checks

Run these checks against the diff. Only check files that were modified in the PR.

#### Backend architecture and service wiring

-   If new backend functionality is introduced, verify service registration in
    `includes/Init.php`
-   Confirm no duplicate/side bootstrap logic bypassing service composition
-   Verify initialization order constraints remain intact

#### WordPress REST route security and validation

-   Confirm routes use
    `Includes\Utils\PermissionHelper::check_manage_options` in `permission_callback`
-   Confirm callbacks verify nonce with `PermissionHelper::verify_nonce($request)`
-   Validate route args include `sanitize_callback` and `validate_callback`
-   Flag missing capability checks, nonce checks, or weak validation

#### WordPress security hardening

-   Check SQL usage for prepared statements (`$wpdb->prepare`) where applicable
-   Check output escaping (`esc_html`, `esc_attr`, `wp_kses_post`) in admin/rendered output
-   Check input sanitization before persistence (`sanitize_text_field`, etc.)
-   Flag direct use of unsanitized `$_GET`, `$_POST`, or request data
-   Flag hardcoded secrets/tokens or insecure HTTP URLs

#### Data/config conventions

-   Verify simple settings respect grouped options conventions:
    `quickpress_license`, `quickpress_ai`, `quickpress_ui`
-   Verify complex entities follow hidden config CPT + meta conventions:
    `_quickpress_config_slug`, `_quickpress_config_data`
-   Flag schema drift or inconsistent storage paths

#### Frontend API and query boundaries

-   Confirm WordPress core entity calls align with `/wp/v2/...`
-   Confirm plugin endpoints use `quickpress/v1/...`
-   Confirm query serialization logic stays in `src/services/queryService.ts`
-   Flag endpoint/query logic embedded directly in components

#### TypeScript and React quality

-   Flag new `any` usage, unsafe casts, and type bypasses
-   Check hooks/effects for stale deps, duplicated state, and unnecessary rerenders
-   Check accessibility regressions (`aria-*`, keyboard nav, focus-visible)
-   Verify shared components/utilities are reused instead of duplicated

#### Styling consistency

-   Prefer semantic theme/CSS variable helpers from
    `src/features/shared/theme/cssVars.ts`
-   Prefer tokenized spacing/typography/radius from theme values
-   Flag hardcoded color literals when a token or semantic role exists
-   Verify behavior in both light and dark modes

#### Test and build coverage

-   Run or verify relevant checks:
    -   `yarn lint`
    -   `yarn type-check`
    -   `yarn test`
-   For PHP backend changes, ask for/verify WordPress runtime tests:
    `php tests/run-all-tests.php`
-   For high-risk UI/editor changes, recommend targeted e2e validation from `e2e/**`

#### CI status

-   Run `gh pr checks <number>` to verify CI status
-   If CI omits relevant checks for changed files, call that out as a review gap

### Phase 3 - Comment Triage

For each unresolved review thread on the PR:

1. Read the comment body and referenced code in the current diff
2. Categorize into one of three buckets:

    **Fix now**
    The comment identifies a correctness issue, bug risk, or convention violation
    that should be addressed before merge.

    **Note for later**
    The comment raises a valid but non-blocking improvement.

    **Ignore**
    The comment is a nitpick, outdated, or already addressed.

3. Reply to each thread with:
    - Category (fix now / note for later / ignore)
    - Brief reasoning
    - Suggested change for "fix now"
    - Tracking reference for "note for later"

### Phase 4 - Findings-First Summary

Present findings first, ordered by severity (`high`, `medium`, `low`).
Each finding should include:

-   Severity
-   File path
-   Risk or regression
-   Recommended fix

Then provide a compact table:

```text
| # | Severity | File | Finding | Action |
|---|----------|------|---------|--------|
| 1 | High | includes/Services/PostTypes/Routes.php | Missing nonce verification | Add PermissionHelper::verify_nonce($request) |
| 2 | Medium | src/features/posts/PostForm.tsx | Hardcoded color literal | Replace with cssVars token |
| 3 | Medium | src/services/postService.ts | Query logic leaked into component boundary | Move/normalize in queryService.ts |
| 4 | Low | src/features/shared/components/Button.tsx | Minor a11y labeling inconsistency | Align aria-label behavior |
```

After the table, include:

1. Open questions or assumptions
2. Test gaps (what was not run or not covered)
3. Brief change overview only after findings

## Reporting Rules

-   If no findings exist, explicitly state: `No material findings.`
-   Still report residual risks and unverified areas
-   Do not approve when critical checks are skipped for high-risk changes

## Example Commands

```bash
gh pr diff <number>
gh pr checks <number>
yarn lint
yarn type-check
yarn test
php tests/run-all-tests.php
```

## Notes

-   Always ask the user before resolving threads categorized as "ignore"
-   Always ask where to capture "note for later" items
-   Keep this skill aligned with:
    -   `.github/copilot-instructions.md`
    -   `.github/skills/quickpress-development/SKILL.md`
    -   `.cursor/skills/quickpress-styling/SKILL.md`
