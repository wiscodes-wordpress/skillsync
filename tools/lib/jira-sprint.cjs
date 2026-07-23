/**
 * Active sprint digest for the journal dashboard (Lifeway / DCD).
 * Config: Journal/_dashboard/jira-sprint.json
 *
 * Returns:
 *   1. Issues assigned to currentUser() in the active sprint
 *   2. Unassigned issues in the active sprint
 *   3. Issues in the board's "Potential Next Sprint" (future planning bucket)
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
	'parent',
	// Classic company-managed Epic Link (fallback when parent is unset)
	'customfield_10008',
];

/**
 * @param {Record<string, unknown>} fields
 * @returns {{ key: string, summary: string } | null}
 */
function resolveEpic(fields) {
	const parent = /** @type {Record<string, unknown> | null} */ (fields.parent);
	if (parent && typeof parent === 'object') {
		const parentFields = /** @type {Record<string, unknown>} */ (
			parent.fields || {}
		);
		const parentType = /** @type {{ name?: string } | null} */ (
			parentFields.issuetype
		);
		const key = String(parent.key || '').toUpperCase();
		if (key && /epic/i.test(String(parentType?.name || ''))) {
			return {
				key,
				summary: String(parentFields.summary || ''),
			};
		}
	}

	const epicLink = fields.customfield_10008;
	if (typeof epicLink === 'string' && epicLink.trim()) {
		return { key: epicLink.trim().toUpperCase(), summary: '' };
	}
	if (epicLink && typeof epicLink === 'object') {
		const e = /** @type {Record<string, unknown>} */ (epicLink);
		const key = String(e.key || e.value || '').toUpperCase();
		if (key) {
			return {
				key,
				summary: String(e.summary || e.name || ''),
			};
		}
	}

	return null;
}

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
 * @param {'active' | 'future'} state
 */
async function fetchSprintsByState(baseUrl, email, token, boardId, state) {
	/** @type {{ id: number, name: string, state: string, startDate?: string, endDate?: string }[]} */
	const out = [];
	let startAt = 0;
	const maxResults = 50;
	for (let page = 0; page < 10; page++) {
		const data = await jiraFetch(
			baseUrl,
			email,
			token,
			`/rest/agile/1.0/board/${boardId}/sprint?state=${state}&startAt=${startAt}&maxResults=${maxResults}`,
		);
		const values = Array.isArray(data?.values) ? data.values : [];
		for (const v of values) {
			const n = normalizeSprint(v);
			if (n && n.state === state) out.push(n);
		}
		if (data?.isLast || values.length < maxResults) break;
		startAt += values.length;
	}
	return out;
}

/**
 * Prefer a sprint named "Potential Next Sprint", else undated future, else soonest dated.
 * @param {{ id: number, name: string, state: string, startDate?: string, endDate?: string }[]} futures
 */
function pickPotentialNextSprint(futures) {
	if (!futures.length) return null;
	const named = futures.find((s) =>
		/potential\s+next\s+sprint/i.test(s.name),
	);
	if (named) return named;
	const undated = futures.find((s) => !s.startDate);
	if (undated) return undated;
	return [...futures].sort((a, b) => {
		const ta = Date.parse(a.startDate || '') || Number.MAX_SAFE_INTEGER;
		const tb = Date.parse(b.startDate || '') || Number.MAX_SAFE_INTEGER;
		return ta - tb;
	})[0];
}

/**
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} token
 * @param {number} boardId
 */
async function fetchActiveSprint(baseUrl, email, token, boardId) {
	const active = await fetchSprintsByState(
		baseUrl,
		email,
		token,
		boardId,
		'active',
	);
	return active[0] || null;
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

	const epic = resolveEpic(fields);
	const epicBrowse =
		epic &&
		(browseUrlForKey(epic.key) ||
			(site ? `${site.replace(/\/$/, '')}/browse/${epic.key}` : null));

	return {
		key,
		summary: String(fields.summary || ''),
		status: status?.name || '',
		priority: priority?.name || '',
		issuetype: issuetype?.name || '',
		assignee: assignee?.displayName || null,
		sprintName,
		epic: epic
			? { key: epic.key, summary: epic.summary, url: epicBrowse }
			: null,
		url: browse,
	};
}

/**
 * @param {string} project
 * @param {{ id: number, name: string } | null} active
 */
function buildJql(project, active) {
	const base = `project = ${project} AND statusCategory != Done`;
	const sprintClause = active
		? `sprint = ${active.id}`
		: 'sprint in openSprints()';
	return {
		unassignedJql: `${base} AND ${sprintClause} AND assignee is EMPTY ORDER BY Rank`,
		mineJql: `${base} AND ${sprintClause} AND assignee = currentUser() ORDER BY Rank`,
	};
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
		nextSprint: null,
		me: null,
		unassigned: [],
		mine: [],
		potentialNext: [],
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
	let nextSprint = null;
	/** @type {{ displayName: string, accountId?: string } | null} */
	let me = null;

	try {
		try {
			const self = await jiraFetch(baseUrl, email, token, '/rest/api/3/myself');
			me = {
				displayName: String(self?.displayName || self?.emailAddress || 'me'),
				accountId: self?.accountId ? String(self.accountId) : undefined,
			};
		} catch (err) {
			return {
				...empty,
				error: `Jira auth failed — check JIRA_EMAIL + JIRA_API_TOKEN (${
					err instanceof Error ? err.message : err
				})`,
			};
		}

		if (cfg.boardId) {
			try {
				const [activeList, futureList] = await Promise.all([
					fetchSprintsByState(baseUrl, email, token, cfg.boardId, 'active'),
					fetchSprintsByState(baseUrl, email, token, cfg.boardId, 'future'),
				]);
				activeSprint = activeList[0] || null;
				nextSprint = pickPotentialNextSprint(futureList);
				if (!activeSprint) {
					warnings.push('No active sprint on board');
				}
				if (!nextSprint) {
					warnings.push('No future / Potential Next Sprint on board');
				}
			} catch (err) {
				warnings.push(
					`Agile board sprints failed (falling back to openSprints()): ${
						err instanceof Error ? err.message : err
					}`,
				);
			}
		} else {
			warnings.push(
				'boardId not set — using openSprints(); set boardId in jira-sprint.json (e.g. 489)',
			);
		}

		const { unassignedJql, mineJql } = buildJql(cfg.project, activeSprint);
		const nextJql = nextSprint
			? `project = ${cfg.project} AND statusCategory != Done AND sprint = ${nextSprint.id} ORDER BY Rank`
			: null;

		const [unassignedRaw, mineRaw, nextRaw] = await Promise.all([
			searchJql(baseUrl, email, token, unassignedJql, cfg.limit),
			searchJql(baseUrl, email, token, mineJql, cfg.limit),
			nextJql
				? searchJql(baseUrl, email, token, nextJql, cfg.limit)
				: Promise.resolve([]),
		]);

		const unassigned = unassignedRaw
			.map((i) => mapIssue(i, site))
			.filter(Boolean);
		const mine = mineRaw.map((i) => mapIssue(i, site)).filter(Boolean);
		const potentialNext = nextRaw.map((i) => mapIssue(i, site)).filter(Boolean);

		if (!activeSprint) {
			const nameFrom =
				(mine[0] && mine[0].sprintName) ||
				(unassigned[0] && unassigned[0].sprintName);
			if (nameFrom) {
				activeSprint = { id: 0, name: nameFrom, state: 'active' };
			}
		}

		return {
			ok: true,
			project: cfg.project,
			site,
			activeSprint: activeSprint
				? {
						id: activeSprint.id,
						name: activeSprint.name,
						state: activeSprint.state,
					}
				: null,
			nextSprint: nextSprint
				? {
						id: nextSprint.id,
						name: nextSprint.name,
						state: nextSprint.state,
					}
				: null,
			me,
			unassigned,
			mine,
			potentialNext,
			warnings,
		};
	} catch (err) {
		return {
			...empty,
			activeSprint,
			nextSprint,
			me,
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
