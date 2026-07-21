#!/usr/bin/env node
/**
 * Local private bridge for Journal/_dashboard.
 * Serves dashboard HTML/JSON and enables checkbox writes + unified Google sync button
 * (Tasks from planning.json + Calendar from Journal ## Calendar).
 * Also GET /api/meetings — pull Google Calendar agenda for the day.
 * Also GET /api/prs — open ready-for-review GitHub PRs (gh + github-prs.json).
 * Also GET /api/jira-sprint — DCD active unassigned + next/future sprint (jira-sprint.json).
 *
 * Usage:
 *   node tools/journal-dashboard-server.cjs
 *   node tools/journal-dashboard-server.cjs --vault "/path/to/DenMercs" --port 8787
 *
 * Then open http://127.0.0.1:8787/dashboard.html
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {
	sync: syncTasks,
	planningPath,
	DEFAULT_VAULT,
} = require('./sync-google-tasks.cjs');
const { sync: syncCalendar } = require('./sync-google-calendar.cjs');
const { getAgenda } = require('./lib/meetings-agenda.cjs');
const { listOpenPrs } = require('./lib/github-prs.cjs');
const { listSprintDigest } = require('./lib/jira-sprint.cjs');
const { bundleDashboard } = require('./journal-dashboard-bundle.cjs');
const { mdToHtml, extractTitle } = require('./lib/markdown-render.cjs');
const { renderNotePage, renderDirPage } = require('./lib/journal-chrome.cjs');

/**
 * Push todos → Google Tasks and Journal ## Calendar → Google Calendar.
 * @param {string} vault
 */
async function syncAll(vault) {
	const tasks = await syncTasks(vault, false);
	const calendar = await syncCalendar(vault, false, null);
	const tasksOk = !tasks || tasks.ok !== false;
	const calendarOk = !calendar || calendar.ok !== false;
	const message = [
		`Tasks: ${(tasks && tasks.message) || 'done'}`,
		`Calendar: ${(calendar && calendar.message) || 'done'}`,
	].join(' · ');
	return {
		ok: tasksOk && calendarOk,
		message,
		tasks,
		calendar,
		planning: tasks && tasks.planning,
	};
}
/**
 * @param {string} vault
 */
function refreshObsidianSnapshot(vault) {
	try {
		const { outPath } = bundleDashboard(vault);
		console.log(`Obsidian snapshot refreshed → ${outPath}`);
	} catch (err) {
		console.error(
			'Obsidian bundle failed:',
			err instanceof Error ? err.message : err,
		);
	}
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	let port = Number(process.env.JOURNAL_DASHBOARD_PORT || 8787);
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
		if (argv[i] === '--port' && argv[i + 1]) port = Number(argv[++i]);
	}
	return { vault: path.resolve(vault), port };
}

/**
 * @param {string} filePath
 */
function contentType(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	switch (ext) {
		case '.html':
			return 'text/html; charset=utf-8';
		case '.js':
			return 'text/javascript; charset=utf-8';
		case '.css':
			return 'text/css; charset=utf-8';
		case '.json':
			return 'application/json; charset=utf-8';
		case '.md':
			return 'text/markdown; charset=utf-8';
		case '.svg':
			return 'image/svg+xml';
		default:
			return 'application/octet-stream';
	}
}

/**
 * @param {http.IncomingMessage} req
 */
function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on('data', (c) => chunks.push(c));
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

/**
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 * @param {string} [type]
 */
function send(res, status, body, type = 'application/json; charset=utf-8') {
	const payload = typeof body === 'string' ? body : JSON.stringify(body);
	res.writeHead(status, {
		'Content-Type': type,
		'Cache-Control': 'no-store',
	});
	res.end(payload);
}

function main() {
	const { vault, port } = parseArgs(process.argv.slice(2));
	const dashRoot = path.join(vault, 'Journal', '_dashboard');
	const journalRoot = path.join(vault, 'Journal');

	if (!fs.existsSync(dashRoot)) {
		console.error(`Missing dashboard folder: ${dashRoot}`);
		process.exit(1);
	}

	const server = http.createServer(async (req, res) => {
		try {
			const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

			if (req.method === 'GET' && url.pathname === '/api/health') {
				return send(res, 200, { ok: true, vault });
			}

			if (req.method === 'GET' && url.pathname === '/api/note') {
				const relRaw = String(url.searchParams.get('path') || '').replace(
					/^\/+/,
					'',
				);
				const rel = relRaw
					.replace(/^Journal\//i, '')
					.split('/')
					.map((p) => decodeURIComponent(p))
					.join('/');
				if (!rel || rel.includes('..') || path.isAbsolute(rel)) {
					return send(res, 400, { ok: false, error: 'invalid path' });
				}
				const abs = path.resolve(path.join(journalRoot, rel));
				if (
					abs !== path.resolve(journalRoot) &&
					!abs.startsWith(path.resolve(journalRoot) + path.sep)
				) {
					return send(res, 403, { ok: false, error: 'forbidden' });
				}
				if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
					return send(res, 404, { ok: false, error: 'not found', path: rel });
				}
				if (path.extname(abs).toLowerCase() !== '.md') {
					return send(res, 400, { ok: false, error: 'not a markdown note' });
				}
				const md = fs.readFileSync(abs, 'utf8');
				const title = extractTitle(md) || path.basename(abs, '.md');
				return send(res, 200, {
					ok: true,
					path: rel.split(path.sep).join('/'),
					title,
					html: mdToHtml(md),
				});
			}

			if (req.method === 'GET' && url.pathname === '/api/meetings') {
				try {
					const day = url.searchParams.get('day') || undefined;
					const daysRaw = url.searchParams.get('days');
					const days = daysRaw ? Number(daysRaw) : 1;
					const agenda = await getAgenda(vault, { day, days });
					return send(res, 200, agenda);
				} catch (err) {
					return send(res, 500, {
						ok: false,
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}

			if (req.method === 'GET' && url.pathname === '/api/prs') {
				try {
					const prs = await listOpenPrs(vault);
					return send(res, 200, prs);
				} catch (err) {
					return send(res, 500, {
						ok: false,
						prs: [],
						people: [],
						warnings: [],
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}

			if (req.method === 'GET' && url.pathname === '/api/jira-sprint') {
				try {
					const digest = await listSprintDigest(vault);
					return send(res, 200, digest);
				} catch (err) {
					return send(res, 500, {
						ok: false,
						project: 'DCD',
						activeSprint: null,
						futureSprint: null,
						unassigned: [],
						future: [],
						warnings: [],
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}

			if (req.method === 'POST' && url.pathname === '/api/todo-status') {
				const raw = await readBody(req);
				const body = JSON.parse(raw || '{}');
				const planFile = planningPath(vault);
				const planning = JSON.parse(fs.readFileSync(planFile, 'utf8'));
				const todo = (planning.todos || []).find((t) => t.id === body.id);
				if (!todo) {
					return send(res, 404, { error: `todo not found: ${body.id}` });
				}
				if (
					body.status === 'done' ||
					body.status === 'todo' ||
					body.status === 'in progress'
				) {
					todo.status = body.status;
				} else if (body.status === 'doing') {
					// Legacy alias → canonical status
					todo.status = 'in progress';
				}
				planning.updatedAt = new Date().toISOString();
				fs.writeFileSync(planFile, `${JSON.stringify(planning, null, 2)}\n`);
				refreshObsidianSnapshot(vault);
				return send(res, 200, planning);
			}

			if (
				req.method === 'POST' &&
				(url.pathname === '/api/sync-tasks' || url.pathname === '/api/sync')
			) {
				try {
					const result = await syncAll(vault);
					if (!result.ok) {
						return send(res, 503, {
							error: result.message || 'sync failed',
							message: result.message,
							tasks: result.tasks,
							calendar: result.calendar,
						});
					}
					refreshObsidianSnapshot(vault);
					return send(res, 200, result);
				} catch (err) {
					return send(res, 500, {
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}

			if (req.method !== 'GET' && req.method !== 'HEAD') {
				return send(res, 405, { error: 'method not allowed' });
			}

			let rel = decodeURIComponent(url.pathname);
			if (rel === '/') rel = '/dashboard.html';

			// Serve dashboard assets and allow ../Year/week.md links under Journal/
			let filePath;
			if (rel.startsWith('/On%20Call') || rel.startsWith('/On Call')) {
				filePath = path.join(journalRoot, decodeURIComponent(rel.slice(1)));
			} else if (/^\/\d{4}\//.test(rel)) {
				filePath = path.join(journalRoot, rel.slice(1));
			} else if (rel.startsWith('/Standup/') || rel.startsWith('/Standup%2F')) {
				filePath = path.join(journalRoot, decodeURIComponent(rel.slice(1)));
			} else {
				filePath = path.join(dashRoot, rel.replace(/^\//, ''));
			}

			const resolved = path.resolve(filePath);
			const allowedRoots = [path.resolve(dashRoot), path.resolve(journalRoot)];
			if (!allowedRoots.some((root) => resolved === root || resolved.startsWith(root + path.sep))) {
				return send(res, 403, { error: 'forbidden' });
			}

			if (!fs.existsSync(resolved)) {
				return send(res, 404, { error: 'not found' });
			}

			const wantRaw = url.searchParams.get('raw') === '1';

			// Directory browse (On Call/, Standup/, year folders)
			if (fs.statSync(resolved).isDirectory()) {
				const relFromJournal = path.relative(journalRoot, resolved).split(path.sep).join('/');
				const entries = fs
					.readdirSync(resolved, { withFileTypes: true })
					.filter((d) => !d.name.startsWith('.'))
					.sort((a, b) => {
						if (a.isDirectory() !== b.isDirectory()) {
							return a.isDirectory() ? -1 : 1;
						}
						return b.name.localeCompare(a.name);
					})
					.map((d) => {
						const name = d.name;
						const href =
							'/' +
							[...relFromJournal.split('/').filter(Boolean), name]
								.map(encodeURIComponent)
								.join('/') +
							(d.isDirectory() ? '/' : '');
						return {
							name,
							href,
							kind: d.isDirectory() ? /** @type {'dir'} */ ('dir') : /** @type {'file'} */ ('file'),
						};
					});
				const title = path.basename(resolved) || 'Journal';
				const html = renderDirPage({
					title,
					relPath: relFromJournal || 'Journal',
					entries,
				});
				return send(res, 200, html, 'text/html; charset=utf-8');
			}

			// Beautified Markdown notes — ?raw=1 for plain text/markdown
			if (path.extname(resolved).toLowerCase() === '.md' && !wantRaw) {
				const md = fs.readFileSync(resolved, 'utf8');
				const relFromJournal = path.relative(journalRoot, resolved).split(path.sep).join('/');
				const title = extractTitle(md) || path.basename(resolved, '.md');
				const html = renderNotePage({
					title,
					htmlBody: mdToHtml(md),
					relPath: relFromJournal,
					md,
				});
				return send(res, 200, html, 'text/html; charset=utf-8');
			}

			const data = fs.readFileSync(resolved);
			res.writeHead(200, {
				'Content-Type': contentType(resolved),
				'Cache-Control': 'no-store',
			});
			res.end(req.method === 'HEAD' ? undefined : data);
		} catch (err) {
			send(res, 500, {
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});

	server.listen(port, '127.0.0.1', () => {
		refreshObsidianSnapshot(vault);
		console.log(`Journal dashboard → http://127.0.0.1:${port}/dashboard.html`);
		console.log(`Obsidian file → Journal/_dashboard/dashboard.obsidian.html`);
		console.log(`Vault: ${vault}`);
		console.log('Private: bound to 127.0.0.1 only.');
	});
}

main();
