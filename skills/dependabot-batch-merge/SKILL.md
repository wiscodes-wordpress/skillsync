---
name: dependabot-batch-merge
description: 'Use when handling Dependabot updates in this repository, including: listing pending dependabot branches, sorting oldest-to-newest, checking for breaking changes, merging one-by-one, validating with yarn install/build/type-check/test, running runtime smoke checks for console errors, and pushing main only when checks pass.'
---

# Dependabot Batch Merge

Use this skill for safe, repeatable Dependabot processing in QuickPress.

## When To Use

-   The user asks to "check Dependabot", "merge Dependabot", or "process dependency update branches".
-   The user wants oldest-to-newest merge ordering.
-   The user asks to detect potential breaking changes before merge.

## Preflight Checklist

Run these checks before collecting branches:

1. Ensure current branch is `main`.
2. Ensure working tree is clean (`git status --porcelain` is empty).
3. Ensure no in-progress operations (`MERGE_HEAD`, rebase state) exist.
4. Ensure local `main` is up to date with `origin/main` using fast-forward only.

## Safety Rules

1. Always work on `main` and ensure clean working tree first.
2. Always `git fetch origin --prune` before planning merges.
3. Only process `origin/dependabot/*` branches that are ahead of `main`.
4. Merge one branch at a time.
5. After each merge, run:

    - `yarn install --frozen-lockfile`
    - `yarn build`
    - `yarn type-check`
    - `yarn test -- --runInBand`

6. Run a runtime smoke check on QuickPress UI and confirm no new console errors.
7. Push `main` only when all checks pass for that branch.
8. Stop immediately on conflict or failed validation and report the failing branch.
9. If branch is already deleted on remote, report as already merged/closed.

## Risk Classification

Classify each branch before merge:

-   Low risk: patch/minor version bumps in leaf dependencies.
-   High risk: major version bumps, build-tooling updates, test-runner updates, webpack/babel/eslint/typescript toolchain changes, and WordPress core package jumps (`@wordpress/*`).

For high-risk branches, require all validations plus explicit runtime console smoke confirmation before push.

## Required Flow

1. Run preflight checks:

```bash
git rev-parse --abbrev-ref HEAD
git status --porcelain
test ! -f .git/MERGE_HEAD
test ! -d .git/rebase-merge
test ! -d .git/rebase-apply
git fetch origin --prune
git pull --ff-only origin main
```

2. Collect pending branches:

```bash
git fetch origin --prune
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/dependabot); do
  c=$(git rev-list --count main.."$b")
  if [ "$c" -gt 0 ]; then
    ts=$(git log -1 --format=%ct "$b")
    echo "$ts|$b|$c"
  fi
done | sort -n
```

3. For each branch in sorted order:

```bash
git merge --no-ff --no-edit <branch>
yarn install --frozen-lockfile
yarn build
yarn type-check
yarn test -- --runInBand
git push origin main
```

4. Runtime smoke validation (before push):

-   Open QuickPress admin page and exercise the changed surface area.
-   Check browser DevTools console and confirm no new red errors.
-   If browser automation is unavailable, explicitly ask the user to perform this check and confirm before push.

5. If merge conflict occurs:

-   Report exact conflicted files.
-   Allowed auto-resolution scope: `package.json` and `yarn.lock` only.
-   If conflicts include any other files, stop and ask the user before continuing.
-   Re-run validations before push.
-   If uncertain, ask user before continuing.

6. If validation fails before push:

-   Stop immediately.
-   Report failing command and concise error summary.
-   Keep state for inspection.
-   If user asks to rollback, run:

```bash
git merge --abort || true
git rebase --abort || true
git reset --hard origin/main
git clean -fd
```

## Completion Criteria

A branch is complete only when all are true:

1. Merge commit created (or explicitly skipped as already merged/deleted).
2. Install/build/type-check/test all pass.
3. Runtime smoke check confirms no new console errors.
4. Push succeeded.

Batch is complete only when final sync check passes:

```bash
git rev-parse HEAD
git rev-parse origin/main
```

These hashes must match.

## Execution Mode

Follow this skill directly in chat/tool execution.
Do not depend on standalone helper scripts for this workflow.

## Output Format

After each branch, report:

1. Branch name
2. Merge status (merged/skipped/failed)
3. Validation results (install/build/type-check/test + runtime console check)
4. Push status

At the end, provide a concise summary:

-   Merged branches
-   Skipped branches
-   Failed branches with reason
-   Final sync status (`main` equals `origin/main` or not)
