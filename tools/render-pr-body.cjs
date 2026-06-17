#!/usr/bin/env node
/**
 * Render PR body markdown from harness state and optional draft file.
 *
 * Usage:
 *   node path/to/skillsync/tools/render-pr-body.cjs [/path/to/consumer-repo] [--out /path/to/body.md] [--draft /path/to/draft.md]
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
	readState,
	parseMarkdownSections,
	runCommand,
	gitCurrentBranch,
} = require('./lib/ss-tools.cjs');

/**
 * @param {string | null} state
 * @param {string | undefined} draft
 * @param {string} consumerRoot
 * @returns {string}
 */
function renderBody(state, draft, consumerRoot) {
	/** @type {string[]} */
	const parts = [];

	if (draft?.trim()) {
		parts.push(draft.trim());
		parts.push('');
	}

	if (state) {
		const sections = parseMarkdownSections(state);
		const summarySections = [
			'Spec Overview',
			'Current Task',
			'Acceptance Criteria',
			'TDD Evidence',
			'Verification Plan',
			'Completed / Remaining',
		];

		let addedHarness = false;
		for (const name of summarySections) {
			const body = sections.get(name);
			if (body) {
				if (!addedHarness) {
					parts.push('## Harness summary');
					parts.push('');
					addedHarness = true;
				}
				parts.push(`### ${name}`);
				parts.push('');
				parts.push(body);
				parts.push('');
			}
		}
	}

	const branchResult = runCommand(consumerRoot, 'git rev-parse --is-inside-work-tree 2>/dev/null');
	const inGit = branchResult.stdout.trim() === 'true';
	const branch = inGit ? gitCurrentBranch(consumerRoot) : '(not a git repo)';
	const log = inGit
		? runCommand(consumerRoot, 'git log --oneline -10 2>/dev/null || true')
		: { stdout: '' };
	if (log.stdout.trim()) {
		parts.push('## Recent commits');
		parts.push('');
		parts.push('```');
		parts.push(log.stdout.trim());
		parts.push('```');
		parts.push('');
	}

	if (parts.length === 0) {
		parts.push('## Summary');
		parts.push('');
		parts.push(`Branch: \`${branch}\``);
		parts.push('');
		parts.push('## Test plan');
		parts.push('');
		parts.push('- [ ] (add verification steps)');
	}

	return parts.join('\n').trim() + '\n';
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const state = readState(consumerRoot);

	const draftPath =
		(typeof flags.draft === 'string' && flags.draft) ||
		path.join(harnessDir(consumerRoot), 'pr-body.md');
	let draft = '';
	if (fs.existsSync(draftPath)) {
		draft = fs.readFileSync(draftPath, 'utf8');
	}

	const body = renderBody(state, draft, consumerRoot);
	const outPath =
		typeof flags.out === 'string'
			? path.resolve(flags.out)
			: path.join(os.tmpdir(), `skillsync-pr-body-${process.pid}.md`);

	fs.writeFileSync(outPath, body, 'utf8');
	console.log(outPath);
}

main();
