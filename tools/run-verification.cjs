#!/usr/bin/env node
/**
 * Run Verification Plan commands from .harness/state.md.
 *
 * Usage:
 *   node path/to/skillsync/tools/run-verification.cjs [/path/to/consumer-repo] [--cycle N] [--continue] [--json]
 */

const {
	parseArgs,
	resolveConsumerRoot,
	statePath,
	readState,
	parseMarkdownSections,
	commandsFromVerificationPlan,
	runCommand,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const cont = Boolean(flags.continue);
	const asJson = Boolean(flags.json);
	const cycle =
		flags.cycle !== undefined ? Number.parseInt(String(flags.cycle), 10) : null;

	const state = readState(consumerRoot);
	assertOrExit(Boolean(state), `Missing ${statePath(consumerRoot)}`);

	const sections = parseMarkdownSections(/** @type {string} */ (state));
	const plan = sections.get('Verification Plan');
	assertOrExit(Boolean(plan), 'Missing ## Verification Plan in state.md');

	const parsed = commandsFromVerificationPlan(/** @type {string} */ (plan), cycle);
	assertOrExit(parsed.ok, parsed.ok === false ? parsed.error : '');
	/** @type {string[]} */
	const commands = parsed.ok ? parsed.commands : [];

	/** @type {{ command: string; status: number; stdout: string; stderr: string }[]} */
	const results = [];
	let failed = false;

	for (const cmd of commands) {
		const result = runCommand(consumerRoot, cmd);
		results.push({ command: cmd, ...result });
		if (result.status !== 0) {
			failed = true;
			if (!cont) {
				break;
			}
		}
	}

	if (asJson) {
		console.log(JSON.stringify({ failed, results }, null, 2));
	} else {
		for (const r of results) {
			const label = r.status === 0 ? 'PASS' : 'FAIL';
			console.log(`${label}: ${r.command}`);
			if (r.status !== 0 && r.stderr) {
				console.error(r.stderr.slice(0, 2000));
			}
		}
	}

	process.exit(failed ? 1 : 0);
}

main();
