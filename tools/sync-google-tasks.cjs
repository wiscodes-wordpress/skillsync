#!/usr/bin/env node
/**
 * Push Journal/_dashboard/planning.json todos → Google Tasks (one-way).
 *
 * Usage:
 *   node tools/sync-google-tasks.cjs
 *   node tools/sync-google-tasks.cjs --vault "/path/to/DenMercs"
 *   node tools/sync-google-tasks.cjs --dry-run
 *
 * Credentials (first existing wins):
 *   $JOURNAL_GOOGLE_TOKEN_PATH
 *   <vault>/_scripts/google-tasks-token.json
 *   <skillsync>/tools/.secrets/google-tasks-token.json
 *
 * Token JSON shape:
 *   {
 *     "access_token": "...",
 *     "refresh_token": "...",
 *     "client_id": "...",
 *     "client_secret": "...",
 *     "token_type": "Bearer",
 *     "expiry_date": 0
 *   }
 *
 * List mapping (optional file next to token: google-tasks-lists.json):
 *   { "work": "LIST_ID", "business": "LIST_ID", "life": "LIST_ID" }
 *
 * Without credentials, exits 0 on --dry-run / prints setup help; exits 2 otherwise.
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const DEFAULT_VAULT =
	'/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs';

const skillsyncRoot = path.join(__dirname, '..');

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	let dryRun = false;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
		if (argv[i] === '--dry-run') dryRun = true;
	}
	return { vault: path.resolve(vault), dryRun };
}

/**
 * @param {string} vault
 */
function planningPath(vault) {
	return path.join(vault, 'Journal', '_dashboard', 'planning.json');
}

/**
 * @param {string} vault
 */
function findTokenPath(vault) {
	const candidates = [
		process.env.JOURNAL_GOOGLE_TOKEN_PATH,
		path.join(vault, '_scripts', 'google-tasks-token.json'),
		path.join(skillsyncRoot, 'tools', '.secrets', 'google-tasks-token.json'),
	].filter(Boolean);
	for (const p of candidates) {
		if (p && fs.existsSync(p)) return p;
	}
	return null;
}

/**
 * @param {string} tokenPath
 */
function findListsPath(tokenPath) {
	const dir = path.dirname(tokenPath);
	const p = path.join(dir, 'google-tasks-lists.json');
	return fs.existsSync(p) ? p : null;
}

/**
 * @param {import('http').RequestOptions & { body?: string }} opts
 */
function request(opts) {
	return new Promise((resolve, reject) => {
		const req = https.request(opts, (res) => {
			const chunks = [];
			res.on('data', (c) => chunks.push(c));
			res.on('end', () => {
				const text = Buffer.concat(chunks).toString('utf8');
				/** @type {unknown} */
				let json = null;
				try {
					json = text ? JSON.parse(text) : null;
				} catch {
					json = text;
				}
				resolve({ status: res.statusCode || 0, body: json, raw: text });
			});
		});
		req.on('error', reject);
		if (opts.body) req.write(opts.body);
		req.end();
	});
}

/**
 * @param {Record<string, unknown>} token
 */
async function refreshAccessToken(token) {
	if (!token.refresh_token || !token.client_id || !token.client_secret) {
		return token;
	}
	const expiry = Number(token.expiry_date || 0);
	if (expiry && Date.now() < expiry - 60_000 && token.access_token) {
		return token;
	}
	const body = new URLSearchParams({
		client_id: String(token.client_id),
		client_secret: String(token.client_secret),
		refresh_token: String(token.refresh_token),
		grant_type: 'refresh_token',
	}).toString();
	const res = await request({
		hostname: 'oauth2.googleapis.com',
		path: '/token',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(body),
		},
		body,
	});
	if (res.status >= 300 || !res.body || typeof res.body !== 'object') {
		throw new Error(`Token refresh failed (${res.status}): ${res.raw}`);
	}
	const b = /** @type {Record<string, unknown>} */ (res.body);
	token.access_token = b.access_token;
	token.expiry_date = Date.now() + Number(b.expires_in || 3600) * 1000;
	return token;
}

/**
 * @param {string} accessToken
 * @param {string} method
 * @param {string} apiPath
 * @param {unknown} [jsonBody]
 */
async function tasksApi(accessToken, method, apiPath, jsonBody) {
	const body = jsonBody != null ? JSON.stringify(jsonBody) : undefined;
	const headers = {
		Authorization: `Bearer ${accessToken}`,
		Accept: 'application/json',
	};
	if (body) {
		headers['Content-Type'] = 'application/json';
		headers['Content-Length'] = Buffer.byteLength(body);
	}
	return request({
		hostname: 'tasks.googleapis.com',
		path: apiPath,
		method,
		headers,
		body,
	});
}

/**
 * @param {string} vault
 * @param {boolean} dryRun
 */
async function sync(vault, dryRun) {
	const planFile = planningPath(vault);
	if (!fs.existsSync(planFile)) {
		throw new Error(`Missing planning.json: ${planFile}`);
	}
	const planning = JSON.parse(fs.readFileSync(planFile, 'utf8'));
	const todos = Array.isArray(planning.todos) ? planning.todos : [];

	const tokenPath = findTokenPath(vault);
	if (!tokenPath) {
		const msg = [
			'Google Tasks credentials not found.',
			'Place OAuth token JSON at one of:',
			`  - $JOURNAL_GOOGLE_TOKEN_PATH`,
			`  - ${path.join(vault, '_scripts', 'google-tasks-token.json')}`,
			`  - ${path.join(skillsyncRoot, 'tools', '.secrets', 'google-tasks-token.json')}`,
			'Optional list map: google-tasks-lists.json beside the token.',
		].join('\n');
		if (dryRun) {
			console.log(`[dry-run] Would sync ${todos.length} todos.`);
			console.log(msg);
			return { ok: true, dryRun: true, message: `dry-run: ${todos.length} todos (no credentials)` };
		}
		console.error(msg);
		process.exitCode = 2;
		return { ok: false, message: 'missing credentials' };
	}

	let token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
	token = await refreshAccessToken(token);
	fs.writeFileSync(tokenPath, `${JSON.stringify(token, null, 2)}\n`);

	const listsPath = findListsPath(tokenPath);
	/** @type {Record<string, string>} */
	let lists = { work: '@default', business: '@default', life: '@default' };
	if (listsPath) {
		lists = { ...lists, ...JSON.parse(fs.readFileSync(listsPath, 'utf8')) };
	}

	if (dryRun) {
		console.log(`[dry-run] ${todos.length} todos → lists`, lists);
		return {
			ok: true,
			dryRun: true,
			message: `dry-run: ${todos.length} todos`,
			planning,
		};
	}

	let created = 0;
	let updated = 0;
	let completed = 0;

	for (const todo of todos) {
		const listId = lists[todo.track] || lists.life || '@default';
		const status = todo.status === 'done' ? 'completed' : 'needsAction';
		const taskBody = {
			title: todo.title,
			status,
			due: todo.due ? `${todo.due}T00:00:00.000Z` : undefined,
		};

		if (!todo.googleTaskId) {
			const res = await tasksApi(
				String(token.access_token),
				'POST',
				`/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`,
				taskBody,
			);
			if (res.status >= 300) {
				throw new Error(`Create failed for ${todo.id}: ${res.raw}`);
			}
			const id =
				res.body && typeof res.body === 'object'
					? /** @type {{ id?: string }} */ (res.body).id
					: null;
			todo.googleTaskId = id || null;
			created++;
		} else {
			const res = await tasksApi(
				String(token.access_token),
				'PATCH',
				`/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(todo.googleTaskId)}`,
				taskBody,
			);
			if (res.status >= 300) {
				throw new Error(`Update failed for ${todo.id}: ${res.raw}`);
			}
			updated++;
			if (status === 'completed') completed++;
		}
	}

	planning.todos = todos;
	planning.updatedAt = new Date().toISOString();
	fs.writeFileSync(planFile, `${JSON.stringify(planning, null, 2)}\n`);

	try {
		const { bundleDashboard } = require('./journal-dashboard-bundle.cjs');
		bundleDashboard(vault);
	} catch {
		/* optional */
	}

	const message = `created ${created}, updated ${updated}, completed marks ${completed}`;
	console.log(message);
	return { ok: true, message, planning };
}

async function main() {
	const { vault, dryRun } = parseArgs(process.argv.slice(2));
	try {
		const result = await sync(vault, dryRun);
		if (result && result.ok === false) return;
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
		process.exitCode = 1;
	}
}

if (require.main === module) {
	main();
}

module.exports = { sync, planningPath, DEFAULT_VAULT };
