#!/usr/bin/env node
/**
 * Build Journal/_dashboard/index.json from weekly markdown notes.
 *
 * Usage:
 *   node tools/journal-index.mjs
 *   node tools/journal-index.mjs --vault "/path/to/DenMercs"
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_VAULT =
	'/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) {
			vault = argv[++i];
		}
	}
	return { vault: path.resolve(vault) };
}

/**
 * @param {string} filePath
 */
function readText(filePath) {
	return fs.readFileSync(filePath, 'utf8');
}

/**
 * @param {string} md
 * @param {string} heading
 */
function sectionAfter(md, heading) {
	const re = new RegExp(
		`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
		'm',
	);
	const m = md.match(re);
	if (!m || m.index == null) return '';
	const start = m.index + m[0].length;
	const rest = md.slice(start);
	const next = rest.search(/^##\s+/m);
	return (next === -1 ? rest : rest.slice(0, next)).trim();
}

/**
 * @param {string} cell
 */
function cellHasContent(cell) {
	const t = String(cell || '')
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/\|/g, '')
		.trim();
	return t.length > 0;
}

/**
 * @param {string} md
 */
function parseDailyLogFills(md) {
	const section = sectionAfter(md, 'Daily log');
	const lines = section.split('\n').filter((l) => /^\|/.test(l));
	let workFill = 0;
	let businessFill = 0;
	let meetingsFill = 0;
	for (const line of lines) {
		if (/^\|\s*-+/.test(line) || /^\|\s*Day\s*\|/i.test(line)) continue;
		const parts = line.split('|').map((p) => p.trim());
		// | Day | Work | Meetings | Business |
		if (parts.length < 5) continue;
		const day = parts[1];
		if (!/^(Mon|Tue|Wed|Thu|Fri)/i.test(day)) continue;
		if (cellHasContent(parts[2])) workFill++;
		if (cellHasContent(parts[3])) meetingsFill++;
		if (cellHasContent(parts[4])) businessFill++;
	}
	return { workFill, meetingsFill, businessFill };
}

/**
 * @param {string} section
 */
function bulletLines(section) {
	return section
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.startsWith('- '))
		.map((l) => l.slice(2).trim())
		.filter(Boolean);
}

/**
 * @param {string} startIso Monday YYYY-MM-DD
 */
function isoWeekFromMonday(startIso) {
	const d = new Date(`${startIso}T12:00:00`);
	const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	const dayNum = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
	return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * @param {string} vault
 * @param {string} startIso
 */
function findOnCall(vault, startIso) {
	const dir = path.join(vault, 'Journal', 'On Call');
	if (!fs.existsSync(dir)) return null;
	const candidates = [
		`${startIso}.md`,
		startIso.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2-$3-$1.md'),
	];
	for (const name of candidates) {
		const full = path.join(dir, name);
		if (fs.existsSync(full)) {
			return path.join('On Call', name).replace(/\\/g, '/');
		}
	}
	return null;
}

/**
 * @param {string} vault
 */
function collectWeeks(vault) {
	const journal = path.join(vault, 'Journal');
	if (!fs.existsSync(journal)) {
		throw new Error(`Missing Journal folder: ${journal}`);
	}

	/** @type {Array<Record<string, unknown>>} */
	const weeks = [];

	for (const ent of fs.readdirSync(journal, { withFileTypes: true })) {
		if (!ent.isDirectory() || !/^\d{4}$/.test(ent.name)) continue;
		const yearDir = path.join(journal, ent.name);
		for (const file of fs.readdirSync(yearDir)) {
			if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(file)) continue;
			const start = file.replace(/\.md$/, '');
			const full = path.join(yearDir, file);
			const md = readText(full);
			const focusSec = sectionAfter(md, 'Focus for the week');
			const winsSec = sectionAfter(md, 'Wins & learnings');
			const fills = parseDailyLogFills(md);
			const focus = bulletLines(focusSec);
			const wins = bulletLines(winsSec);
			const relPath = path.join(ent.name, file).replace(/\\/g, '/');
			weeks.push({
				week: isoWeekFromMonday(start),
				start,
				path: relPath,
				focus,
				workFill: fills.workFill,
				meetingsFill: fills.meetingsFill,
				businessFill: fills.businessFill,
				wins,
				winsCount: wins.length,
				onCallPath: findOnCall(vault, start),
			});
		}
	}

	weeks.sort((a, b) => String(b.start).localeCompare(String(a.start)));
	return weeks;
}

function main() {
	const { vault } = parseArgs(process.argv.slice(2));
	const outDir = path.join(vault, 'Journal', '_dashboard');
	fs.mkdirSync(outDir, { recursive: true });

	const weeks = collectWeeks(vault);
	const payload = {
		weeks,
		generatedAt: new Date().toISOString(),
	};
	const outPath = path.join(outDir, 'index.json');
	fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
	console.log(`Wrote ${weeks.length} weeks → ${outPath}`);

	try {
		const { bundleDashboard } = require('./journal-dashboard-bundle.cjs');
		const { outPath: snap } = bundleDashboard(vault);
		console.log(`Obsidian snapshot → ${snap}`);
	} catch (err) {
		console.error(
			'Obsidian bundle skipped:',
			err instanceof Error ? err.message : err,
		);
	}
}

main();
