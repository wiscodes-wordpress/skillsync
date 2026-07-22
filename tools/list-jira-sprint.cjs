#!/usr/bin/env node
/**
 * List DCD active-sprint: assigned to me + unassigned.
 *
 * Usage:
 *   node tools/list-jira-sprint.cjs
 *   node tools/list-jira-sprint.cjs --vault "/path/to/DenMercs"
 *   node tools/list-jira-sprint.cjs --json
 *
 * Requires: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
 * Config: Journal/_dashboard/jira-sprint.json
 */

const path = require('node:path');
const { loadEnv } = require('./lib/load-env.cjs');
const { listSprintDigest, DEFAULT_VAULT } = require('./lib/jira-sprint.cjs');

loadEnv(path.join(__dirname, '..'));

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	let json = false;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
		if (argv[i] === '--json') json = true;
	}
	return { vault: path.resolve(vault), json };
}

/**
 * @param {{ key: string, summary: string, status: string, assignee: string | null, url: string | null }[]} issues
 * @param {string} label
 */
function printIssues(issues, label) {
	console.log(`\n${label} (${issues.length})`);
	if (!issues.length) {
		console.log('  (none)');
		return;
	}
	for (const i of issues) {
		const who = i.assignee ? ` · ${i.assignee}` : ' · unassigned';
		console.log(`  ${i.key}  ${i.summary}  [${i.status}]${who}`);
		if (i.url) console.log(`         ${i.url}`);
	}
}

async function main() {
	const { vault, json } = parseArgs(process.argv.slice(2));
	const result = await listSprintDigest(vault);
	if (json) {
		console.log(JSON.stringify(result, null, 2));
		if (!result.ok) process.exitCode = 1;
		return;
	}

	if (result.error) {
		console.error(`Error: ${result.error}`);
	}
	for (const w of result.warnings || []) {
		console.warn(`Warning: ${w}`);
	}

	const sprintName = result.activeSprint?.name || 'active';
	const me = result.me?.displayName || 'me';
	console.log(
		`Sprint digest · ${result.project} · ${result.site || '(no site)'} · ${sprintName}`,
	);
	printIssues(result.mine || [], `Assigned to me — ${me}`);
	printIssues(result.unassigned || [], 'Unassigned');

	if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
