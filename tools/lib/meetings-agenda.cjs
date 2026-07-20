/**
 * Meetings agenda: pull Google Calendar for the day.
 * Push remains sync-google-calendar.cjs (Journal → Google).
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadEnv } = require('./load-env.cjs');

const skillsyncRoot = path.join(__dirname, '..', '..');
loadEnv(skillsyncRoot);

const DEFAULT_TZ = process.env.JOURNAL_TIMEZONE || 'America/Chicago';

/**
 * @param {Date} day Local calendar day
 */
function dayBounds(day) {
	const start = new Date(day);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	return { start, end, startMs: start.getTime(), endMs: end.getTime() };
}

/**
 * @param {string} isoDate YYYY-MM-DD
 */
function parseDay(isoDate) {
	const m = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return new Date();
	return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   track: 'work' | 'personal' | 'business',
 *   source: 'google',
 *   start: string,
 *   end: string,
 *   allDay: boolean,
 *   location: string,
 *   meetingUrl: string,
 *   startMs: number,
 *   endMs: number,
 * }} Meeting
 */

/**
 * Prefer Meet / Teams / Zoom-style join URLs from free text.
 * @param {string} text
 * @returns {string}
 */
function findMeetingUrlInText(text) {
	const s = String(text || '');
	if (!s) return '';
	const patterns = [
		/https?:\/\/meet\.google\.com\/[a-z0-9-]+/i,
		/https?:\/\/(?:[\w.-]+\.)?zoom\.us\/(?:j|my)\/[^\s<>"']+/i,
		/https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s<>"']+/i,
		/https?:\/\/teams\.live\.com\/meet\/[^\s<>"']+/i,
		/https?:\/\/[\w.-]*webex\.com\/[^\s<>"']+/i,
	];
	for (const re of patterns) {
		const m = s.match(re);
		if (m) return m[0].replace(/[),.;]+$/, '');
	}
	const any = s.match(/https?:\/\/[^\s<>"']+/i);
	if (any) {
		const u = any[0].replace(/[),.;]+$/, '');
		if (/meet|zoom|teams|webex|gotomeeting|whereby|facetime/i.test(u)) {
			return u;
		}
	}
	return '';
}

/**
 * @param {string} value
 * @returns {string}
 */
function asHttpUrl(value) {
	const s = String(value || '').trim();
	if (!/^https?:\/\//i.test(s)) return '';
	return s.replace(/[),.;]+$/, '');
}

/**
 * @param {object} item Google Calendar event
 * @returns {string}
 */
function meetingUrlFromGoogle(item) {
	if (item.hangoutLink) {
		const u = asHttpUrl(item.hangoutLink);
		if (u) return u;
	}
	const entries =
		item.conferenceData && Array.isArray(item.conferenceData.entryPoints)
			? item.conferenceData.entryPoints
			: [];
	const video = entries.find(
		(e) => e && e.entryPointType === 'video' && e.uri,
	);
	if (video) {
		const u = asHttpUrl(video.uri);
		if (u) return u;
	}
	for (const e of entries) {
		const u = asHttpUrl(e && e.uri);
		if (u && /meet|zoom|teams|webex/i.test(u)) return u;
	}
	const fromLoc = asHttpUrl(item.location) || findMeetingUrlInText(item.location);
	if (fromLoc) return fromLoc;
	return findMeetingUrlInText(item.description || '');
}

/**
 * @param {object} item Google event
 * @param {'work' | 'personal' | 'business'} track
 * @returns {Meeting | null}
 */
function normalizeGoogle(item, track) {
	if (!item || item.status === 'cancelled') return null;
	const title = String(item.summary || '(no title)').trim();
	const startRaw = item.start || {};
	const endRaw = item.end || {};
	const allDay = Boolean(startRaw.date);
	let startMs;
	let endMs;
	if (allDay) {
		const [y, m, d] = String(startRaw.date).split('-').map(Number);
		startMs = new Date(y, m - 1, d, 0, 0, 0).getTime();
		const [ey, em, ed] = String(endRaw.date || startRaw.date)
			.split('-')
			.map(Number);
		endMs = new Date(ey, em - 1, ed, 0, 0, 0).getTime();
	} else {
		startMs = new Date(startRaw.dateTime || startRaw.date).getTime();
		endMs = new Date(
			endRaw.dateTime || endRaw.date || startRaw.dateTime,
		).getTime();
		if (!Number.isFinite(endMs)) endMs = startMs + 60 * 60 * 1000;
	}
	if (!Number.isFinite(startMs)) return null;
	const location = String(item.location || '');
	return {
		id: `google:${item.id || `${track}-${startMs}`}`,
		title,
		track,
		source: 'google',
		start: new Date(startMs).toISOString(),
		end: new Date(endMs).toISOString(),
		allDay,
		location,
		meetingUrl: meetingUrlFromGoogle(item),
		startMs,
		endMs,
	};
}

/**
 * @param {string} vault
 * @param {number} timeMinMs
 * @param {number} timeMaxMs
 * @returns {Promise<{ meetings: Meeting[], error?: string, calendars?: Record<string, string> }>}
 */
async function pullGoogle(vault, timeMinMs, timeMaxMs) {
	const cal = require('../sync-google-calendar.cjs');
	const tokenPath = cal.findTokenPath(vault);
	if (!tokenPath) {
		return {
			meetings: [],
			error: 'Google Calendar credentials not found (run yarn google:auth)',
		};
	}

	/** @type {Record<string, string>} */
	let calendars = { personal: 'primary', work: 'primary', business: 'primary' };
	const calendarsPath = cal.findCalendarsPath(tokenPath);
	if (calendarsPath) {
		const loaded = JSON.parse(fs.readFileSync(calendarsPath, 'utf8'));
		calendars = { ...calendars, ...loaded };
		delete calendars._comment;
	}

	/** @type {Array<{ track: 'work' | 'personal' | 'business', calId: string }>} */
	const targets = [
		{ track: 'personal', calId: calendars.personal || 'primary' },
		{ track: 'business', calId: calendars.business || 'primary' },
		{ track: 'work', calId: calendars.work || 'primary' },
	];

	/** @type {Map<string, 'work' | 'personal' | 'business'>} */
	const byCal = new Map();
	for (const t of targets) {
		if (!byCal.has(t.calId)) byCal.set(t.calId, t.track);
	}

	let token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
	token = await cal.refreshAccessToken(token);
	fs.writeFileSync(tokenPath, `${JSON.stringify(token, null, 2)}\n`);

	const timeMin = new Date(timeMinMs).toISOString();
	const timeMax = new Date(timeMaxMs).toISOString();
	/** @type {Meeting[]} */
	const meetings = [];

	for (const [calId, track] of byCal) {
		let pageToken = '';
		do {
			const q = new URLSearchParams({
				timeMin,
				timeMax,
				singleEvents: 'true',
				orderBy: 'startTime',
				maxResults: '250',
			});
			if (pageToken) q.set('pageToken', pageToken);
			const res = await cal.calendarApi(
				String(token.access_token),
				'GET',
				`/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${q}`,
			);
			if (res.status >= 300) {
				return {
					meetings,
					error: `Google list failed for ${calId}: ${res.raw}`,
					calendars,
				};
			}
			const body = /** @type {{ items?: unknown[], nextPageToken?: string }} */ (
				res.body || {}
			);
			for (const item of body.items || []) {
				const m = normalizeGoogle(item, track);
				if (m) meetings.push(m);
			}
			pageToken = body.nextPageToken || '';
		} while (pageToken);
	}

	return { meetings, calendars };
}

/**
 * Soft-dedupe same title+start.
 * @param {Meeting[]} meetings
 */
function dedupeMeetings(meetings) {
	/** @type {Map<string, Meeting>} */
	const map = new Map();
	const sorted = [...meetings].sort((a, b) => a.startMs - b.startMs);
	for (const m of sorted) {
		const key = `${m.title.trim().toLowerCase()}|${Math.round(m.startMs / 60_000)}`;
		if (!map.has(key)) map.set(key, m);
	}
	return [...map.values()].sort((a, b) => a.startMs - b.startMs);
}

/**
 * @param {Meeting[]} meetings
 * @param {number} nowMs
 */
function pickNowNext(meetings, nowMs) {
	/** @type {Meeting | null} */
	let now = null;
	/** @type {Meeting | null} */
	let next = null;
	for (const m of meetings) {
		if (m.startMs <= nowMs && m.endMs > nowMs) {
			if (!now || m.startMs > now.startMs) now = m;
		} else if (m.startMs > nowMs) {
			if (!next || m.startMs < next.startMs) next = m;
		}
	}
	return { now, next };
}

/**
 * @param {string} vault
 * @param {{ day?: string, days?: number }} [opts]
 */
async function getAgenda(vault, opts = {}) {
	const day = parseDay(opts.day || '');
	const days = Math.max(1, Math.min(7, Number(opts.days) || 1));
	const { start, startMs } = dayBounds(day);
	const end = new Date(start);
	end.setDate(end.getDate() + days);
	const endMs = end.getTime();
	const nowMs = Date.now();

	const sources = { google: false };

	/** @type {Meeting[]} */
	let meetings = [];
	/** @type {string[]} */
	const warnings = [];

	try {
		const g = await pullGoogle(vault, startMs, endMs);
		if (g.error) warnings.push(g.error);
		else sources.google = true;
		meetings.push(...g.meetings);
	} catch (err) {
		warnings.push(err instanceof Error ? err.message : String(err));
	}

	meetings = dedupeMeetings(meetings);
	const { now, next } = pickNowNext(meetings, nowMs);

	const dayLabel = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

	return {
		ok: true,
		day: dayLabel,
		days,
		timezone: DEFAULT_TZ,
		now,
		next,
		meetings,
		sources,
		warnings,
		fetchedAt: new Date().toISOString(),
	};
}

module.exports = {
	getAgenda,
	dayBounds,
	parseDay,
	dedupeMeetings,
	pickNowNext,
	pullGoogle,
	findMeetingUrlInText,
	meetingUrlFromGoogle,
};
