/**
 * Shared Journal dashboard chrome (nav + page shell) for localhost bridge.
 */

const { esc } = require('./markdown-render.cjs');

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
 * @param {'dashboard' | 'week' | 'standup' | 'oncall' | 'note' | 'browse'} active
 */
function navLinks(active) {
	const today = new Date();
	const mon = mondayOf(today);
	const weekHref = `/${mon.getFullYear()}/${isoDate(mon)}.md`;
	const standupHref = `/Standup/${today.getFullYear()}/${isoDate(today)}.md`;

	/** @type {{ id: string, href: string, label: string }[]} */
	const items = [
		{ id: 'dashboard', href: '/dashboard.html', label: 'Dashboard' },
		{ id: 'week', href: weekHref, label: 'Weekly log' },
		{ id: 'standup', href: standupHref, label: "Today's standup" },
		{ id: 'oncall', href: '/On%20Call/', label: 'On Call' },
	];

	return items
		.map((item) => {
			const cls = active === item.id ? ' class="active"' : '';
			return `<a href="${item.href}"${cls}>${esc(item.label)}</a>`;
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
 * @param {string} [opts.subtitle]
 * @param {string} [opts.crumb]
 * @param {string} [opts.rawHref]
 * @param {string} [opts.extraActions]
 */
function renderChromePage(opts) {
	const {
		title,
		bodyHtml,
		active,
		subtitle = '',
		crumb = '',
		rawHref = '',
		extraActions = '',
	} = opts;

	const rawBtn = rawHref
		? `<a class="btn" href="${esc(rawHref)}">Raw .md</a>`
		: '';

	return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)} · Journal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/assets/notes.css" />
  </head>
  <body>
    <div class="app-shell">
      <nav class="site-nav" aria-label="Journal">
        <a class="brand" href="/dashboard.html">Journal</a>
        <div class="site-nav-links">
          ${navLinks(active)}
        </div>
        <div class="site-nav-actions">
          ${extraActions}
          ${rawBtn}
        </div>
      </nav>
      <div class="wrap">
        ${
					crumb
						? `<p class="crumb">${crumb}</p>`
						: ''
				}
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
 * @param {string} opts.htmlBody  rendered markdown HTML
 * @param {string} opts.relPath   e.g. 2026/2026-07-20.md
 * @param {string} [opts.rawHref]
 */
function renderNotePage(opts) {
	const { title, htmlBody, relPath, rawHref } = opts;
	const clean = relPath.replace(/^\//, '');
	const crumb = `<a href="/dashboard.html">Dashboard</a><span aria-hidden="true"> / </span><span>${esc(clean)}</span>`;
	return renderChromePage({
		title,
		active: activeForNotePath(clean),
		subtitle: esc(clean),
		crumb,
		rawHref: rawHref || `/${clean.split('/').map(encodeURIComponent).join('/')}?raw=1`,
		bodyHtml: `<article class="md-doc section">${htmlBody}</article>`,
	});
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.relPath
 * @param {{ name: string, href: string, kind: 'dir' | 'file' }[]} opts.entries
 */
function renderDirPage(opts) {
	const { title, relPath, entries } = opts;
	const rows = entries
		.map((e) => {
			const label = e.kind === 'dir' ? `${e.name}/` : e.name;
			return `<li><a href="${esc(e.href)}">${esc(label)}</a></li>`;
		})
		.join('\n');
	const crumb = `<a href="/dashboard.html">Dashboard</a><span aria-hidden="true"> / </span><span>${esc(relPath)}</span>`;
	return renderChromePage({
		title,
		active: relPath.toLowerCase().includes('on call') ? 'oncall' : 'browse',
		subtitle: `${entries.length} item${entries.length === 1 ? '' : 's'}`,
		crumb,
		bodyHtml: `<section class="section"><ul class="dir-list">${rows || '<li class="empty">Empty folder</li>'}</ul></section>`,
	});
}

module.exports = {
	renderChromePage,
	renderNotePage,
	renderDirPage,
	navLinks,
	activeForNotePath,
	isoDate,
	mondayOf,
};
