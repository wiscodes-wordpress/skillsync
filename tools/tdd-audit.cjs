#!/usr/bin/env node
/**
 * TDD hard gates — maps to harness/critic-tdd-testing.md Step 2–3.
 *
 * Usage:
 *   node path/to/skillsync/tools/tdd-audit.cjs [/path/to/consumer-repo] [--base main] [--strict-warn]
 */

const {
	parseArgs,
	resolveConsumerRoot,
	readState,
	readOptionalConfig,
	runCommand,
	gitMergeBase,
	hasSection,
	parseMarkdownSections,
} = require('./lib/ss-tools.cjs');

const TEST_GLOB =
	"*.test.* *.spec.* __tests__/* e2e/* tests/*";

const PROD_SKIP = [
	/\.test\./,
	/\.spec\./,
	/__tests__\//,
	/\/e2e\//,
	/\/tests\//,
	/\.md$/,
	/\.snap$/,
	/package-lock\.json$/,
	/yarn\.lock$/,
];

/**
 * @param {string} file
 * @returns {boolean}
 */
function isTestPath(file) {
	return (
		/\.test\./.test(file) ||
		/\.spec\./.test(file) ||
		file.includes('__tests__/') ||
		file.includes('/e2e/') ||
		file.startsWith('e2e/') ||
		(file.includes('/tests/') && !file.includes('node_modules'))
	);
}

/**
 * @param {string} file
 * @returns {boolean}
 */
function isProdPath(file) {
	if (isTestPath(file)) {
		return false;
	}
	return !PROD_SKIP.some((re) => re.test(file));
}

/**
 * @param {string} diff
 * @returns {{ removedTests: number; removedExpect: number; skipAdded: boolean; expectDelta: number }}
 */
function analyzeTestDiff(diff) {
	let removedTests = 0;
	let removedExpect = 0;
	let skipAdded = false;
	let expectAdded = 0;
	let expectRemoved = 0;

	for (const line of diff.split('\n')) {
		if (line.startsWith('-') && !line.startsWith('---')) {
			const content = line.slice(1);
			if (/\b(it|test)\s*\(/.test(content)) {
				removedTests++;
			}
			const expects = content.match(/expect\s*\(/g);
			if (expects) {
				expectRemoved += expects.length;
			}
		}
		if (line.startsWith('+') && !line.startsWith('+++')) {
			const content = line.slice(1);
			if (/\.(skip|only)\s*\(|^\s*(xit|xtest|fit|fdescribe)\s*\(/.test(content)) {
				skipAdded = true;
			}
			const expects = content.match(/expect\s*\(/g);
			if (expects) {
				expectAdded += expects.length;
			}
		}
	}

	return {
		removedTests,
		removedExpect: expectRemoved,
		skipAdded,
		expectDelta: expectAdded - expectRemoved,
	};
}

/**
 * @param {string | null} state
 * @returns {string[]}
 */
function auditRedEvidence(state) {
	/** @type {string[]} */
	const errors = [];
	if (!state || !hasSection(state, 'TDD Evidence')) {
		return errors;
	}

	const sections = parseMarkdownSections(state);
	const table = sections.get('TDD Evidence') ?? '';
	const rows = table.split('\n').filter((line) => line.startsWith('|') && !line.includes('---'));
	for (const row of rows.slice(1)) {
		const cols = row.split('|').map((c) => c.trim()).filter(Boolean);
		if (cols.length < 4) {
			continue;
		}
		const cycle = cols[0];
		if (!cycle || cycle === 'Cycle') {
			continue;
		}
		const redCmd = cols[2] ?? '';
		const redSnippet = cols[3] ?? '';
		const green = cols[5] ?? cols[4] ?? '';
		if (green && green.toLowerCase() !== 'green' && !green.includes('PASS')) {
			if (!redCmd || redCmd === '(pending)') {
				errors.push(`Cycle ${cycle}: missing RED cmd in TDD Evidence`);
			}
			if (!redSnippet || redSnippet === '(pending)') {
				errors.push(`Cycle ${cycle}: missing RED fail snippet in TDD Evidence`);
			}
		}
	}

	return errors;
}

/**
 * @param {string} diff
 * @returns {string[]}
 */
function auditLocators(diff) {
	/** @type {string[]} */
	const warnings = [];
	const patterns = [
		/data-testid/,
		/getByTestId/,
		/querySelector\s*\(/,
		/xpath/i,
	];
	for (const line of diff.split('\n')) {
		if (!line.startsWith('+') || line.startsWith('+++')) {
			continue;
		}
		for (const re of patterns) {
			if (re.test(line)) {
				warnings.push(`Locator signal in diff: ${line.trim()}`);
				break;
			}
		}
	}
	return warnings;
}

/**
 * @param {string[]} paths
 * @returns {string[]}
 */
function routeCriticModules(paths) {
	/** @type {Set<string>} */
	const modules = new Set();
	for (const p of paths) {
		if (/\.(php|inc)$/.test(p) || p.includes('/includes/')) {
			modules.add('critic-backend.md');
		}
		if (/\.(tsx?|jsx?|vue|svelte)$/.test(p) && !isTestPath(p)) {
			modules.add('critic-frontend.md');
		}
		if (/block\.json|theme\.json|patterns\/|templates\//.test(p)) {
			modules.add('critic-blocks.md');
		}
		if (isTestPath(p) && !p.includes('/e2e/') && !p.startsWith('e2e/')) {
			modules.add('critic-unit-testing.md');
		}
		if (p.includes('/e2e/') || p.startsWith('e2e/')) {
			modules.add('critic-e2e-testing.md');
		}
	}
	return [...modules];
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const config = readOptionalConfig(consumerRoot);
	const base =
		(typeof flags.base === 'string' && flags.base) ||
		config?.prBaseBranch ||
		'main';
	const strictWarn = Boolean(flags['strict-warn']);

	const mergeBase = gitMergeBase(consumerRoot, base);
	const nameOnly = runCommand(
		consumerRoot,
		`git diff --name-only ${mergeBase}...HEAD`,
	);
	const changedPaths = nameOnly.stdout
		.split('\n')
		.map((p) => p.trim())
		.filter(Boolean);

	const testDiff = runCommand(
		consumerRoot,
		`git diff ${mergeBase}...HEAD -- ${TEST_GLOB}`,
	);
	const fullDiff = testDiff.stdout;

	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	const analysis = analyzeTestDiff(fullDiff);
	if (analysis.removedTests > 0) {
		errors.push(`Removed ${analysis.removedTests} test case(s) in diff`);
	}
	if (analysis.expectDelta < 0) {
		errors.push(`Net fewer expect() assertions (${analysis.expectDelta})`);
	}
	if (analysis.skipAdded) {
		errors.push('Added .skip / xit / fit in test diff');
	}

	const prodChanged = changedPaths.filter(isProdPath);
	const testChanged = changedPaths.filter(isTestPath);
	if (testChanged.length > 0 && prodChanged.length === 0) {
		const state = readState(consumerRoot);
		const contractChange =
			state?.includes('# contract-change') ||
			state?.includes('contract-change') ||
			(state && parseMarkdownSections(state).get('Remaining')?.includes('contract'));
		if (!contractChange) {
			errors.push('Test-only GREEN: diff has test files but zero production paths');
		}
	}

	errors.push(...auditRedEvidence(readState(consumerRoot)));
	warnings.push(...auditLocators(fullDiff));

	const modules = routeCriticModules(changedPaths);
	if (modules.length > 0) {
		console.log('Optional critic modules for this diff:');
		for (const m of modules) {
			console.log(`  - ${m}`);
		}
		console.log('');
	}

	for (const w of warnings) {
		console.warn(`WARN: ${w}`);
	}

	if (errors.length > 0) {
		console.error('tdd-audit: FAILED');
		for (const e of errors) {
			console.error(`  - ${e}`);
		}
		process.exit(1);
	}

	if (warnings.length > 0 && strictWarn) {
		console.error('tdd-audit: warnings treated as failure (--strict-warn)');
		process.exit(2);
	}

	console.log('tdd-audit: OK');
}

main();
