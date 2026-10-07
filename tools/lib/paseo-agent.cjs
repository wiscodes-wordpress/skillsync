/**
 * Run one epic-loop phase as a Paseo agent (Claude Code provider), so each phase is a chat you
 * can open in the Paseo app (desktop or phone), read while it works, and talk to.
 *
 * What `claude -p` got from flags, the Paseo agent gets from the worktree's
 * `.claude/settings.local.json` (`paseo run` cannot pass Claude flags): git commit/push denied,
 * routine tools allowed, the skillsync and epic folders readable. That file is git-excluded so
 * it never reaches a commit, and is put back as it was when the checkout isn't the loop's own.
 *
 * Talking to a session: the loop notices a message that it did not send (Paseo's
 * `lastUserMessageAt` is later than the loop's own send). From then on an idle agent is not
 * "finished": the loop waits until the phase's own check passes (`ready`) or you release the
 * story (`released`), and the phase timeout no longer applies.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { gitExclude } = require('./ss-tools.cjs');

const SETTINGS_FILE = path.join('.claude', 'settings.local.json');
const APP_BIN = '/Applications/Paseo.app/Contents/Resources/bin/paseo';
/** A message this long after the loop's own send counts as yours (Paseo stamps the loop's a few ms late). */
const HUMAN_GRACE_MS = 2000;
/** Agent statuses that mean the current turn is over. */
const SETTLED = ['idle', 'error', 'closed'];

/**
 * `epicLoop.agent.paseo`, else `paseo` on PATH, else the CLI bundled with Paseo.app.
 * @param {Record<string, any> | null} config
 * @returns {string}
 */
function paseoBin(config) {
	const custom = config?.epicLoop?.agent?.paseo;
	if (typeof custom === 'string' && custom.trim()) return custom.trim();
	if (spawnSync('paseo', ['--version'], { encoding: 'utf8' }).status === 0) return 'paseo';
	return fs.existsSync(APP_BIN) ? APP_BIN : 'paseo';
}

/**
 * @param {string} bin
 * @param {string[]} args
 * @param {{ cwd?: string; timeoutMs?: number }} [opts]
 */
function paseo(bin, args, opts = {}) {
	const res = spawnSync(bin, args, { cwd: opts.cwd, encoding: 'utf8', timeout: opts.timeoutMs ?? 120_000 });
	return { status: res.status ?? 1, stdout: String(res.stdout ?? ''), stderr: String(res.stderr ?? res.error ?? '') };
}

/** The CLI can print launcher noise before its JSON. @param {string} text @returns {any} */
function parseJson(text) {
	const start = text.search(/[[{]/);
	if (start < 0) return null;
	try {
		return JSON.parse(text.slice(start));
	} catch {
		return null;
	}
}

/**
 * @param {string} bin
 * @returns {{ ok: boolean; reason: string }}
 */
function paseoStatus(bin) {
	const res = paseo(bin, ['status', '--json'], { timeoutMs: 20_000 });
	const status = parseJson(res.stdout);
	if (res.status !== 0 || !status) return { ok: false, reason: `paseo status failed: ${(res.stderr || res.stdout).trim().slice(-200) || `exit ${res.status}`}` };
	if (status.localDaemon !== 'running') return { ok: false, reason: `Paseo daemon is ${status.localDaemon ?? 'not running'}` };
	const claude = (status.providers ?? []).find((/** @type {any} */ p) => p.provider === 'claude');
	if (claude && !claude.available) return { ok: false, reason: `Paseo's claude provider is unavailable: ${claude.error ?? 'no reason given'}` };
	return { ok: true, reason: '' };
}

/**
 * Merge the loop's permission rules into `<cwd>/.claude/settings.local.json`.
 *
 * @param {string} cwd
 * @param {{ allow: string[]; deny: string[]; dirs: string[] }} rules
 * @returns {string | null} the file's previous contents, or null when it did not exist
 */
function writeAgentSettings(cwd, rules) {
	const file = path.join(cwd, SETTINGS_FILE);
	const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
	/** @type {any} */
	let settings = {};
	try {
		settings = before ? JSON.parse(before) : {};
	} catch {
		settings = {};
	}
	const perms = settings.permissions ?? {};
	const union = (/** @type {unknown} */ a, /** @type {string[]} */ b) => [...new Set([...(Array.isArray(a) ? a : []), ...b])];
	settings.permissions = {
		...perms,
		allow: union(perms.allow, rules.allow),
		deny: union(perms.deny, rules.deny),
		additionalDirectories: union(perms.additionalDirectories, rules.dirs),
	};
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
	gitExclude(cwd, '.claude/settings.local.json');
	return before;
}

/** @param {string} cwd @param {string | null} before */
function restoreAgentSettings(cwd, before) {
	const file = path.join(cwd, SETTINGS_FILE);
	if (before === null) fs.rmSync(file, { force: true });
	else fs.writeFileSync(file, before, 'utf8');
}

/**
 * When you last messaged the agent, from Paseo's agent record. The CLI does not expose it, so
 * this reads `$PASEO_HOME/agents/<workspace>/<id>.json`; null when that can't be found.
 *
 * @param {string} id
 * @returns {number | null} epoch ms
 */
function lastUserMessageAt(id) {
	const agentsDir = path.join(process.env.PASEO_HOME || path.join(os.homedir(), '.paseo'), 'agents');
	if (!fs.existsSync(agentsDir)) return null;
	for (const dir of fs.readdirSync(agentsDir)) {
		const file = path.join(agentsDir, dir, `${id}.json`);
		if (!fs.existsSync(file)) continue;
		try {
			const at = Date.parse(JSON.parse(fs.readFileSync(file, 'utf8')).lastUserMessageAt);
			return Number.isNaN(at) ? null : at;
		} catch {
			return null;
		}
	}
	return null;
}

/**
 * @param {string} bin @param {string} id @param {string} cwd
 * @returns {{ status: string; pending: number; archived: boolean } | null}
 */
function inspectAgent(bin, id, cwd) {
	const res = paseo(bin, ['inspect', id, '--json'], { cwd, timeoutMs: 30_000 });
	const info = res.status === 0 ? parseJson(res.stdout) : null;
	if (!info) return null;
	return {
		status: String(info.Status ?? info.status ?? '').toLowerCase(),
		pending: (info.PendingPermissions ?? info.pendingPermissions ?? []).length,
		archived: Boolean(info.Archived ?? info.archived),
	};
}

/**
 * Append the part of the agent's transcript not yet in the log. `paseo logs` prints whole,
 * merged entries (`logs -f` streams token fragments), so each snapshot normally extends the
 * last one; when it doesn't (an entry was rewritten), the changed tail is appended again.
 *
 * @param {string} bin @param {string} id @param {string} cwd @param {number} fd
 * @param {{ written: string }} mirror
 */
function syncTranscript(bin, id, cwd, fd, mirror) {
	const res = paseo(bin, ['logs', id], { cwd, timeoutMs: 30_000 });
	if (res.status !== 0) return;
	const now = res.stdout;
	let common = 0;
	while (common < mirror.written.length && common < now.length && mirror.written[common] === now[common]) common++;
	if (common === now.length) return;
	const lineStart = now.lastIndexOf('\n', common - 1) + 1;
	fs.writeSync(fd, common === mirror.written.length ? now.slice(common) : `\n${now.slice(lineStart)}`);
	mirror.written = now;
}

/** @param {number} ms */
function sleep(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * @typedef {object} PaseoRunOpts
 * @property {string} bin
 * @property {string} cwd
 * @property {string} prompt
 * @property {string} logFile
 * @property {string | null} model
 * @property {string} mode Claude permission mode in Paseo (`auto`)
 * @property {number} timeoutMin applies only until you message the agent
 * @property {{ allow: string[]; deny: string[]; dirs: string[] }} rules
 * @property {string} [title]
 * @property {Record<string, string>} [labels]
 * @property {boolean} [ownsCwd] a loop worktree: leave the settings file for later phases and chats
 * @property {{ id: string; sentAt: number } | null} [resume] reattach to this agent instead of starting one
 * @property {() => boolean} [ready] the phase's own check; ends a session you have talked to
 * @property {() => boolean} [released] you said you are done with the session
 * @property {(session: { id: string; sentAt: number }) => void} [onSession]
 * @property {(held: boolean) => void} [onHold]
 * @property {(reason: string) => void} [onAttention]
 * @property {number} [pollMs] wait between checks while held (default 5s)
 * @property {number} [waitSec] how long each `paseo wait` blocks, and how often the log catches up (default 10s)
 */

/**
 * @param {PaseoRunOpts} opts
 * @returns {string[]}
 */
function runArgs(opts) {
	return [
		'run',
		'-d',
		'--json',
		'--provider',
		'claude',
		'--mode',
		opts.mode,
		...(opts.model ? ['--model', opts.model] : []),
		...(opts.title ? ['--title', opts.title] : []),
		...Object.entries(opts.labels ?? {}).flatMap(([k, v]) => ['--label', `${k}=${v}`]),
		'--cwd',
		opts.cwd,
		opts.prompt,
	];
}

/** The command as logged (prompt left out: it is in the log already). @param {PaseoRunOpts} opts */
function describeRun(opts) {
	return [opts.bin === APP_BIN ? 'paseo' : opts.bin, ...runArgs(opts).slice(0, -1), '<prompt>'].join(' ');
}

/**
 * @param {PaseoRunOpts} opts
 * @returns {{ status: number; agentId: string; intervened: boolean }}
 */
function runPaseoAgent(opts) {
	const before = writeAgentSettings(opts.cwd, opts.rules);
	const mirror = { written: '' };
	let agentId = '';
	let human = false;
	let status = 1;
	const fd = fs.openSync(opts.logFile, 'a');
	try {
		let sentAt = 0;
		const prior = opts.resume ? inspectAgent(opts.bin, opts.resume.id, opts.cwd) : null;
		if (opts.resume && prior && !prior.archived && prior.status !== 'error') {
			({ id: agentId, sentAt } = opts.resume);
			fs.writeSync(fd, `--- reattached to Paseo agent ${agentId} ---\n`);
		} else {
			const res = paseo(opts.bin, runArgs(opts), { cwd: opts.cwd });
			agentId = String(parseJson(res.stdout)?.agentId ?? '');
			if (!agentId) {
				fs.writeSync(fd, `paseo run failed (exit ${res.status}): ${(res.stderr || res.stdout).trim().slice(-500)}\n`);
				return { status: 1, agentId: '', intervened: false };
			}
			sentAt = Date.now();
			fs.writeSync(fd, `--- Paseo agent ${agentId} ---\n`);
		}
		opts.onSession?.({ id: agentId, sentAt });

		const deadline = Date.now() + opts.timeoutMin * 60_000;
		let held = false;
		let asked = false;
		for (;;) {
			paseo(opts.bin, ['wait', agentId, '--timeout', String(opts.waitSec ?? 10), '--json'], { cwd: opts.cwd, timeoutMs: ((opts.waitSec ?? 10) + 30) * 1000 });
			// The log feeds --tail and the dashboard; the live view is the chat in Paseo.
			syncTranscript(opts.bin, agentId, opts.cwd, fd, mirror);
			const info = inspectAgent(opts.bin, agentId, opts.cwd);
			if (!info) {
				fs.writeSync(fd, `\nPaseo agent ${agentId} is gone (deleted or daemon down)\n`);
				return { status: 1, agentId, intervened: human };
			}
			human = human || (lastUserMessageAt(agentId) ?? 0) > sentAt + HUMAN_GRACE_MS;
			if (info.pending > 0 && !asked) {
				asked = true;
				opts.onAttention?.(`${info.pending} permission request${info.pending > 1 ? 's' : ''} waiting in Paseo`);
			}
			if (info.pending === 0) asked = false;
			// Anything but a settled status (running, starting, …) means it is still working.
			if (!SETTLED.includes(info.status) || info.pending > 0) {
				// Nobody waits on a permission card forever, but a run you're in is yours to end.
				if (!human && info.pending === 0 && Date.now() > deadline) {
					paseo(opts.bin, ['stop', agentId], { cwd: opts.cwd });
					status = 124;
					fs.writeSync(fd, `\n--- TIMED OUT after ${opts.timeoutMin} min ---\n`);
					return { status, agentId, intervened: false };
				}
				continue;
			}
			const settled = info.status === 'idle' ? 0 : 1;
			if (!human) {
				status = settled;
				return { status, agentId, intervened: false };
			}
			if (opts.ready?.() || opts.released?.()) {
				if (held) opts.onHold?.(false);
				status = 0;
				return { status, agentId, intervened: true };
			}
			if (!held) {
				held = true;
				opts.onHold?.(true);
			}
			sleep(opts.pollMs ?? 5000);
		}
	} finally {
		if (agentId) syncTranscript(opts.bin, agentId, opts.cwd, fd, mirror);
		if (status !== 124) fs.writeSync(fd, `\n--- exit ${status} at ${new Date().toISOString()} ---\n`);
		fs.closeSync(fd);
		if (!opts.ownsCwd) restoreAgentSettings(opts.cwd, before);
	}
}

/**
 * Archive every agent carrying all these labels (a merged story's sessions). Best effort.
 * @param {string} bin @param {string} cwd @param {Record<string, string>} labels
 * @returns {number} how many were archived
 */
function archiveSessions(bin, cwd, labels) {
	const res = paseo(bin, ['ls', '-g', '--json', ...Object.entries(labels).flatMap(([k, v]) => ['--label', `${k}=${v}`])], { cwd });
	const rows = res.status === 0 ? parseJson(res.stdout) : null;
	if (!Array.isArray(rows)) return 0;
	let archived = 0;
	for (const row of rows) {
		if (row?.id && paseo(bin, ['archive', String(row.id)], { cwd }).status === 0) archived++;
	}
	return archived;
}

/**
 * Open an agent's chat in Paseo Desktop.
 * @param {string} bin @param {string} id
 * @returns {{ ok: boolean; error: string }}
 */
function openSession(bin, id) {
	const res = paseo(bin, ['agent', 'open', id], { timeoutMs: 30_000 });
	return { ok: res.status === 0, error: res.status === 0 ? '' : (res.stderr || res.stdout).trim().slice(-300) };
}

module.exports = {
	paseoBin,
	paseoStatus,
	writeAgentSettings,
	restoreAgentSettings,
	lastUserMessageAt,
	runPaseoAgent,
	describeRun,
	archiveSessions,
	openSession,
};
