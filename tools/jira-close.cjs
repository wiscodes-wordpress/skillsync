#!/usr/bin/env node
/**
 * Close a Jira issue (subtasks first) via REST, then harness-reset.
 *
 * Requires env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
 * Optional env: JIRA_DONE_TRANSITION (default "Done")
 *
 * Usage:
 *   node path/to/skillsync/tools/jira-close.cjs [/path/to/consumer-repo] --issue PROJECT-123 [--dry-run]
 */

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	assertOrExit,
} = require('./lib/ss-tools.cjs');
const { jiraFetch, resolveJiraCreds } = require('./lib/jira-rest.cjs');

/**
 * @param {object} issue
 * @returns {string[]}
 */
function subtaskKeys(issue) {
	const fields = issue.fields ?? {};
	const subtasks = fields.subtasks ?? [];
	return subtasks
		.filter((/** @type {{ fields?: { status?: { statusCategory?: { key?: string } } } }} */ st) => {
			const cat = st.fields?.status?.statusCategory?.key;
			return cat !== 'done';
		})
		.map((/** @type {{ key: string }} */ st) => st.key);
}

/**
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} token
 * @param {string} issueKey
 * @param {string} doneName
 * @param {boolean} dryRun
 */
async function transitionIssue(baseUrl, email, token, issueKey, doneName, dryRun) {
	const transitions = await jiraFetch(
		baseUrl,
		email,
		token,
		`/rest/api/3/issue/${issueKey}/transitions`,
	);
	const match = (transitions.transitions ?? []).find(
		(/** @type {{ name?: string }} */ t) =>
			t.name?.toLowerCase() === doneName.toLowerCase(),
	);
	assertOrExit(Boolean(match), `No "${doneName}" transition for ${issueKey}`);
	if (dryRun) {
		console.log(`would transition ${issueKey} → ${doneName} (id ${match.id})`);
		return;
	}
	await jiraFetch(baseUrl, email, token, `/rest/api/3/issue/${issueKey}/transitions`, {
		method: 'POST',
		body: JSON.stringify({ transition: { id: match.id } }),
	});
	console.log(`transitioned ${issueKey} → ${doneName}`);
}

async function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const issueKey = typeof flags.issue === 'string' ? flags.issue : '';
	const dryRun = Boolean(flags['dry-run']);

	assertOrExit(Boolean(issueKey), 'Missing --issue PROJECT-123');

	const creds = resolveJiraCreds();
	assertOrExit(creds.ok, creds.ok === false ? creds.error : 'Jira credentials missing');
	const { baseUrl, email, token } = creds;
	const doneName = process.env.JIRA_DONE_TRANSITION ?? 'Done';

	const issue = await jiraFetch(
		baseUrl,
		email,
		token,
		`/rest/api/3/issue/${issueKey}?fields=subtasks,status`,
	);

	const openSubtasks = subtaskKeys(issue);
	for (const key of openSubtasks) {
		await transitionIssue(baseUrl, email, token, key, doneName, dryRun);
	}
	await transitionIssue(baseUrl, email, token, issueKey, doneName, dryRun);

	if (dryRun) {
		console.log('would run harness-reset.cjs');
		return;
	}

	const resetScript = path.join(__dirname, 'harness-reset.cjs');
	execFileSync(process.execPath, [resetScript, consumerRoot], { stdio: 'inherit' });
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
