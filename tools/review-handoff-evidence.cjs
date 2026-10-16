#!/usr/bin/env node
/**
 * Review handoff human evidence gate.
 *
 * Usage:
 *   node review-handoff-evidence.cjs [/path/to/consumer] [--check-state]
 */

const { parseArgs, resolveConsumerRoot } = require('./lib/ss-tools.cjs');
const {
	evaluateReviewHandoff,
	assertReviewHandoffOrExit,
} = require('./lib/review-handoff-evidence.cjs');

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);

	if (flags['check-state']) {
		const { ok, reason } = evaluateReviewHandoff(consumerRoot);
		if (!ok) {
			console.error(`review-handoff-evidence --check-state: ${reason}`);
			process.exit(1);
		}
		console.log(`review-handoff-evidence --check-state: OK (${reason})`);
		return;
	}

	console.log('Usage: review-handoff-evidence.cjs [consumerRoot] --check-state');
	process.exit(2);
}

main();
