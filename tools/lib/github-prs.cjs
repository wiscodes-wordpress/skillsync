/**
 * Open (ready-for-review) GitHub PRs for the journal dashboard.
 * Source of truth: GitHub via `gh`. Config: Journal/_dashboard/github-prs.json
 *
 * Ready for review = open + not draft. Authors come from config `people`
 * (you + teammates). Scopes map orgs/repos → work | business tracks.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadEnv } = require('./load-env.cjs');
const { DEFAULT_VAULT } = require('./journal-vault.cjs');

const skillsyncRoot = path.join(__dirname, '..', '..');
loadEnv(skillsyncRoot);

const CONFIG_NAME = 'github-prs.json';

/**
 * @param {string} vault
 */
function configPath(vault) {
	return path.join(vault, 'Journal', '_dashboard', CONFIG_NAME);
}

/**
 * @param {string} login
 */
function normalizeLogin(login) {
	return String(login || '')
		.trim()
		.replace(/^@/, '')
		.toLowerCase();
}

/**
 * @param {unknown} raw
 * @returns {{ login: string, label: string }[]}
 */
function parsePeople(raw) {
	if (!Array.isArray(raw)) return [];
	const out = [];
	const seen = new Set();
	for (const p of raw) {
		if (!p || typeof p !== 'object') continue;
		const login = normalizeLogin(/** @type {{ login?: string }} */ (p).login);
		if (!login || seen.has(login)) continue;
		seen.add(login);
		const label =
			typeof /** @type {{ label?: string }} */ (p).label === 'string' &&
			/** @type {{ label?: string }} */ (p).label.trim()
				? /** @type {{ label: string }} */ (p).label.trim()
				: login;
		out.push({ login, label });
	}
	return out;
}

/**
 * Env: JOURNAL_GITHUB_PR_AUTHORS=denmercs,alice:Alice,bob
 * @returns {{ login: string, label: string }[]}
 */
function peopleFromEnv() {
	const raw = process.env.JOURNAL_GITHUB_PR_AUTHORS;
	if (!raw || !String(raw).trim()) return [];
	return String(raw)
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => {
			const [loginPart, ...labelParts] = part.split(':');
			const login = normalizeLogin(loginPart);
			const label = labelParts.join(':').trim() || login;
			return { login, label };
		})
		.filter((p) => p.login);
}

/**
 * @param {unknown} raw
 * @returns {{ track: 'work' | 'business', owners: string[], repos: string[] }[]}
 */
function parseScopes(raw) {
	if (!Array.isArray(raw)) return [];
	/** @type {{ track: 'work' | 'business', owners: string[], repos: string[] }[]} */
	const out = [];
	for (const s of raw) {
		if (!s || typeof s !== 'object') continue;
		const trackRaw = String(/** @type {{ track?: string }} */ (s).track || '')
			.trim()
			.toLowerCase();
		const track = trackRaw === 'business' ? 'business' : 'work';
		const owners = []
			.concat(/** @type {{ owners?: unknown, owner?: unknown }} */ (s).owners || [])
			.concat(
				/** @type {{ owner?: unknown }} */ (s).owner
					? [/** @type {{ owner: unknown }} */ (s).owner]
					: [],
			)
			.map((o) => String(o || '').trim())
			.filter(Boolean);
		const repos = []
			.concat(/** @type {{ repos?: unknown, repo?: unknown }} */ (s).repos || [])
			.concat(
				/** @type {{ repo?: unknown }} */ (s).repo
					? [/** @type {{ repo: unknown }} */ (s).repo]
					: [],
			)
			.map((r) => String(r || '').trim())
			.filter(Boolean);
		if (!owners.length && !repos.length) continue;
		out.push({ track, owners, repos });
	}
	return out;
}

/**
 * @param {string} vault
 */
function loadConfig(vault) {
	const file = configPath(vault);
	/** @type {Record<string, unknown>} */
	let fileCfg = {};
	const warnings = [];
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
			`Missing ${CONFIG_NAME} — copy tools/fixtures/github-prs.example.json to Journal/_dashboard/${CONFIG_NAME}`,
		);
	}

	const peopleMap = new Map();
	for (const p of [...parsePeople(fileCfg.people), ...peopleFromEnv()]) {
		peopleMap.set(p.login, p);
	}
	const people = [...peopleMap.values()];
	const scopes = parseScopes(fileCfg.scopes);
	const limitRaw = Number(fileCfg.limit);
	const limit =
		Number.isFinite(limitRaw) && limitRaw > 0
			? Math.min(100, Math.floor(limitRaw))
			: 50;

	// Hide PRs you already reviewed/approved (teammate PRs). Default on.
	const envHide = process.env.JOURNAL_GITHUB_PR_HIDE_REVIEWED;
	let hideReviewedByMe = true;
	if (fileCfg.hideReviewedByMe === false || fileCfg.hideReviewedByMe === 'false') {
		hideReviewedByMe = false;
	}
	if (envHide === '0' || envHide === 'false') hideReviewedByMe = false;
	if (envHide === '1' || envHide === 'true') hideReviewedByMe = true;

	return {
		people,
		scopes,
		limit,
		hideReviewedByMe,
		warnings,
		configFile: file,
	};
}

/**
 * @param {string[]} args
 * @returns {{ ok: true, stdout: string } | { ok: false, error: string }}
 */
function runGh(args) {
	try {
		const stdout = execFileSync('gh', args, {
			encoding: 'utf8',
			maxBuffer: 12 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: process.env,
		});
		return { ok: true, stdout: String(stdout || '') };
	} catch (err) {
		const e = /** @type {NodeJS.ErrnoException & { stderr?: Buffer | string }} */ (
			err
		);
		const stderr = String(e.stderr || e.message || err);
		if (e.code === 'ENOENT') {
			return { ok: false, error: 'gh CLI not found — install GitHub CLI' };
		}
		return { ok: false, error: stderr.trim() || 'gh failed' };
	}
}

/**
 * @param {string} htmlUrl
 */
function repoFromPullUrl(htmlUrl) {
	const m = String(htmlUrl || '').match(
		/github\.com\/([^/]+\/[^/]+)\/pull\/\d+/i,
	);
	return m ? m[1] : '';
}

/**
 * @param {string} repoName owner/name
 * @param {number} number
 */
function parseRepo(repoName) {
	const [owner, name] = String(repoName || '').split('/');
	if (!owner || !name) return null;
	return { owner, name };
}

/**
 * Batch-fetch GraphQL reviewDecision for open PRs.
 * @param {{ repo: string, number: number, id: string }[]} prs
 * @returns {Map<string, string | null>}
 */
function fetchReviewDecisions(prs) {
	/** @type {Map<string, string | null>} */
	const out = new Map();
	if (!prs.length) return out;

	const chunkSize = 20;
	for (let i = 0; i < prs.length; i += chunkSize) {
		const chunk = prs.slice(i, i + chunkSize);
		const aliases = [];
		const vars = {};
		const varDefs = [];
		chunk.forEach((pr, idx) => {
			const parsed = parseRepo(pr.repo);
			if (!parsed || !pr.number) return;
			const o = `o${idx}`;
			const n = `n${idx}`;
			const num = `num${idx}`;
			varDefs.push(`$${o}: String!`, `$${n}: String!`, `$${num}: Int!`);
			vars[o] = parsed.owner;
			vars[n] = parsed.name;
			vars[num] = pr.number;
			aliases.push(
				`p${idx}: repository(owner: $${o}, name: $${n}) { pullRequest(number: $${num}) { reviewDecision } }`,
			);
		});
		if (!aliases.length) continue;

		const query = `query(${varDefs.join(', ')}) { ${aliases.join('\n')} }`;
		const args = ['api', 'graphql', '-f', `query=${query}`];
		for (const [key, value] of Object.entries(vars)) {
			if (typeof value === 'number') {
				args.push('-F', `${key}=${value}`);
			} else {
				args.push('-f', `${key}=${value}`);
			}
		}
		const result = runGh(args);
		if (!result.ok) continue;
		try {
			const payload = JSON.parse(result.stdout || '{}');
			const data = payload.data || {};
			chunk.forEach((pr, idx) => {
				const node = data[`p${idx}`];
				const decision =
					node &&
					node.pullRequest &&
					typeof node.pullRequest.reviewDecision === 'string'
						? node.pullRequest.reviewDecision
						: null;
				out.set(pr.id, decision);
			});
		} catch {
			/* keep missing decisions as unset */
		}
	}
	return out;
}

/**
 * @param {string} q
 * @param {number} limit
 */
function searchIssues(q, limit) {
	const result = runGh([
		'api',
		'--method',
		'GET',
		'search/issues',
		'-f',
		`q=${q}`,
		'-f',
		`per_page=${Math.min(100, Math.max(1, limit))}`,
	]);
	if (!result.ok) {
		return { items: [], error: result.error };
	}
	try {
		const payload = JSON.parse(result.stdout || '{}');
		return {
			items: Array.isArray(payload.items) ? payload.items : [],
			error: null,
		};
	} catch {
		return { items: [], error: 'gh returned invalid JSON' };
	}
}

/**
 * @param {{ login: string, label: string }[]} people
 * @param {{ track: 'work' | 'business', owners: string[], repos: string[] }} scope
 * @param {number} limit
 * @param {{ viewerLogin?: string, hideReviewedByMe?: boolean }} [opts]
 */
function searchScope(people, scope, limit, opts = {}) {
	if (!people.length) {
		return { prs: [], error: null };
	}
	const scopeParts = [
		...scope.owners.map((o) => ({ kind: 'org', value: o })),
		...scope.repos.map((r) => ({ kind: 'repo', value: r })),
	];
	if (!scopeParts.length) {
		return { prs: [], error: null };
	}

	const viewer = normalizeLogin(opts.viewerLogin || '');
	const hideReviewed = Boolean(opts.hideReviewedByMe && viewer);
	const labelByLogin = new Map(people.map((p) => [p.login, p.label]));
	/** @type {Map<string, object>} */
	const byId = new Map();
	/** @type {string[]} */
	const errors = [];

	for (const person of people) {
		for (const part of scopeParts) {
			// Teammate PRs: skip ones you already reviewed/approved.
			// Own PRs: keep (you are the author, not the reviewer).
			const skipReviewed =
				hideReviewed && person.login !== viewer
					? ` -reviewed-by:${viewer}`
					: '';
			const q = `author:${person.login} is:pr is:open -is:draft ${part.kind}:${part.value}${skipReviewed}`;
			const { items, error } = searchIssues(q, limit);
			if (error) {
				errors.push(`${person.login}@${part.value}: ${error.split('\n')[0]}`);
				continue;
			}
			for (const row of items) {
				if (!row || !row.pull_request) continue;
				const authorLogin = normalizeLogin(row.user && row.user.login);
				if (!authorLogin || !labelByLogin.has(authorLogin)) continue;
				const url = String(row.html_url || '');
				const repoName = repoFromPullUrl(url);
				const id = url || `${repoName}#${row.number}`;
				if (byId.has(id)) continue;
				byId.set(id, {
					id,
					number: Number(row.number) || 0,
					title: String(row.title || ''),
					url,
					repo: repoName,
					author: authorLogin,
					authorLabel: labelByLogin.get(authorLogin) || authorLogin,
					track: scope.track,
					updatedAt: String(row.updated_at || ''),
					createdAt: String(row.created_at || ''),
				});
			}
		}
	}

	return {
		prs: [...byId.values()],
		error: errors.length ? errors[0] : null,
	};
}

/**
 * @param {string} [vault]
 * @returns {Promise<{
 *   ok: boolean,
 *   prs: object[],
 *   people: { login: string, label: string }[],
 *   warnings: string[],
 *   fetchedAt: string,
 *   configFile: string,
 * }>}
 */
async function listOpenPrs(vault = DEFAULT_VAULT) {
	const resolved = path.resolve(vault);
	const { people, scopes, limit, hideReviewedByMe, warnings, configFile } =
		loadConfig(resolved);
	const fetchedAt = new Date().toISOString();

	if (!people.length) {
		return {
			ok: false,
			prs: [],
			people: [],
			warnings: [
				...warnings,
				`Add people[].login in ${CONFIG_NAME} (or JOURNAL_GITHUB_PR_AUTHORS)`,
			],
			fetchedAt,
			configFile,
			hideReviewedByMe,
		};
	}
	if (!scopes.length) {
		return {
			ok: false,
			prs: [],
			people,
			warnings: [
				...warnings,
				`Add scopes (owners / repos) in ${CONFIG_NAME} — e.g. LifewayIT for work`,
			],
			fetchedAt,
			configFile,
			hideReviewedByMe,
		};
	}

	const whoami = runGh(['api', 'user', '--jq', '.login']);
	if (!whoami.ok) {
		const hint = whoami.error.split('\n').find(Boolean) || whoami.error;
		return {
			ok: false,
			prs: [],
			people,
			warnings: [
				...warnings,
				`gh not authenticated — run: gh auth login -h github.com (${hint})`,
			],
			fetchedAt,
			configFile,
			hideReviewedByMe,
		};
	}
	const viewerLogin = normalizeLogin(whoami.stdout.trim());

	/** @type {Map<string, object>} */
	const byId = new Map();
	const allWarnings = [...warnings];

	for (const scope of scopes) {
		const { prs, error } = searchScope(people, scope, limit, {
			viewerLogin,
			hideReviewedByMe,
		});
		if (error) {
			const label =
				scope.owners.join(',') ||
				scope.repos.join(',') ||
				scope.track;
			allWarnings.push(`${scope.track} (${label}): ${error.split('\n')[0]}`);
			continue;
		}
		for (const pr of prs) {
			const prev = byId.get(pr.id);
			if (!prev) {
				byId.set(pr.id, pr);
				continue;
			}
			// Prefer work if the same PR appears under both scopes
			if (prev.track === 'business' && pr.track === 'work') {
				byId.set(pr.id, pr);
			}
		}
	}

	const list = [...byId.values()].sort((a, b) => {
		const ta = Date.parse(a.updatedAt) || 0;
		const tb = Date.parse(b.updatedAt) || 0;
		return tb - ta;
	});

	const decisions = fetchReviewDecisions(list);
	for (const pr of list) {
		pr.reviewDecision = decisions.has(pr.id)
			? decisions.get(pr.id)
			: null;
		pr.approved = pr.reviewDecision === 'APPROVED';
	}

	return {
		ok: allWarnings.length === 0 || list.length > 0,
		prs: list,
		people,
		warnings: allWarnings,
		fetchedAt,
		configFile,
		hideReviewedByMe,
		viewerLogin,
	};
}

module.exports = {
	listOpenPrs,
	loadConfig,
	configPath,
	CONFIG_NAME,
	DEFAULT_VAULT,
};
