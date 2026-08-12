#!/usr/bin/env node
/**
 * Render PR body markdown from optional draft file.
 * Default skeleton is terse for human reviewers — no harness dump, no test results.
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
} = require('./lib/ss-tools.cjs');

/** Terse default for human review — agent fills `.harness/pr-body.md` before open. */
const DEFAULT_BODY = `## Purpose of PR

(why this change)

## Changes Made

- (what changed)

## Visual changes to check in review (optional)

- (UI / UX spots to look at — omit section if none)

## Screenshot

(attach image or omit if no UI)
`;

/**
 * @param {string | undefined} draft
 * @returns {string}
 */
function renderBody(draft) {
	if (draft?.trim()) {
		return draft.trim() + '\n';
	}
	return DEFAULT_BODY;
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);

	const draftPath =
		(typeof flags.draft === 'string' && flags.draft) ||
		path.join(harnessDir(consumerRoot), 'pr-body.md');
	let draft = '';
	if (fs.existsSync(draftPath)) {
		draft = fs.readFileSync(draftPath, 'utf8');
	}

	const body = renderBody(draft);
	const outPath =
		typeof flags.out === 'string'
			? path.resolve(flags.out)
			: path.join(os.tmpdir(), `skillsync-pr-body-${process.pid}.md`);

	fs.writeFileSync(outPath, body, 'utf8');
	console.log(outPath);
}

main();
