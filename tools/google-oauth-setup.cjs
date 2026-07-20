#!/usr/bin/env node
/**
 * One-time Google OAuth setup for Journal Tasks + Calendar sync (skillsync .env).
 *
 * Prerequisites (Google Cloud Console):
 *   1. Create/select a project
 *   2. Enable "Google Tasks API" and "Google Calendar API"
 *   3. OAuth consent screen → **External** (not Internal — Internal causes Error 403: org_internal for personal Gmail)
 *      → add your Google account as a test user while Publishing status is Testing
 *   4. Credentials → Create OAuth client ID → Application type: Desktop app
 *   5. Copy Client ID + Client secret into skillsync/.env (from .env.example)
 *
 * Usage (from skillsync root):
 *   node tools/google-oauth-setup.cjs --calendar   # recommended: Tasks + Calendar
 *   node tools/google-oauth-setup.cjs             # Tasks only
 *
 * Writes token JSON to JOURNAL_GOOGLE_TOKEN_PATH or tools/.secrets/google-tasks-token.json
 * Does not use Cursor MCP — Calendar and Tasks both use this token.
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');
const { exec } = require('node:child_process');
const { loadEnv } = require('./lib/load-env.cjs');

const skillsyncRoot = path.join(__dirname, '..');
loadEnv(skillsyncRoot);

const PORT = Number(process.env.JOURNAL_OAUTH_PORT || 8765);
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;

const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	return { withCalendar: argv.includes('--calendar') };
}

/**
 * @param {string} url
 */
function openBrowser(url) {
	const cmd =
		process.platform === 'darwin'
			? `open "${url}"`
			: process.platform === 'win32'
				? `start "" "${url}"`
				: `xdg-open "${url}"`;
	exec(cmd);
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
				try {
					resolve({ status: res.statusCode || 0, body: JSON.parse(text), raw: text });
				} catch {
					resolve({ status: res.statusCode || 0, body: null, raw: text });
				}
			});
		});
		req.on('error', reject);
		if (opts.body) req.write(opts.body);
		req.end();
	});
}

function defaultTokenPath() {
	return (
		process.env.JOURNAL_GOOGLE_TOKEN_PATH ||
		path.join(skillsyncRoot, 'tools', '.secrets', 'google-tasks-token.json')
	);
}

async function main() {
	const { withCalendar } = parseArgs(process.argv.slice(2));
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		console.error(`Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.

1. Copy .env.example → .env
2. Create a Desktop OAuth client in Google Cloud Console
3. Paste Client ID and Client secret into .env
4. Re-run: node tools/google-oauth-setup.cjs --calendar
`);
		process.exit(1);
	}

	const scopes = [TASKS_SCOPE];
	if (withCalendar) scopes.push(CALENDAR_SCOPE);
	else {
		console.warn(
			'Note: running without --calendar (Tasks only). Prefer: node tools/google-oauth-setup.cjs --calendar\n',
		);
	}

	const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('scope', scopes.join(' '));
	authUrl.searchParams.set('access_type', 'offline');
	authUrl.searchParams.set('prompt', 'consent');

	const tokenPath = defaultTokenPath();
	fs.mkdirSync(path.dirname(tokenPath), { recursive: true });

	console.log('Scopes:', scopes.join(', '));
	console.log('Redirect URI (must match if you use a Web client):', REDIRECT_URI);
	console.log('Opening browser for Google sign-in…\n');

	/** @type {import('http').Server} */
	let server;
	const code = await new Promise((resolve, reject) => {
		server = http.createServer((req, res) => {
			try {
				const u = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
				if (u.pathname !== '/oauth2callback') {
					res.writeHead(404);
					res.end('Not found');
					return;
				}
				const err = u.searchParams.get('error');
				if (err) {
					res.writeHead(400, { 'Content-Type': 'text/html' });
					res.end(`<h1>Auth error</h1><p>${err}</p>`);
					reject(new Error(err));
					return;
				}
				const c = u.searchParams.get('code');
				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.end(
					'<h1>Journal Google auth OK</h1><p>You can close this tab and return to the terminal.</p>',
				);
				resolve(c);
			} catch (e) {
				reject(e);
			}
		});
		server.listen(PORT, '127.0.0.1', () => {
			openBrowser(authUrl.toString());
			console.log('If the browser did not open, visit:\n', authUrl.toString(), '\n');
		});
		server.on('error', reject);
	});

	server.close();

	const body = new URLSearchParams({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: REDIRECT_URI,
		grant_type: 'authorization_code',
	}).toString();

	const tokenRes = await request({
		hostname: 'oauth2.googleapis.com',
		path: '/token',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(body),
		},
		body,
	});

	if (tokenRes.status >= 300 || !tokenRes.body) {
		console.error('Token exchange failed:', tokenRes.raw);
		process.exit(1);
	}

	const b = /** @type {Record<string, unknown>} */ (tokenRes.body);
	const token = {
		access_token: b.access_token,
		refresh_token: b.refresh_token,
		token_type: b.token_type || 'Bearer',
		expiry_date: Date.now() + Number(b.expires_in || 3600) * 1000,
		client_id: clientId,
		client_secret: clientSecret,
		scope: b.scope || scopes.join(' '),
	};

	if (!token.refresh_token) {
		console.warn(
			'Warning: no refresh_token returned. Revoke app access at https://myaccount.google.com/permissions and re-run with prompt=consent.',
		);
	}

	fs.writeFileSync(tokenPath, `${JSON.stringify(token, null, 2)}\n`);
	console.log('Wrote', tokenPath);

	const listsPath = path.join(path.dirname(tokenPath), 'google-tasks-lists.json');
	if (!fs.existsSync(listsPath)) {
		fs.writeFileSync(
			listsPath,
			`${JSON.stringify(
				{
					work: '@default',
					business: '@default',
					life: '@default',
					_comment:
						'Replace @default with list IDs from Google Tasks (list IDs via API or leave @default for primary list)',
				},
				null,
				2,
			)}\n`,
		);
		console.log('Wrote list map stub', listsPath);
	}

	if (withCalendar) {
		const calendarsPath = path.join(path.dirname(tokenPath), 'google-calendars.json');
		if (!fs.existsSync(calendarsPath)) {
			fs.writeFileSync(
				calendarsPath,
				`${JSON.stringify(
					{
						personal: 'primary',
						work: 'primary',
						business: 'primary',
						_comment:
							'Replace primary with calendar IDs from Google Calendar settings (or leave primary for the default calendar)',
					},
					null,
					2,
				)}\n`,
			);
			console.log('Wrote calendar map stub', calendarsPath);
		}
	}

	const nextCal = withCalendar
		? `
  node tools/sync-google-calendar.cjs --dry-run
  node tools/sync-google-calendar.cjs`
		: `
  (re-run with --calendar to authorize Calendar, then sync-google-calendar.cjs)`;

	console.log(`
Next:
  node tools/sync-google-tasks.cjs --dry-run
  node tools/sync-google-tasks.cjs${nextCal}

Auth is via skillsync/.env + this token (not Cursor MCP).
`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
