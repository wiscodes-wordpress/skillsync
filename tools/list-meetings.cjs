#!/usr/bin/env node
/**
 * List today's meetings (Google Calendar pull).
 *
 * Usage:
 *   node tools/list-meetings.cjs
 *   node tools/list-meetings.cjs --day 2026-07-20
 *   node tools/list-meetings.cjs --days 2
 *   node tools/list-meetings.cjs --vault "/path/to/DenMercs"
 */

const path = require('node:path');
const { loadEnv } = require('./lib/load-env.cjs');
const { getAgenda } = require('./lib/meetings-agenda.cjs');
const { DEFAULT_VAULT } = require('./sync-google-calendar.cjs');

loadEnv(path.join(__dirname, '..'));

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	let day = null;
	let days = 1;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
		if (argv[i] === '--day' && argv[i + 1]) day = argv[++i];
		if (argv[i] === '--days' && argv[i + 1]) days = Number(argv[++i]);
	}
	return { vault: path.resolve(vault), day, days };
}

/**
 * @param {object | null | undefined} m
 * @param {string} label
 */
function printMeeting(m, label) {
	if (!m) {
		console.log(`${label}: —`);
		return;
	}
	const when = m.allDay
		? 'all-day'
		: new Date(m.startMs).toLocaleTimeString([], {
				hour: 'numeric',
				minute: '2-digit',
			});
	console.log(
		`${label}: ${when} · [${m.track}] ${m.title}${
			m.location ? ` @ ${m.location}` : ''
		}${m.meetingUrl ? ` · ${m.meetingUrl}` : ''}`,
	);
}

async function main() {
	const { vault, day, days } = parseArgs(process.argv.slice(2));
	const agenda = await getAgenda(vault, {
		day: day || undefined,
		days,
	});
	console.log(
		`Meetings · ${agenda.day}${days > 1 ? ` (+${days - 1}d)` : ''} · ${agenda.timezone}`,
	);
	console.log(`Sources: Google ${agenda.sources.google ? 'ok' : '—'}`);
	printMeeting(agenda.now, 'Now');
	printMeeting(agenda.next, 'Next');
	console.log(`Today (${agenda.meetings.length}):`);
	if (!agenda.meetings.length) {
		console.log('  (none)');
	} else {
		for (const m of agenda.meetings) {
			const when = m.allDay
				? 'all-day'
				: `${new Date(m.startMs).toLocaleTimeString([], {
						hour: 'numeric',
						minute: '2-digit',
					})}–${new Date(m.endMs).toLocaleTimeString([], {
						hour: 'numeric',
						minute: '2-digit',
					})}`;
			console.log(
				`  - ${when} [${m.track}] ${m.title}${
					m.location ? ` · ${m.location}` : ''
				}${m.meetingUrl ? ` · ${m.meetingUrl}` : ''}`,
			);
		}
	}
	for (const w of agenda.warnings || []) {
		console.log(`Note: ${w}`);
	}
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exitCode = 1;
});
