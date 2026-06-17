#!/usr/bin/env node
/**
 * Open a GitHub pull request from the current branch (deterministic helper).
 *
 * Usage:
 *   node path/to/skillsync/tools/open-pr.cjs [/path/to/consumer-repo] [--base main] [--title "..."] [--no-push] [--dry-run] [--force-new]
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
	parseArgs,
	resolveConsumerRoot,
	readOptionalConfig,
	runCommand,
	gitCurrentBranch,
	titleFromBranch,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

/**
 * @param {string} consumerRoot
 * @param {string} script
 * @param {string[]} args
 * @returns {string}
 */
function runNodeScript(consumerRoot, script, args) {
	return execFileSync(process.execPath, [script, ...args], {
		cwd: consumerRoot,
		encoding: 'utf8',
	}).trim();
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const config = readOptionalConfig(consumerRoot);
	const dryRun = Boolean(flags['dry-run']);
	const noPush = Boolean(flags['no-push']);
	const forceNew = Boolean(flags['force-new']);
	const base =
		(typeof flags.base === 'string' && flags.base) ||
		config?.prBaseBranch ||
		'main';

	const toolsDir = path.join(__dirname);
	const renderScript = path.join(toolsDir, 'render-pr-body.cjs');

	const branch = gitCurrentBranch(consumerRoot);
	assertOrExit(branch && branch !== 'HEAD', 'Could not determine current git branch.');

	const ghAuth = runCommand(consumerRoot, 'gh auth status 2>&1');
	if (ghAuth.status !== 0 && !dryRun) {
		console.error('gh is not authenticated. Run: gh auth login');
		console.error(ghAuth.stderr || ghAuth.stdout);
		process.exit(1);
	}

	if (!noPush && !dryRun) {
		const push = runCommand(consumerRoot, 'git push -u origin HEAD');
		if (push.status !== 0) {
			console.error('git push failed:');
			console.error(push.stderr || push.stdout);
			process.exit(1);
		}
	} else if (dryRun) {
		console.log('would push: git push -u origin HEAD');
	}

	const existing = runCommand(
		consumerRoot,
		`gh pr view --head "${branch}" --json url --jq .url 2>/dev/null || true`,
	);
	const existingUrl = existing.stdout.trim();
	if (existingUrl && !forceNew) {
		console.log(existingUrl);
		return;
	}

	let title = typeof flags.title === 'string' ? flags.title : '';
	if (!title) {
		title =
			titleFromBranch(branch, config?.issueKeyPattern) ??
			'';
	}
	assertOrExit(Boolean(title), `Could not derive PR title from branch "${branch}". Pass --title.`);

	let bodyFile = typeof flags['body-file'] === 'string' ? path.resolve(flags['body-file']) : '';
	if (!bodyFile) {
		if (dryRun) {
			bodyFile = path.join(consumerRoot, '.harness', 'pr-body-rendered.md');
			console.log(`would render body via ${renderScript}`);
		} else {
			bodyFile = runNodeScript(consumerRoot, renderScript, [consumerRoot]);
		}
	}

	if (dryRun) {
		console.log(`would create PR: base=${base} title="${title}" body-file=${bodyFile}`);
		return;
	}

	const create = runCommand(
		consumerRoot,
		`gh pr create --base "${base}" --title ${JSON.stringify(title)} --body-file ${JSON.stringify(bodyFile)}`,
	);
	if (create.status !== 0) {
		console.error('gh pr create failed:');
		console.error(create.stderr || create.stdout);
		process.exit(1);
	}

	const url = (create.stdout || create.stderr).trim().split('\n').pop();
	console.log(url || create.stdout.trim());

	if (bodyFile.includes('/tmp/skillsync-pr-body-') || bodyFile.includes('skillsync-pr-body-')) {
		try {
			fs.unlinkSync(bodyFile);
		} catch {
			// ignore cleanup errors
		}
	}
}

main();
