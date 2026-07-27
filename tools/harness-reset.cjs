#!/usr/bin/env node
/**
 * Reset local harness handoff files after story close.
 *
 * Usage:
 *   node path/to/skillsync/tools/harness-reset.cjs [/path/to/consumer-repo] [--dry-run]
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
} = require('./lib/ss-tools.cjs');

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const dryRun = Boolean(flags['dry-run']);
	const dir = harnessDir(consumerRoot);

	const actions = [
		{ type: 'mkdir', path: dir },
		{ type: 'write-empty', path: path.join(dir, 'state.md') },
		{ type: 'write-empty', path: path.join(dir, 'qa-current.md') },
		{ type: 'delete', path: path.join(dir, 'pr-body.md') },
		{ type: 'delete', path: path.join(dir, 'code-handoff.html') },
		{ type: 'delete', path: path.join(dir, 'code-handoff.md') }, // legacy markdown brief
	];

	for (const action of actions) {
		if (action.type === 'mkdir') {
			if (dryRun) {
				console.log(`would mkdir: ${path.relative(consumerRoot, action.path)}`);
			} else {
				fs.mkdirSync(action.path, { recursive: true });
			}
			continue;
		}

		if (action.type === 'write-empty') {
			if (dryRun) {
				console.log(`would write empty: ${path.relative(consumerRoot, action.path)}`);
			} else {
				fs.mkdirSync(path.dirname(action.path), { recursive: true });
				fs.writeFileSync(action.path, '', 'utf8');
			}
			continue;
		}

		if (action.type === 'delete') {
			if (!fs.existsSync(action.path)) {
				if (dryRun) {
					console.log(`skip delete (absent): ${path.relative(consumerRoot, action.path)}`);
				}
				continue;
			}
			if (dryRun) {
				console.log(`would delete: ${path.relative(consumerRoot, action.path)}`);
			} else {
				fs.unlinkSync(action.path);
			}
		}
	}

	if (!dryRun) {
		console.log(
			'harness-reset: cleared .harness/state.md, .harness/qa-current.md; removed pr-body.md and code-handoff.html if present.',
		);
	}
}

main();
