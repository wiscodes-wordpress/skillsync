#!/usr/bin/env node
/**
 * Create/update a daily standup note derived from the weekly Journal log
 * and planning.json Focus (work + in progress).
 *
 * Usage:
 *   node tools/journal-standup.cjs
 *   node tools/journal-standup.cjs --date 2026-07-20
 *   node tools/journal-standup.cjs --vault "/path/to/DenMercs"
 *
 * Writes: Journal/Standup/YYYY/YYYY-MM-DD.md
 * Source: Journal/YYYY/<Monday>.md daily log (Work + Meetings)
 *         Journal/_dashboard/planning.json → ## Focus (work, in progress)
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_VAULT =
	'/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	/** @type {string | null} */
	let date = null;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
		if (argv[i] === '--date' && argv[i + 1]) date = argv[++i];
	}
	return { vault: path.resolve(vault), date };
}

/**
 * @param {Date} d
 */
function isoDate(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * @param {Date} d
 */
function mondayOf(d) {
	const x = new Date(d);
	const day = (x.getDay() + 6) % 7;
	x.setDate(x.getDate() - day);
	x.setHours(12, 0, 0, 0);
	return x;
}

/**
 * @param {string} cell
 */
function cellLines(cell) {
	return String(cell || '')
		.replace(/<br\s*\/?>/gi, '\n')
		.split(/\n|;/)
		.map((s) => s.replace(/^[-*]\s*/, '').trim())
		.filter(Boolean);
}

/**
 * @param {string} md
 */
function parseDailyLog(md) {
	/** @type {Record<string, { work: string[], meetings: string[], business: string[] }>} */
	const byDay = {};
	const lines = md.split('\n').filter((l) => /^\|/.test(l));
	for (const line of lines) {
		if (/^\|\s*-+/.test(line) || /^\|\s*Day\s*\|/i.test(line)) continue;
		const parts = line.split('|').map((p) => p.trim());
		if (parts.length < 5) continue;
		const day = parts[1];
		if (!/^(Mon|Tue|Wed|Thu|Fri)/i.test(day)) continue;
		const key = day.slice(0, 3);
		byDay[key] = {
			work: cellLines(parts[2]),
			meetings: cellLines(parts[3]),
			business: cellLines(parts[4]),
		};
	}
	return byDay;
}

/**
 * Work-track todos currently in progress (Lifeway standup Focus).
 * Legacy status `doing` counts as in progress.
 *
 * @param {string} vault
 * @returns {string[]}
 */
function focusTitlesFromPlanning(vault) {
	const planFile = path.join(vault, 'Journal', '_dashboard', 'planning.json');
	if (!fs.existsSync(planFile)) return [];
	let planning;
	try {
		planning = JSON.parse(fs.readFileSync(planFile, 'utf8'));
	} catch {
		return [];
	}
	const todos = Array.isArray(planning.todos) ? planning.todos : [];
	return todos
		.filter((t) => {
			if (!t || t.track !== 'work') return false;
			const s = t.status;
			return s === 'in progress' || s === 'doing';
		})
		.map((t) => String(t.title || '').trim())
		.filter(Boolean);
}

/**
 * @param {string[]} items
 * @param {string} [emptyMsg]
 */
function bullets(items, emptyMsg = '(none yet — fill weekly log or add below)') {
	if (!items.length) return `- ${emptyMsg}\n`;
	return items.map((i) => `- ${i}`).join('\n') + '\n';
}

/**
 * @param {string} vault
 * @param {Date} target
 */
function buildStandup(vault, target) {
	const dateStr = isoDate(target);
	const mon = mondayOf(target);
	const mondayStr = isoDate(mon);
	const year = String(mon.getFullYear());
	const weeklyPath = path.join(vault, 'Journal', year, `${mondayStr}.md`);

	if (!fs.existsSync(weeklyPath)) {
		throw new Error(
			`Weekly log missing: ${weeklyPath}\nCreate it first (journal-ensure-week / journal-weekly).`,
		);
	}

	const md = fs.readFileSync(weeklyPath, 'utf8');
	const byDay = parseDailyLog(md);

	const todayKey = DAY_NAMES[target.getDay()];
	const yest = new Date(target);
	yest.setDate(yest.getDate() - 1);
	const yestKey = DAY_NAMES[yest.getDay()];

	const today = byDay[todayKey] || { work: [], meetings: [], business: [] };
	const yesterday =
		byDay[yestKey] || { work: [], meetings: [], business: [] };

	// Weekend: use Fri as yesterday context when today is Mon
	let yesterdayLabel = yestKey;
	let yesterdayData = yesterday;
	if (todayKey === 'Mon' && !yesterday.work.length && !yesterday.meetings.length) {
		yesterdayLabel = 'Fri';
		yesterdayData = byDay.Fri || yesterdayData;
	}

	const yesterdayItems = [
		...yesterdayData.work,
		...yesterdayData.meetings.filter((m) => !/things to talk/i.test(m)),
	];
	const todayItems = [...today.work];
	const blockers = today.meetings.filter(
		(m) => /block|wait|stuck|depend/i.test(m),
	);
	const talkingPoints = today.meetings.filter(
		(m) => !/block|wait|stuck|depend/i.test(m),
	);
	const focusItems = focusTitlesFromPlanning(vault);

	const weeklyLink = `[[${year}/${mondayStr}|Week of ${mondayStr}]]`;
	const outDir = path.join(vault, 'Journal', 'Standup', String(target.getFullYear()));
	fs.mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, `${dateStr}.md`);

	const body = `---
Created: "${dateStr}"
tags: [log, standup]
source_week: "${mondayStr}"
---
# Standup ${dateStr}

Derived from ${weeklyLink} + planning Focus (work in progress). Edit the weekly log for lasting notes; this file is for the meeting.

## Focus
${bullets(focusItems, '(none in progress)')}
## Yesterday (${yesterdayLabel})
${bullets(yesterdayItems)}
## Today (${todayKey})
${bullets(todayItems)}
## Blockers
${bullets(blockers)}
## Talking points
${bullets(talkingPoints)}
## Notes
- 
`;

	const existed = fs.existsSync(outPath);
	if (existed) {
		// Refresh derived sections (including Focus); preserve ## Notes if present
		const prev = fs.readFileSync(outPath, 'utf8');
		const notesMatch = prev.match(/## Notes\n([\s\S]*)$/);
		const notes = notesMatch ? notesMatch[1].trimEnd() : '- ';
		const rebuilt = body.replace(/## Notes\n- \n?$/, `## Notes\n${notes}\n`);
		fs.writeFileSync(outPath, rebuilt, 'utf8');
	} else {
		fs.writeFileSync(outPath, body, 'utf8');
	}

	return {
		outPath,
		weeklyPath,
		created: !existed,
		todayKey,
		yesterdayLabel,
		focusCount: focusItems.length,
	};
}

function main() {
	const { vault, date } = parseArgs(process.argv.slice(2));
	const target = date ? new Date(`${date}T12:00:00`) : new Date();
	if (Number.isNaN(target.getTime())) {
		console.error(`Invalid --date: ${date}`);
		process.exit(1);
	}
	try {
		const result = buildStandup(vault, target);
		console.log(
			`${result.created ? 'Created' : 'Updated'} ${result.outPath}`,
		);
		console.log(
			`From weekly ${result.weeklyPath} · Focus ${result.focusCount} in progress`,
		);
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	buildStandup,
	focusTitlesFromPlanning,
	DEFAULT_VAULT,
};
