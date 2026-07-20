#!/usr/bin/env node
/**
 * Ensure this week's Journal Markdown note exists (Monday filename).
 * Idempotent: creates from template only if missing; never overwrites.
 *
 * Usage:
 *   node tools/journal-ensure-week.cjs
 *   node tools/journal-ensure-week.cjs --vault "/path/to/DenMercs"
 *   node tools/journal-ensure-week.cjs --date 2026-07-22
 *   node tools/journal-ensure-week.cjs --index
 *
 * Writes: Journal/YYYY/YYYY-MM-DD.md (Monday of target week)
 * Optional --index: run journal-index.cjs after create/ensure
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_VAULT =
	'/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	/** @type {string | null} */
	let date = null;
	let index = false;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
		if (argv[i] === '--date' && argv[i + 1]) date = argv[++i];
		if (argv[i] === '--index') index = true;
	}
	return { vault: path.resolve(vault), date, index };
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
 * @param {string} mondayStr
 */
function weekTemplate(mondayStr) {
	return `---
Created: "${mondayStr}"
tags: [log, weekly]
country:
  - Philippines
  - United States
---
# Week of ${mondayStr}

## Focus for the week
- Work: 
- Business: 

---

## Daily log
| Day | Work | Meetings | Business |
|-----|-----|----------|----------|
| Mon | | | |
| Tue | | | |
| Wed | | | |
| Thu | | | |
| Fri | | | |

---

## Calendar
<!-- Sync: - [emoji] Date, time - Event title (Personal|Work|Business) -->
- 

---

## Wins & learnings
- 
`;
}

/**
 * Prefer vault template when present; else built-in.
 * @param {string} vault
 * @param {string} mondayStr
 */
function resolveTemplate(vault, mondayStr) {
	const candidates = [
		path.join(vault, '_Templates', 'Weekly Log.md'),
		path.join(vault, 'Templates', 'Weekly Log.md'),
	];
	for (const p of candidates) {
		if (!fs.existsSync(p)) continue;
		const raw = fs.readFileSync(p, 'utf8');
		return raw
			.replaceAll('{{date}}', mondayStr)
			.replaceAll('{{monday}}', mondayStr)
			.replace(/Week of YYYY-MM-DD/g, `Week of ${mondayStr}`)
			.replace(/Created: "YYYY-MM-DD"/g, `Created: "${mondayStr}"`);
	}
	return weekTemplate(mondayStr);
}

/**
 * @param {string} vault
 * @param {Date} target
 * @returns {{ path: string, monday: string, created: boolean, existed: boolean }}
 */
function ensureWeek(vault, target) {
	const mon = mondayOf(target);
	const mondayStr = isoDate(mon);
	const year = String(mon.getFullYear());
	const dir = path.join(vault, 'Journal', year);
	const filePath = path.join(dir, `${mondayStr}.md`);

	if (fs.existsSync(filePath)) {
		return { path: filePath, monday: mondayStr, created: false, existed: true };
	}

	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(filePath, resolveTemplate(vault, mondayStr), 'utf8');
	return { path: filePath, monday: mondayStr, created: true, existed: false };
}

/**
 * @param {string} vault
 */
function runIndex(vault) {
	const script = path.join(__dirname, 'journal-index.cjs');
	const r = spawnSync(process.execPath, [script, '--vault', vault], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	if (r.status !== 0) {
		const err = (r.stderr || r.stdout || '').trim();
		throw new Error(`journal-index failed: ${err || `exit ${r.status}`}`);
	}
}

function main() {
	const { vault, date, index } = parseArgs(process.argv.slice(2));
	if (!fs.existsSync(vault)) {
		console.error(`Vault not found: ${vault}`);
		process.exit(1);
	}

	let target = new Date();
	if (date) {
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
		if (!m) {
			console.error(`Invalid --date (want YYYY-MM-DD): ${date}`);
			process.exit(1);
		}
		target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
	}

	const result = ensureWeek(vault, target);
	if (result.created) {
		console.log(`Created weekly log: ${result.path}`);
	} else {
		console.log(`Weekly log exists: ${result.path}`);
	}

	if (index) {
		runIndex(vault);
		console.log('Indexed journal (journal-index).');
	}
}

if (require.main === module) {
	main();
}

module.exports = { ensureWeek, DEFAULT_VAULT, mondayOf, isoDate };
