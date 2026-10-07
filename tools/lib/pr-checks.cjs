/**
 * Read a GitHub pull request's merge state and CI checks through `gh`, and reduce them
 * to one verdict the PR watcher and epic loop can act on.
 */

const { runCommand } = require('./ss-tools.cjs');

/** Check conclusions that mean "this PR broke something". CANCELLED is left out: CI concurrency cancels superseded runs. */
const FAILING = new Set(['FAILURE', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'ERROR']);

const PR_FIELDS = 'number,url,state,mergedAt,headRefName,headRefOid,statusCheckRollup';

/**
 * @typedef {object} FailingCheck
 * @property {string} name
 * @property {string} url
 * @property {string | null} runId GitHub Actions run id, when the check is an Actions job
 */

/**
 * @typedef {object} PrSummary
 * @property {'merged' | 'closed' | 'failing' | 'pending' | 'green' | 'no-checks'} state
 * @property {number | null} number
 * @property {string} url
 * @property {string} headSha
 * @property {string} branch
 * @property {FailingCheck[]} failing
 * @property {string[]} pending names of checks still running
 */

/**
 * @param {Record<string, any>} check a statusCheckRollup entry (CheckRun or StatusContext)
 * @returns {{ name: string; done: boolean; outcome: string; url: string; at: string }}
 */
function normalizeCheck(check) {
	if (check.__typename === 'StatusContext') {
		const state = String(check.state ?? '').toUpperCase();
		return {
			name: check.context ?? 'status',
			done: state !== 'PENDING' && state !== 'EXPECTED',
			outcome: state,
			url: check.targetUrl ?? '',
			at: check.startedAt ?? '',
		};
	}
	return {
		name: check.workflowName ? `${check.workflowName} / ${check.name}` : check.name,
		done: String(check.status ?? '').toUpperCase() === 'COMPLETED',
		outcome: String(check.conclusion ?? '').toUpperCase(),
		url: check.detailsUrl ?? '',
		at: check.completedAt || check.startedAt || '',
	};
}

/**
 * Pushes and pull_request events both run CI, so the same check name can appear twice.
 * Keep the most recent entry per name.
 *
 * @param {Record<string, any>[]} rollup
 */
function latestPerName(rollup) {
	/** @type {Map<string, ReturnType<typeof normalizeCheck>>} */
	const byName = new Map();
	for (const raw of rollup) {
		const c = normalizeCheck(raw);
		const prev = byName.get(c.name);
		if (!prev || c.at > prev.at) byName.set(c.name, c);
	}
	return [...byName.values()];
}

/**
 * @param {Record<string, any>} pr JSON from `gh pr view --json ${PR_FIELDS}`
 * @returns {PrSummary}
 */
function summarizePr(pr) {
	const base = {
		number: typeof pr.number === 'number' ? pr.number : null,
		url: pr.url ?? '',
		headSha: pr.headRefOid ?? '',
		branch: pr.headRefName ?? '',
		failing: /** @type {FailingCheck[]} */ ([]),
		pending: /** @type {string[]} */ ([]),
	};
	const prState = String(pr.state ?? '').toUpperCase();
	if (prState === 'MERGED' || pr.mergedAt) return { ...base, state: 'merged' };
	if (prState === 'CLOSED') return { ...base, state: 'closed' };

	const checks = latestPerName(Array.isArray(pr.statusCheckRollup) ? pr.statusCheckRollup : []);
	if (checks.length === 0) return { ...base, state: 'no-checks' };

	const failing = checks
		.filter((c) => c.done && FAILING.has(c.outcome))
		.map((c) => ({ name: c.name, url: c.url, runId: c.url.match(/\/actions\/runs\/(\d+)/)?.[1] ?? null }));
	const pending = checks.filter((c) => !c.done).map((c) => c.name);

	if (failing.length) return { ...base, state: 'failing', failing, pending };
	if (pending.length) return { ...base, state: 'pending', pending };
	return { ...base, state: 'green' };
}

/**
 * @param {string} cwd repository checkout
 * @param {string | number} ref PR number, URL or head branch
 * @returns {PrSummary | null} null when no PR matches
 */
function fetchPr(cwd, ref) {
	const res = runCommand(cwd, `gh pr view ${JSON.stringify(String(ref))} --json ${PR_FIELDS}`);
	if (res.status !== 0) return null;
	return summarizePr(JSON.parse(res.stdout));
}

/**
 * Failed-step log for an Actions run, trimmed to the tail so it fits in an agent prompt.
 *
 * @param {string} cwd
 * @param {string} runId
 * @param {number} [maxLines]
 * @returns {string}
 */
function failedLog(cwd, runId, maxLines = 200) {
	const res = runCommand(cwd, `gh run view ${runId} --log-failed`);
	const text = res.status === 0 ? res.stdout : res.stderr;
	const lines = text.split('\n');
	return lines.slice(-maxLines).join('\n');
}

module.exports = {
	PR_FIELDS,
	summarizePr,
	fetchPr,
	failedLog,
};
