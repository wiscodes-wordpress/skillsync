#!/usr/bin/env node
/**
 * Start a story: update planning.json + append to weekly log daily table.
 *
 * Usage:
 *   node tools/journal-start-story.cjs --key "DCD-123" --title "Short title" [--track work] [--vault "/path"]
 *
 * Actions:
 *   1. Find or create a todo in planning.json for the issue key.
 *      - If found: set status "in progress", pin week if unset.
 *      - If not found: create "Ship KEY — title" todo.
 *   2. Append "Started KEY — title" to today's Work cell in the weekly log table.
 *   3. Update planning.json updatedAt.
 *
 * Idempotent: won't duplicate a Started line or re-create an existing todo.
 */

const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_VAULT } = require('./lib/journal-vault.cjs');
const { linkKey } = require('./lib/journal-jira.cjs');

function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	let key = null;
	let title = null;
	let track = 'work';
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
		if (argv[i] === '--key' && argv[i + 1]) key = argv[++i];
		if (argv[i] === '--title' && argv[i + 1]) title = argv[++i];
		if (argv[i] === '--track' && argv[i + 1]) track = argv[++i];
	}
	return { vault: path.resolve(vault), key, title, track };
}

function isoDate(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function mondayOf(d) {
	const x = new Date(d);
	const day = (x.getDay() + 6) % 7;
	x.setDate(x.getDate() - day);
	x.setHours(12, 0, 0, 0);
	return x;
}

/** ISO week string like 2026-W29 */
function isoWeek(d) {
	const mon = mondayOf(d);
	const jan1 = new Date(mon.getFullYear(), 0, 1, 12, 0, 0);
	const days = Math.round((mon - jan1) / 86400000);
	const week = Math.ceil((days + jan1.getDay()) / 7);
	return `${mon.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function main() {
	const { vault, key, title, track } = parseArgs(process.argv.slice(2));

	if (!key || !title) {
		console.error('Required: --key "ISSUE-KEY" --title "Short title"');
		process.exit(1);
	}
	if (!fs.existsSync(vault)) {
		console.error(`Vault not found: ${vault}`);
		process.exit(1);
	}

	// --- 1. Update planning.json ---
	const planPath = path.join(vault, 'Journal/_dashboard/planning.json');
	let planning;
	try {
		planning = JSON.parse(fs.readFileSync(planPath, 'utf8'));
	} catch (e) {
		console.error(`Cannot read planning.json: ${e.message}`);
		process.exit(1);
	}

	const todos = Array.isArray(planning.todos) ? planning.todos : [];
	const matches = todos.filter(t => t.title && t.title.includes(key));

	if (matches.length > 1) {
		console.error(`MULTIPLE todos match "${key}" — resolve manually.`);
		process.exit(1);
	}

	const now = new Date();
	const week = isoWeek(now);

	if (matches.length === 1) {
		const todo = matches[0];
		todo.status = 'in progress';
		if (!todo.week) todo.week = week;
		console.log(`Updated todo: "${todo.title}" → in progress (week ${todo.week})`);
	} else {
		const newTodo = {
			title: `Ship ${key} — ${title}`,
			track,
			status: 'in progress',
			week,
		};
		todos.push(newTodo);
		planning.todos = todos;
		console.log(`Created todo: "${newTodo.title}" (${track}, ${week})`);
	}

	planning.updatedAt = now.toISOString();
	fs.writeFileSync(planPath, JSON.stringify(planning, null, 2) + '\n', 'utf8');
	console.log('planning.json saved.');

	// --- 2. Append to weekly log daily table ---
	const monday = mondayOf(now);
	const mondayStr = isoDate(monday);
	const weeklyPath = path.join(vault, `Journal/${monday.getFullYear()}/${mondayStr}.md`);

	if (!fs.existsSync(weeklyPath)) {
		console.log(`Weekly log not found: ${weeklyPath} — skipping daily log update.`);
		return;
	}

	let content = fs.readFileSync(weeklyPath, 'utf8');
	const keyNorm = String(key).trim().toUpperCase();
	const startedText = `Started ${linkKey(keyNorm)} — ${title}`;
	const startedBare = `Started ${keyNorm} — ${title}`;

	if (content.includes(startedText) || content.includes(startedBare)) {
		console.log(`Daily log already has a Started line for ${keyNorm}`);
		return;
	}

	// Find today's row in the Daily log table
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const todayAbbr = days[now.getDay()];

	// Match the table row starting with today's day abbreviation
	// Format: | Mon | work content | meetings | business |
	const rowRegex = new RegExp(`^(\\|\\s*${todayAbbr}\\s*\\|)(.*)$`, 'm');
	const match = content.match(rowRegex);

	if (match) {
		const prefix = match[1]; // "| Mon |"
		const rest = match[2];   // " work | meetings | business |"
		const cells = rest.split('|');
		// cells[0] = Work cell, cells[1] = Meetings, cells[2] = Business, cells[3] = trailing empty

		if (cells.length >= 3) {
			const workCell = cells[0].trim();
			const newWork = workCell
				? `${workCell}<br>${startedText}`
				: ` ${startedText} `;
			cells[0] = ` ${newWork} `;
			const newRow = prefix + cells.join('|');
			content = content.replace(match[0], newRow);
			fs.writeFileSync(weeklyPath, content, 'utf8');
			console.log(`Appended to ${todayAbbr} Work cell: "${startedText}"`);
		} else {
			console.log(`Could not parse ${todayAbbr} row cells — update manually.`);
		}
	} else {
		console.log(`No "${todayAbbr}" row found in daily log table — update manually.`);
	}
}

main();
