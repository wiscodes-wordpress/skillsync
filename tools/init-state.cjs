#!/usr/bin/env node
/**
 * Write skeleton .harness/state.md for a new story or bug fix.
 *
 * Usage:
 *   node path/to/skillsync/tools/init-state.cjs [/path/to/consumer-repo] [--task "PROJECT-123 title"] [--mode story|bug] [--force]
 */

const fs = require('node:fs');
const {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
	statePath,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

/**
 * @param {string | undefined} task
 * @returns {string}
 */
function buildSkeleton(task) {
	const currentTask = task ?? '(set issue key and title)';
	return `# Harness state

## Current Task

${currentTask}

## Status

planning

## Spec Overview

(TBD — outcomes and constraints)

## Behavior & Test Contracts

#### B1
- **name:**
- **expectation:** step 1 > step 2 > assertion
- **red:**
- **layer:** unit
- **path:**
- **guard:**

## RED→GREEN Plan

### Cycle 1 — B1

| Field | Content |
|-------|---------|
| **Behavior ID** | B1 |
| **name** | |
| **expectation** | |
| **RED** | |
| **GREEN** | |
| **layer** | unit |
| **Risk** | low |

## Acceptance Criteria

### Cycle 1

- [ ] (test-first gate)

## Risk Register

- (none yet)

## Verification Plan

### Cycle 1

1. \`<scoped test command>\` → expect **FAIL** (RED)
2. (implement GREEN)
3. Same command → expect **PASS** (GREEN)

## Next Action

**Actor:** human  
**Do:** Run \`/ss-plan\` to complete Behavior & Test Contracts and RED→GREEN Plan (then \`/ss-implement\` walks all Remaining cycles).

## TDD Evidence

| Cycle | Behavior ID | RED cmd | RED fail snippet | GREEN cmd | GREEN | Test Δ | Re-break |
|-------|-------------|---------|------------------|-----------|-------|--------|----------|

## Last Critic Verdict

(none)

## Last Harness Output

(none)

## Completed / Remaining

**Completed:** (none)  
**Remaining:** Cycle 1
`;
}

/**
 * @param {string | undefined} task
 * @returns {string}
 */
function buildBugSkeleton(task) {
	const currentTask = task ?? '(set issue key and title)';
	return `# Harness state

## Current Task

${currentTask}

## Status

investigating

## Tier

standard

## Root Cause

- **Symptom:** (what the user sees)
- **Mechanism:** (incorrect assumption / invariant / data path)
- **Fix class:** corrects mechanism | masks symptom (justify if latter)

## Hypotheses

1. (falsifiable — If X, then changing Y will …)

## Investigation Evidence

| Step | Command / script | Outcome | Snippet |
|------|------------------|---------|---------|
| 1 | \`<repro command>\` | FAIL | |

## Verification Plan

1. \`<repro command>\` → expect **FAIL** (before fix)
2. (apply fix)
3. Same command → expect **PASS** (after fix)

## Regression Evidence

| Test / repro | Command | Before | After |
|--------------|---------|--------|-------|
| | | FAIL | |

## Surface-fix veto

- [ ] Fix addresses mechanism, not only symptom site
- [ ] Same pattern checked elsewhere (grep / GitNexus)
- [ ] All \`[DEBUG-*]\` removed

## Next Action

**Actor:** harness-bug-fix  
**Do:** Build repro loop (diagnose Phase 1–2); fill Investigation Evidence before root-cause gate.

## Last Critic Verdict

(none)

## Completed / Remaining

**Completed:** (none)  
**Remaining:** repro → root cause → fix → regression → review
`;
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const task = typeof flags.task === 'string' ? flags.task : undefined;
	const mode = String(flags.mode ?? 'story');
	const force = Boolean(flags.force);
	const file = statePath(consumerRoot);

	assertOrExit(
		['story', 'bug'].includes(mode),
		`Invalid --mode "${mode}". Use story or bug.`,
	);

	fs.mkdirSync(harnessDir(consumerRoot), { recursive: true });

	if (fs.existsSync(file)) {
		const existing = fs.readFileSync(file, 'utf8').trim();
		if (existing && !force) {
			console.error(
				`Refusing to overwrite non-empty ${file}. Pass --force to replace.`,
			);
			process.exit(1);
		}
	}

	const skeleton = mode === 'bug' ? buildBugSkeleton(task) : buildSkeleton(task);
	fs.writeFileSync(file, skeleton, 'utf8');
	console.log(`init-state (${mode}): wrote ${file}`);
}

main();
