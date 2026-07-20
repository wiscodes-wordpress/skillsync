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
	obsidianNavFromDash,
	isoDate: chromeIsoDate,
	mondayOf: chromeMondayOf,
} = require('./lib/journal-chrome.cjs');
const { renderStandupBoard } = require('./lib/standup-render.cjs');
const { DEFAULT_VAULT } = require('./lib/journal-vault.cjs');

const TRACK_LABEL = { work: 'Work', business: 'Business', life: 'Life' };
const TRACKS = ['work', 'business', 'life'];

const STANDUP_BOARD_CSS = fs.readFileSync(
	path.join(__dirname, 'lib', 'standup-board.css'),
	'utf8',
);

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
 * Encode a Journal-relative path for hrefs (keep `/`, encode segments).
 * @param {string} rel
 */
function hrefRel(rel) {
	return String(rel)
		.split('/')
		.map((p) => encodeURIComponent(p))
		.join('/');
}

/**
 * Remove legacy pre-rendered note HTML under `_dashboard/view/`.
 * Notes are vault `.md` only (live server / Obsidian open the markdown).
 *
 * @param {string} vault
 * @returns {{ viewDir: string, removed: number }}
 */
function clearViewHtml(vault) {
	const viewDir = path.join(vault, 'Journal', '_dashboard', 'view');
	if (!fs.existsSync(viewDir)) {
		return { viewDir, removed: 0 };
	}
	let removed = 0;
	for (const name of fs.readdirSync(viewDir)) {
		if (name.endsWith('.html')) {
			fs.unlinkSync(path.join(viewDir, name));
			removed++;
		}
	}
	return { viewDir, removed };
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
 * @param {string} vault
 */
function renderStaticBody(planning, indexData, bundledAt, vault) {
	const mon = mondayOf(new Date());
	const mondayStr = isoDate(mon);
	const year = mon.getFullYear();
	const today = new Date();
	const todayStr = isoDate(today);

	const weekRel = `${year}/${mondayStr}.md`;
	const weekAbs = path.join(vault, 'Journal', weekRel);
	let weekReaderHtml = `<p class="empty">No weekly note yet for ${esc(mondayStr)}. Use <code>journal-ensure-week.cjs</code>.</p>`;
	let weekTitle = `Week of ${mondayStr}`;
	if (fs.existsSync(weekAbs)) {
		const weekMd = fs.readFileSync(weekAbs, 'utf8');
		weekTitle = extractTitle(weekMd) || weekTitle;
		weekReaderHtml = mdToHtml(weekMd);
	}

	const standupRel = `Standup/${today.getFullYear()}/${todayStr}.md`;
	const standupAbs = path.join(vault, 'Journal', standupRel);
	let standupHtml = `<p class="empty">No standup yet for ${esc(todayStr)}. Run <code>journal-standup.cjs</code>.</p>`;
	if (fs.existsSync(standupAbs)) {
		const standupMd = fs.readFileSync(standupAbs, 'utf8');
		standupHtml = renderStandupBoard({
			md: standupMd,
			linkMode: 'obsidian',
			mondayStr,
		});
	}

	const onCallDir = path.join(vault, 'Journal', 'On Call');
	/** @type {string[]} */
	const onCallLinks = [];
	if (fs.existsSync(onCallDir) && fs.statSync(onCallDir).isDirectory()) {
		const files = fs
			.readdirSync(onCallDir)
			.filter((n) => n.toLowerCase().endsWith('.md') && !n.startsWith('.'))
			.sort((a, b) => b.localeCompare(a));
		for (const name of files.slice(0, 12)) {
			const rel = `On Call/${name}`;
			onCallLinks.push(
				`<li><a href="../${hrefRel(rel)}">${esc(name)}</a></li>`,
			);
		}
	}
	const onCallListHtml = onCallLinks.length
		? `<ul class="dir-list">${onCallLinks.join('')}</ul>`
		: `<p class="empty">No On Call notes yet.</p>`;

	const goals = Array.isArray(planning.goals) ? planning.goals : [];
	const todos = Array.isArray(planning.todos) ? planning.todos : [];
	const activeGoals = goals.filter((g) => g.status === 'active');
	const weekStart = mondayStr;
	const weekEndDate = new Date(mon);
	weekEndDate.setDate(weekEndDate.getDate() + 6);
	const weekEnd = isoDate(weekEndDate);
	/**
	 * Done this week: completedAt in Mon–Sun, or bare done (no completedAt) for
	 * one-week display until a skill backfills the field.
	 * @param {{ status?: string, completedAt?: string }} g
	 */
	function isDoneThisWeek(g) {
		if (g.status !== 'done') return false;
		const at = g.completedAt;
		if (!at) return true;
		return at >= weekStart && at <= weekEnd;
	}
	const doneThisWeekGoals = goals.filter(isDoneThisWeek);
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
	 */
	function goalListHtml(items) {
		if (!items.length) return '';
		const ordered = [...items].sort(
			(a, b) =>
				TRACKS.indexOf(/** @type {{track?: string}} */ (a).track || '') -
				TRACKS.indexOf(/** @type {{track?: string}} */ (b).track || ''),
		);
		return `<ul class="goal-list">${ordered
			.map((g) => {
				const x = /** @type {{ track?: string, title?: string, horizon?: string, status?: string, target?: string, completedAt?: string }} */ (
					g
				);
				const track = TRACK_LABEL[x.track || ''] ? x.track : 'life';
				const doneCls = x.status === 'done' ? ' class="done"' : '';
				const metaBits = [
					x.horizon ? `<span class="meta-plain">${esc(x.horizon)}</span>` : null,
					statusPill(x.status || 'active'),
					x.target
						? `<span class="meta-plain">target ${esc(x.target)}</span>`
						: null,
					x.completedAt
						? `<span class="meta-plain">done ${esc(x.completedAt)}</span>`
						: null,
				].filter(Boolean);
				return `<li${doneCls}><div class="title"><span class="track-label track-${esc(track)}">${esc(TRACK_LABEL[track] || track)}</span>${esc(x.title || '')}<div class="meta meta-row">${metaBits.join('')}</div></div></li>`;
			})
			.join('')}</ul>`;
	}

	/**
	 * @param {string} title
	 * @param {unknown[]} items
	 */
	function goalGroup(title, items) {
		if (!items.length) return '';
		return `<h3>${esc(title)}</h3>${goalListHtml(items)}`;
	}

	const goalsHtml =
		goalGroup('Active', activeGoals) +
			goalGroup('Done this week', doneThisWeekGoals) ||
		`<p class="empty">No active goals. Use <code>journal-planning</code> to add some.</p>`;

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
					const href = x.path
						? `../${String(x.path).split('/').map(encodeURIComponent).join('/')}`
						: '#';
					const focus = (x.focus && x.focus[0]) || '—';
					const wins =
						x.winsCount != null ? x.winsCount : (x.wins && x.wins.length) || 0;
					let onCall = '—';
					if (x.onCallPath) {
						const rel = String(x.onCallPath).replace(/^Journal\//, '');
						onCall = `<a href="../${hrefRel(rel)}">on call</a>`;
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
          <p class="sub">Goals &amp; todos (overall) · weekly log from vault .md</p>
        </div>
        <div class="actions">
          <a class="btn primary" href="${esc(dashNav.week)}">Weekly log</a>
          <a class="btn" href="${esc(dashNav.standup)}">Today’s standup</a>
          <a class="btn" href="${esc(dashNav.oncall)}">On Call</a>
        </div>
      </header>

      <div class="banner">
        Obsidian snapshot (static — no JS). Bundled <strong>${esc(when)}</strong>.
        Notes stay as vault <code>.md</code> (no <code>_dashboard/view/*.html</code>).
        Live reader: <code>http://127.0.0.1:8787/dashboard.html</code>
      </div>

      <div class="status-row">
        <div class="panel">
          <h2>Goals</h2>
          <div class="value">${activeGoals.length} active</div>
          <div class="meta">${doneThisWeekGoals.length} done this week · ${goals.length} total</div>
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
          <h2>Goals</h2>
          <div class="todo-groups">${goalsHtml}</div>
        </section>
        <section class="section">
          <h2>Todos (overall)</h2>
          <div class="todo-groups">${todosHtml}</div>
        </section>
      </div>

      <section class="section" id="week-log" aria-labelledby="week-log-heading">
        <h2 id="week-log-heading">${esc(weekTitle)}</h2>
        <p class="meta" style="margin-top:-0.5rem;margin-bottom:0.75rem;color:var(--muted);font-size:0.8rem">
          From <code>${esc(weekRel)}</code>
          · <a href="../${hrefRel(weekRel)}">Open .md</a>
        </p>
        <article class="md-doc week-reader">${weekReaderHtml}</article>
      </section>

      <section class="section" id="standup-log" aria-labelledby="standup-log-heading">
        <h2 id="standup-log-heading">Today’s standup</h2>
        <p class="meta" style="margin-top:-0.5rem;margin-bottom:0.75rem;color:var(--muted);font-size:0.8rem">
          From <code>${esc(standupRel)}</code>
          · <a href="../${hrefRel(standupRel)}">Open .md</a>
        </p>
        ${standupHtml}
      </section>

      <section class="section" id="oncall-log" aria-labelledby="oncall-log-heading">
        <h2 id="oncall-log-heading">On Call</h2>
        <p class="meta" style="margin-top:-0.5rem;margin-bottom:0.75rem;color:var(--muted);font-size:0.8rem">
          Vault folder <code>On Call/</code>
        </p>
        ${onCallListHtml}
      </section>

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
	const { removed } = clearViewHtml(vault);
	const bodyInner = renderStaticBody(planning, indexData, bundledAt, vault);

	const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Journal Dashboard (Obsidian)</title>
    <style>
${css}
${STANDUP_BOARD_CSS}
    </style>
  </head>
  <body>
${bodyInner}
  </body>
</html>
`;

	fs.writeFileSync(outPath, html, 'utf8');
	return { outPath, bundledAt, removed };
}

function main() {
	const { vault } = parseArgs(process.argv.slice(2));
	const { outPath, bundledAt, removed } = bundleDashboard(vault);
	console.log(`Obsidian dashboard → ${outPath}`);
	console.log(`Cleared _dashboard/view/*.html (${removed} removed)`);
	console.log(`bundledAt ${bundledAt}`);
}

if (require.main === module) {
	main();
}

module.exports = { bundleDashboard, DEFAULT_VAULT };
