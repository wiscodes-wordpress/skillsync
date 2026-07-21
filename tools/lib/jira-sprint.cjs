/**
 * Active + future sprint digest for the journal dashboard (Lifeway / DCD).
 * Config: Journal/_dashboard/jira-sprint.json
 *
 * Returns unassigned issues in the active sprint and issues in the nearest
 * future sprint (when boardId is set), via Jira Cloud REST + Agile API.
 */

const fs = require('node:fs');
const path = require('node:path');
const { jiraFetch, resolveJiraCreds } = require('./jira-rest.cjs');
const { browseUrlForKey } = require('./journal-jira.cjs');
const { DEFAULT_VAULT } = require('./journal-vault.cjs');

const CONFIG_NAME = 'jira-sprint.json';

const ISSUE_FIELDS = [
	'summary',
	'status',
	'assignee',
	'priority',
	'issuetype',
	'sprint',
];

/**
 * @param {string} vault
 */
function configPath(vault) {
	return path.join(vault, 'Journal', '_dashboard', CONFIG_NAME);
}

/**
 * @param {string} vault
 */
function loadConfig(vault) {
	const file = configPath(vault);
	/** @type {string[]} */
	const warnings = [];
	/** @type {Record<string, unknown>} */
	let fileCfg = {};
	if (fs.existsSync(file)) {
		try {
			fileCfg = JSON.parse(fs.readFileSync(file, 'utf8'));
		} catch (err) {
			warnings.push(
				`Invalid ${CONFIG_NAME}: ${err instanceof Error ? err.message : err}`,
			);
		}
	} else {
		warnings.push(
			`Missing ${CONFIG_NAME} — copy tools/fixtures/jira-sprint.example.json to Journal/_dashboard/${CONFIG_NAME}`,
		);
	}

	const site = String(fileCfg.site || process.env.JIRA_BASE_URL || '')
		.trim()
		.replace(/\/$/, '');
	let project = String(fileCfg.project || '')
		.trim()
		.toUpperCase();
	if (!project && /lifeway\.atlassian\.net/i.test(site)) {
		project = 'DCD';
	}
	const boardRaw = fileCfg.boardId;
	const boardId =
		boardRaw === null || boardRaw === undefined || boardRaw === ''
			? null
			: Number(boardRaw);
	const limitRaw = Number(fileCfg.limit);
	const limit =
		Number.isFinite(limitRaw) && limitRaw > 0
			? Math.min(100, Math.floor(limitRaw))
			: 40;

	return {
		site,
		project,
		boardId: Number.isFinite(boardId) && boardId > 0 ? boardId : null,
		limit,
		warnings,
		configFile: file,
	};
}

/**
 * @param {unknown} sprint
 * @returns {{ id: number, name: string, state: string, startDate?: string, endDate?: string } | null}
 */
function normalizeSprint(sprint) {
	if (!sprint || typeof sprint !== 'object') return null;
	const s = /** @type {Record<string, unknown>} */ (sprint);
	const id = Number(s.id);
	if (!Number.isFinite(id)) return null;
	return {
		id,
		name: String(s.name || `Sprint ${id}`),
		state: String(s.state || '').toLowerCase(),
		startDate: typeof s.startDate === 'string' ? s.startDate : undefined,
		endDate: typeof s.endDate === 'string' ? s.endDate : undefined,
	};
}

/**
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} token
 * @param {number} boardId
 */
async function fetchBoardSprints(baseUrl, email, token, boardId) {
	/** @type {{ id: number, name: string, state: string, startDate?: string, endDate?: string }[]} */
	const all = [];
	let startAt = 0;
	const maxResults = 50;
	for (let page = 0; page < 10; page++) {
		const data = await jiraFetch(
			baseUrl,
			email,
			token,
			`/rest/agile/1.0/board/${boardId}/sprint?state=active,future&startAt=${startAt}&maxResults=${maxResults}`,
		);
		const values = Array.isArray(data?.values) ? data.values : [];
		for (const v of values) {
			const n = normalizeSprint(v);
			if (n) all.push(n);
		}
		if (data?.isLast || values.length < maxResults) break;
		startAt += values.length;
	}
	return all;
}

/**
 * Pick active + nearest future sprint from Agile board list.
 * @param {{ id: number, name: string, state: string, startDate?: string, endDate?: string }[]} sprints
 */
function pickSprints(sprints) {
	const active = sprints.find((s) => s.state === 'active') || null;
	const future = sprints
		.filter((s) => s.state === 'future')
		.sort((a, b) => {
			const aT = a.startDate ? Date.parse(a.startDate) : Number.POSITIVE_INFINITY;
			const bT = b.startDate ? Date.parse(b.startDate) : Number.POSITIVE_INFINITY;
			if (aT !== bT) return aT - bT;
			return a.id - b.id;
		});
	return { active, future: future[0] || null };
}

/**
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} token
 * @param {string} jql
 * @param {number} maxResults
 */
async function searchJql(baseUrl, email, token, jql, maxResults) {
	/** @type {unknown[]} */
	const issues = [];
	let nextPageToken;
	for (let page = 0; page < 5 && issues.length < maxResults; page++) {
		const body = {
			jql,
			maxResults: Math.min(50, maxResults - issues.length),
			fields: ISSUE_FIELDS,
			...(nextPageToken ? { nextPageToken } : {}),
		};
		const data = await jiraFetch(baseUrl, email, token, '/rest/api/3/search/jql', {
			method: 'POST',
			body: JSON.stringify(body),
		});
		const batch = Array.isArray(data?.issues) ? data.issues : [];
		issues.push(...batch);
		if (!data?.nextPageToken || batch.length === 0) break;
		nextPageToken = data.nextPageToken;
	}
	return issues;
}

/**
 * @param {unknown} issue
 * @param {string} [site]
 */
function mapIssue(issue, site) {
	if (!issue || typeof issue !== 'object') return null;
	const i = /** @type {Record<string, unknown>} */ (issue);
	const key = String(i.key || '').toUpperCase();
	if (!key) return null;
	const fields = /** @type {Record<string, unknown>} */ (i.fields || {});
	const status = /** @type {{ name?: string } | null} */ (fields.status);
	const priority = /** @type {{ name?: string } | null} */ (fields.priority);
	const issuetype = /** @type {{ name?: string } | null} */ (fields.issuetype);
	const assignee = /** @type {{ displayName?: string, emailAddress?: string } | null} */ (
		fields.assignee
	);

	let sprintName = '';
	const sprintField = fields.sprint;
	if (Array.isArray(sprintField) && sprintField.length) {
		const last = sprintField[sprintField.length - 1];
		const n = normalizeSprint(last);
		if (n) sprintName = n.name;
	} else if (sprintField && typeof sprintField === 'object') {
		const n = normalizeSprint(sprintField);
		if (n) sprintName = n.name;
	}

	const browse =
		browseUrlForKey(key) ||
		(site ? `${site.replace(/\/$/, '')}/browse/${key}` : null);

	return {
		key,
		summary: String(fields.summary || ''),
		status: status?.name || '',
		priority: priority?.name || '',
		issuetype: issuetype?.name || '',
		assignee: assignee?.displayName || null,
		sprintName,
		url: browse,
	};
}

/**
 * @param {string} project
 * @param {{ active: { id: number, name: string } | null, future: { id: number, name: string } | null }} picked
 */
function buildJql(project, picked) {
	const base = `project = ${project} AND statusCategory != Done`;
	let unassignedJql;
	if (picked.active) {
		unassignedJql = `${base} AND sprint = ${picked.active.id} AND assignee is EMPTY ORDER BY Rank`;
	} else {
		unassignedJql = `${base} AND sprint in openSprints() AND assignee is EMPTY ORDER BY Rank`;
	}

	let futureJql;
	if (picked.future) {
		futureJql = `${base} AND sprint = ${picked.future.id} ORDER BY Rank`;
	} else {
		futureJql = `${base} AND sprint in futureSprints() ORDER BY Rank`;
	}

	return { unassignedJql, futureJql };
}

/**
 * @param {string} [vault]
 */
async function listSprintDigest(vault = DEFAULT_VAULT) {
	const cfg = loadConfig(vault);
	/** @type {string[]} */
	const warnings = [...cfg.warnings];

	const empty = {
		ok: false,
		project: cfg.project || 'DCD',
		site: cfg.site || '',
		activeSprint: null,
		futureSprint: null,
		unassigned: [],
		future: [],
		warnings,
		error: /** @type {string | undefined} */ (undefined),
	};

	if (!cfg.project) {
		return {
			...empty,
			error: 'jira-sprint.json: set "project" (e.g. DCD)',
		};
	}

	const creds = resolveJiraCreds(
		cfg.site ? { baseUrl: cfg.site } : undefined,
	);
	if (!creds.ok) {
		return {
			...empty,
			error: creds.error,
		};
	}

	const { baseUrl, email, token } = creds;
	const site = cfg.site || baseUrl;

	/** @type {{ id: number, name: string, state: string, startDate?: string, endDate?: string } | null} */
	let activeSprint = null;
	/** @type {{ id: number, name: string, state: string, startDate?: string, endDate?: string } | null} */
	let futureSprint = null;

	try {
		if (cfg.boardId) {
			try {
				const sprints = await fetchBoardSprints(
					baseUrl,
					email,
					token,
					cfg.boardId,
				);
				const picked = pickSprints(sprints);
				activeSprint = picked.active;
				futureSprint = picked.future;
				if (!activeSprint) {
					warnings.push('No active sprint on board');
				}
				if (!futureSprint) {
					warnings.push('No future sprint on board');
				}
			} catch (err) {
				warnings.push(
					`Agile board sprints failed (falling back to JQL): ${
						err instanceof Error ? err.message : err
					}`,
				);
			}
		} else {
			warnings.push(
				'boardId not set — using openSprints()/futureSprints(); set boardId in jira-sprint.json for a single next sprint',
			);
		}

		const { unassignedJql, futureJql } = buildJql(cfg.project, {
			active: activeSprint,
			future: futureSprint,
		});

		const [unassignedRaw, futureRaw] = await Promise.all([
			searchJql(baseUrl, email, token, unassignedJql, cfg.limit),
			searchJql(baseUrl, email, token, futureJql, cfg.limit),
		]);

		const unassigned = unassignedRaw
			.map((i) => mapIssue(i, site))
			.filter(Boolean);
		const future = futureRaw.map((i) => mapIssue(i, site)).filter(Boolean);

		// Infer sprint names from issues if Agile lookup skipped
		if (!activeSprint && unassigned.length && unassigned[0].sprintName) {
			activeSprint = {
				id: 0,
				name: unassigned[0].sprintName,
				state: 'active',
			};
		}
		if (!futureSprint && future.length && future[0].sprintName) {
			futureSprint = {
				id: 0,
				name: future[0].sprintName,
				state: 'future',
			};
		}

		return {
			ok: true,
			project: cfg.project,
			site,
			activeSprint: activeSprint
				? { id: activeSprint.id, name: activeSprint.name, state: activeSprint.state }
				: null,
			futureSprint: futureSprint
				? { id: futureSprint.id, name: futureSprint.name, state: futureSprint.state }
				: null,
			unassigned,
			future,
			warnings,
		};
	} catch (err) {
		return {
			...empty,
			activeSprint,
			futureSprint,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

module.exports = {
	listSprintDigest,
	configPath,
	CONFIG_NAME,
	DEFAULT_VAULT,
	loadConfig,
};
