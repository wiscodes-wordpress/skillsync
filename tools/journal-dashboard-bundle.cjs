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

const DEFAULT_VAULT =
	'/Users/dennis.mercado/Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs';

const TRACK_LABEL = { work: 'Work', business: 'Business', life: 'Life' };
const TRACKS = ['work', 'business', 'life'];

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
	x.setHours(0, 0, 0, 0);
	return x;
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
	const doing = openTodos.filter((t) => t.status === 'doing');
	const openOnly = openTodos.filter((t) => t.status !== 'doing');
	const done = todos.filter((t) => t.status === 'done').slice(0, 8);
	const weeks = Array.isArray(indexData.weeks) ? indexData.weeks : [];

	const when = new Date(bundledAt).toLocaleString();

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
				return `<li><div class="title"><span class="track-label track-${esc(track)}">${esc(TRACK_LABEL[track] || track)}</span>${esc(x.title || '')}<div class="meta">${esc(x.horizon || '')} · ${esc(x.status || '')}${x.target ? ` · target ${esc(x.target)}` : ''}</div></div></li>`;
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
				const meta = [x.status, x.due ? `due ${x.due}` : null, x.week ? `pinned ${x.week}` : null, x.goalId ? `goal ${x.goalId}` : null]
					.filter(Boolean)
					.join(' · ');
				return `<li${doneCls}><div class="title"><span class="track-label track-${esc(track)}">${esc(TRACK_LABEL[track] || track)}</span>${esc(x.title || '')}<div class="meta">${esc(meta)}</div></div></li>`;
			})
			.join('')}</ul>`;
	}

	const todosHtml =
		todoGroup('Doing', doing) +
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
					const href = x.path ? `../${x.path}` : '#';
					const focus = (x.focus && x.focus[0]) || '—';
					const wins =
						x.winsCount != null ? x.winsCount : (x.wins && x.wins.length) || 0;
					const onCall = x.onCallPath
						? `<a href="../${esc(x.onCallPath)}">on call</a>`
						: '—';
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

	return `
    <div class="wrap">
      <header class="top">
        <div>
          <h1>Journal</h1>
          <p class="sub">Goals &amp; todos (overall) · weekly log is separate</p>
        </div>
        <div class="actions">
          <a class="btn primary" href="../${year}/${mondayStr}.md">Weekly log</a>
          <a class="btn" href="../Standup/${today.getFullYear()}/${todayStr}.md">Today’s standup</a>
          <a class="btn" href="../On Call/">On Call</a>
        </div>
      </header>

      <div class="banner">
        Obsidian snapshot (static — no JS). Bundled <strong>${esc(when)}</strong>.
        Reload in Obsidian cannot refresh data — run
        <code>node tools/journal-dashboard-bundle.cjs</code>
        (or keep the localhost server running; it rebuilds this file on writes).
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
          <div class="meta">${doing.length} doing · ${todos.length} total</div>
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
        <div style="overflow-x:auto">
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
	const bodyInner = renderStaticBody(planning, indexData, bundledAt);

	const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
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
	return { outPath, bundledAt };
}

function main() {
	const { vault } = parseArgs(process.argv.slice(2));
	const { outPath, bundledAt } = bundleDashboard(vault);
	console.log(`Obsidian dashboard → ${outPath}`);
	console.log(`bundledAt ${bundledAt}`);
}

if (require.main === module) {
	main();
}

module.exports = { bundleDashboard, DEFAULT_VAULT };
