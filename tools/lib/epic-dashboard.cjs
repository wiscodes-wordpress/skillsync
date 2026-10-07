/**
 * Local live dashboard for the epic loop: the dependency graph is the board (click a story for its
 * actions), epic-level Start/Stop, milestone updates, running agent feed, loop timeline. Served on 127.0.0.1 only; the page polls /api/state every 2 seconds.
 *
 * Started by `epic-loop.cjs --dashboard [--port 4747]`.
 */

const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { loadEpic, nextStory, retryStatus, retryStory, writeStory, writeStoryTable } = require('./epic.cjs');
const { formatStreamLine } = require('./agent-runner.cjs');
const { paseoBin, openSession } = require('./paseo-agent.cjs');
const { approvePlan, requestRelease } = require('./epic-session.cjs');
const { harnessDir, parseCompletedRemaining, parseMarkdownSections, readOptionalConfig, runCommand } = require('./ss-tools.cjs');
const { createPreviews } = require('./epic-preview.cjs');

/**
 * The review agent's `## Preview` section: `- /route — what to check` lines, or a note such as
 * `none — library only` when there is nothing to see in the app.
 * @param {string} state
 */
function parsePreview(state) {
	const section = parseMarkdownSections(state).get('Preview') ?? '';
	const routes = [...section.matchAll(/^\s*[-*]\s*`?(\/[^\s`]*)`?\s*(?:[—–:-]+\s*(.*))?$/gm)].map((m) => ({ path: m[1], check: (m[2] ?? '').trim() }));
	return { routes, note: routes.length ? '' : (section.split('\n')[0] ?? '').replace(/^\s*[-*]\s*/, '').trim() };
}

/** @param {string} file @param {number} maxBytes */
function readTail(file, maxBytes) {
	if (!fs.existsSync(file)) return '';
	const size = fs.statSync(file).size;
	const start = Math.max(0, size - maxBytes);
	const fd = fs.openSync(file, 'r');
	const buf = Buffer.alloc(size - start);
	fs.readSync(fd, buf, 0, buf.length, start);
	fs.closeSync(fd);
	const text = buf.toString('utf8');
	return start > 0 ? text.slice(text.indexOf('\n') + 1) : text;
}

/** @param {string} lockFile */
function loopPid(lockFile) {
	if (!fs.existsSync(lockFile)) return null;
	const pid = Number.parseInt(fs.readFileSync(lockFile, 'utf8'), 10);
	try {
		process.kill(pid, 0);
		return pid;
	} catch {
		return null;
	}
}

/**
 * Pid of a live loop working on this story (its claim, or a `--story` loop's lock), or null.
 * @param {{ root: string; loopDir: string }} opts @param {string} id
 */
function storyLoopPid(opts, id) {
	return loopPid(path.join(opts.loopDir, 'claims', `${id}.pid`)) ?? loopPid(path.join(path.dirname(opts.loopDir), `epic-loop.${id}.lock`));
}

/**
 * Everything the page renders, read fresh from disk on each request.
 *
 * @param {{ root: string; epicDir: string; loopDir: string; previews?: ReturnType<typeof createPreviews> }} opts
 */
function readDashboardState(opts) {
	const epic = loadEpic(opts.epicDir);
	const next = nextStory(epic.stories);
	const logsDir = path.join(opts.loopDir, 'logs');

	const stories = epic.stories.map((s) => {
		const stateFile = path.join(epic.dir, 'state', `${s.id}.md`);
		const state = fs.existsSync(stateFile) ? fs.readFileSync(stateFile, 'utf8') : '';
		const { completed, remaining } = parseCompletedRemaining(state);
		return {
			id: s.id,
			title: s.title,
			status: s.status,
			dependsOn: s.dependsOn,
			blockedBy: s.blockedBy,
			blockedReason: s.meta.blocked_reason ?? '',
			discoveredFrom: s.meta.discovered_from ?? '',
			branch: s.branch,
			pr: s.pr,
			attempts: s.attempts,
			cycles: completed.length + remaining.length ? { done: completed.length, total: completed.length + remaining.length } : null,
			planFile: state ? path.relative(opts.root, stateFile) : '',
			preview: { ...parsePreview(state), url: opts.previews?.urlOf(s.id) ?? null },
			ready: s.status === 'todo' && nextStory(epic.stories, { only: s.id }).story !== null,
			retryAt: s.status === 'blocked' ? retryStatus(s, state) : null,
			loopPid: storyLoopPid(opts, s.id),
			// The Paseo chat of the story's latest phase, and whether the loop waits on you in it.
			session: s.meta.session ? { id: s.meta.session, phase: s.meta.session_phase ?? '', live: s.meta.session_open === 'yes', held: s.meta.session_held === 'yes' } : null,
		};
	});

	const newest = fs.existsSync(logsDir)
		? fs
				.readdirSync(logsDir)
				.filter((f) => f.endsWith('.log'))
				.map((f) => ({ f, t: fs.statSync(path.join(logsDir, f)).mtimeMs }))
				.sort((a, b) => b.t - a.t)[0]
		: undefined;
	/** @type {null | { name: string; running: boolean; updated: number; lines: string[] }} */
	let agent = null;
	if (newest) {
		const raw = readTail(path.join(logsDir, newest.f), 256 * 1024);
		const output = raw.includes('--- output ---') ? raw.slice(raw.indexOf('--- output ---') + 15) : raw;
		const lines = output
			.split('\n')
			.map((l) => (l.startsWith('--- ') ? l : formatStreamLine(l)))
			.filter((l) => l !== null)
			.flatMap((l) => String(l).split('\n'));
		agent = {
			name: newest.f.replace(/\.log$/, ''),
			running: !/\n--- (exit|TIMED OUT)/.test(raw),
			updated: newest.t,
			lines: lines.slice(-150),
		};
	}

	const progress = readTail(path.join(opts.loopDir, 'progress.log'), 64 * 1024)
		.split('\n')
		.filter(Boolean)
		.slice(-60)
		.map((l) => {
			const sp = l.indexOf(' ');
			return { at: l.slice(0, sp), text: l.slice(sp + 1) };
		});

	return {
		epic: { id: epic.meta.id ?? path.basename(epic.dir), title: epic.meta.title ?? '', dir: path.relative(opts.root, epic.dir) },
		loop: { pid: epicLoopPid(opts) },
		next: { story: next.story?.id ?? null, reason: next.reason },
		previewEnabled: Boolean(opts.previews?.enabled),
		stories,
		agent,
		progress,
		now: Date.now(),
	};
}

/**
 * Run an epic-loop process detached so it outlives the dashboard, its output appended to `out`.
 * @param {{ root: string; epicDir: string; loopDir: string }} opts @param {string[]} extra @param {string} out
 * @returns {number} pid
 */
function launchLoop(opts, extra, out) {
	fs.mkdirSync(path.dirname(out), { recursive: true });
	const fd = fs.openSync(out, 'a');
	const child = spawn(process.execPath, [path.join(__dirname, '..', 'epic-loop.cjs'), opts.root, '--epic', opts.epicDir, ...extra], {
		cwd: opts.root,
		detached: true,
		stdio: ['ignore', fd, fd],
	});
	fs.closeSync(fd);
	child.unref();
	return /** @type {number} */ (child.pid);
}

/**
 * Run a `--story <id>` loop for one story. It claims the story, so the default loop skips it, and
 * exits once the story merges.
 * @param {{ root: string; epicDir: string; loopDir: string }} opts @param {string} id
 */
const launchStoryLoop = (opts, id) => launchLoop(opts, ['--story', id], path.join(opts.loopDir, 'logs', `story-loop-${id}.out`));

/** @param {{ loopDir: string }} opts */
const epicLoopPid = (opts) => loopPid(path.join(path.dirname(opts.loopDir), 'epic-loop.lock'));

const json = (/** @type {number} */ code, /** @type {unknown} */ body) => ({ code, body });

/**
 * Dashboard options for a consumer repo, from its skillsync.config.json `epicLoop` block.
 * For callers other than epic-loop.cjs (the Paseo Orchestrator plugin).
 * @param {string} root
 */
function epicDashboardOptions(root) {
	const config = readOptionalConfig(root);
	const cfg = config?.epicLoop ?? {};
	if (typeof cfg.epic !== 'string') throw new Error(`no epicLoop.epic in ${path.join(root, 'skillsync.config.json')}`);
	return { root, epicDir: path.resolve(root, cfg.epic), loopDir: path.join(harnessDir(root), 'epic-loop'), preview: cfg.preview ?? null, config };
}

/**
 * The dashboard's state and every button behind it, shared by the web page and the Orchestrator plugin.
 * `act` returns an HTTP-style status and a JSON body.
 * Actions: start, retry, session, release, approve, preview, preview-stop (by story id), loop-start, loop-stop.
 * @param {{ root: string; epicDir: string; loopDir: string; preview?: { command?: string; basePort?: number } | null; config?: Record<string, any> | null }} opts
 */
function createEpicActions(opts) {
	const previews = createPreviews({ root: opts.root, loopDir: opts.loopDir, config: opts.preview });
	const log = (/** @type {string} */ line) => fs.appendFileSync(path.join(opts.loopDir, 'progress.log'), `${new Date().toISOString()} ${line}\n`, 'utf8');

	/** @param {string} action @param {string} [id] @returns {Promise<{ code: number; body: unknown }>} */
	async function act(action, id = '') {
		// The default loop: every ready story in turn, still waiting on you for plan approval and merge.
		if (action === 'loop-start' || action === 'loop-stop') {
			const pid = epicLoopPid(opts);
			if (action === 'loop-stop') {
				if (!pid) return json(409, { error: 'the epic loop is not running' });
				// Default signal death: the loop blocks in spawnSync/sleep, and agent-guard stops its agent.
				process.kill(pid, 'SIGTERM');
				log(`epic-loop: stopped (dashboard), pid ${pid}`);
				return json(200, { ok: true });
			}
			if (pid) return json(409, { error: `the epic loop is already running (pid ${pid})` });
			const started = launchLoop(opts, [], path.join(opts.loopDir, 'loop.out'));
			log(`epic-loop: started (dashboard), pid ${started}`);
			return json(200, { ok: true, pid: started });
		}
		const epic = loadEpic(opts.epicDir);
		const index = epic.stories.findIndex((s) => s.id === id);
		const story = epic.stories[index];
		if (!story) return json(404, { error: `no story ${id}` });
		if (action === 'preview-stop') {
			previews.stop(id);
			return json(200, { ok: true });
		}
		if (action === 'preview') {
			const r = await previews.start(id, index);
			return json(r.url ? 200 : 409, r);
		}
		if (action === 'start' || action === 'retry') {
			const busy = storyLoopPid(opts, id);
			if (busy) return json(409, { error: `${id} is already run by an epic-loop (pid ${busy})` });
			let line;
			if (action === 'retry') {
				if (story.status !== 'blocked') return json(409, { error: `${id} is ${story.status}, not blocked` });
				const stateFile = path.join(epic.dir, 'state', `${id}.md`);
				const resumed = retryStory(story, fs.existsSync(stateFile) ? fs.readFileSync(stateFile, 'utf8') : '');
				writeStory(story);
				writeStoryTable(epic.file, epic.stories);
				line = `retried (dashboard) → ${resumed}`;
			} else {
				const next = nextStory(epic.stories, { only: id });
				if (story.status !== 'todo' || !next.story) return json(409, { error: next.reason });
				line = 'started (dashboard)';
			}
			const pid = launchStoryLoop(opts, id);
			log(`${id}: ${line}, epic-loop --story pid ${pid}`);
			return json(200, { ok: true, pid });
		}
		if (action === 'session' || action === 'release') {
			if (!story.meta.session) return json(404, { error: `${id} has no Paseo session` });
			if (action === 'session') {
				const opened = openSession(paseoBin(opts.config ?? null), story.meta.session);
				return opened.ok ? json(200, { ok: true }) : json(502, { error: `paseo agent open failed: ${opened.error}` });
			}
			if (story.meta.session_held !== 'yes') return json(409, { error: `${id} has no session held for you` });
			requestRelease(opts.loopDir, id);
			log(`${id}: session released (dashboard)`);
			return json(200, { ok: true });
		}
		if (action === 'approve') {
			if (story.status !== 'awaiting-approval') return json(409, { error: `${id} is not awaiting approval` });
			const approved = approvePlan(opts.root, epic.dir, story.id);
			if (!approved.ok) return json(409, { error: approved.error });
			story.status = 'implementing';
			story.attempts = 0;
			writeStory(story);
			writeStoryTable(epic.file, epic.stories);
			log(`${story.id}: plan approved (dashboard) → implementing`);
			return json(200, { ok: true });
		}
		return json(404, { error: `unknown action ${action}` });
	}

	return { previews, state: () => readDashboardState({ ...opts, previews }), act };
}

/**
 * @param {{ root: string; epicDir: string; loopDir: string; port: number; preview?: { command?: string; basePort?: number } | null; config?: Record<string, any> | null }} opts
 * @returns {http.Server}
 */
function startDashboard(opts) {
	const repo = runCommand(opts.root, 'gh repo view --json url -q .url');
	const repoUrl = repo.status === 0 ? repo.stdout.trim() : '';
	const actions = createEpicActions(opts);
	process.on('exit', actions.previews.stopAll);
	process.on('SIGINT', () => process.exit(130));
	process.on('SIGTERM', () => process.exit(143));
	const server = http.createServer((req, res) => {
		const send = (/** @type {number} */ code, /** @type {string} */ type, /** @type {string} */ body) => {
			res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
			res.end(body);
		};
		const reply = (/** @type {{ code: number; body: unknown }} */ r) => send(r.code, 'application/json', JSON.stringify(r.body));
		const fail = (/** @type {unknown} */ err) => send(500, 'application/json', JSON.stringify({ error: String(err) }));
		try {
			if (req.method === 'GET' && req.url === '/') return send(200, 'text/html; charset=utf-8', PAGE);
			if (req.method === 'GET' && req.url === '/repo') return send(200, 'text/plain', repoUrl);
			if (req.method === 'GET' && req.url === '/api/state') return send(200, 'application/json', JSON.stringify(actions.state()));
			const loop = req.method === 'POST' && req.url?.match(/^\/api\/loop\/(start|stop)$/);
			if (loop) return void actions.act(`loop-${loop[1]}`).then(reply, fail);
			const preview = req.method === 'POST' && req.url?.match(/^\/api\/preview\/([\w.-]+)(\/stop)?$/);
			if (preview) return void actions.act(preview[2] ? 'preview-stop' : 'preview', preview[1]).then(reply, fail);
			const story = req.method === 'POST' && req.url?.match(/^\/api\/(start|retry|session|release|approve)\/([\w.-]+)$/);
			if (story) return void actions.act(story[1], story[2]).then(reply, fail);
			return send(404, 'text/plain', 'not found');
		} catch (err) {
			return fail(err);
		}
	});
	server.listen(opts.port, '127.0.0.1');
	return server;
}

const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Epic loop</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
  :root {
    color-scheme: light;
    --bg: #F4F5F8; --surface: #FFFFFF; --panel: #F1F4F9; --ink: #1A2130; --muted: #5A6476; --faint: #8A93A3; --line: #DCE0E7;
    --accent: #2A5DB0; --accent-bg: #E6EEFA; --on-accent: #FFFFFF;
    --todo: #56606F; --todo-bg: #EDEFF2;
    --planning: #2A5DB0; --planning-bg: #E6EEFA;
    --approval: #A16207; --approval-bg: #FBF3DC;
    --implementing: #4F46C8; --implementing-bg: #ECEBFB;
    --reviewing: #0E7490; --reviewing-bg: #E0F2F6;
    --pr: #15803D; --pr-bg: #E3F4E8;
    --merged: #4D7A5C; --merged-bg: #EAF1EC;
    --blocked: #B91C1C; --blocked-bg: #FCE7E7;
    --sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
    --mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --bg: #0F131A; --surface: #161B24; --panel: #1B2230; --ink: #E5E9F0; --muted: #9BA5B6; --faint: #6F7A8C; --line: #283040;
      --accent: #7FA8EE; --accent-bg: #1C2A42; --on-accent: #0F131A;
      --todo: #A3ACBA; --todo-bg: #232A36; --planning: #7FA8EE; --planning-bg: #1C2A42; --approval: #E6B94F; --approval-bg: #33290F;
      --implementing: #A9A4F5; --implementing-bg: #25234A; --reviewing: #5CC6DB; --reviewing-bg: #12303A; --pr: #5FCB86; --pr-bg: #15301F;
      --merged: #8FC2A0; --merged-bg: #1A2A21; --blocked: #F28B8B; --blocked-bg: #3A1A1A;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --bg: #0F131A; --surface: #161B24; --panel: #1B2230; --ink: #E5E9F0; --muted: #9BA5B6; --faint: #6F7A8C; --line: #283040;
    --accent: #7FA8EE; --accent-bg: #1C2A42; --on-accent: #0F131A;
    --todo: #A3ACBA; --todo-bg: #232A36; --planning: #7FA8EE; --planning-bg: #1C2A42; --approval: #E6B94F; --approval-bg: #33290F;
    --implementing: #A9A4F5; --implementing-bg: #25234A; --reviewing: #5CC6DB; --reviewing-bg: #12303A; --pr: #5FCB86; --pr-bg: #15301F;
    --merged: #8FC2A0; --merged-bg: #1A2A21; --blocked: #F28B8B; --blocked-bg: #3A1A1A;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.5 var(--sans); padding: 28px 16px 56px; }
  main { max-width: 1240px; margin: 0 auto; display: grid; gap: 24px; }
  h1, h2, h3 { margin: 0; }
  h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.01em; }
  h2 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
  a { color: var(--accent); text-underline-offset: 2px; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  code, .mono { font-family: var(--mono); font-size: 12.5px; }
  .muted { color: var(--muted); }
  section { display: grid; gap: 12px; min-width: 0; }
  .sec-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
  .sec-head .count { font-size: 12.5px; color: var(--muted); }

  /* header */
  header { display: grid; gap: 10px; }
  .eyebrow { font-family: var(--mono); font-size: 12.5px; color: var(--muted); }
  .status { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; color: var(--muted); font-size: 13.5px; }
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; color: var(--c); background: var(--cb); }
  .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .pill.live::before { animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: 0.3; } }
  @media (prefers-reduced-motion: reduce) { .pill.live::before { animation: none; } }

  /* summary tiles */
  .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }
  .tile { padding: 9px 14px 10px; display: grid; gap: 3px; align-content: start; min-width: 0; }
  .tile + .tile { border-left: 1px solid var(--line); }
  .tile-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .tile .k { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); white-space: nowrap; }
  .tile .big { font-family: var(--mono); font-size: 17px; font-weight: 500; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .tile .big small { font-size: 12px; color: var(--muted); }
  .tile .sub { font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media (max-width: 760px) {
    .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tile:nth-child(3) { border-left: 0; }
    .tile:nth-child(n + 3) { border-top: 1px solid var(--line); }
  }
  .track { height: 4px; border-radius: 2px; background: var(--panel); overflow: hidden; display: flex; margin: 2px 0 1px; }
  .track i { display: block; height: 100%; }

  /* attention queue */
  .queue { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .qi { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 6px 14px; align-items: center; padding: 11px 16px; box-shadow: inset 3px 0 0 var(--c); }
  .qi + .qi { border-top: 1px solid var(--line); }
  .qi .what { display: grid; gap: 1px; min-width: 0; }
  .qi .what b { font-weight: 600; }
  .qi .what span { color: var(--muted); font-size: 12.5px; overflow-wrap: anywhere; }
  .qi .acts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
  @media (max-width: 640px) { .qi { grid-template-columns: auto minmax(0, 1fr); } .qi .acts { grid-column: 1 / -1; justify-content: flex-start; } }
  .empty { color: var(--muted); font-size: 13.5px; padding: 12px 16px; border: 1px dashed var(--line); border-radius: 10px; }

  /* buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border: 1px solid var(--line); border-radius: 6px; font: 500 12.5px var(--sans); color: var(--ink); background: var(--surface); cursor: pointer; text-decoration: none; white-space: nowrap; }
  .btn:hover { border-color: var(--accent); }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .btn.primary:hover { filter: brightness(1.08); }
  .btn.danger { color: var(--blocked); border-color: var(--blocked); background: var(--blocked-bg); }
  .btn:disabled { opacity: 0.6; cursor: progress; }

  /* panels */
  .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; min-width: 0; }
  .header-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; }
  .header-row h1 { flex: 1 1 auto; min-width: 0; }

  /* the board: dependency graph of story cards */
  .graph-wrap { overflow-x: auto; padding-bottom: 4px; }
  .graph { position: relative; }
  .graph svg { position: absolute; inset: 0; pointer-events: none; }
  .node { position: absolute; display: grid; gap: 1px; align-content: center; padding: 0 12px 0 15px; text-align: left; font: inherit; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 10px; box-shadow: inset 3px 0 0 var(--c); cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
  .node:hover { border-color: var(--c); }
  .node.active { border-color: var(--c); box-shadow: inset 3px 0 0 var(--c), 0 0 0 3px var(--cb); }
  .node.selected { border-color: var(--accent); box-shadow: inset 3px 0 0 var(--c), 0 0 0 2px var(--accent); }
  .node.waiting { opacity: 0.62; }
  .node.flash { animation: flash 2.4s ease-out 1; }
  @keyframes flash { 0% { box-shadow: inset 3px 0 0 var(--c), 0 0 0 6px var(--cb); } 100% { box-shadow: inset 3px 0 0 var(--c), 0 0 0 0 var(--cb); } }
  .node .row { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .node .id { font: 500 12px var(--mono); color: var(--muted); }
  .node .t { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .node .sub { font-size: 11.5px; color: var(--c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .node .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); animation: pulse 1.6s ease-in-out infinite; }
  .badge { margin-left: auto; padding: 0 7px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 18px; white-space: nowrap; color: var(--bc); background: var(--bb); }
  @media (prefers-reduced-motion: reduce) { .node .dot, .node.flash { animation: none; } }
  /* narrow screens: the same stories as a list, one group per dependency step */
  .dlist { display: none; gap: 14px; }
  .dlist .step { display: grid; gap: 6px; }
  .dlist .step h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--faint); }
  .dlist .node { position: static; width: 100%; min-height: 58px; }
  @media (max-width: 700px) { .graph-wrap { display: none; } .dlist { display: grid; } }

  /* drawer: one story's details and actions */
  .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 100vw); background: var(--surface); border-left: 1px solid var(--line); box-shadow: -12px 0 32px rgba(0, 0, 0, 0.18); padding: 18px 18px 28px; overflow: auto; display: grid; gap: 14px; align-content: start; z-index: 10; }
  .drawer[hidden] { display: none; }
  .drawer-head { display: flex; align-items: center; gap: 8px; }
  .drawer-head .x { margin-left: auto; }
  .drawer .card { border: 0; padding: 0 0 0 12px; }
  .drawer ol.timeline { max-height: none; }

  /* epic updates */
  .updates { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; font-size: 13px; }
  .updates li { display: grid; grid-template-columns: 58px auto minmax(0, 1fr); gap: 10px; align-items: baseline; padding: 6px 0; border-bottom: 1px solid var(--line); }
  .updates li:last-child { border-bottom: 0; }
  .updates time { font-family: var(--mono); color: var(--faint); font-size: 11.5px; }
  .updates span:last-child { overflow-wrap: anywhere; }
  .toasts { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); display: grid; gap: 8px; z-index: 20; }
  .toast { padding: 9px 14px; border-radius: 8px; background: var(--ink); color: var(--bg); font-size: 13px; font-weight: 500; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25); }

  /* story card (drawer) */
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px 11px 15px; display: grid; gap: 6px; box-shadow: inset 3px 0 0 var(--c); }
  .card-top { display: flex; align-items: baseline; gap: 8px; }
  .card-top .id { font-family: var(--mono); font-size: 12px; font-weight: 500; color: var(--muted); }
  .card-top .pr { margin-left: auto; font-family: var(--mono); font-size: 12px; }
  .card .t { font-weight: 600; line-height: 1.35; }
  .card .meta { font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
  .card .reason { font-size: 12px; color: var(--blocked); background: var(--blocked-bg); border-radius: 6px; padding: 5px 8px; overflow-wrap: anywhere; }
  .card .acts { display: flex; flex-wrap: wrap; gap: 6px; }
  .bar { height: 4px; border-radius: 2px; background: var(--panel); overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--c); }
  .preview { display: grid; gap: 8px; margin-top: 2px; padding: 8px 10px; border-radius: 8px; background: var(--panel); font-size: 12.5px; }
  .preview summary { cursor: pointer; font-size: 12.5px; font-weight: 500; color: var(--muted); list-style: none; }
  .preview summary:hover { color: var(--ink); }
  .preview summary::-webkit-details-marker { display: none; }
  .preview summary::before { content: "▸ "; }
  .preview details[open] summary::before { content: "▾ "; }
  .preview details[open] summary { margin-bottom: 6px; }
  .preview ul { margin: 0; padding-left: 16px; display: grid; gap: 4px; }
  .preview .chk { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--muted); }

  /* agent + timeline */
  .split { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 12px; }
  .split > .panel { align-content: start; }
  @media (max-width: 900px) { .split { grid-template-columns: minmax(0, 1fr); } }
  .panel-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-bottom: 10px; }
  .panel-head .name { font-family: var(--mono); font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
  pre { margin: 0; padding: 12px; background: var(--panel); border-radius: 8px; font: 12px/1.55 var(--mono); white-space: pre-wrap; word-break: break-word; max-height: 460px; overflow: auto; }
  .feed .tool { color: var(--accent); }
  .feed .err { color: var(--blocked); }
  .feed .done { color: var(--pr); }
  ol.timeline { list-style: none; margin: 0; padding: 0; max-height: 484px; overflow: auto; font-size: 13px; }
  ol.timeline li { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line); }
  ol.timeline li:last-child { border-bottom: 0; }
  ol.timeline time { font-family: var(--mono); color: var(--faint); font-size: 11.5px; padding-top: 1px; white-space: nowrap; }
  ol.timeline span { overflow-wrap: anywhere; }
</style>
</head>
<body>
<main>
  <header>
    <span class="eyebrow" id="eyebrow">epic loop</span>
    <div class="header-row"><h1 id="title">Epic loop</h1><span id="loopbtn"></span></div>
    <div class="status"><span class="pill" id="loopstate">Loading…</span><span id="next"></span><span id="updated"></span></div>
  </header>

  <div class="tiles" id="tiles"></div>

  <section aria-labelledby="h-queue">
    <div class="sec-head"><h2 id="h-queue">Waiting on you</h2><span class="count" id="queue-count"></span></div>
    <div id="queue"></div>
  </section>

  <section class="panel" aria-labelledby="h-graph">
    <div class="sec-head"><h2 id="h-graph">Stories</h2><span class="count">Click a story for its actions. Arrows point from a dependency to the stories that need it.</span></div>
    <div class="graph-wrap"><div class="graph" id="graph"></div></div>
    <div class="dlist" id="dlist"></div>
  </section>

  <section class="panel" aria-labelledby="h-updates">
    <h2 id="h-updates">Epic updates</h2>
    <ol class="updates" id="updates"></ol>
  </section>

  <div class="split">
    <section class="panel" aria-labelledby="h-agent">
      <div class="panel-head"><h2 id="h-agent">Agent</h2><span class="pill" id="agentstate" hidden></span><span class="name" id="agentname"></span></div>
      <pre class="feed" id="feed"></pre>
    </section>
    <section class="panel" aria-labelledby="h-timeline">
      <div class="panel-head"><h2 id="h-timeline">Loop timeline</h2></div>
      <ol class="timeline" id="timeline"></ol>
    </section>
  </div>
</main>
<aside class="drawer" id="drawer" hidden aria-labelledby="drawer-title"></aside>
<div class="toasts" id="toasts" aria-live="polite"></div>
<script>
const PHASES = [
  ['todo', 'To do', 'todo'], ['planning', 'Planning', 'planning'], ['awaiting-approval', 'Awaiting approval', 'approval'],
  ['implementing', 'Implementing', 'implementing'], ['reviewing', 'Review', 'reviewing'], ['pr-open', 'PR open', 'pr'],
  ['merged', 'Merged', 'merged'], ['blocked', 'Blocked', 'blocked'],
];
const ACTIVE = ['planning', 'awaiting-approval', 'implementing', 'reviewing', 'pr-open'];
const toneOf = (s) => (PHASES.find((p) => p[0] === s) || PHASES[0])[2];
const labelOf = (s) => (PHASES.find((p) => p[0] === s) || PHASES[0])[1];
const tone = (s) => '--c: var(--' + toneOf(s) + '); --cb: var(--' + toneOf(s) + '-bg)';
const toneVars = (name) => '--c: var(--' + name + '); --cb: var(--' + name + '-bg)';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (id) => document.getElementById(id);
let repoUrl = '';
let previewEnabled = false;
const starting = new Set();
const openPreviews = new Set(); // which cards have their checklist open, kept across refreshes
let selected = null; // story id shown in the drawer
let last = null; // latest /api/state, for re-rendering the drawer on click
const seenStatus = {}; // id → status at the previous refresh, to flash stories that just merged
let seenProgress = null; // timestamp of the newest progress line already toasted

const prLink = (s) => s.pr ? (repoUrl ? '<a href="' + esc(repoUrl) + '/pull/' + s.pr + '" target="_blank" rel="noreferrer">#' + s.pr + '</a>' : '#' + s.pr) : '';
const btn = (cls, attrs, label, title) => '<button class="btn ' + cls + '" ' + attrs + (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(label) + '</button>';
const approveBtn = (s) => btn('primary', 'data-approve="' + esc(s.id) + '"', 'Approve plan');
const startBtn = (s) => btn('primary', 'data-run="start" data-id="' + esc(s.id) + '"', 'Start planning', 'Runs epic-loop --story ' + s.id + ': plan, then wait for your approval');
const sessionBtn = (s, label) => btn('', 'data-session="' + esc(s.id) + '"', label || 'Open session', 'Open the ' + s.session.phase + ' chat in Paseo to read it or talk to it');
const releaseBtn = (s) => btn('primary', 'data-release="' + esc(s.id) + '"', 'Release', 'Done talking: the loop runs its checks and moves on');
const retryBtn = (s) => btn('danger', 'data-run="retry" data-id="' + esc(s.id) + '"', 'Retry → ' + labelOf(s.retryAt).toLowerCase(), 'Reset attempts and run epic-loop --story ' + s.id);

function previewRoutes(s) {
  const p = s.preview;
  const nothing = !p.routes.length && /^none\b/i.test(p.note);
  const routes = p.routes.length ? p.routes : [{ path: '/', check: nothing ? '' : p.note || 'the review agent listed no routes' }];
  return { nothing, routes, note: p.note.replace(/^none\s*[—–:-]*\s*/i, '') };
}
function previewBtns(s) {
  if (starting.has(s.id)) return '<button class="btn primary" disabled>Starting dev server…</button>';
  const { routes } = previewRoutes(s);
  const open = btn('primary', 'data-preview="' + esc(s.id) + '" data-path="' + esc(routes[0].path) + '"', s.preview.url ? 'Open preview' : 'Preview');
  return open + (s.preview.url ? btn('', 'data-preview-stop="' + esc(s.id) + '"', 'Stop') : '');
}

// Review and PR open: the review agent's routes to check, and the buttons that run the story's dev server.
function previewBlock(s) {
  if (!previewEnabled || !['reviewing', 'pr-open'].includes(s.status)) return '';
  const { nothing, routes, note } = previewRoutes(s);
  const items = nothing
    ? '<li class="muted">Nothing to see in the app: ' + esc(note) + '</li>'
    : routes.map((r) => '<li>' + (s.preview.url ? '<a href="' + esc(s.preview.url + r.path) + '" target="_blank" rel="noreferrer"><code>' + esc(r.path) + '</code></a>' : '<code>' + esc(r.path) + '</code>') + (r.check ? '<div class="chk" title="' + esc(r.check) + '">' + esc(r.check) + '</div>' : '') + '</li>').join('');
  const count = nothing ? 'nothing to see' : routes.length + (routes.length === 1 ? ' route' : ' routes');
  return '<div class="preview"><details data-preview-for="' + esc(s.id) + '"' + (openPreviews.has(s.id) ? ' open' : '') + '><summary>What to check · ' + count + '</summary><ul>' + items + '</ul></details>' +
    '<div class="acts">' + previewBtns(s) + '</div></div>';
}

function card(s) {
  const pct = s.cycles ? Math.round((s.cycles.done / s.cycles.total) * 100) : 0;
  const meta = [];
  if (s.status === 'todo' && s.dependsOn.length) meta.push('needs ' + s.dependsOn.join(', '));
  if (s.blockedBy) meta.push('blocked by ' + s.blockedBy);
  if (s.cycles) meta.push('cycle ' + s.cycles.done + '/' + s.cycles.total);
  if (s.attempts) meta.push('attempt ' + (s.attempts + 1));
  if (s.loopPid && ['todo', 'blocked'].includes(s.status)) meta.push('loop pid ' + s.loopPid);
  if (s.session && s.session.held) meta.push(s.session.phase + ' held for you');
  else if (s.session && s.session.live) meta.push(s.session.phase + ' session live');
  const acts = [];
  if (s.session) acts.push(sessionBtn(s));
  if (s.session && s.session.held) acts.push(releaseBtn(s));
  if (s.planFile && s.status === 'awaiting-approval') acts.push(approveBtn(s));
  if (s.ready && !s.loopPid) acts.push(startBtn(s));
  if (s.retryAt && !s.loopPid) acts.push(retryBtn(s));
  return '<article class="card" style="' + tone(s.status) + '">' +
    '<div class="card-top"><span class="id">' + esc(s.id) + '</span><span class="pr">' + prLink(s) + '</span></div>' +
    '<div class="t">' + esc(s.title) + '</div>' +
    (meta.length ? '<div class="meta">' + esc(meta.join(' · ')) + '</div>' : '') +
    (s.blockedReason && s.status === 'blocked' ? '<div class="reason">' + esc(s.blockedReason) + '</div>' : '') +
    (s.planFile && s.status === 'awaiting-approval' ? '<div class="meta">plan: <code>' + esc(s.planFile) + '</code></div>' : '') +
    (s.cycles ? '<div class="bar"><i style="width:' + pct + '%"></i></div>' : '') +
    (acts.length ? '<div class="acts">' + acts.join('') + '</div>' : '') +
    previewBlock(s) + '</article>';
}

// What only a human can move along: plans to approve, PRs to try and merge, blocked stories.
function queue(stories) {
  const items = [];
  for (const s of stories) {
    if (s.session && s.session.held) items.push([s, 'Waiting on you in the ' + s.session.phase + ' session', 'Release when you are done talking to it', sessionBtn(s) + releaseBtn(s)]);
    if (s.status === 'awaiting-approval') items.push([s, 'Plan ready for review', s.planFile ? '<code>' + esc(s.planFile) + '</code>' : '', (s.session ? sessionBtn(s, 'Ask the planner') : '') + approveBtn(s)]);
    if (s.status === 'pr-open') {
      const { nothing, routes } = previewRoutes(s);
      const hint = nothing ? 'Nothing to see in the app' : routes.map((r) => r.path).join(', ');
      items.push([s, 'PR ' + (s.pr ? '#' + s.pr + ' ' : '') + 'ready to merge on GitHub', esc(hint), (previewEnabled ? previewBtns(s) : '') + (s.pr && repoUrl ? '<a class="btn" href="' + esc(repoUrl) + '/pull/' + s.pr + '" target="_blank" rel="noreferrer">Open PR</a>' : '')]);
    }
    if (s.status === 'blocked') items.push([s, 'Blocked', esc(s.blockedReason || 'no reason recorded'), s.retryAt && !s.loopPid ? retryBtn(s) : '']);
  }
  $('queue-count').textContent = items.length ? items.length + (items.length === 1 ? ' item' : ' items') : '';
  if (!items.length) return '<div class="empty">Nothing needs you right now. The loop will notify you when a plan or PR is ready.</div>';
  return '<div class="queue">' + items.map(([s, what, detail, acts]) =>
    '<div class="qi" style="' + tone(s.status) + '"><button class="pill" data-select="' + esc(s.id) + '" style="' + tone(s.status) + '; border: 0; cursor: pointer">' + esc(s.id) + '</button>' +
    '<div class="what"><b>' + esc(what) + ' · ' + esc(s.title) + '</b>' + (detail ? '<span>' + detail + '</span>' : '') + '</div>' +
    '<div class="acts">' + acts + '</div></div>').join('') + '</div>';
}

function tiles(stories) {
  const n = (f) => stories.filter(f).length;
  const total = stories.length, merged = n((s) => s.status === 'merged');
  const active = stories.filter((s) => ACTIVE.includes(s.status));
  const stuck = n((s) => s.status === 'blocked'), external = n((s) => s.status === 'todo' && s.blockedBy);
  const ready = n((s) => s.ready);
  const seg = PHASES.filter(([k]) => k !== 'todo').map(([k, , t]) => [n((s) => s.status === k), t]).filter(([c]) => c);
  const tile = (k, big, sub, extra) => '<div class="tile"><div class="tile-top"><span class="k">' + k + '</span><span class="big">' + big + '</span></div>' + (extra || '') + '<span class="sub" title="' + esc(sub) + '">' + sub + '</span></div>';
  return tile('Progress', merged + '<small>/' + total + '</small>', total ? Math.round((merged / total) * 100) + '% merged' : 'no stories',
      '<div class="track">' + seg.map(([c, t]) => '<i style="width:' + (c / total) * 100 + '%; background: var(--' + t + ')"></i>').join('') + '</div>') +
    tile('In progress', String(active.length), active.length ? active.map((s) => esc(s.id) + ' ' + labelOf(s.status).toLowerCase()).join(' · ') : 'nothing running') +
    tile('Ready to start', String(ready), ready ? 'dependencies merged' : 'waiting on dependencies') +
    tile('Blocked', String(stuck + external), [stuck ? stuck + ' by the loop' : '', external ? external + ' waiting on an outside dependency' : ''].filter(Boolean).join(' · ') || 'nothing blocked');
}

// Columns are dependency depth. Within a column, stories sit near the stories they depend on
// (mean row of their dependencies), which keeps arrows short and mostly uncrossed.
function layout(stories) {
  const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
  const depth = {};
  const d = (id, seen = new Set()) => {
    if (depth[id] !== undefined) return depth[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const deps = byId[id].dependsOn.filter((x) => byId[x]);
    return (depth[id] = deps.length ? 1 + Math.max(...deps.map((x) => d(x, seen))) : 0);
  };
  stories.forEach((s) => d(s.id));
  const cols = [];
  stories.forEach((s) => (cols[depth[s.id]] ||= []).push(s));
  const row = {};
  cols.forEach((col, ci) => {
    if (ci > 0) {
      const key = (s) => { const r = s.dependsOn.filter((x) => row[x] !== undefined).map((x) => row[x]); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : Infinity; };
      col.sort((a, b) => key(a) - key(b));
    }
    col.forEach((s, ri) => (row[s.id] = ri));
  });
  return { byId, cols };
}

// What a story needs from you, as a short badge on its node.
function badgeOf(s) {
  if (s.session && s.session.held) return ['Your turn', 'approval'];
  if (s.status === 'awaiting-approval') return ['Approve plan', 'approval'];
  if (s.status === 'pr-open') return ['Merge', 'pr'];
  if (s.status === 'blocked') return ['Blocked', 'blocked'];
  if (s.ready && !s.loopPid) return ['Ready', 'planning'];
  return null;
}
const running = (s) => ACTIVE.includes(s.status) && s.status !== 'awaiting-approval' && s.status !== 'pr-open' && Boolean(s.loopPid || (s.session && s.session.live));

function node(s, activeId, style) {
  const sub = s.status === 'todo' && s.blockedBy ? 'blocked by ' + s.blockedBy
    : s.status === 'todo' && !s.ready && s.dependsOn.length ? 'waiting on ' + s.dependsOn.join(', ')
    : labelOf(s.status) + (s.cycles ? ' · ' + s.cycles.done + '/' + s.cycles.total : '') + (s.pr ? ' · #' + s.pr : '');
  const b = badgeOf(s);
  const cls = ['node', s.id === activeId ? 'active' : '', s.id === selected ? 'selected' : '', s.status === 'todo' && !s.ready ? 'waiting' : '',
    seenStatus[s.id] && seenStatus[s.id] !== 'merged' && s.status === 'merged' ? 'flash' : ''].filter(Boolean).join(' ');
  return '<button class="' + cls + '" data-select="' + esc(s.id) + '" style="' + tone(s.status) + (style || '') + '" title="' + esc(s.id + ' — ' + s.title) + '">' +
    '<span class="row"><span class="id">' + esc(s.id) + '</span>' + (running(s) ? '<span class="dot" title="Agent working"></span>' : '') +
    (b ? '<span class="badge" style="--bc: var(--' + b[1] + '); --bb: var(--' + b[1] + '-bg)">' + b[0] + '</span>' : '') + '</span>' +
    '<span class="t">' + esc(s.title) + '</span><span class="sub">' + esc(sub) + '</span></button>';
}

function graph(stories, activeId) {
  const { byId, cols } = layout(stories);
  const W = 230, H = 66, GX = 72, GY = 14, P = 8;
  const pos = {};
  cols.forEach((col, ci) => col.forEach((s, ri) => (pos[s.id] = { x: P + ci * (W + GX), y: P + ri * (H + GY) })));
  const width = P * 2 + cols.length * W + (cols.length - 1) * GX;
  const height = P * 2 + Math.max(...cols.map((c) => c.length)) * (H + GY) - GY;
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue('--' + name).trim();
  let edges = '';
  stories.forEach((s) => s.dependsOn.filter((x) => pos[x]).forEach((x) => {
    const a = pos[x], b = pos[s.id];
    const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x - 7, y2 = b.y + H / 2, mx = x1 + GX / 2;
    const done = byId[x].status === 'merged';
    // Red when either end failed: the story it feeds is blocked, or the dependency holding it up is.
    const failed = s.status === 'blocked' || byId[x].status === 'blocked';
    const hot = selected && (selected === s.id || selected === x);
    const color = hot ? v('accent') : failed ? v('blocked') : done ? v('merged') : v('faint');
    const marker = hot ? 'arrow-hot' : failed ? 'arrow-failed' : done ? 'arrow-done' : 'arrow';
    edges += '<path d="M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + (x2 - GX / 2) + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="' + color + '" stroke-width="' + (hot || failed ? 2 : 1.5) + '"' + (done || hot || failed ? '' : ' stroke-dasharray="4 4"') + ' marker-end="url(#' + marker + ')"/>';
  }));
  const marker = (id, color) => '<marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="' + color + '"/></marker>';
  const nodes = stories.map((s) => node(s, activeId, '; left: ' + pos[s.id].x + 'px; top: ' + pos[s.id].y + 'px; width: ' + W + 'px; height: ' + H + 'px')).join('');
  return { width, height, html: '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true">' +
    '<defs>' + marker('arrow', v('faint')) + marker('arrow-done', v('merged')) + marker('arrow-failed', v('blocked')) + marker('arrow-hot', v('accent')) + '</defs>' + edges + '</svg>' + nodes };
}

function depList(stories, activeId) {
  return layout(stories).cols.map((col, ci) => '<div class="step"><h3>' + (ci ? 'Step ' + (ci + 1) + ' · after step ' + ci : 'Step 1 · no dependencies') + '</h3>' +
    col.map((s) => node(s, activeId)).join('') + '</div>').join('');
}

// Milestones only: what moved the epic forward or needs a person.
const MILESTONE = /: (PR #\d+ merged|PR opened|plan ready for review|plan approved|blocked —|filed|started on|started \(dashboard\)|started \(parallel|stopped \(dashboard\)|retried)/;
const milestoneText = (t) => t.replace(/ — [^ ]+\.md\. Approve with --approve \S+$/, '').replace(/^(\S+): PR opened (\S+\/pull\/(\d+))$/, '$1: PR #$3 opened');
function updates(progress) {
  const items = progress.filter((p) => MILESTONE.test(p.text)).slice(-8).reverse();
  if (!items.length) return '<li class="muted"><span></span><span></span><span>No milestones yet. Start the epic to begin.</span></li>';
  return items.map((p) => {
    const [who, ...rest] = milestoneText(p.text).split(': ');
    const t = /merged/.test(p.text) ? 'merged' : /blocked/.test(p.text) ? 'blocked' : /plan ready|filed/.test(p.text) ? 'approval' : /PR/.test(p.text) ? 'pr' : 'todo';
    const when = new Date(p.at);
    const label = when.toDateString() === new Date().toDateString() ? when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : when.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return '<li><time title="' + esc(when.toLocaleString()) + '">' + esc(label) + '</time><span class="pill" style="' + toneVars(t) + '">' + esc(who) + '</span><span>' + esc(rest.join(': ')) + '</span></li>';
  }).join('');
}

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

function drawer(st) {
  const el = $('drawer');
  const s = selected && st.stories.find((x) => x.id === selected);
  if (!s) { el.hidden = true; return; }
  const deps = s.dependsOn.map((x) => { const d = st.stories.find((y) => y.id === x); return d ? '<button class="btn" data-select="' + esc(d.id) + '" style="' + tone(d.status) + '">' + esc(d.id) + ' · ' + labelOf(d.status) + '</button>' : esc(x); }).join(' ');
  const needed = st.stories.filter((x) => x.dependsOn.includes(s.id)).map((d) => '<button class="btn" data-select="' + esc(d.id) + '">' + esc(d.id) + '</button>').join(' ');
  const history = st.progress.filter((p) => p.text.startsWith(s.id + ':')).slice(-12).reverse();
  const keepScroll = el.scrollTop;
  el.innerHTML = '<div class="drawer-head"><span class="pill" style="' + tone(s.status) + '">' + labelOf(s.status) + '</span><h2 id="drawer-title">' + esc(s.id) + '</h2>' +
    btn('x', 'data-close', 'Close', 'Esc') + '</div>' + card(s) +
    (s.discoveredFrom ? '<div class="meta"><h2 style="margin-bottom: 6px">Found while working on</h2><button class="btn" data-select="' + esc(s.discoveredFrom) + '">' + esc(s.discoveredFrom) + '</button></div>' : '') +
    (deps ? '<div class="meta"><h2 style="margin-bottom: 6px">Depends on</h2>' + deps + '</div>' : '') +
    (needed ? '<div class="meta"><h2 style="margin-bottom: 6px">Needed by</h2>' + needed + '</div>' : '') +
    '<div><h2 style="margin-bottom: 6px">History</h2><ol class="timeline">' + (history.length ? history.map((p) =>
      '<li><time>' + esc(new Date(p.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) + '</time><span>' + esc(p.text.slice(s.id.length + 2)) + '</span></li>').join('') : '<li class="muted"><span></span><span>Nothing yet.</span></li>') + '</ol></div>';
  el.hidden = false;
  el.scrollTop = keepScroll;
}

function loopButton(st) {
  if (st.loop.pid) return btn('', 'data-loop="stop"', 'Stop epic', 'Stop the epic loop (pid ' + st.loop.pid + '). Story loops started from a story keep running.');
  const left = st.stories.filter((s) => s.status !== 'merged').length;
  return left ? btn('primary', 'data-loop="start"', 'Start epic', 'Run the epic loop: each ready story in turn. It still waits for you to approve each plan and merge each PR.') : '';
}

function render(st) {
  const activeId = st.next.story;
  $('tiles').innerHTML = tiles(st.stories);
  $('queue').innerHTML = queue(st.stories);
  const g = graph(st.stories, activeId);
  const box = $('graph');
  box.style.width = g.width + 'px';
  box.style.height = g.height + 'px';
  box.innerHTML = g.html;
  $('dlist').innerHTML = depList(st.stories, activeId);
  $('updates').innerHTML = updates(st.progress);
  $('loopbtn').innerHTML = loopButton(st);
  drawer(st);
}

function feedLine(l) {
  const e = esc(l);
  if (l.startsWith('→')) return '<span class="tool">' + e + '</span>';
  if (l.trim().startsWith('✗')) return '<span class="err">' + e + '</span>';
  if (l.startsWith('agent finished') || l.startsWith('--- exit 0')) return '<span class="done">' + e + '</span>';
  return e;
}

function setPill(el, text, toneName, live) {
  el.hidden = false;
  el.textContent = text;
  el.setAttribute('style', toneVars(toneName));
  el.classList.toggle('live', Boolean(live));
}

async function refresh() {
  let st;
  try { st = await (await fetch('/api/state')).json(); } catch { setPill($('loopstate'), 'Dashboard server stopped', 'blocked'); return; }
  if (st.error) { $('next').textContent = st.error; return; }
  last = st;
  previewEnabled = st.previewEnabled;
  $('eyebrow').textContent = st.epic.dir || 'epic loop';
  $('title').textContent = (st.epic.id ? st.epic.id + ' · ' : '') + (st.epic.title || 'Epic loop');
  document.title = 'Epic loop · ' + (st.epic.id || '');
  setPill($('loopstate'), st.loop.pid ? 'Epic running · pid ' + st.loop.pid : 'Epic stopped', st.loop.pid ? 'pr' : 'todo', st.loop.pid);
  $('next').textContent = 'Next: ' + st.next.reason;
  $('updated').textContent = 'Updated ' + new Date(st.now).toLocaleTimeString();
  render(st);
  // Toast merges (and other milestones) that happened since the last refresh, not the backlog on load.
  if (seenProgress !== null) st.progress.filter((p) => p.at > seenProgress && MILESTONE.test(p.text) && /merged|plan ready|blocked|filed/.test(p.text)).forEach((p) => toast(milestoneText(p.text)));
  seenProgress = st.progress.length ? st.progress[st.progress.length - 1].at : '';
  st.stories.forEach((s) => (seenStatus[s.id] = s.status));
  const feed = $('feed');
  const atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 40;
  if (st.agent) {
    setPill($('agentstate'), st.agent.running ? 'Running' : 'Finished', st.agent.running ? 'implementing' : 'todo', st.agent.running);
    $('agentname').textContent = st.agent.name;
    feed.innerHTML = st.agent.lines.map(feedLine).join('\n');
  } else {
    feed.textContent = 'No agent has run yet.';
  }
  if (atBottom) feed.scrollTop = feed.scrollHeight;
  $('timeline').innerHTML = st.progress.slice().reverse().map((p) =>
    '<li><time>' + esc(new Date(p.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) + '</time><span>' + esc(p.text) + '</span></li>').join('');
}

document.addEventListener('toggle', (e) => {
  const id = e.target.getAttribute && e.target.getAttribute('data-preview-for');
  if (id) e.target.open ? openPreviews.add(id) : openPreviews.delete(id);
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) { selected = null; if (last) render(last); }
});

document.addEventListener('click', async (e) => {
  const target = e.target.closest && e.target.closest('button');
  if (!target) return;
  const attr = (name) => target.getAttribute(name);
  const pick = attr('data-select');
  if (pick || target.hasAttribute('data-close')) {
    selected = pick && pick !== selected ? pick : null;
    if (last) render(last);
    return;
  }
  const loopAction = attr('data-loop');
  if (loopAction) {
    if (loopAction === 'stop' && !confirm('Stop the epic loop? Its running agent is stopped too; the story picks up where it left off next start.')) return;
    target.disabled = true;
    target.textContent = loopAction === 'start' ? 'Starting…' : 'Stopping…';
    const r = await fetch('/api/loop/' + loopAction, { method: 'POST' });
    if (!r.ok) alert((await r.json()).error);
    return refresh();
  }
  const stopId = attr('data-preview-stop');
  if (stopId) {
    await fetch('/api/preview/' + encodeURIComponent(stopId) + '/stop', { method: 'POST' });
    return refresh();
  }
  const sessionId = attr('data-session') || attr('data-release');
  if (sessionId) {
    const r = await fetch('/api/' + (attr('data-session') ? 'session' : 'release') + '/' + encodeURIComponent(sessionId), { method: 'POST' });
    if (!r.ok) alert(sessionId + ': ' + (await r.json()).error);
    return refresh();
  }
  const runAction = attr('data-run');
  if (runAction) {
    const runId = attr('data-id');
    target.disabled = true;
    target.textContent = runAction === 'start' ? 'Starting…' : 'Retrying…';
    const r = await fetch('/api/' + runAction + '/' + encodeURIComponent(runId), { method: 'POST' });
    if (!r.ok) alert(runId + ': ' + (await r.json()).error);
    return refresh();
  }
  const previewId = attr('data-preview');
  if (previewId) {
    // Open the tab inside the click so the browser doesn't block it, then point it at the server once it answers.
    const tab = window.open('about:blank', '_blank');
    starting.add(previewId);
    refresh();
    const r = await fetch('/api/preview/' + encodeURIComponent(previewId), { method: 'POST' });
    const body = await r.json();
    starting.delete(previewId);
    if (r.ok && tab) tab.location.href = body.url + attr('data-path');
    else if (tab) tab.close();
    if (!r.ok) alert('Preview failed: ' + body.error);
    return refresh();
  }
  const id = attr('data-approve');
  if (!id) return;
  target.disabled = true;
  target.textContent = 'Approving…';
  const r = await fetch('/api/approve/' + encodeURIComponent(id), { method: 'POST' });
  if (!r.ok) target.textContent = (await r.json()).error;
  refresh();
});

fetch('/repo').then((r) => r.ok ? r.text() : '').then((u) => { repoUrl = u.trim(); }).catch(() => {});
refresh();
setInterval(refresh, 2000);
</script>
</body>
</html>`;

/**
 * Runner for the Orchestrator Paseo plugin's Harness plan board (set this file as its Runner).
 * The plugin picks the epic, so this takes it directly instead of reading epicLoop.epic.
 * @param {{ root: string; epicDir: string }} opts
 */
function createHarnessRunner({ root, epicDir }) {
	const config = readOptionalConfig(root);
	const loopDir = path.join(harnessDir(root), 'epic-loop');
	const actions = createEpicActions({ root, epicDir: path.resolve(root, epicDir), loopDir, preview: config?.epicLoop?.preview ?? null, config });
	return {
		state: actions.state,
		act: actions.act,
		stop: () => actions.previews.stopAll(),
		reset: () => fs.rmSync(loopDir, { recursive: true, force: true }),
	};
}

module.exports = { launchStoryLoop, createEpicActions, createHarnessRunner, epicDashboardOptions, readDashboardState, startDashboard };
