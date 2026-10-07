#!/usr/bin/env node
/**
 * Watch a pull request's CI checks; optionally let a fresh agent fix failures and push.
 *
 * Usage:
 *   node path/to/skillsync/tools/pr-watch.cjs [/path/to/repo] [--pr 42 | --branch feature/x]
 *     [--fix] [--max-fixes 3] [--interval 60] [--once] [--json] [--dry-run]
 *
 * Defaults to the PR for the current branch. Prints one line per state change and exits
 * when the PR is merged or closed (or after one check with --once).
 *
 * --fix   on failing checks, run one fix agent per head commit (needs a clean checkout on
 *         the PR branch), then commit "Fix CI: …" and push. Capped by --max-fixes.
 *
 * Test hook: --fixture <file.json> summarizes saved `gh pr view --json` output instead of
 * calling GitHub (implies --once).
 *
 * Exit codes: 0 merged / green with --once, 1 usage or gh error, 2 closed, 3 failing and
 * not fixed (--once, or --max-fixes reached).
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs, resolveConsumerRoot, harnessDir, readOptionalConfig, runCommand } = require('./lib/ss-tools.cjs');
const { summarizePr, fetchPr } = require('./lib/pr-checks.cjs');
const { fixFailingChecks } = require('./lib/pr-fix.cjs');

/** @param {number} ms */
function sleep(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * @param {import('./lib/pr-checks.cjs').PrSummary} pr
 * @returns {string}
 */
function describe(pr) {
	const head = `PR #${pr.number ?? '?'} (${pr.branch} @ ${pr.headSha.slice(0, 7)})`;
	switch (pr.state) {
		case 'failing':
			return `${head}: failing — ${pr.failing.map((c) => c.name).join(', ')}`;
		case 'pending':
			return `${head}: pending — ${pr.pending.length} running`;
		default:
			return `${head}: ${pr.state}`;
	}
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	if (flags.help) {
		console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
		return;
	}
	const root = resolveConsumerRoot(positional[0]);
	const once = Boolean(flags.once || flags.fixture);
	const asJson = Boolean(flags.json);
	const fix = Boolean(flags.fix);
	const dryRun = Boolean(flags['dry-run']);
	const maxFixes = Number(flags['max-fixes'] ?? 3);
	const intervalMs = Number(flags.interval ?? 60) * 1000;
	const config = readOptionalConfig(root);
	const logDir = path.join(harnessDir(root), 'pr-watch');

	const ref =
		(typeof flags.pr === 'string' && flags.pr) ||
		(typeof flags.branch === 'string' && flags.branch) ||
		runCommand(root, 'git rev-parse --abbrev-ref HEAD').stdout.trim();

	const load = () =>
		typeof flags.fixture === 'string'
			? summarizePr(JSON.parse(fs.readFileSync(path.resolve(flags.fixture), 'utf8')))
			: fetchPr(root, ref);

	let fixes = 0;
	/** @type {Set<string>} */
	const triedShas = new Set();
	let lastLine = '';

	for (;;) {
		const pr = load();
		if (!pr) {
			console.error(`pr-watch: no pull request found for ${ref}`);
			process.exit(1);
		}

		const line = describe(pr);
		if (asJson) {
			console.log(JSON.stringify(pr));
		} else if (line !== lastLine) {
			console.log(line);
		}
		lastLine = line;

		if (pr.state === 'merged') return;
		if (pr.state === 'closed') process.exit(2);

		if (pr.state === 'failing') {
			const canFix = fix && fixes < maxFixes && !triedShas.has(pr.headSha);
			if (canFix) {
				triedShas.add(pr.headSha);
				fixes++;
				console.log(`pr-watch: fix attempt ${fixes}/${maxFixes}`);
				const result = fixFailingChecks({ cwd: root, pr, logDir, config, dryRun });
				console.log(`pr-watch: ${result.ok ? 'fix' : 'no fix'} — ${result.detail}${result.logFile ? ` (log: ${result.logFile})` : ''}`);
			} else if (once || (fix && fixes >= maxFixes) || !fix) {
				if (fix && fixes >= maxFixes) console.log(`pr-watch: ${maxFixes} fix attempts used; over to you`);
				if (once || fix) process.exit(3);
			}
		}

		if (once) return;
		sleep(intervalMs);
	}
}

if (require.main === module) {
	main();
}

module.exports = { describe };
