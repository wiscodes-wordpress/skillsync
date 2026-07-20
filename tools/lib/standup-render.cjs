/**
 * Meeting-first standup board from Journal/Standup/*.md
 * (Focus banner + Yesterday / Today / Blockers triad).
 */

const { esc, splitFrontmatter, inline } = require('./markdown-render.cjs');

/** Placeholder / empty bullets from the generator or hand edits. */
const EMPTY_RE =
	/^\((none|none yet|none in progress)(\s*[—–-].*)?\)$/i;

/**
 * @param {string} heading
 * @returns {{ key: string, dayLabel: string | null }}
 */
function classifyHeading(heading) {
	const h = heading.trim();
	const day = h.match(/\(([^)]+)\)\s*$/);
	const dayLabel = day ? day[1].trim() : null;
	const base = h.replace(/\s*\([^)]+\)\s*$/, '').trim().toLowerCase();
	if (base === 'focus') return { key: 'focus', dayLabel };
	if (base === 'yesterday') return { key: 'yesterday', dayLabel };
	if (base === 'today') return { key: 'today', dayLabel };
	if (base === 'blockers' || base === 'blocker') return { key: 'blockers', dayLabel };
	if (base === 'talking points' || base === 'talking point') {
		return { key: 'talking', dayLabel };
	}
	if (base === 'notes' || base === 'note') return { key: 'notes', dayLabel };
	return { key: 'other', dayLabel };
}

/**
 * @param {string} text
 */
function isEmptyItem(text) {
	const t = String(text || '').trim();
	if (!t || t === '-' || t === '—' || t === '–') return true;
	return EMPTY_RE.test(t);
}

/**
 * @param {string} text raw markdown fragment
 */
function itemHtml(text) {
	let s = String(text || '');
	// [[path|label]] or [[path]] → markdown link before escape/inline
	s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
		const href = String(target).trim().replace(/\\/g, '/');
		const pathPart = href.endsWith('.md') ? href : `${href}.md`;
		const display = (label || target).trim();
		return `[${display}](/${pathPart.replace(/^\//, '')})`;
	});
	return inline(s);
}

/**
 * @param {string} sectionBody
 * @returns {string[]}
 */
function parseItems(sectionBody) {
	const items = [];
	for (const line of String(sectionBody || '').split('\n')) {
		const m = line.match(/^\s*[-*+]\s+(.*)$/);
		if (m) {
			const t = m[1].trim();
			if (!isEmptyItem(t)) items.push(t);
			continue;
		}
		const plain = line.trim();
		if (plain && !/^#/.test(plain) && !isEmptyItem(plain) && plain !== '-') {
			// Notes sometimes stored as bare lines
			if (!/^(Derived from|tags:)/i.test(plain)) items.push(plain);
		}
	}
	return items;
}

/**
 * @param {string} md
 */
function parseStandup(md) {
	const { meta, body } = splitFrontmatter(md);
	/** @type {Record<string, { dayLabel: string | null, items: string[] }>} */
	const sections = {
		focus: { dayLabel: null, items: [] },
		yesterday: { dayLabel: null, items: [] },
		today: { dayLabel: null, items: [] },
		blockers: { dayLabel: null, items: [] },
		talking: { dayLabel: null, items: [] },
		notes: { dayLabel: null, items: [] },
	};

	let sourceWeek = null;
	if (meta) {
		const sw = meta.match(/source_week:\s*"?([^"\n]+)"?/);
		if (sw) sourceWeek = sw[1].trim();
	}

	const wiki = body.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
	if (wiki && !sourceWeek) {
		const t = wiki[1].trim();
		const base = pathBasename(t);
		if (/^\d{4}-\d{2}-\d{2}$/.test(base)) sourceWeek = base;
	}

	const lines = body.replace(/\r\n/g, '\n').split('\n');
	/** @type {string | null} */
	let current = null;
	/** @type {string[]} */
	let buf = [];

	function flush() {
		if (!current || !sections[current]) return;
		sections[current].items = parseItems(buf.join('\n'));
		buf = [];
	}

	for (const line of lines) {
		const h = line.match(/^##\s+(.+)$/);
		if (h) {
			flush();
			const { key, dayLabel } = classifyHeading(h[1]);
			current = key === 'other' ? null : key;
			if (current && dayLabel) sections[current].dayLabel = dayLabel;
			buf = [];
			continue;
		}
		if (current) buf.push(line);
	}
	flush();

	return { sections, sourceWeek };
}

/**
 * @param {string} p
 */
function pathBasename(p) {
	const s = String(p).replace(/\\/g, '/');
	const base = s.split('/').pop() || s;
	return base.replace(/\.md$/i, '');
}

/**
 * @param {string[]} items
 * @param {string} emptyLabel
 */
function listHtml(items, emptyLabel) {
	if (!items.length) {
		return `<p class="standup-empty">${esc(emptyLabel)}</p>`;
	}
	return `<ul class="standup-list">${items
		.map((i) => `<li>${itemHtml(i)}</li>`)
		.join('')}</ul>`;
}

/**
 * @param {object} opts
 * @param {string} opts.md
 * @param {'live' | 'obsidian'} [opts.linkMode]
 * @param {string} [opts.mondayStr] for Obsidian week view href
 */
function renderStandupBoard(opts) {
	const { md, linkMode = 'live', mondayStr } = opts;
	const { sections, sourceWeek } = parseStandup(md);
	const week = sourceWeek || mondayStr || null;

	let weekHref = '';
	let weekLabel = week ? `Week of ${week}` : 'Weekly log';
	if (week) {
		const y = week.slice(0, 4);
		if (linkMode === 'obsidian') {
			weekHref = `../../${y}/${week}.md`;
		} else {
			weekHref = `/dashboard.html#week/${week}`;
		}
	}

	const focus = sections.focus;
	const yest = sections.yesterday;
	const today = sections.today;
	const blockers = sections.blockers;
	const talking = sections.talking;
	const notes = sections.notes;

	const weekLink = weekHref
		? `<a class="standup-week-link" href="${esc(weekHref)}">${esc(weekLabel)}</a>`
		: '';

	return `<div class="standup-board">
  <p class="standup-meta">Meeting view${weekLink ? ` · ${weekLink}` : ''}. Edit the weekly log for lasting notes.</p>

  <section class="standup-focus" aria-labelledby="standup-focus-h">
    <h2 id="standup-focus-h">Focus</h2>
    ${listHtml(focus.items, 'Nothing in progress')}
  </section>

  <div class="standup-triad" role="group" aria-label="Standup triad">
    <section class="standup-card standup-yesterday" aria-labelledby="standup-yest-h">
      <header>
        <h2 id="standup-yest-h">Yesterday</h2>
        ${yest.dayLabel ? `<span class="standup-day">${esc(yest.dayLabel)}</span>` : ''}
      </header>
      ${listHtml(yest.items, 'Nothing logged')}
    </section>
    <section class="standup-card standup-today" aria-labelledby="standup-today-h">
      <header>
        <h2 id="standup-today-h">Today</h2>
        ${today.dayLabel ? `<span class="standup-day">${esc(today.dayLabel)}</span>` : ''}
      </header>
      ${listHtml(today.items, 'Nothing logged')}
    </section>
    <section class="standup-card standup-blockers" aria-labelledby="standup-block-h">
      <header>
        <h2 id="standup-block-h">Blockers</h2>
      </header>
      ${listHtml(blockers.items, 'None')}
    </section>
  </div>

  <div class="standup-secondary">
    <section class="standup-card" aria-labelledby="standup-talk-h">
      <header><h2 id="standup-talk-h">Talking points</h2></header>
      ${listHtml(talking.items, 'None')}
    </section>
    <section class="standup-card" aria-labelledby="standup-notes-h">
      <header><h2 id="standup-notes-h">Notes</h2></header>
      ${listHtml(notes.items, '—')}
    </section>
  </div>
</div>`;
}

/**
 * Friendlier subtitle for the page chrome (not the file path).
 * @param {string} md
 * @param {string} dateStr YYYY-MM-DD from filename or title
 */
function standupSubtitle(md, dateStr) {
	const { sections } = parseStandup(md);
	const day = sections.today.dayLabel;
	const parts = [];
	if (day) parts.push(day);
	if (dateStr) parts.push(dateStr);
	return parts.join(' · ') || dateStr || '';
}

module.exports = {
	parseStandup,
	renderStandupBoard,
	standupSubtitle,
	isEmptyItem,
};
