/**
 * Run one fresh coding agent for a single epic-loop phase.
 *
 * Two runners, both Claude Code in auto permission mode (a classifier approves routine
 * actions, blocks risky ones). The loop itself commits and pushes, so `git commit` /
 * `git push` are denied outright.
 *
 * - `paseo` (default): a Paseo agent on the claude provider, so you can open each phase's chat
 *   in the Paseo app, read it, and talk to it. See tools/lib/paseo-agent.cjs. When the Paseo
 *   daemon isn't reachable, the phase falls back to `claude` and the log says why.
 * - `claude`: headless `claude -p`, prompt on stdin. Nobody can step in.
 *
 * Override in skillsync.config.json:
 *
 *   "epicLoop": { "agent": { "runner": "paseo", "timeoutMin": 45, "model": "claude-opus-5-5" } }
 *   "epicLoop": { "agent": { "runner": "claude", "command": "claude", "args": [...] } }
 *
 * Setting `command` or `args` without `runner` means `claude`. `paseo` is the CLI path when it
 * is not on PATH (default: PATH, then the one inside Paseo.app). `mode` is the Paseo permission
 * mode (default `auto`).
 *
 * `model` is passed as `--model` (claude only, and only when `args` has no `--model` of its own).
 * Without it the agent runs on the CLI's default model. Give one id, or one per phase:
 *
 *   "model": { "plan": "claude-opus-5-5", "review": "claude-opus-5-5", "default": "claude-sonnet-5-5" }
 *
 * Phases: plan, cycle (every implementation cycle), review, fix (CI fixes). A phase without
 * an entry uses `default`; with no `default` it falls back to the CLI's default model.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const paseoAgent = require('./paseo-agent.cjs');

const DEFAULT_ALLOWED_TOOLS = [
	'Read',
	'Edit',
	'Write',
	'Glob',
	'Grep',
	'Skill',
	'Bash(npm:*)',
	'Bash(npx:*)',
	'Bash(node:*)',
	'Bash(sbt:*)',
	'Bash(git status:*)',
	'Bash(git diff:*)',
	'Bash(git log:*)',
	'Bash(git show:*)',
	'Bash(git stash:*)',
	'Bash(git checkout -- :*)',
	'Bash(gh pr view:*)',
	'Bash(gh run view:*)',
	'Bash(ls:*)',
	'Bash(cat:*)',
	'Bash(grep:*)',
	'Bash(mkdir:*)',
	'Bash(cp:*)',
];

/** Denied even in auto mode (deny rules win): the loop commits and pushes, never the agent. */
const DEFAULT_DISALLOWED_TOOLS = ['Bash(git commit:*)', 'Bash(git push:*)', 'Bash(git * commit:*)', 'Bash(git * push:*)'];

const DEFAULT_AGENT = {
	command: 'claude',
	// stream-json writes one event per line while the agent works, so the log can be followed live
	// (`epic-loop.cjs --tail`). --verbose is required for stream-json in print mode.
	// auto: nobody is there to approve, and an allowlist alone refuses ordinary chained shell
	// commands (`cd x && …`, `F=…; …`), so agents lost turns and skipped TDD re-break steps.
	// The classifier approves routine work and still blocks risky actions.
	args: [
		'-p',
		'--output-format',
		'stream-json',
		'--verbose',
		'--permission-mode',
		'auto',
		'--allowedTools',
		DEFAULT_ALLOWED_TOOLS.join(','),
		'--disallowedTools',
		DEFAULT_DISALLOWED_TOOLS.join(','),
	],
	timeoutMin: 45,
};

/**
 * @param {Record<string, any> | null} config skillsync.config.json
 * @returns {{ runner: 'paseo' | 'claude'; command: string; args: string[]; timeoutMin: number; mode: string }}
 */
function resolveAgent(config) {
	const custom = config?.epicLoop?.agent ?? {};
	const runner = custom.runner === 'paseo' || custom.runner === 'claude' ? custom.runner : custom.command || custom.args ? 'claude' : 'paseo';
	return {
		runner,
		command: typeof custom.command === 'string' ? custom.command : DEFAULT_AGENT.command,
		args: Array.isArray(custom.args) ? custom.args.map(String) : DEFAULT_AGENT.args,
		timeoutMin: Number(custom.timeoutMin) > 0 ? Number(custom.timeoutMin) : DEFAULT_AGENT.timeoutMin,
		mode: typeof custom.mode === 'string' && custom.mode.trim() ? custom.mode.trim() : 'auto',
	};
}

/**
 * Is the Paseo runner usable right now? Asked before every phase: the loop runs for hours and
 * the daemon can stop or come back in between.
 * @param {Record<string, any> | null} config
 * @returns {{ ok: boolean; reason: string; bin: string }}
 */
function paseoReady(config) {
	const bin = paseoAgent.paseoBin(config);
	return { ...paseoAgent.paseoStatus(bin), bin };
}

/**
 * Model id for a phase from `epicLoop.agent.model`, or null for the CLI default.
 * Loop phases like `cycle3` resolve as `cycle`.
 *
 * @param {Record<string, any> | null} config skillsync.config.json
 * @param {string} [phase]
 * @returns {string | null}
 */
function resolveModel(config, phase) {
	const model = config?.epicLoop?.agent?.model;
	if (typeof model === 'string') return model.trim() || null;
	if (!model || typeof model !== 'object') return null;
	const key = String(phase ?? '').replace(/^cycle\d+$/, 'cycle');
	const picked = model[key] ?? model.default;
	return typeof picked === 'string' && picked.trim() ? picked.trim() : null;
}

/**
 * @param {object} opts
 * @param {string} opts.cwd where the agent works (the story worktree)
 * @param {string} opts.prompt
 * @param {string} opts.logFile full transcript destination
 * @param {Record<string, any> | null} opts.config
 * @param {string} [opts.phase] plan | cycle<N> | review | fix — picks the model
 * @param {string[]} [opts.addDirs] extra folders the agent may read (claude `--add-dir`)
 * @param {boolean} [opts.dryRun]
 * Paseo runner only (ignored by `claude -p`, where nobody can step in):
 * @param {string} [opts.title] chat title in Paseo
 * @param {Record<string, string>} [opts.labels] Paseo labels (story, phase, …)
 * @param {boolean} [opts.ownsCwd] cwd is a loop worktree (see paseo-agent.cjs)
 * @param {{ id: string; sentAt: number } | null} [opts.resume]
 * @param {() => boolean} [opts.ready]
 * @param {() => boolean} [opts.released]
 * @param {(session: { id: string; sentAt: number }) => void} [opts.onSession]
 * @param {(held: boolean) => void} [opts.onHold]
 * @param {(reason: string) => void} [opts.onAttention]
 * @param {number} [opts.pollMs]
 * @param {number} [opts.waitSec]
 * @returns {{ status: number; logFile: string; command: string; runner: 'paseo' | 'claude'; fallback: string; agentId: string; intervened: boolean }}
 */
function runAgent(opts) {
	const agent = resolveAgent(opts.config);
	const model = resolveModel(opts.config, opts.phase);
	if (agent.runner === 'paseo') {
		const bin = paseoAgent.paseoBin(opts.config);
		const paseoOpts = {
			...opts,
			bin,
			model,
			mode: agent.mode,
			timeoutMin: agent.timeoutMin,
			rules: { allow: DEFAULT_ALLOWED_TOOLS, deny: DEFAULT_DISALLOWED_TOOLS, dirs: opts.addDirs ?? [] },
		};
		const command = paseoAgent.describeRun(paseoOpts);
		fs.mkdirSync(path.dirname(opts.logFile), { recursive: true });
		if (opts.dryRun) {
			fs.writeFileSync(opts.logFile, `DRY RUN\n$ ${command}\n\n${opts.prompt}\n`, 'utf8');
			return { status: 0, logFile: opts.logFile, command, runner: 'paseo', fallback: '', agentId: '', intervened: false };
		}
		const ready = paseoReady(opts.config);
		if (ready.ok) {
			fs.writeFileSync(opts.logFile, [`$ ${command}`, `cwd: ${opts.cwd}`, `started: ${new Date().toISOString()}`, '', '--- prompt ---', opts.prompt, '', '--- output ---', ''].join('\n'), 'utf8');
			const run = paseoAgent.runPaseoAgent(paseoOpts);
			return { status: run.status, logFile: opts.logFile, command, runner: 'paseo', fallback: '', agentId: run.agentId, intervened: run.intervened };
		}
		const run = runClaudeAgent(opts, agent, model);
		fs.appendFileSync(opts.logFile, `\n(ran with claude -p: ${ready.reason})\n`, 'utf8');
		return { ...run, fallback: ready.reason };
	}
	return runClaudeAgent(opts, agent, model);
}

/**
 * Headless `claude -p`, prompt on stdin, output streamed into the log file.
 * @param {Parameters<typeof runAgent>[0]} opts
 * @param {ReturnType<typeof resolveAgent>} agent
 * @param {string | null} model
 * @returns {ReturnType<typeof runAgent>}
 */
function runClaudeAgent(opts, agent, model) {
	agent = { ...agent };
	if (agent.command === 'claude' && model && !agent.args.includes('--model')) agent.args = [...agent.args, '--model', model];
	if (agent.command === 'claude' && opts.addDirs?.length) agent.args = [...agent.args, '--add-dir', ...opts.addDirs];
	const command = [agent.command, ...agent.args].join(' ');
	fs.mkdirSync(path.dirname(opts.logFile), { recursive: true });

	if (opts.dryRun) {
		fs.writeFileSync(opts.logFile, `DRY RUN\n$ ${command}\n\n${opts.prompt}\n`, 'utf8');
		return { status: 0, logFile: opts.logFile, command, runner: 'claude', fallback: '', agentId: '', intervened: false };
	}

	// Header first, then the agent's stdout/stderr stream straight into the log file.
	fs.writeFileSync(opts.logFile, [`$ ${command}`, `cwd: ${opts.cwd}`, `started: ${new Date().toISOString()}`, '', '--- prompt ---', opts.prompt, '', '--- output ---', ''].join('\n'), 'utf8');
	const fd = fs.openSync(opts.logFile, 'a');
	let res;
	try {
		// Through agent-guard, so the agent stops when the loop is killed mid-run.
		res = spawnSync(process.execPath, [path.join(__dirname, 'agent-guard.cjs'), agent.command, ...agent.args], {
			cwd: opts.cwd,
			input: opts.prompt,
			stdio: ['pipe', fd, fd],
			timeout: agent.timeoutMin * 60_000,
		});
	} finally {
		fs.closeSync(fd);
	}
	const timedOut = res.error && /** @type {NodeJS.ErrnoException} */ (res.error).code === 'ETIMEDOUT';
	const status = timedOut ? 124 : (res.status ?? 1);
	fs.appendFileSync(
		opts.logFile,
		`\n--- ${timedOut ? `TIMED OUT after ${agent.timeoutMin} min` : `exit ${status}`} at ${new Date().toISOString()} ---\n${res.error && !timedOut ? String(res.error) : ''}`,
		'utf8',
	);
	return { status, logFile: opts.logFile, command, runner: 'claude', fallback: '', agentId: '', intervened: false };
}

/**
 * Startup check: can the installed claude CLI run every model the phases will use? An older
 * CLI rejects a newer model within seconds, which would otherwise burn each story's attempts
 * in turn. Sends one tiny prompt per distinct model (the CLI default counts as one, which also
 * catches a logged-out CLI). Custom agent commands are not checked.
 *
 * @param {Record<string, any> | null} config skillsync.config.json
 * @param {string} cwd
 * @returns {string[]} one problem per model that failed; empty when all run
 */
function checkAgentModels(config, cwd) {
	const agent = resolveAgent(config);
	if (agent.command !== 'claude') return [];
	const pinned = agent.args.indexOf('--model');
	const models = new Set(
		['plan', 'cycle', 'review', 'fix'].map((phase) => (pinned >= 0 ? agent.args[pinned + 1] : resolveModel(config, phase))),
	);
	const version = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout?.trim() || 'version unknown';
	/** @type {string[]} */
	const problems = [];
	for (const model of models) {
		const res = spawnSync('claude', ['-p', '--output-format', 'json', '--max-turns', '1', ...(model ? ['--model', model] : [])], {
			cwd,
			input: 'Reply with OK.',
			encoding: 'utf8',
			timeout: 120_000,
		});
		/** @type {any} */
		let result = null;
		try {
			result = JSON.parse(String(res.stdout ?? '').trim().split('\n').pop() ?? '');
		} catch {
			// not JSON: report stderr below
		}
		if (res.status === 0 && result && !result.is_error) continue;
		const why = result?.result ?? (String(res.stderr ?? '').trim() || String(res.error ?? `exit ${res.status}`));
		problems.push(`claude ${version} cannot run ${model ?? 'its default model'}: ${clip(why, 300)}`);
	}
	return problems;
}

/** @param {string} text @param {number} max */
const clip =(text, max) => {
	const one = String(text).replace(/\s+/g, ' ').trim();
	return one.length > max ? `${one.slice(0, max - 1)}…` : one;
};

/**
 * One readable line per `--output-format stream-json` event, or null to skip it.
 * Paseo's timeline lines (`[Shell] npm test`, `[User] …`) become the same `→ Tool: arg` shape,
 * with messages to the agent (yours and the loop's) as `» …`. Other non-JSON lines (log header,
 * agent text, stderr) pass through unchanged.
 *
 * @param {string} line
 * @returns {string | null}
 */
function formatStreamLine(line) {
	if (!line.trim()) return null;
	/** @type {any} */
	let ev;
	try {
		ev = JSON.parse(line);
	} catch {
		const tagged = line.match(/^\[([A-Za-z][\w ]*)\] ?(.*)$/);
		if (!tagged) return line;
		return tagged[1] === 'User' ? `» ${clip(tagged[2], 160)}` : `→ ${tagged[1]}${tagged[2] ? `: ${clip(tagged[2], 140)}` : ''}`;
	}
	if (ev.type === 'system' && ev.subtype === 'init') return `agent started (${ev.model ?? 'model ?'})`;
	if (ev.type === 'assistant') {
		const parts = [];
		for (const c of ev.message?.content ?? []) {
			if (c.type === 'text' && c.text.trim()) parts.push(`  ${clip(c.text, 160)}`);
			if (c.type === 'tool_use') {
				const i = c.input ?? {};
				const arg = i.command ?? i.file_path ?? i.pattern ?? i.skill ?? i.description ?? '';
				parts.push(`→ ${c.name}${arg ? `: ${clip(arg, 140)}` : ''}`);
			}
		}
		return parts.length ? parts.join('\n') : null;
	}
	if (ev.type === 'user') {
		const errors = (ev.message?.content ?? []).filter((/** @type {any} */ c) => c.type === 'tool_result' && c.is_error);
		return errors.length ? errors.map((/** @type {any} */ c) => `  ✗ ${clip(Array.isArray(c.content) ? c.content.map((/** @type {any} */ x) => x.text ?? '').join(' ') : c.content, 160)}`).join('\n') : null;
	}
	if (ev.type === 'result') {
		const secs = ev.duration_ms ? ` in ${Math.round(ev.duration_ms / 1000)}s` : '';
		const cost = typeof ev.total_cost_usd === 'number' ? `, $${ev.total_cost_usd.toFixed(2)}` : '';
		return `agent finished (${ev.subtype})${secs}${cost}${ev.result ? `\n  ${clip(ev.result, 200)}` : ''}`;
	}
	return null;
}

module.exports = {
	DEFAULT_ALLOWED_TOOLS,
	DEFAULT_DISALLOWED_TOOLS,
	resolveAgent,
	resolveModel,
	paseoReady,
	runAgent,
	checkAgentModels,
	formatStreamLine,
};
