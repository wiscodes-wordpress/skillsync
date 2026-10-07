#!/usr/bin/env node
/**
 * TDD hard gates — maps to harness/critic-tdd-testing.md Step 1–3.
 *
 * Usage:
 *   node path/to/skillsync/tools/tdd-audit.cjs [/path/to/consumer-repo] [--base main] [--strict-warn]
 *
 * Diff scope: working tree vs merge-base with `--base` (includes uncommitted WIP).
 * Triple-dot `…HEAD` alone is too narrow for mid-story `/ss-review`.
 *
 * Contract cards under ## Behavior & Test Contracts (#### B1 + **name:** / **expectation:**)
 * are parsed; completed cycles must show matching **name** (and preferably **path**) in the
 * test diff. Incomplete card shape fails when a card looks filled-in.
 */

const fs = require('node:fs');
const path = require('node:path');
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

// Monorepo-safe: include nested plugin test trees (e.g. quickpress/tests/), not only repo-root tests/.
const TEST_GLOB =
	'*.test.* *.spec.* __tests__/* e2e/* tests/* ":(glob)**/tests/**" ":(glob)**/*Test.php"';

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
 * @typedef {object} ContractCard
 * @property {string} id
 * @property {string} name
 * @property {string} expectation
 * @property {string} red
 * @property {string} layer
 * @property {string} path
 * @property {string} locator
 * @property {string} guard
 */

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
 * @param {string} value
 * @returns {string}
 */
function stripTicks(value) {
	return value.replace(/^`+|`+$/g, '').trim();
}

/**
 * @param {string} expectation
 * @returns {string}
 */
function expectationLastHop(expectation) {
	const parts = expectation
		.split(/\s*>\s*/)
		.map((s) => s.trim())
		.filter(Boolean);
	return parts.length > 0 ? parts[parts.length - 1] : '';
}

/**
 * Parse Behavior & Test Contract cards (`#### B1` + category bullets).
 * Falls back to legacy wide tables when no cards exist.
 *
 * @param {string | null} state
 * @returns {ContractCard[]}
 */
function parseContractCards(state) {
	if (!state || !hasSection(state, 'Behavior & Test Contracts')) {
		return [];
	}

	const body = parseMarkdownSections(state).get('Behavior & Test Contracts') ?? '';
	/** @type {ContractCard[]} */
	const cards = [];

	const cardChunks = body.split(/^#{3,4}\s+/m).slice(1);
	for (const chunk of cardChunks) {
		const lines = chunk.split('\n');
		const heading = (lines[0] ?? '').trim();
		if (/^Behaviors\b/i.test(heading) || /^Test contracts\b/i.test(heading)) {
			continue;
		}
		if (/^E2E spines\b/i.test(heading) || /^Non-goals\b/i.test(heading)) {
			continue;
		}

		const idMatch = heading.match(/\b([BS]\d+)\b/i);
		if (!idMatch) {
			continue;
		}
		const id = idMatch[1].toUpperCase();

		/** @type {Record<string, string>} */
		const fields = {};
		for (const line of lines.slice(1)) {
			// Accept **name:** value (colon inside bold) or **name**: value
			const m = line.match(
				/^\s*[-*]\s*\*\*([A-Za-z][A-Za-z0-9_-]*):?\*\*\s*:?\s*(.*)$/,
			);
			if (m) {
				fields[m[1].toLowerCase()] = m[2].trim();
			}
		}

		cards.push({
			id,
			name: fields.name ?? '',
			expectation: fields.expectation ?? '',
			red: fields.red ?? '',
			layer: fields.layer ?? '',
			path: stripTicks(fields.path ?? ''),
			locator: fields.locator ?? '',
			guard: fields.guard ?? '',
		});
	}

	if (cards.length > 0) {
		return cards;
	}

	// Legacy table: | ID | Behavior | RED expectation | … | Test file |
	for (const line of body.split('\n')) {
		if (!line.startsWith('|') || line.includes('---')) {
			continue;
		}
		const cols = line
			.split('|')
			.map((c) => c.trim())
			.filter(Boolean);
		if (cols.length < 2) {
			continue;
		}
		const id = cols[0];
		if (!/^[BS]\d+$/i.test(id) || /^id$/i.test(id) || /behavior id/i.test(id)) {
			continue;
		}
		cards.push({
			id: id.toUpperCase(),
			name: cols[1] ?? '',
			expectation: cols[2] ?? cols[1] ?? '',
			red: cols[2] ?? '',
			layer: cols.find((c) => /unit|integration|e2e/i.test(c)) ?? '',
			path: stripTicks(cols[cols.length - 1] ?? ''),
			locator: '',
			guard: '',
		});
	}

	return cards;
}

/**
 * @param {ContractCard} card
 * @returns {boolean}
 */
function cardLooksFilled(card) {
	return Boolean(
		card.name ||
			card.expectation ||
			card.red ||
			card.path ||
			card.guard ||
			card.locator,
	);
}

/**
 * @param {string | null} state
 * @returns {string[]} Cycle numbers as strings ("1", "2")
 */
function parseCompletedCycleNumbers(state) {
	if (!state) {
		return [];
	}
	const m = state.match(/\*\*Completed:\*\*\s*([^\n]+)/i);
	if (!m) {
		return [];
	}
	const value = m[1].trim();
	if (!value || /\(none\)/i.test(value)) {
		return [];
	}
	return [...value.matchAll(/Cycle\s+(\d+)/gi)].map((x) => x[1]);
}

/**
 * Map cycle number → Behavior ID from RED→GREEN Plan headings / tables.
 *
 * @param {string | null} state
 * @returns {Map<string, string>}
 */
function parseCycleBehaviorMap(state) {
	/** @type {Map<string, string>} */
	const map = new Map();
	if (!state || !hasSection(state, 'RED→GREEN Plan')) {
		return map;
	}

	const body = parseMarkdownSections(state).get('RED→GREEN Plan') ?? '';
	const blocks = body.split(/^###\s+/m).slice(1);
	for (const block of blocks) {
		const lines = block.split('\n');
		const heading = (lines[0] ?? '').trim();
		const cycleMatch = heading.match(/^Cycle\s+(\d+)/i);
		if (!cycleMatch) {
			continue;
		}
		const cycle = cycleMatch[1];
		let behaviorId = '';
		const fromHeading = heading.match(/\b([BS]\d+)\b/i);
		if (fromHeading) {
			behaviorId = fromHeading[1].toUpperCase();
		}
		for (const line of lines.slice(1)) {
			const tableId = line.match(
				/\|\s*\*\*Behavior ID\*\*\s*\|\s*([BS]\d+)\s*\|/i,
			);
			if (tableId) {
				behaviorId = tableId[1].toUpperCase();
				break;
			}
		}
		if (behaviorId) {
			map.set(cycle, behaviorId);
		}
	}

	return map;
}

/**
 * Deferred behaviors listed under Remaining (explicit defer / contract-change).
 *
 * @param {string | null} state
 * @returns {Set<string>}
 */
function parseDeferredBehaviorIds(state) {
	/** @type {Set<string>} */
	const deferred = new Set();
	if (!state) {
		return deferred;
	}
	const section =
		(parseMarkdownSections(state).get('Completed / Remaining') ?? '') +
		'\n' +
		state;
	for (const m of section.matchAll(
		/\b([BS]\d+)\b[^\n]{0,60}\b(defer(?:red)?|contract-change)\b/gi,
	)) {
		deferred.add(m[1].toUpperCase());
	}
	for (const m of section.matchAll(
		/\b(defer(?:red)?|contract-change)\b[^\n]{0,60}\b([BS]\d+)\b/gi,
	)) {
		deferred.add(m[2].toUpperCase());
	}
	return deferred;
}

/**
 * @param {ContractCard[]} cards
 * @returns {{ errors: string[]; warnings: string[] }}
 */
function auditContractShape(cards) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	for (const card of cards) {
		if (!cardLooksFilled(card)) {
			continue;
		}
		if (!card.name) {
			errors.push(`${card.id}: contract card missing **name:**`);
		}
		if (!card.expectation) {
			errors.push(`${card.id}: contract card missing **expectation:**`);
		} else if (!card.expectation.includes('>')) {
			warnings.push(
				`${card.id}: **expectation:** should be a step chain (step 1 > step 2 > assertion)`,
			);
		}
		if (!card.layer) {
			warnings.push(`${card.id}: contract card missing **layer:**`);
		}
		if (!card.path) {
			warnings.push(`${card.id}: contract card missing **path:**`);
		}
	}

	return { errors, warnings };
}

/**
 * Step 1 — completed cycles must land **name** (and preferably **path**) in the test diff.
 *
 * @param {string | null} state
 * @param {string} testDiff
 * @param {string[]} changedTestPaths
 * @returns {{ errors: string[]; warnings: string[] }}
 */
function auditContractsVsDiff(state, testDiff, changedTestPaths) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	const cards = parseContractCards(state);
	const shape = auditContractShape(cards);
	errors.push(...shape.errors);
	warnings.push(...shape.warnings);

	const completed = parseCompletedCycleNumbers(state);
	if (completed.length === 0) {
		return { errors, warnings };
	}

	const cycleMap = parseCycleBehaviorMap(state);
	const deferred = parseDeferredBehaviorIds(state);
	const byId = new Map(cards.map((c) => [c.id, c]));
	const diffLower = testDiff.toLowerCase();
	const pathsNormalized = changedTestPaths.map((p) => p.replace(/\\/g, '/'));

	for (const cycle of completed) {
		const behaviorId = cycleMap.get(cycle);
		if (!behaviorId) {
			warnings.push(
				`Cycle ${cycle}: completed but no Behavior ID found in RED→GREEN Plan`,
			);
			continue;
		}
		if (deferred.has(behaviorId)) {
			continue;
		}
		const card = byId.get(behaviorId);
		if (!card) {
			errors.push(
				`Cycle ${cycle} (${behaviorId}): completed but missing Behavior & Test Contract card`,
			);
			continue;
		}
		if (!card.name) {
			continue;
		}
		if (!diffLower.includes(card.name.toLowerCase())) {
			errors.push(
				`Cycle ${cycle} (${behaviorId}): **name** not found in test diff: "${card.name}"`,
			);
		}

		const lastHop = expectationLastHop(card.expectation);
		if (lastHop && lastHop.length >= 4) {
			const tokens = lastHop
				.toLowerCase()
				.split(/[^a-z0-9]+/)
				.filter((t) => t.length >= 4);
			const hit = tokens.some((t) => diffLower.includes(t));
			if (tokens.length > 0 && !hit) {
				warnings.push(
					`Cycle ${cycle} (${behaviorId}): last **expectation** hop not obviously asserted in diff (“${lastHop}”)`,
				);
			}
		}

		if (card.path) {
			const target = card.path.replace(/\\/g, '/');
			const baseName = target.split('/').pop() ?? target;
			const pathHit = pathsNormalized.some(
				(p) => p === target || p.endsWith('/' + target) || p.endsWith(baseName),
			);
			if (!pathHit && changedTestPaths.length > 0) {
				warnings.push(
					`Cycle ${cycle} (${behaviorId}): proposed **path** ${card.path} not in changed test files`,
				);
			}
		}
	}

	return { errors, warnings };
}

const TEST_CASE_RE = /\b(it|test)\s*\(/;

/** Title of an `it(` / `test(` line, for reporting renames. */
function testTitle(content) {
	const m = content.match(/\b(?:it|test)\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/);
	return m ? m[2].replace(/\\(.)/g, '$1') : content.trim();
}

/**
 * A test removed and another added in the same hunk is a rename, not a deletion:
 * only removals beyond the hunk's additions count toward `removedTests`.
 * @param {string} diff
 * @returns {{ removedTests: number; renamedTests: string[]; removedExpect: number; skipAdded: boolean; expectDelta: number }}
 */
function analyzeTestDiff(diff) {
	let removedTests = 0;
	/** @type {string[]} */
	const renamedTests = [];
	let skipAdded = false;
	let expectAdded = 0;
	let expectRemoved = 0;
	/** @type {string[]} */
	let hunkRemoved = [];
	/** @type {string[]} */
	let hunkAdded = [];

	const closeHunk = () => {
		const pairs = Math.min(hunkRemoved.length, hunkAdded.length);
		for (let i = 0; i < pairs; i++) {
			renamedTests.push(`${hunkRemoved[i]} → ${hunkAdded[i]}`);
		}
		removedTests += hunkRemoved.length - pairs;
		hunkRemoved = [];
		hunkAdded = [];
	};

	for (const line of diff.split('\n')) {
		if (line.startsWith('@@') || line.startsWith('diff --git')) {
			closeHunk();
			continue;
		}
		if (line.startsWith('-') && !line.startsWith('---')) {
			const content = line.slice(1);
			if (TEST_CASE_RE.test(content)) {
				hunkRemoved.push(testTitle(content));
			}
			const expects = content.match(/expect\s*\(/g);
			if (expects) {
				expectRemoved += expects.length;
			}
		}
		if (line.startsWith('+') && !line.startsWith('+++')) {
			const content = line.slice(1);
			if (TEST_CASE_RE.test(content)) {
				hunkAdded.push(testTitle(content));
			}
			if (/\.(skip|only)\s*\(|^\s*(xit|xtest|fit|fdescribe)\s*\(/.test(content)) {
				skipAdded = true;
			}
			const expects = content.match(/expect\s*\(/g);
			if (expects) {
				expectAdded += expects.length;
			}
		}
	}
	closeHunk();

	return {
		removedTests,
		renamedTests,
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
	const rows = table
		.split('\n')
		.filter((line) => line.startsWith('|') && !line.includes('---'));
	for (const row of rows.slice(1)) {
		const cols = row
			.split('|')
			.map((c) => c.trim())
			.filter(Boolean);
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
	const patterns = [/data-testid/, /getByTestId/, /querySelector\s*\(/, /xpath/i];
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
	// Working tree vs merge-base (not triple-dot …HEAD): uncommitted implement/review
	// work must be auditable. Committed branch changes are included too.
	const nameOnly = runCommand(
		consumerRoot,
		`git diff --name-only ${mergeBase}`,
	);
	const untracked = runCommand(
		consumerRoot,
		'git ls-files --others --exclude-standard',
	);
	const changedPaths = [
		...nameOnly.stdout.split('\n'),
		...untracked.stdout.split('\n'),
	]
		.map((p) => p.trim())
		.filter(Boolean);

	const testDiff = runCommand(
		consumerRoot,
		`git diff ${mergeBase} -- ${TEST_GLOB}`,
	);
	/** @type {string[]} */
	const untrackedTestChunks = [];
	for (const rel of changedPaths.filter(isTestPath)) {
		const tracked = runCommand(consumerRoot, `git ls-files --error-unmatch -- "${rel}"`);
		if (tracked.status === 0) {
			continue;
		}
		const abs = path.join(consumerRoot, rel);
		try {
			const body = fs.readFileSync(abs, 'utf8');
			untrackedTestChunks.push(`--- /dev/null\n+++ b/${rel}\n${body}`);
		} catch {
			// skip unreadable
		}
	}
	const fullDiff = [testDiff.stdout, ...untrackedTestChunks].filter(Boolean).join('\n');

	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	const analysis = analyzeTestDiff(fullDiff);
	if (analysis.removedTests > 0) {
		errors.push(`Removed ${analysis.removedTests} test case(s) in diff`);
	}
	for (const rename of analysis.renamedTests) {
		warnings.push(`Renamed test (confirm same behavior): ${rename}`);
	}
	if (analysis.expectDelta < 0) {
		errors.push(`Net fewer expect() assertions (${analysis.expectDelta})`);
	}
	if (analysis.skipAdded) {
		errors.push('Added .skip / xit / fit in test diff');
	}

	const prodChanged = changedPaths.filter(isProdPath);
	const testChanged = changedPaths.filter(isTestPath);
	const state = readState(consumerRoot);

	if (testChanged.length > 0 && prodChanged.length === 0) {
		const contractChange =
			state?.includes('# contract-change') ||
			state?.includes('contract-change') ||
			(state &&
				parseMarkdownSections(state)
					.get('Remaining')
					?.includes('contract'));
		if (!contractChange) {
			errors.push(
				'Test-only GREEN: diff has test files but zero production paths',
			);
		}
	}

	const contractAudit = auditContractsVsDiff(state, fullDiff, testChanged);
	errors.push(...contractAudit.errors);
	warnings.push(...contractAudit.warnings);

	errors.push(...auditRedEvidence(state));
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

if (require.main === module) {
	main();
}

module.exports = {
	parseContractCards,
	expectationLastHop,
	parseCompletedCycleNumbers,
	parseCycleBehaviorMap,
	auditContractShape,
	auditContractsVsDiff,
	analyzeTestDiff,
	auditRedEvidence,
};
