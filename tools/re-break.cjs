#!/usr/bin/env node
/**
 * Re-break check: prod stashed → test FAIL → restore → test PASS.
 *
 * Usage:
 *   node path/to/skillsync/tools/re-break.cjs [/path/to/consumer-repo] --cmd "yarn test path" --paths src/foo.ts,src/bar.ts
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	runCommand,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const cmd = typeof flags.cmd === 'string' ? flags.cmd : '';
	const pathsArg = typeof flags.paths === 'string' ? flags.paths : '';

	assertOrExit(Boolean(cmd), 'Missing --cmd "scoped test command"');
	assertOrExit(Boolean(pathsArg), 'Missing --paths comma-separated production file paths');

	const prodPaths = pathsArg
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean);

	for (const rel of prodPaths) {
		const abs = path.join(consumerRoot, rel);
		assertOrExit(fs.existsSync(abs), `Production path not found: ${rel}`);
	}

	const statusBefore = runCommand(consumerRoot, 'git status --porcelain');
	assertOrExit(
		statusBefore.stdout.trim() === '',
		'Working tree must be clean before re-break. Commit or stash unrelated changes.',
	);

	const stashPaths = prodPaths.map((p) => JSON.stringify(p)).join(' ');
	const stash = runCommand(consumerRoot, `git stash push -m "skillsync-re-break" -- ${stashPaths}`);
	if (stash.status !== 0) {
		console.error('git stash push failed:');
		console.error(stash.stderr || stash.stdout);
		process.exit(1);
	}

	const failRun = runCommand(consumerRoot, cmd);
	const restored = runCommand(consumerRoot, 'git stash pop');
	if (restored.status !== 0) {
		console.error('git stash pop failed — repo may need manual cleanup:');
		console.error(restored.stderr || restored.stdout);
		process.exit(1);
	}

	const passRun = runCommand(consumerRoot, cmd);

	/** @type {string[]} */
	const errors = [];
	if (failRun.status === 0) {
		errors.push('Re-break FAIL: test still PASS with production changes stashed');
	}
	if (passRun.status !== 0) {
		errors.push('Re-break FAIL: test does not PASS after restoring production changes');
	}

	if (errors.length > 0) {
		console.error('re-break: FAILED');
		for (const e of errors) {
			console.error(`  - ${e}`);
		}
		process.exit(1);
	}

	console.log('re-break: OK');
	console.log(`| Re-break | yes | stashed ${prodPaths.join(', ')} |`);
}

main();
