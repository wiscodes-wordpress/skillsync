#!/usr/bin/env node
/**
 * Validate .harness/state.md section contract.
 *
 * Usage:
 *   node path/to/skillsync/tools/validate-state.cjs [/path/to/consumer-repo] [--mode plan|implement|review|bug-fix]
 */

const fs = require('node:fs');
const {
	parseArgs,
	resolveConsumerRoot,
	statePath,
	countHeading,
	hasSection,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

/** @param {string} content */
/** @param {string} mode */
function validate(content, mode) {
	/** @type {string[]} */
	const errors = [];

	const nextActionCount = countHeading(content, 'Next Action');
	if (nextActionCount === 0) {
		errors.push('Missing required section: ## Next Action');
	} else if (nextActionCount > 1) {
		errors.push(`Duplicate ## Next Action (${nextActionCount} found; expected exactly 1)`);
	}

	if (mode === 'plan') {
		if (!hasSection(content, 'Spec Overview')) {
			errors.push('Missing required section: ## Spec Overview');
		}

		const hasTddContracts = hasSection(content, 'Behavior & Test Contracts');
		const hasSprintPlan = hasSection(content, 'Sprint Plan');
		if (!hasTddContracts && !hasSprintPlan) {
			errors.push(
				'Missing plan slice section: ## Behavior & Test Contracts or ## Sprint Plan',
			);
		}

		const hasRedGreen = hasSection(content, 'RED→GREEN Plan');
		if (!hasRedGreen && !hasSprintPlan) {
			errors.push('Missing plan slice section: ## RED→GREEN Plan or ## Sprint Plan');
		}

		if (!hasSection(content, 'Acceptance Criteria')) {
			errors.push('Missing required section: ## Acceptance Criteria');
		}
		if (!hasSection(content, 'Verification Plan')) {
			errors.push('Missing required section: ## Verification Plan');
		}
	}

	if (mode === 'implement' || mode === 'review') {
		const hasCurrentTask = hasSection(content, 'Current Task');
		const hasNextAction = nextActionCount >= 1;
		if (!hasCurrentTask && !hasNextAction) {
			errors.push('Missing ## Current Task or ## Next Action (implement/review mode)');
		}
		if (!hasSection(content, 'Verification Plan')) {
			errors.push('Missing required section: ## Verification Plan');
		}
	}

	if (mode === 'review') {
		const hasTddPlan =
			hasSection(content, 'RED→GREEN Plan') ||
			hasSection(content, 'Behavior & Test Contracts');
		if (hasTddPlan && !hasSection(content, 'TDD Evidence')) {
			errors.push(
				'TDD plan present but missing ## TDD Evidence (review mode)',
			);
		}
	}

	if (mode === 'bug-fix') {
		if (!hasSection(content, 'Current Task')) {
			errors.push('Missing required section: ## Current Task');
		}
		if (!hasSection(content, 'Root Cause')) {
			errors.push('Missing required section: ## Root Cause');
		}
		if (!hasSection(content, 'Investigation Evidence')) {
			errors.push('Missing required section: ## Investigation Evidence');
		}
		if (!hasSection(content, 'Verification Plan')) {
			errors.push('Missing required section: ## Verification Plan');
		}
		if (!hasSection(content, 'Regression Evidence')) {
			errors.push('Missing required section: ## Regression Evidence');
		}
		if (!hasSection(content, 'Surface-fix veto')) {
			errors.push('Missing required section: ## Surface-fix veto');
		}
	}

	return errors;
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const mode = String(flags.mode ?? 'plan');
	const file = statePath(consumerRoot);

	assertOrExit(
		['plan', 'implement', 'review', 'bug-fix'].includes(mode),
		`Invalid --mode "${mode}". Use plan, implement, review, or bug-fix.`,
	);

	if (!fs.existsSync(file)) {
		console.error(`Missing ${file}`);
		process.exit(1);
	}

	const content = fs.readFileSync(file, 'utf8').trim();
	if (!content) {
		console.error('state.md is empty');
		process.exit(1);
	}

	const errors = validate(content, mode);
	if (errors.length > 0) {
		console.error(`validate-state (${mode}): FAILED`);
		for (const err of errors) {
			console.error(`  - ${err}`);
		}
		process.exit(1);
	}

	console.log(`validate-state (${mode}): OK`);
}

main();
