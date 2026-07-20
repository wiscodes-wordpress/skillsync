#!/usr/bin/env node
/**
 * Build a self-contained Obsidian HTML snapshot.
 *
 * Obsidian HTML plugins usually do NOT run JavaScript — so this file is
 * pre-rendered static HTML (CSS inlined). Reload in Obsidian cannot refresh
 * data; re-run this script (or the localhost server / journal-index) instead.
 *
 * Usage:
 *   node tools/journal-dashboard-bundle.cjs
 *   node tools/journal-dashboard-bundle.cjs --vault "/path/to/DenMercs"
 *
 * Writes: Journal/_dashboard/dashboard.obsidian.html
 */

const fs = require('node:fs');
const path = require('node:path');
const { mdToHtml, extractTitle } = require('./lib/markdown-render.cjs');
const {
	renderNotePage,
	renderDirPage,
	obsidianNavFromView,
	obsidianNavFromDash,
	onCallViewName,
	isoDate: chromeIsoDate,
	mondayOf: chromeMondayOf,
} = require('./lib/journal-chrome.cjs');

const DEFAULT_VAULT =
	'/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs';

const TRACK_LABEL = { work: 'Work', business: 'Business', life: 'Life' };
const TRACKS = ['work', 'business', 'life'];
/** How many recent weekly notes to pre-render for Obsidian HTML. */
const OBSIDIAN_WEEK_VIEWS = 52;

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
	}
	return { vault: path.resolve(vault) };
}

/**
 * @param {string} s
 */
function esc(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * @param {Date} d
 */
function isoDate(d) {
	return chromeIsoDate(d);
}

/**
 * @param {Date} d
 */
function mondayOf(d) {
	return chromeMondayOf(d);
}

/**
 * @param {string} start YYYY-MM-DD
 */
function weekViewFile(start) {
	return `week-${start}.html`;
}

/**
 * @param {string} day YYYY-MM-DD
 */
function standupViewFile(day) {
	return `standup-${day}.html`;
}

/**
 * Clear and rebuild `_dashboard/view/*.html` so Obsidian keeps nav + styled notes
 * (HTML plugins cannot run the localhost Markdown wrapper).
 *
 * @param {string} vault
 * @param {string} css
 * @param {{ weeks?: unknown[] }} indexData
 * @returns {{ viewDir: string, written: number }}
 */
function writeObsidianViews(vault, css, indexData) {
	const journal = path.join(vault, 'Journal');
	const viewDir = path.join(vault, 'Journal', '_dashboard', 'view');
	fs.mkdirSync(viewDir, { recursive: true });
	for (const name of fs.readdirSync(viewDir)) {
		if (name.endsWith('.html')) {
			fs.unlinkSync(path.join(viewDir, name));
		}
	}

	const today = new Date();
	const mondayStr = isoDate(mondayOf(today));
	const todayStr = isoDate(today);
	const nav = obsidianNavFromView(mondayStr, todayStr);
	let written = 0;

	/**
	 * @param {string} absMd
	 * @param {string} relFromJournal
	 * @param {string} outName
	 */
	function writeNote(absMd, relFromJournal, outName) {
		if (!fs.existsSync(absMd) || !fs.statSync(absMd).isFile()) return;
		const md = fs.readFileSync(absMd, 'utf8');
		const title = extractTitle(md) || path.basename(absMd, '.md');
		const html = renderNotePage({
			title,
			htmlBody: mdToHtml(md),
			relPath: relFromJournal,
			nav,
			cssInline: css,
			md,
			rawHref: `../../${relFromJournal.split('/').map(encodeURIComponent).join('/')}`,
		});
		fs.writeFileSync(path.join(viewDir, outName), html, 'utf8');
		written++;
	}

	const weeks = Array.isArray(indexData.weeks) ? indexData.weeks : [];
	const seenWeek = new Set();
	for (const w of weeks.slice(0, OBSIDIAN_WEEK_VIEWS)) {
		const x = /** @type {{ start?: string, path?: string }} */ (w);
		if (!x.start || !x.path) continue;
		seenWeek.add(x.start);
		writeNote(path.join(journal, x.path), x.path, weekViewFile(x.start));
	}

	// Always include this week's file even if index is stale
	if (!seenWeek.has(mondayStr)) {
		const rel = `${today.getFullYear()}/${mondayStr}.md`;
		writeNote(path.join(journal, rel), rel, weekViewFile(mondayStr));
	}

	const standupRel = `Standup/${today.getFullYear()}/${todayStr}.md`;
	writeNote(path.join(journal, standupRel), standupRel, standupViewFile(todayStr));

	const onCallDir = path.join(journal, 'On Call');
	/** @type {{ name: string, href: string, kind: 'dir' | 'file' }[]} */
	const onCallEntries = [];
	if (fs.existsSync(onCallDir) && fs.statSync(onCallDir).isDirectory()) {
		const files = fs
			.readdirSync(onCallDir)
			.filter((n) => n.toLowerCase().endsWith('.md') && !n.startsWith('.'))
			.sort((a, b) => b.localeCompare(a));
		for (const name of files) {
			const viewName = onCallViewName(name);
			const rel = `On Call/${name}`;
			writeNote(path.join(onCallDir, name), rel, viewName);
			onCallEntries.push({ name, href: `./${viewName}`, kind: 'file' });
		}
	}

	const onCallIndex = renderDirPage({
		title: 'On Call',
		relPath: 'On Call',
		entries: onCallEntries,
		nav,
		cssInline: css,
		active: 'oncall',
	});
	fs.writeFileSync(path.join(viewDir, 'on-call.html'), onCallIndex, 'utf8');
	written++;

	return { viewDir, written };
}

/**
 * @param {number} n
 * @param {number} max
 */
function densityDots(n, max) {
	const filled = Math.min(Math.max(0, n || 0), max);
	let s = '';
	for (let i = 0; i < max; i++) {
		s += `<span class="${i < filled ? 'filled' : ''}">●</span>`;
	}
	return `<span class="density">${s}</span>`;
}

/**
 * @param {Record<string, unknown>} planning
 * @param {{ weeks?: unknown[], generatedAt?: string | null }} indexData
 * @param {string} bundledAt
 */
function renderStaticBody(planning, indexData, bundledAt) {
	const mon = mondayOf(new Date());
	const mondayStr = isoDate(mon);
	const year = mon.getFullYear();
	const today = new Date();
	const todayStr = isoDate(today);

	const goals = Array.isArray(planning.goals) ? planning.goals : [];
	const todos = Array.isArray(planning.todos) ? planning.todos : [];
	const activeGoals = goals.filter((g) => g.status === 'active');
	const openTodos = todos.filter((t) => t.status !== 'done');
	const inProgress = openTodos.filter(
		(t) => t.status === 'in progress' || t.status === 'doing',
	);
	const openOnly = openTodos.filter(
		(t) => t.status !== 'in progress' && t.status !== 'doing',
	);
	const done = todos.filter((t) => t.status === 'done').slice(0, 8);
	const weeks = Array.isArray(indexData.weeks) ? indexData.weeks : [];

	const when = new Date(bundledAt).toLocaleString();

	/**
	 * @param {string | undefined} status
	 */
	function statusPill(status) {
		const raw = String(status || 'todo').toLowerCase();
		const key =
			raw === 'doing' || raw === 'in progress'
				? 'in-progress'
				: raw === 'done'
					? 'done'
					: raw === 'active'
						? 'active'
						: 'todo';
		const label =
			key === 'in-progress'
				? 'in progress'
				: key === 'done'
					? 'done'
					: key === 'active'
						? 'active'
						: 'todo';
		return `<span class="status-pill status-${key}">${esc(label)}</span>`;
	}

	/**
	 * @param {unknown[]} items
	 * @param {string} emptyMsg
	 */
	function goalListHtml(items, emptyMsg) {
		if (!items.length) {
			return `<p class="empty">${esc(emptyMsg)}</p>`;
		}
		const ordered = [...items].sort(
			(a, b) =>
				TRACKS.indexOf(/** @type {{track?: string}} */ (a).track || '') -
				TRACKS.indexOf(/** @type {{track?: string}} */ (b).track || ''),
		);
		return `<ul class="goal-list">${ordered
			.map((g) => {
				const x = /** @type {{ track?: string, title?: string, horizon?: string, status?: string, target?: string }} */ (
					g
				);
				const track = TRACK_LABEL[x.track || ''] ? x.track : 'life';
				const metaBits = [
					x.horizon ? `<span class="meta-plain">${esc(x.horizon)}</span>` : null,
					statusPill(x.status || 'active'),
					x.target
						? `<span class="meta-plain">target ${esc(x.target)}</span>`
						: null,
				].filter(Boolean);
				return `<li><div class="title"><span class="track-label track-${esc(track)}">${esc(TRACK_LABEL[track] || track)}</span>${esc(x.title || '')}<div class="meta meta-row">${metaBits.join('')}</div></div></li>`;
			})
			.join('')}</ul>`;
	}

	/**
	 * @param {string} title
	 * @param {unknown[]} items
	 */
	function todoGroup(title, items) {
		if (!items.length) return '';
		return `<h3>${esc(title)}</h3><ul class="todo-list">${items
			.map((t) => {
				const x = /** @type {{ track?: string, title?: string, status?: string, due?: string, week?: string, goalId?: string }} */ (
					t
				);
				const track = TRACK_LABEL[x.track || ''] ? x.track : 'life';
				const doneCls = x.status === 'done' ? ' class="done"' : '';
				const metaBits = [
					statusPill(x.status),
					x.due
						? `<span class="meta-plain">due ${esc(x.due)}</span>`
						: null,
					x.week
						? `<span class="meta-plain">pinned ${esc(x.week)}</span>`
						: null,
					x.goalId
						? `<span class="meta-plain">goal ${esc(x.goalId)}</span>`
						: null,
				].filter(Boolean);
				return `<li${doneCls}><div class="title"><span class="track-label track-${esc(track)}">${esc(TRACK_LABEL[track] || track)}</span>${esc(x.title || '')}<div class="meta meta-row">${metaBits.join('')}</div></div></li>`;
			})
			.join('')}</ul>`;
	}

	const todosHtml =
		todoGroup('In progress', inProgress) +
			todoGroup('Open', openOnly) +
			todoGroup('Recently done', done) ||
		`<p class="empty">No todos yet. Use the <code>journal-planning</code> skill to add them.</p>`;

	const weeksRows = weeks.slice(0, 16).length
		? weeks
				.slice(0, 16)
				.map((w) => {
					const x = /** @type {{ week?: string, start?: string, path?: string, focus?: string[], workFill?: number, businessFill?: number, winsCount?: number, wins?: unknown[], onCallPath?: string | null }} */ (
						w
					);
					const href = x.start
						? `./view/${weekViewFile(x.start)}`
						: x.path
							? `../${x.path}`
							: '#';
					const focus = (x.focus && x.focus[0]) || '—';
					const wins =
						x.winsCount != null ? x.winsCount : (x.wins && x.wins.length) || 0;
					let onCall = '—';
					if (x.onCallPath) {
						const base = path.basename(String(x.onCallPath));
						onCall = `<a href="./view/${esc(onCallViewName(base))}">on call</a>`;
					}
					return `<tr>
          <td><a href="${esc(href)}">${esc(x.week || x.start || '')}</a></td>
          <td>${esc(focus)}</td>
          <td>${densityDots(x.workFill || 0, 5)}</td>
          <td>${densityDots(x.businessFill || 0, 5)}</td>
          <td>${esc(String(wins))}</td>
          <td>${onCall}</td>
        </tr>`;
				})
				.join('')
		: `<tr><td colspan="6" class="empty">No weeks indexed. Run <code>node tools/journal-index.cjs</code>.</td></tr>`;

	const indexMeta = indexData.generatedAt
		? `Indexed ${new Date(indexData.generatedAt).toLocaleString()}`
		: '';

	const dashNav = obsidianNavFromDash(mondayStr, todayStr);

	return `
    <div class="app-shell">
      <nav class="site-nav" aria-label="Journal">
        <a class="brand" href="${esc(dashNav.brand)}">Journal</a>
        <div class="site-nav-links">
          <a href="${esc(dashNav.dashboard)}" class="active">Dashboard</a>
          <a href="${esc(dashNav.week)}">Weekly log</a>
          <a href="${esc(dashNav.standup)}">Today’s standup</a>
          <a href="${esc(dashNav.oncall)}">On Call</a>
        </div>
      </nav>
    <div class="wrap">
      <header class="top">
        <div>
          <h1>Journal</h1>
          <p class="sub">Goals &amp; todos (overall) · weekly log is separate</p>
        </div>
        <div class="actions">
          <a class="btn primary" href="${esc(dashNav.week)}">Weekly log</a>
          <a class="btn" href="${esc(dashNav.standup)}">Today’s standup</a>
          <a class="btn" href="${esc(dashNav.oncall)}">On Call</a>
        </div>
      </header>

      <div class="banner">
        Obsidian snapshot (static — no JS). Bundled <strong>${esc(when)}</strong>.
        Notes open as styled HTML under <code>_dashboard/view/</code> (re-run bundle after writing weeks).
        Live interactive UI:
        <code>http://127.0.0.1:8787/dashboard.html</code>
      </div>

      <div class="status-row">
        <div class="panel">
          <h2>Goals</h2>
          <div class="value">${activeGoals.length} active</div>
          <div class="meta">${goals.length} total · not time-bounded</div>
        </div>
        <div class="panel">
          <h2>Todos</h2>
          <div class="value">${openTodos.length} open</div>
          <div class="meta">${inProgress.length} in progress · ${todos.length} total</div>
          <div class="meta">${planning.updatedAt ? esc(new Date(/** @type {string} */ (planning.updatedAt)).toLocaleString()) : '—'}</div>
        </div>
        <div class="panel">
          <h2>Shortcuts</h2>
          <div class="value">${esc(mondayStr)}</div>
          <div class="meta">Weekly log · Journal/${year}/${mondayStr}.md</div>
        </div>
      </div>

      <div class="grid-2">
        <section class="section">
          <h2>Goals (all active)</h2>
          ${goalListHtml(activeGoals, 'No active goals. Use journal-planning to add some.')}
        </section>
        <section class="section">
          <h2>Todos (overall)</h2>
          <div class="todo-groups">${todosHtml}</div>
        </section>
      </div>

      <section class="section">
        <h2>Weekly activity (archive)</h2>
        <p class="meta" style="margin-top:-0.5rem;margin-bottom:0.75rem;color:var(--muted);font-size:0.8rem">${esc(indexMeta)}</p>
        <div class="table-scroll">
          <table class="weeks">
            <thead>
              <tr>
                <th>Week</th>
                <th>Focus</th>
                <th>Work</th>
                <th>Business</th>
                <th>Wins</th>
                <th>On call</th>
              </tr>
            </thead>
            <tbody>${weeksRows}</tbody>
          </table>
        </div>
      </section>

      <p class="footer-note">
        Static snapshot for Obsidian HTML plugins. Goals/todos from
        <code>planning.json</code>; weeks from <code>index.json</code>.
        Do not deploy this folder publicly.
      </p>
    </div>
    </div>`;
}

/**
 * @param {string} vault
 * @returns {{ outPath: string, bundledAt: string }}
 */
function bundleDashboard(vault) {
	const dash = path.join(vault, 'Journal', '_dashboard');
	const cssPath = path.join(dash, 'assets', 'notes.css');
	const planPath = path.join(dash, 'planning.json');
	const indexPath = path.join(dash, 'index.json');
	const outPath = path.join(dash, 'dashboard.obsidian.html');

	if (!fs.existsSync(cssPath)) {
		throw new Error(`Missing CSS: ${cssPath}`);
	}
	if (!fs.existsSync(planPath)) {
		throw new Error(`Missing planning.json: ${planPath}`);
	}

	const css = fs.readFileSync(cssPath, 'utf8');
	const planning = JSON.parse(fs.readFileSync(planPath, 'utf8'));
	let indexData = { weeks: [], generatedAt: null };
	if (fs.existsSync(indexPath)) {
		indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
	}

	const bundledAt = new Date().toISOString();
	const { written } = writeObsidianViews(vault, css, indexData);
	const bodyInner = renderStaticBody(planning, indexData, bundledAt);

	const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Journal Dashboard (Obsidian)</title>
    <style>
${css}
    </style>
  </head>
  <body>
${bodyInner}
  </body>
</html>
`;

	fs.writeFileSync(outPath, html, 'utf8');
	return { outPath, bundledAt, viewPages: written };
}

function main() {
	const { vault } = parseArgs(process.argv.slice(2));
	const { outPath, bundledAt, viewPages } = bundleDashboard(vault);
	console.log(`Obsidian dashboard → ${outPath}`);
	console.log(`Obsidian note views → Journal/_dashboard/view/ (${viewPages} files)`);
	console.log(`bundledAt ${bundledAt}`);
}

if (require.main === module) {
	main();
}

module.exports = { bundleDashboard, DEFAULT_VAULT };
