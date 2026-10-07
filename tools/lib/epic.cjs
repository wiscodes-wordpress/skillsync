/**
 * Local epic manifest: an epic folder holds `epic.md` plus `stories/*.md`.
 * Each story file starts with frontmatter the epic loop reads and writes:
 *
 *   ---
 *   id: E1-S2
 *   title: API reference module
 *   status: todo
 *   depends_on: E1-S0, E1-S1
 *   blocked_by: backend API keys      # optional external blocker; story is skipped while set
 *   branch: feature/E1-S2-api-reference
 *   pr: 42
 *   attempts: 0
 *   discovered_from: E1-S1           # set by --file: found while working on that story
 *   ---
 *
 * The story table in epic.md is generated between
 * `<!-- epic-loop:stories:start -->` and `<!-- epic-loop:stories:end -->`.
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseFrontmatter } = require('./plan-md.cjs');
const { parseCompletedRemaining } = require('./ss-tools.cjs');

/** Story statuses in delivery order. `blocked` can follow any active status. */
const STATUSES = [
	'todo',
	'planning',
	'awaiting-approval',
	'implementing',
	'reviewing',
	'pr-open',
	'merged',
	'blocked',
];

/** Statuses that mean the loop owns the story right now (work in progress). */
const ACTIVE_STATUSES = ['planning', 'awaiting-approval', 'implementing', 'reviewing', 'pr-open'];

/** Frontmatter keys written back in this order; unknown keys are kept after them. */
const KEY_ORDER = ['id', 'title', 'status', 'depends_on', 'blocked_by', 'branch', 'pr', 'attempts'];

const TABLE_START = '<!-- epic-loop:stories:start -->';
const TABLE_END = '<!-- epic-loop:stories:end -->';

/**
 * @typedef {object} Story
 * @property {string} id
 * @property {string} title
 * @property {string} status
 * @property {string[]} dependsOn
 * @property {string} blockedBy
 * @property {string} branch
 * @property {number | null} pr
 * @property {number} attempts
 * @property {string} file absolute path to the story markdown
 * @property {Record<string, string>} meta raw frontmatter
 * @property {string} body markdown after frontmatter
 */

/**
 * @param {string} raw
 * @returns {string[]}
 */
function parseList(raw) {
	if (!raw) return [];
	return raw
		.replace(/^\[|\]$/g, '')
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s && s !== '—' && s !== '-');
}

/**
 * @param {string} file
 * @returns {Story}
 */
function readStory(file) {
	const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
	const id = meta.id || path.basename(file, '.md');
	const status = (meta.status || 'todo').toLowerCase();
	if (!STATUSES.includes(status)) {
		throw new Error(`${file}: unknown status "${meta.status}" (expected one of ${STATUSES.join(', ')})`);
	}
	const pr = Number.parseInt(meta.pr ?? '', 10);
	const attempts = Number.parseInt(meta.attempts ?? '', 10);
	return {
		id,
		title: meta.title || id,
		status,
		dependsOn: parseList(meta.depends_on ?? ''),
		blockedBy: (meta.blocked_by ?? '').trim(),
		branch: (meta.branch ?? '').trim(),
		pr: Number.isFinite(pr) ? pr : null,
		attempts: Number.isFinite(attempts) ? attempts : 0,
		file,
		meta,
		body,
	};
}

/**
 * @param {Story} story
 * @returns {string}
 */
function serializeStory(story) {
	/** @type {Record<string, string>} */
	const meta = { ...story.meta };
	meta.id = story.id;
	meta.title = story.title;
	meta.status = story.status;
	meta.depends_on = story.dependsOn.join(', ');
	meta.blocked_by = story.blockedBy;
	meta.branch = story.branch;
	meta.pr = story.pr === null ? '' : String(story.pr);
	meta.attempts = String(story.attempts);

	const keys = [...KEY_ORDER, ...Object.keys(meta).filter((k) => !KEY_ORDER.includes(k))];
	const lines = keys
		.filter((k) => meta[k] !== undefined && meta[k] !== '' && !(k === 'attempts' && meta[k] === '0'))
		.map((k) => `${k}: ${meta[k]}`);
	return `---\n${lines.join('\n')}\n---\n\n${story.body.replace(/^\n+/, '')}`;
}

/**
 * @param {Story} story
 */
function writeStory(story) {
	fs.writeFileSync(story.file, serializeStory(story), 'utf8');
}

/**
 * @param {string} epicDir folder containing epic.md and stories/
 * @returns {{ dir: string; file: string; meta: Record<string, string>; stories: Story[] }}
 */
function loadEpic(epicDir) {
	const dir = path.resolve(epicDir);
	const file = path.join(dir, 'epic.md');
	if (!fs.existsSync(file)) {
		throw new Error(`No epic.md in ${dir}`);
	}
	const { meta } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
	const storiesDir = path.join(dir, 'stories');
	const stories = fs.existsSync(storiesDir)
		? fs
				.readdirSync(storiesDir)
				.filter((f) => f.endsWith('.md'))
				.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
				.map((f) => readStory(path.join(storiesDir, f)))
		: [];

	const ids = new Set(stories.map((s) => s.id));
	for (const s of stories) {
		for (const dep of s.dependsOn) {
			if (!ids.has(dep)) {
				throw new Error(`${s.file}: depends_on "${dep}" is not a story in this epic`);
			}
		}
	}
	return { dir, file, meta, stories };
}

/**
 * What the loop should work on next: the story already in progress, else the first `todo`
 * story (file order) whose dependencies are all merged and which has no external blocker.
 * A story starts only after its dependencies merge, so branches never stack.
 *
 * `only` pins the answer to one story (a `--story` loop). `skip` leaves out stories another
 * loop process is working on, so two loops never pick the same story.
 *
 * @param {Story[]} stories
 * @param {{ only?: string; skip?: Set<string> }} [opts]
 * @returns {{ story: Story | null; reason: string }}
 */
function nextStory(stories, opts = {}) {
	const merged = new Set(stories.filter((s) => s.status === 'merged').map((s) => s.id));
	/** @param {Story} s */
	const waitReason = (s) => {
		if (s.status === 'blocked') return `${s.id} blocked`;
		if (s.blockedBy) return `${s.id} blocked by ${s.blockedBy}`;
		const open = s.dependsOn.filter((d) => !merged.has(d));
		return `${s.id} waits on ${open.join(', ')}`;
	};

	if (opts.only) {
		const s = stories.find((x) => x.id === opts.only);
		if (!s) return { story: null, reason: `no story ${opts.only}` };
		if (ACTIVE_STATUSES.includes(s.status)) return { story: s, reason: `${s.id} is ${s.status}` };
		if (s.status === 'merged') return { story: null, reason: `${s.id} merged` };
		if (s.status === 'todo' && !s.blockedBy && s.dependsOn.every((d) => merged.has(d))) {
			return { story: s, reason: `${s.id} is ready (dependencies merged)` };
		}
		return { story: null, reason: `${s.id} not ready: ${waitReason(s)}` };
	}

	const skip = opts.skip ?? new Set();
	const open = stories.filter((s) => !skip.has(s.id));
	const active = open.find((s) => ACTIVE_STATUSES.includes(s.status));
	if (active) {
		return { story: active, reason: `${active.id} is ${active.status}` };
	}
	for (const s of open) {
		if (s.status !== 'todo') continue;
		if (s.blockedBy) continue;
		if (s.dependsOn.every((d) => merged.has(d))) {
			return { story: s, reason: `${s.id} is ready (dependencies merged)` };
		}
	}
	if (stories.every((s) => s.status === 'merged')) {
		return { story: null, reason: 'all stories merged' };
	}
	const waiting = [
		...[...skip].filter((id) => stories.some((s) => s.id === id && s.status !== 'merged')).map((id) => `${id} running in another loop`),
		...open.filter((s) => s.status === 'todo' || s.status === 'blocked').map(waitReason),
	];
	return { story: null, reason: `nothing ready: ${waiting.join('; ')}` };
}

/**
 * Every story a new loop could start now: `todo`, no external blocker, dependencies merged,
 * not in `skip` (stories another loop process has claimed). File order.
 * @param {Story[]} stories @param {Set<string>} [skip]
 * @returns {Story[]}
 */
function readyStories(stories, skip = new Set()) {
	const merged = new Set(stories.filter((s) => s.status === 'merged').map((s) => s.id));
	return stories.filter((s) => s.status === 'todo' && !s.blockedBy && !skip.has(s.id) && s.dependsOn.every((d) => merged.has(d)));
}

/** @param {string} raw */
const slug = (raw) =>
	raw
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);

/**
 * Add a story to the epic: work an agent found that belongs outside its own story (beads'
 * "discovered from"). It starts as `todo` and goes through plan approval like any story.
 * The id continues the epic's numbering (E3-S10 → E3-S11). Filing the same title twice
 * returns the existing story, so a retried agent does not file duplicates.
 *
 * @param {string} epicDir
 * @param {{ title: string; note?: string; dependsOn?: string[]; discoveredFrom?: string; maxPerStory?: number }} input
 * @returns {{ story: Story; created: boolean }}
 */
function fileStory(epicDir, input) {
	const title = input.title.trim().replace(/\s+/g, ' ');
	if (!title) throw new Error('a filed story needs a title');
	const storiesDir = path.join(path.resolve(epicDir), 'stories');
	fs.mkdirSync(storiesDir, { recursive: true });
	// Parallel loops can file at the same moment: hold a lock while picking the next id.
	const lock = path.join(storiesDir, '.file.lock');
	const deadline = Date.now() + 10_000;
	for (;;) {
		try {
			fs.closeSync(fs.openSync(lock, 'wx'));
			break;
		} catch (err) {
			if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'EEXIST') throw err;
			if (Date.now() > deadline) fs.unlinkSync(lock); // left by a killed process
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
		}
	}
	try {
		const epic = loadEpic(epicDir);
		const same = epic.stories.find((s) => s.title.toLowerCase() === title.toLowerCase());
		if (same) return { story: same, created: false };
		const ids = new Set(epic.stories.map((s) => s.id));
		const dependsOn = (input.dependsOn ?? []).filter(Boolean);
		for (const dep of dependsOn) if (!ids.has(dep)) throw new Error(`depends on "${dep}", which is not a story in this epic`);
		const from = input.discoveredFrom ?? '';
		if (from && !ids.has(from)) throw new Error(`discovered from "${from}", which is not a story in this epic`);
		const max = input.maxPerStory ?? 3;
		if (from && epic.stories.filter((s) => s.meta.discovered_from === from).length >= max) {
			throw new Error(`${from} already filed ${max} stories (epicLoop.maxFiledPerStory); mention further work in .harness/state.md instead`);
		}
		const numbered = epic.stories.map((s) => s.id.match(/^(.*?)(\d+)$/)).filter((m) => m !== null);
		const prefix = numbered.length ? /** @type {RegExpMatchArray} */ (numbered[numbered.length - 1])[1] : `${epic.meta.id || path.basename(epic.dir)}-S`;
		const next = 1 + Math.max(0, ...numbered.filter((m) => m[1] === prefix).map((m) => Number(m[2])));
		const id = `${prefix}${next}`;
		/** @type {Story} */
		const story = {
			id,
			title,
			status: 'todo',
			dependsOn,
			blockedBy: '',
			branch: '',
			pr: null,
			attempts: 0,
			file: path.join(storiesDir, `${id}-${slug(title) || 'story'}.md`),
			meta: from ? { discovered_from: from } : {},
			body: `${(input.note ?? '').trim() || title}\n${from ? `\nFound while working on ${from}.\n` : ''}`,
		};
		fs.writeFileSync(story.file, serializeStory(story), { encoding: 'utf8', flag: 'wx' });
		writeStoryTable(epic.file, [...epic.stories, story]);
		return { story, created: true };
	} finally {
		fs.rmSync(lock, { force: true });
	}
}

/**
 * Where a blocked story resumes: the status it was blocked from (`blocked_from`, which the loop
 * records), else a guess from its PR, branch and plan for stories blocked before that existed.
 * The guess re-plans whenever no cycle is done yet, so plan approval is never skipped.
 *
 * @param {Story} story
 * @param {string} state the story's harness state.md ('' when there is none)
 * @returns {string}
 */
function retryStatus(story, state) {
	const from = story.meta.blocked_from ?? '';
	if (from === 'todo' || ACTIVE_STATUSES.includes(from)) return from;
	if (story.pr !== null) return 'pr-open';
	if (!story.branch) return 'todo';
	const { completed, remaining } = parseCompletedRemaining(state);
	if (completed.length === 0) return 'planning';
	return remaining.length ? 'implementing' : 'reviewing';
}

/**
 * Unblock a story (in memory; the caller writes it): resume status, attempts and the CI-fix
 * count reset, block notes cleared.
 *
 * @param {Story} story
 * @param {string} state
 * @returns {string} the status it resumes at
 */
function retryStory(story, state) {
	story.status = retryStatus(story, state);
	story.attempts = 0;
	for (const key of ['blocked_reason', 'blocked_from', 'fix_attempts', 'fixed_sha']) delete story.meta[key];
	return story.status;
}

/**
 * @param {Story[]} stories
 * @returns {string}
 */
function renderStoryTable(stories) {
	const rows = stories.map((s) => {
		const rel = `stories/${path.basename(s.file)}`;
		const deps = s.dependsOn.join(', ') || '—';
		const status = s.blockedBy && s.status === 'todo' ? `todo (blocked by ${s.blockedBy})` : s.status;
		const pr = s.pr === null ? '—' : `#${s.pr}`;
		return `| [${s.id}](${rel}) | ${s.title} | ${deps} | ${status} | ${pr} |`;
	});
	return ['| ID | Story | Depends on | Status | PR |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}

/**
 * Rewrite the generated story table in epic.md. Adds the markers under `## Stories`
 * (or at the end) the first time.
 *
 * @param {string} epicFile
 * @param {Story[]} stories
 */
function writeStoryTable(epicFile, stories) {
	const content = fs.readFileSync(epicFile, 'utf8');
	const block = `${TABLE_START}\n${renderStoryTable(stories)}\n${TABLE_END}`;
	let next;
	const start = content.indexOf(TABLE_START);
	const end = content.indexOf(TABLE_END);
	if (start !== -1 && end > start) {
		next = content.slice(0, start) + block + content.slice(end + TABLE_END.length);
	} else if (/^## Stories\s*$/m.test(content)) {
		next = content.replace(/^## Stories\s*$/m, `## Stories\n\n${block}`);
	} else {
		next = `${content.trimEnd()}\n\n## Stories\n\n${block}\n`;
	}
	if (next !== content) {
		fs.writeFileSync(epicFile, next, 'utf8');
	}
}

module.exports = {
	STATUSES,
	ACTIVE_STATUSES,
	loadEpic,
	readStory,
	writeStory,
	serializeStory,
	nextStory,
	readyStories,
	fileStory,
	retryStatus,
	retryStory,
	renderStoryTable,
	writeStoryTable,
};
