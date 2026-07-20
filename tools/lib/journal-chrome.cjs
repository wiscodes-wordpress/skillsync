/**
 * Shared Journal dashboard chrome (nav + page shell).
 * Supports live localhost (absolute URLs + linked CSS) and Obsidian
 * (relative URLs + inlined CSS — HTML plugins usually do not load external assets).
 */

const fs = require('node:fs');
const path = require('node:path');
const { esc, extractTitle } = require('./markdown-render.cjs');
const {
	renderStandupBoard,
	standupSubtitle,
} = require('./standup-render.cjs');

const STANDUP_BOARD_CSS = fs.readFileSync(
	path.join(__dirname, 'standup-board.css'),
	'utf8',
);

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
 * @typedef {{
 *   brand: string,
 *   dashboard: string,
 *   week: string,
 *   standup: string,
 *   oncall: string,
 * }} NavMap
 */

/**
 * Live localhost nav (served by journal-dashboard-server).
 * @returns {NavMap}
 */
function liveNav() {
	const today = new Date();
	const mon = mondayOf(today);
	return {
		brand: '/dashboard.html',
		dashboard: '/dashboard.html',
		week: `/${mon.getFullYear()}/${isoDate(mon)}.md`,
		standup: `/Standup/${today.getFullYear()}/${isoDate(today)}.md`,
		oncall: '/On%20Call/',
	};
}

/**
 * Obsidian snapshot nav when the page lives in `_dashboard/view/`.
 * @param {string} mondayStr
 * @param {string} todayStr
 * @returns {NavMap}
 */
function obsidianNavFromView(mondayStr, todayStr) {
	return {
		brand: '../dashboard.obsidian.html',
		dashboard: '../dashboard.obsidian.html',
		week: `./week-${mondayStr}.html`,
		standup: `./standup-${todayStr}.html`,
		oncall: './on-call.html',
	};
}

/**
 * Obsidian snapshot nav when the page lives in `_dashboard/` (dashboard itself).
 * @param {string} mondayStr
 * @param {string} todayStr
 * @returns {NavMap}
 */
function obsidianNavFromDash(mondayStr, todayStr) {
	return {
		brand: './dashboard.obsidian.html',
		dashboard: './dashboard.obsidian.html',
		week: `./view/week-${mondayStr}.html`,
		standup: `./view/standup-${todayStr}.html`,
		oncall: './view/on-call.html',
	};
}

/**
 * @param {string} filename
 */
function onCallViewName(filename) {
	const base = String(filename).replace(/\.md$/i, '');
	const slug = base
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase() || 'note';
	return `on-call-${slug}.html`;
}

/**
 * @param {'dashboard' | 'week' | 'standup' | 'oncall' | 'note' | 'browse'} active
 * @param {NavMap} nav
 */
function navLinksHtml(active, nav) {
	/** @type {{ id: keyof Omit<NavMap, 'brand'>, label: string }[]} */
	const items = [
		{ id: 'dashboard', label: 'Dashboard' },
		{ id: 'week', label: 'Weekly log' },
		{ id: 'standup', label: "Today's standup" },
		{ id: 'oncall', label: 'On Call' },
	];
	return items
		.map((item) => {
			const cls = active === item.id ? ' class="active"' : '';
			return `<a href="${esc(nav[item.id])}"${cls}>${esc(item.label)}</a>`;
		})
		.join('\n          ');
}

/**
 * @param {string} relPath  e.g. Standup/2026/2026-07-20.md
 * @returns {'week' | 'standup' | 'oncall' | 'note'}
 */
function activeForNotePath(relPath) {
	const p = relPath.replace(/\\/g, '/').toLowerCase();
	if (p.includes('standup/')) return 'standup';
	if (p.includes('on call/') || p.includes('on%20call/')) return 'oncall';
	if (/^\d{4}\//.test(p)) return 'week';
	return 'note';
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.bodyHtml
 * @param {'dashboard' | 'week' | 'standup' | 'oncall' | 'note' | 'browse'} opts.active
 * @param {NavMap} [opts.nav]
 * @param {string} [opts.subtitle]  already escaped if plain text
 * @param {string} [opts.crumb]     HTML
 * @param {string} [opts.rawHref]
 * @param {string} [opts.extraActions]
 * @param {string} [opts.cssInline] when set, inline CSS (Obsidian); else link /assets/notes.css
 * @param {boolean} [opts.omitFonts]
 * @param {string} [opts.extraCss] appended as a second <style> (e.g. standup board)
 */
function renderChromePage(opts) {
	const {
		title,
		bodyHtml,
		active,
		nav = liveNav(),
		subtitle = '',
		crumb = '',
		rawHref = '',
		extraActions = '',
		cssInline = '',
		omitFonts = false,
		extraCss = '',
	} = opts;

	const rawBtn = rawHref
		? `<a class="btn" href="${esc(rawHref)}">${cssInline ? 'Open note' : 'Raw .md'}</a>`
		: '';

	const styles = cssInline
		? `<style>\n${cssInline}\n${extraCss ? `${extraCss}\n` : ''}    </style>`
		: `<link rel="stylesheet" href="/assets/notes.css" />${
				extraCss ? `\n    <style>\n${extraCss}\n    </style>` : ''
			}`;

	const fonts =
		omitFonts || cssInline
			? ''
			: `    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
`;

	return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(title)} · Journal</title>
${fonts}    ${styles}
  </head>
  <body>
    <div class="app-shell">
      <nav class="site-nav" aria-label="Journal">
        <a class="brand" href="${esc(nav.brand)}">Journal</a>
        <div class="site-nav-links">
          ${navLinksHtml(active, nav)}
        </div>
        <div class="site-nav-actions">
          ${extraActions}
          ${rawBtn}
        </div>
      </nav>
      <div class="wrap">
        ${crumb ? `<p class="crumb">${crumb}</p>` : ''}
        <header class="page-head">
          <div>
            <h1>${esc(title)}</h1>
            ${subtitle ? `<p class="sub">${subtitle}</p>` : ''}
          </div>
        </header>
        ${bodyHtml}
      </div>
    </div>
  </body>
</html>
`;
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.htmlBody
 * @param {string} opts.relPath
 * @param {string} [opts.rawHref]
 * @param {NavMap} [opts.nav]
 * @param {string} [opts.cssInline]
 * @param {string} [opts.dashboardHref]
 * @param {string} [opts.md] raw markdown — enables standup board layout
 */
function renderNotePage(opts) {
	const {
		title,
		htmlBody,
		relPath,
		rawHref,
		nav = liveNav(),
		cssInline = '',
		dashboardHref,
		md = '',
	} = opts;
	const clean = relPath.replace(/^\//, '');
	const dash = dashboardHref || nav.dashboard;
	const crumb = `<a href="${esc(dash)}">Dashboard</a><span aria-hidden="true"> / </span><span>${esc(clean)}</span>`;
	const defaultRaw = cssInline
		? `../${clean.split('/').map(encodeURIComponent).join('/')}`
		: `/${clean.split('/').map(encodeURIComponent).join('/')}?raw=1`;
	const active = activeForNotePath(clean);
	const isStandup = active === 'standup' && md;

	let bodyHtml;
	let subtitle;
	if (isStandup) {
		const dateMatch = clean.match(/(\d{4}-\d{2}-\d{2})\.md$/i);
		const dateStr = dateMatch ? dateMatch[1] : '';
		bodyHtml = renderStandupBoard({
			md,
			linkMode: cssInline ? 'obsidian' : 'live',
		});
		subtitle = esc(standupSubtitle(md, dateStr));
	} else {
		bodyHtml = `<article class="md-doc section">${htmlBody}</article>`;
		subtitle = esc(clean);
	}

	return renderChromePage({
		title: isStandup ? title || extractTitle(md) || 'Standup' : title,
		active,
		nav,
		subtitle,
		crumb,
		rawHref: rawHref || defaultRaw,
		cssInline,
		extraCss: isStandup ? STANDUP_BOARD_CSS : '',
		bodyHtml,
	});
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.relPath
 * @param {{ name: string, href: string, kind: 'dir' | 'file' }[]} opts.entries
 * @param {NavMap} [opts.nav]
 * @param {string} [opts.cssInline]
 * @param {'oncall' | 'browse'} [opts.active]
 */
function renderDirPage(opts) {
	const {
		title,
		relPath,
		entries,
		nav = liveNav(),
		cssInline = '',
		active,
	} = opts;
	const rows = entries
		.map((e) => {
			const label = e.kind === 'dir' ? `${e.name}/` : e.name;
			return `<li><a href="${esc(e.href)}">${esc(label)}</a></li>`;
		})
		.join('\n');
	const dash = nav.dashboard;
	const crumb = `<a href="${esc(dash)}">Dashboard</a><span aria-hidden="true"> / </span><span>${esc(relPath)}</span>`;
	const activeId =
		active ||
		(relPath.toLowerCase().includes('on call') ? 'oncall' : 'browse');
	return renderChromePage({
		title,
		active: activeId,
		nav,
		subtitle: `${entries.length} item${entries.length === 1 ? '' : 's'}`,
		crumb,
		cssInline,
		bodyHtml: `<section class="section"><ul class="dir-list">${rows || '<li class="empty">Empty folder</li>'}</ul></section>`,
	});
}

module.exports = {
	renderChromePage,
	renderNotePage,
	renderDirPage,
	liveNav,
	obsidianNavFromView,
	obsidianNavFromDash,
	onCallViewName,
	activeForNotePath,
	isoDate,
	mondayOf,
};
