#!/usr/bin/env node
/**
 * Push Journal/YYYY ## Calendar bullets → Google Calendar (one-way).
 *
 * Usage:
 *   node tools/sync-google-calendar.cjs
 *   node tools/sync-google-calendar.cjs --vault "/path/to/DenMercs"
 *   node tools/sync-google-calendar.cjs --week 2026-07-20
 *   node tools/sync-google-calendar.cjs --dry-run
 *
 * Credentials (first existing wins):
 *   Load skillsync/.env first (GOOGLE_* + JOURNAL_GOOGLE_TOKEN_PATH)
 *   $JOURNAL_GOOGLE_TOKEN_PATH
 *   <vault>/_scripts/google-tasks-token.json
 *   <skillsync>/tools/.secrets/google-tasks-token.json
 *
 * One-time OAuth (Tasks + Calendar):
 *   cp .env.example .env   # fill GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 *   node tools/google-oauth-setup.cjs --calendar
 *
 * Calendar map (optional file next to token: google-calendars.json):
 *   { "personal": "primary", "work": "CAL_ID", "business": "CAL_ID" }
 *
 * Without credentials, exits 0 on --dry-run / prints setup help; exits 2 otherwise.
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { loadEnv } = require('./lib/load-env.cjs');

const skillsyncRoot = path.join(__dirname, '..');
loadEnv(skillsyncRoot);

const DEFAULT_VAULT =
	process.env.JOURNAL_VAULT_PATH ||
	'/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs';

const DEFAULT_TZ = process.env.JOURNAL_TIMEZONE || 'America/Chicago';

const MONTHS = {
	jan: 0,
	january: 0,
	feb: 1,
	february: 1,
	mar: 2,
	march: 2,
	apr: 3,
	april: 3,
	may: 4,
	jun: 5,
	june: 5,
	jul: 6,
	july: 6,
	aug: 7,
	august: 7,
	sep: 8,
	sept: 8,
	september: 8,
	oct: 9,
	october: 9,
	nov: 10,
	november: 10,
	dec: 11,
	december: 11,
};

const COLOR_BY_TRACK = {
	personal: '1',
	work: '9',
	business: '6',
};

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	let dryRun = false;
	/** @type {string | null} */
	let week = null;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
		if (argv[i] === '--week' && argv[i + 1]) week = argv[++i];
		if (argv[i] === '--dry-run') dryRun = true;
	}
	return { vault: path.resolve(vault), dryRun, week };
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
function findCalendarsPath(tokenPath) {
	const p = path.join(path.dirname(tokenPath), 'google-calendars.json');
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
async function calendarApi(accessToken, method, apiPath, jsonBody) {
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
		hostname: 'www.googleapis.com',
		path: apiPath,
		method,
		headers,
		body,
	});
}

/**
 * Strip leading list marker + decorative emoji.
 * @param {string} line
 */
function stripBullet(line) {
	// Drop list marker, then leading symbols/emoji (avoid combining marks in []).
	return line
		.replace(/^\s*[-*]\s+/, '')
		.replace(/^[^\p{L}\p{N}]+/u, '')
		.trim();
}

/**
 * @param {string} timeStr
 * @returns {{ hours: number, minutes: number } | null}
 */
function parseTime(timeStr) {
	const s = timeStr.trim().toLowerCase();
	const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
	if (m24) {
		return { hours: Number(m24[1]), minutes: Number(m24[2]) };
	}
	const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
	if (m12) {
		let hours = Number(m12[1]);
		const minutes = Number(m12[2] || 0);
		const ap = m12[3];
		if (ap === 'pm' && hours < 12) hours += 12;
		if (ap === 'am' && hours === 12) hours = 0;
		return { hours, minutes };
	}
	return null;
}

/**
 * @param {string} datePart
 * @param {number} defaultYear
 * @returns {{ y: number, m: number, d: number, time: { hours: number, minutes: number } | null } | null}
 */
function parseDatePart(datePart, defaultYear) {
	const raw = datePart.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');

	const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(.+))?$/);
	if (iso) {
		const time = iso[4] ? parseTime(iso[4]) : null;
		if (iso[4] && !time) return null;
		return {
			y: Number(iso[1]),
			m: Number(iso[2]) - 1,
			d: Number(iso[3]),
			time,
		};
	}

	const named = raw.match(
		/^([A-Za-z]+)\s+(\d{1,2})(?:\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2}))?$/i,
	);
	if (named) {
		const month = MONTHS[named[1].toLowerCase()];
		if (month == null) return null;
		const d = Number(named[2]);
		const time = named[3] ? parseTime(named[3]) : null;
		if (named[3] && !time) return null;
		return { y: defaultYear, m: month, d, time };
	}

	return null;
}

/**
 * @param {string} line
 * @param {number} defaultYear
 * @param {string} sourceFile
 */
function parseEventLine(line, defaultYear, sourceFile) {
	const stripped = stripBullet(line);
	if (!stripped || stripped.startsWith('#')) return null;

	const trackMatch = stripped.match(/\((Personal|Work|Business)\)\s*$/i);
	if (!trackMatch) return null;
	const track = trackMatch[1].toLowerCase();
	const withoutTrack = stripped.slice(0, trackMatch.index).trim();

	const sep = withoutTrack.indexOf(' - ');
	if (sep < 0) return null;
	const datePart = withoutTrack.slice(0, sep).trim();
	const title = withoutTrack.slice(sep + 3).trim();
	if (!title) return null;

	const parsed = parseDatePart(datePart, defaultYear);
	if (!parsed) return null;

	const dateStr = `${parsed.y}-${String(parsed.m + 1).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;

	return {
		title,
		track,
		date: dateStr,
		allDay: !parsed.time,
		hours: parsed.time ? parsed.time.hours : null,
		minutes: parsed.time ? parsed.time.minutes : null,
		sourceFile,
		raw: line.trim(),
	};
}

/**
 * Extract ## Calendar section bullets from markdown.
 * @param {string} md
 * @param {number} defaultYear
 * @param {string} sourceFile
 */
function eventsFromMarkdown(md, defaultYear, sourceFile) {
	const lines = md.split(/\r?\n/);
	/** @type {ReturnType<typeof parseEventLine>[]} */
	const events = [];
	let inCalendar = false;
	for (const line of lines) {
		if (/^##\s+Calendar\s*$/i.test(line)) {
			inCalendar = true;
			continue;
		}
		if (inCalendar && /^##\s+/.test(line)) break;
		if (!inCalendar) continue;
		if (!/^\s*[-*]\s+/.test(line)) continue;
		const ev = parseEventLine(line, defaultYear, sourceFile);
		if (ev) events.push(ev);
	}
	return events;
}

/**
 * @param {string} vault
 * @param {string | null} weekFilter Monday week start YYYY-MM-DD or null for current+upcoming years
 */
function collectJournalEvents(vault, weekFilter) {
	const journalRoot = path.join(vault, 'Journal');
	/** @type {NonNullable<ReturnType<typeof parseEventLine>>[]} */
	const events = [];

	if (weekFilter) {
		const y = weekFilter.slice(0, 4);
		const file = path.join(journalRoot, y, `${weekFilter}.md`);
		if (!fs.existsSync(file)) {
			throw new Error(`Week file not found: ${file}`);
		}
		const md = fs.readFileSync(file, 'utf8');
		events.push(...eventsFromMarkdown(md, Number(y), file));
		return events;
	}

	if (!fs.existsSync(journalRoot)) {
		throw new Error(`Missing Journal folder: ${journalRoot}`);
	}

	const now = new Date();
	const years = new Set([String(now.getFullYear()), String(now.getFullYear() + 1)]);
	for (const ent of fs.readdirSync(journalRoot, { withFileTypes: true })) {
		if (ent.isDirectory() && /^\d{4}$/.test(ent.name)) years.add(ent.name);
	}

	for (const y of [...years].sort()) {
		const dir = path.join(journalRoot, y);
		if (!fs.existsSync(dir)) continue;
		for (const name of fs.readdirSync(dir).sort()) {
			if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) continue;
			const file = path.join(dir, name);
			const md = fs.readFileSync(file, 'utf8');
			events.push(...eventsFromMarkdown(md, Number(y), file));
		}
	}
	return events;
}

/**
 * @param {NonNullable<ReturnType<typeof parseEventLine>>} ev
 * @param {string} timeZone
 */
function eventBody(ev, timeZone) {
	const colorId = COLOR_BY_TRACK[ev.track] || '1';
	if (ev.allDay) {
		const next = new Date(`${ev.date}T12:00:00Z`);
		next.setUTCDate(next.getUTCDate() + 1);
		const endDate = next.toISOString().slice(0, 10);
		return {
			summary: ev.title,
			colorId,
			start: { date: ev.date },
			end: { date: endDate },
		};
	}
	const hh = String(ev.hours).padStart(2, '0');
	const mm = String(ev.minutes).padStart(2, '0');
	const startLocal = `${ev.date}T${hh}:${mm}:00`;
	const endMinutes = (ev.hours || 0) * 60 + (ev.minutes || 0) + 60;
	const endH = Math.floor(endMinutes / 60) % 24;
	const endM = endMinutes % 60;
	let endDate = ev.date;
	if (endMinutes >= 24 * 60) {
		const d = new Date(`${ev.date}T12:00:00Z`);
		d.setUTCDate(d.getUTCDate() + 1);
		endDate = d.toISOString().slice(0, 10);
	}
	const endLocal = `${endDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
	return {
		summary: ev.title,
		colorId,
		start: { dateTime: startLocal, timeZone },
		end: { dateTime: endLocal, timeZone },
	};
}

/**
 * @param {string} title
 * @param {string} dateStr YYYY-MM-DD
 * @param {Set<string>} existingKeys lower(title)|date
 */
function isDuplicate(title, dateStr, existingKeys) {
	return existingKeys.has(`${title.trim().toLowerCase()}|${dateStr}`);
}

/**
 * @param {unknown} item
 */
function eventKeyFromGoogle(item) {
	if (!item || typeof item !== 'object') return null;
	const ev = /** @type {{ summary?: string, start?: { date?: string, dateTime?: string } }} */ (item);
	const title = (ev.summary || '').trim().toLowerCase();
	if (!title) return null;
	const start = ev.start || {};
	let dateStr = start.date || null;
	if (!dateStr && start.dateTime) dateStr = start.dateTime.slice(0, 10);
	if (!dateStr) return null;
	return `${title}|${dateStr}`;
}

/**
 * @param {string} vault
 * @param {boolean} dryRun
 * @param {string | null} week
 */
async function sync(vault, dryRun, week) {
	const events = collectJournalEvents(vault, week);
	const timeZone = DEFAULT_TZ;

	const tokenPath = findTokenPath(vault);
	if (!tokenPath) {
		const msg = [
			'Google Calendar credentials not found.',
			'One-time setup:',
			'  1. Fill GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in skillsync/.env',
			'  2. Enable Google Tasks API + Google Calendar API',
			'  3. node tools/google-oauth-setup.cjs --calendar',
			'Token paths:',
			`  - $JOURNAL_GOOGLE_TOKEN_PATH`,
			`  - ${path.join(vault, '_scripts', 'google-tasks-token.json')}`,
			`  - ${path.join(skillsyncRoot, 'tools', '.secrets', 'google-tasks-token.json')}`,
			'Optional calendar map: google-calendars.json beside the token.',
		].join('\n');
		if (dryRun) {
			console.log(`[dry-run] Would sync ${events.length} calendar events.`);
			for (const ev of events) {
				console.log(`  - ${ev.date} ${ev.allDay ? 'all-day' : `${ev.hours}:${String(ev.minutes).padStart(2, '0')}`} [${ev.track}] ${ev.title}`);
			}
			console.log(msg);
			return { ok: true, dryRun: true, message: `dry-run: ${events.length} events (no credentials)`, events };
		}
		console.error(msg);
		process.exitCode = 2;
		return { ok: false, message: 'missing credentials' };
	}

	/** @type {Record<string, string>} */
	let calendars = { personal: 'primary', work: 'primary', business: 'primary' };
	const calendarsPath = findCalendarsPath(tokenPath);
	if (calendarsPath) {
		const loaded = JSON.parse(fs.readFileSync(calendarsPath, 'utf8'));
		calendars = { ...calendars, ...loaded };
		delete calendars._comment;
	}

	if (dryRun) {
		console.log(`[dry-run] ${events.length} events → calendars`, calendars);
		for (const ev of events) {
			const calId = calendars[ev.track] || calendars.personal || 'primary';
			console.log(`  - ${ev.date} [${ev.track}/${calId}] ${ev.title}`);
		}
		return {
			ok: true,
			dryRun: true,
			message: `dry-run: ${events.length} events`,
			events,
		};
	}

	let token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
	token = await refreshAccessToken(token);
	fs.writeFileSync(tokenPath, `${JSON.stringify(token, null, 2)}\n`);

	if (events.length === 0) {
		console.log('No calendar events found in Journal ## Calendar sections.');
		return { ok: true, message: 'no events', created: 0, skipped: 0 };
	}

	const dates = events.map((e) => e.date).sort();
	const timeMin = `${dates[0]}T00:00:00Z`;
	const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
	last.setUTCDate(last.getUTCDate() + 2);
	const timeMax = last.toISOString();

	/** @type {Set<string>} */
	const existingKeys = new Set();
	const calendarIds = [...new Set(events.map((e) => calendars[e.track] || calendars.personal || 'primary'))];

	for (const calId of calendarIds) {
		let pageToken = '';
		do {
			const q = new URLSearchParams({
				timeMin,
				timeMax,
				singleEvents: 'true',
				maxResults: '2500',
			});
			if (pageToken) q.set('pageToken', pageToken);
			const res = await calendarApi(
				String(token.access_token),
				'GET',
				`/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${q}`,
			);
			if (res.status >= 300) {
				throw new Error(`List events failed for ${calId}: ${res.raw}`);
			}
			const body = /** @type {{ items?: unknown[], nextPageToken?: string }} */ (res.body || {});
			for (const item of body.items || []) {
				const key = eventKeyFromGoogle(item);
				if (key) existingKeys.add(key);
			}
			pageToken = body.nextPageToken || '';
		} while (pageToken);
	}

	let created = 0;
	let skipped = 0;

	for (const ev of events) {
		if (isDuplicate(ev.title, ev.date, existingKeys)) {
			skipped++;
			continue;
		}
		const calId = calendars[ev.track] || calendars.personal || 'primary';
		const body = eventBody(ev, timeZone);
		const res = await calendarApi(
			String(token.access_token),
			'POST',
			`/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
			body,
		);
		if (res.status >= 300) {
			throw new Error(`Create failed for "${ev.title}" (${ev.date}): ${res.raw}`);
		}
		existingKeys.add(`${ev.title.trim().toLowerCase()}|${ev.date}`);
		created++;
	}

	const message = `created ${created}, skipped duplicates ${skipped}`;
	console.log(message);
	return { ok: true, message, created, skipped, events };
}

async function main() {
	const { vault, dryRun, week } = parseArgs(process.argv.slice(2));
	try {
		const result = await sync(vault, dryRun, week);
		if (result && result.ok === false) return;
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
		process.exitCode = 1;
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	sync,
	parseEventLine,
	eventsFromMarkdown,
	collectJournalEvents,
	findTokenPath,
	findCalendarsPath,
	refreshAccessToken,
	calendarApi,
	DEFAULT_VAULT,
	DEFAULT_TZ,
};
