#!/usr/bin/env node
/**
 * AFK Remaining-cycle walker: one fresh Paseo Cursor agent per cycle.
 *
 * Usage:
 *   node path/to/skillsync/tools/ss-loop.cjs [/path/to/consumer-repo] [options]
 *
 * Options:
 *   --dry-run              Print plan + first prompt; do not spawn agents
 *   --cycle N              Only this cycle number
 *   --through N            Remaining cycles up to and including N
 *   --max-iterations N     Cap agent spawns (default: 20)
 *   --max-retries N        Retries only when paseo fails to create/start an agent (default: 0).
 *                          Incomplete cycles (Remaining still lists N) never respawn — one agent per cycle.
 *   --provider NAME        Paseo provider or provider/model (default: cursor)
 *   --model ID             Model override (default for cursor: composer-2.5 — Cursor Models pool)
 *   --mode MODE            Provider mode (default: agent for cursor)
 *   --worktree             Branch-off worktree workspace for each cycle
 *   --new-branch NAME      Branch name when --worktree (default: ss-loop/<task-slug>)
 *   --base REF             Base ref for worktree (default: HEAD)
 *   --wait-timeout DUR     Passed to paseo run when not backgrounding (e.g. 45m)
 *   --no-permit-poll       Do not auto-allow pending Paseo permissions
 *   --json                 Machine-readable summary on stdout
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
	parseArgs,
	resolveConsumerRoot,
	statePath,
	readState,
	parseMarkdownSections,
	harnessDir,
	commandsFromVerificationPlan,
	parseCompletedRemaining,
	extractCycleBlock,
	checkCycleAgentOutcome,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

const DEFAULT_MAX_ITERATIONS = 20;
/** Spawn-create failures only — never respawn when Remaining still lists the cycle. */
const DEFAULT_MAX_RETRIES = 0;
/**
 * Cost-efficient Cursor default: first-party Composer (Cursor Models pool), not
 * account/parent default which often resolves to gpt-5.4-mini + medium thinking.
 * Override with --model (e.g. default, gpt-5.4-mini, composer-2).
 */
const DEFAULT_CURSOR_MODEL = 'composer-2.5';
const PERMIT_POLL_MS = 2500;
/** After paseo wait sees idle, require stable idle this long (permissions pause looks like idle). */
const IDLE_SETTLE_MS = 5000;

/**
 * @param {string} state
 * @param {number} cycle
 * @returns {string}
 */
function buildCyclePrompt(state, cycle) {
	const sections = parseMarkdownSections(state);
	const currentTask = sections.get('Current Task') ?? '(unknown)';
	const plan =
		sections.get('RED→GREEN Plan') ??
		sections.get('RED->GREEN Plan') ??
		sections.get('Sprint Plan') ??
		'';
	const verification = sections.get('Verification Plan') ?? '';
	const acceptance = sections.get('Acceptance Criteria') ?? '';
	const contracts =
		sections.get('Behavior & Test Contracts') ??
		sections.get('Sprint Plan') ??
		'';

	const cyclePlan = extractCycleBlock(plan, cycle);
	const cycleVerify = extractCycleBlock(verification, cycle);
	const cycleAccept = extractCycleBlock(acceptance, cycle);

	return [
		'You are running one AFK skillsync cycle via /ss-loop.',
		'Follow harness/harness-loop.md (or .cursor/vendor/skillsync/harness/harness-loop.md).',
		'',
		`## Assigned cycle`,
		`Implement **Cycle ${cycle} only**. Do not start other Remaining cycles.`,
		'',
		'## Current Task',
		currentTask.trim(),
		'',
		'## Behavior & Test Contracts (context)',
		contracts.trim() || '(none)',
		'',
		`## Cycle ${cycle} plan`,
		cyclePlan || `(see RED→GREEN Plan / Sprint Plan for Cycle ${cycle} in .harness/state.md)`,
		'',
		`## Cycle ${cycle} acceptance`,
		cycleAccept || `(see Acceptance Criteria for Cycle ${cycle})`,
		'',
		`## Cycle ${cycle} verification`,
		cycleVerify ||
			`Run: node .cursor/vendor/skillsync/tools/run-verification.cjs . --cycle ${cycle}`,
		'',
		'## Required before you stop',
		`- Complete RED→GREEN→re-break for Cycle ${cycle} when TDD plan applies.`,
		`- Update .harness/state.md: move Cycle ${cycle} to Completed; shrink Remaining; append TDD Evidence.`,
		`- If Remaining is empty, set Next Action to harness-critic (/ss-review).`,
		`- Prefer: node .cursor/vendor/skillsync/tools/run-verification.cjs . --cycle ${cycle}`,
	].join('\n');
}

/**
 * Fail before spawning if Cycle N has no runnable Verification Plan commands.
 *
 * @param {string} state
 * @param {number} cycle
 * @returns {{ ok: true } | { ok: false; detail: string }}
 */
function preflightVerificationPlan(state, cycle) {
	const sections = parseMarkdownSections(state);
	const plan = sections.get('Verification Plan');
	if (!plan) {
		return { ok: false, detail: 'Missing ## Verification Plan in state.md' };
	}
	const parsed = commandsFromVerificationPlan(plan, cycle);
	if (!parsed.ok) {
		return { ok: false, detail: parsed.error };
	}
	return { ok: true };
}

/**
 * @param {number[]} remaining
 * @param {{ cycle: number | null; through: number | null }} scope
 * @returns {number[]}
 */
function applyScope(remaining, scope) {
	if (scope.cycle !== null) {
		assertOrExit(
			remaining.includes(scope.cycle),
			`Cycle ${scope.cycle} is not in Remaining (${remaining.join(', ') || 'empty'})`,
		);
		return [scope.cycle];
	}
	if (scope.through !== null) {
		return remaining.filter((n) => n <= scope.through);
	}
	return remaining;
}

/**
 * @param {string[]} args
 * @param {{ cwd?: string; inherit?: boolean }} [opts]
 * @returns {{ status: number; stdout: string; stderr: string }}
 */
function runPaseo(args, opts = {}) {
	const result = spawnSync('paseo', args, {
		cwd: opts.cwd,
		encoding: 'utf8',
		stdio: opts.inherit ? 'inherit' : ['pipe', 'pipe', 'pipe'],
	});
	return {
		status: result.status ?? 1,
		stdout: result.stdout?.toString() ?? '',
		stderr: result.stderr?.toString() ?? result.error?.message ?? '',
	};
}

/**
 * @returns {boolean}
 */
function paseoAvailable() {
	const which = spawnSync('paseo', ['--version'], { encoding: 'utf8' });
	return (which.status ?? 1) === 0;
}

/**
 * @param {string} stdout
 * @returns {string | null}
 */
function extractAgentId(stdout) {
	const trimmed = stdout.trim();
	if (!trimmed) {
		return null;
	}
	try {
		const parsed = JSON.parse(trimmed);
		if (typeof parsed === 'string') {
			return parsed;
		}
		if (parsed && typeof parsed === 'object') {
			const id =
				parsed.id ??
				parsed.agentId ??
				parsed.agent?.id ??
				parsed.data?.id;
			if (typeof id === 'string') {
				return id;
			}
		}
	} catch {
		// fall through to line / token heuristics
	}
	const quietLine = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
	if (quietLine.length === 1 && /^[A-Za-z0-9_-]+$/.test(quietLine[0])) {
		return quietLine[0];
	}
	const m = trimmed.match(/\b(agt_[A-Za-z0-9_-]+|[a-f0-9]{8,})\b/);
	return m?.[1] ?? null;
}

/**
 * @param {string} agentId
 * @param {unknown} rowAgent
 * @returns {boolean}
 */
function rowMatchesAgent(agentId, rowAgent) {
	if (!rowAgent) {
		return true;
	}
	const s = String(rowAgent);
	return s === agentId || s.startsWith(agentId) || agentId.startsWith(s);
}

/**
 * @param {string} agentId
 * @param {string} consumerRoot
 * @returns {object[]}
 */
function listPendingPermits(agentId, consumerRoot) {
	const listed = runPaseo(['permit', 'ls', '--json'], { cwd: consumerRoot });
	if (listed.status !== 0 || !listed.stdout.trim()) {
		return [];
	}
	try {
		const rows = JSON.parse(listed.stdout);
		if (!Array.isArray(rows)) {
			return [];
		}
		return rows.filter((row) =>
			rowMatchesAgent(
				agentId,
				row.agentId ?? row.agent ?? row.agent_id ?? row.id?.agent,
			),
		);
	} catch {
		return [];
	}
}

/**
 * @param {string} agentId
 * @param {string} consumerRoot
 */
function allowPendingPermits(agentId, consumerRoot) {
	for (const row of listPendingPermits(agentId, consumerRoot)) {
		const reqId = row.requestId ?? row.reqId ?? row.id ?? row.request_id;
		if (reqId) {
			runPaseo(['permit', 'allow', agentId, String(reqId)], {
				cwd: consumerRoot,
			});
		} else {
			runPaseo(['permit', 'allow', agentId], { cwd: consumerRoot });
		}
	}
}

/**
 * @param {string} agentId
 * @param {string} consumerRoot
 * @returns {string | null}
 */
function getAgentStatus(agentId, consumerRoot) {
	const inspected = runPaseo(['inspect', agentId, '--json'], {
		cwd: consumerRoot,
	});
	if (inspected.status !== 0 || !inspected.stdout.trim()) {
		return null;
	}
	try {
		const parsed = JSON.parse(inspected.stdout);
		const status = parsed.Status ?? parsed.status;
		return typeof status === 'string' ? status.toLowerCase() : null;
	} catch {
		return null;
	}
}

/**
 * @param {string} agentId
 * @param {string} consumerRoot
 */
function archiveAgent(agentId, consumerRoot) {
	if (!agentId) {
		return;
	}
	runPaseo(['archive', agentId], { cwd: consumerRoot });
}

/**
 * @param {string} agentId
 * @param {string} consumerRoot
 * @param {{ pollPermits: boolean; timeoutSec: number | null }} opts
 * @returns {number} paseo wait status
 */
function waitWithPermitPolling(agentId, consumerRoot, opts) {
	const started = Date.now();
	for (;;) {
		if (opts.pollPermits) {
			allowPendingPermits(agentId, consumerRoot);
		}
		const waitArgs = ['wait', agentId, '--timeout', '5'];
		const waited = runPaseo(waitArgs, { cwd: consumerRoot });
		if (waited.status === 0) {
			// Idle can mean "paused for permissions" — settle before treating as finished.
			if (opts.pollPermits) {
				allowPendingPermits(agentId, consumerRoot);
			}
			spawnSync('sleep', [String(IDLE_SETTLE_MS / 1000)], { stdio: 'ignore' });
			if (opts.pollPermits) {
				allowPendingPermits(agentId, consumerRoot);
			}
			const status = getAgentStatus(agentId, consumerRoot);
			if (status === 'running') {
				continue;
			}
			if (status === 'error') {
				return 1;
			}
			if (listPendingPermits(agentId, consumerRoot).length > 0) {
				continue;
			}
			// Stable idle or closed — agent finished its turn.
			return 0;
		}
		if (opts.timeoutSec !== null) {
			const elapsed = (Date.now() - started) / 1000;
			if (elapsed >= opts.timeoutSec) {
				return waited.status || 1;
			}
		}
		spawnSync('sleep', [String(PERMIT_POLL_MS / 1000)], { stdio: 'ignore' });
	}
}

/**
 * @param {number} pid
 * @returns {boolean}
 */
function isPidAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/**
 * One ss-loop process per consumer repo.
 *
 * @param {string} consumerRoot
 * @returns {string} lock path
 */
function acquireLoopLock(consumerRoot) {
	const dir = harnessDir(consumerRoot);
	fs.mkdirSync(dir, { recursive: true });
	const lockPath = path.join(dir, 'ss-loop.lock');
	try {
		fs.writeFileSync(lockPath, `${process.pid}\n`, { flag: 'wx' });
		return lockPath;
	} catch (err) {
		const e = /** @type {NodeJS.ErrnoException} */ (err);
		if (e.code !== 'EEXIST') {
			throw err;
		}
		const existing = Number.parseInt(
			fs.readFileSync(lockPath, 'utf8').trim().split(/\s+/)[0] ?? '',
			10,
		);
		if (Number.isFinite(existing) && isPidAlive(existing)) {
			assertOrExit(
				false,
				`ss-loop already running (pid ${existing}, ${lockPath}). One agent loop at a time.`,
			);
		}
		fs.writeFileSync(lockPath, `${process.pid}\n`);
		return lockPath;
	}
}

/**
 * @param {string | null} lockPath
 */
function releaseLoopLock(lockPath) {
	if (!lockPath) {
		return;
	}
	try {
		const raw = fs.readFileSync(lockPath, 'utf8').trim();
		if (raw.split(/\s+/)[0] === String(process.pid)) {
			fs.unlinkSync(lockPath);
		}
	} catch {
		// ignore
	}
}

/**
 * @param {object} opts
 * @param {string} opts.consumerRoot
 * @param {string} opts.prompt
 * @param {number} opts.cycle
 * @param {string} opts.provider
 * @param {string | null} opts.model
 * @param {string | null} opts.mode
 * @param {boolean} opts.worktree
 * @param {string | null} opts.newBranch
 * @param {string} opts.base
 * @param {boolean} opts.pollPermits
 * @param {string | null} opts.waitTimeout
 * @returns {{ status: number; agentId: string | null; stderr: string }}
 */
function spawnCycleAgent(opts) {
	/** @type {string[]} */
	const args = [
		'run',
		'--background',
		'--json',
		'--quiet',
		'--cwd',
		opts.consumerRoot,
		'--provider',
		opts.provider,
		'--title',
		`ss-loop Cycle ${opts.cycle}`,
		'--label',
		'skillsync=ss-loop',
		'--label',
		`cycle=${opts.cycle}`,
	];
	if (opts.model) {
		args.push('--model', opts.model);
	}
	if (opts.mode) {
		args.push('--mode', opts.mode);
	}
	if (opts.worktree) {
		args.push(
			'--new-workspace',
			'worktree',
			'--worktree-mode',
			'branch-off',
			'--base',
			opts.base,
			'--new-branch',
			opts.newBranch ?? `ss-loop/cycle-${opts.cycle}`,
		);
	}
	args.push(opts.prompt);

	const spawned = runPaseo(args, { cwd: opts.consumerRoot });
	const agentId = extractAgentId(spawned.stdout) ?? extractAgentId(spawned.stderr);
	if (spawned.status !== 0 || !agentId) {
		return {
			status: spawned.status || 1,
			agentId,
			stderr: spawned.stderr || spawned.stdout || 'paseo run failed',
		};
	}

	let timeoutSec = null;
	if (opts.waitTimeout) {
		const m = String(opts.waitTimeout).match(/^(\d+)(s|m|h)?$/i);
		if (m) {
			const n = Number.parseInt(m[1], 10);
			const unit = (m[2] ?? 's').toLowerCase();
			timeoutSec = unit === 'h' ? n * 3600 : unit === 'm' ? n * 60 : n;
		}
	}

	const waitStatus = waitWithPermitPolling(agentId, opts.consumerRoot, {
		pollPermits: opts.pollPermits,
		timeoutSec,
	});
	return { status: waitStatus, agentId, stderr: '' };
}

/**
 * @param {string} consumerRoot
 * @param {number} cycle
 * @returns {{ ok: boolean; detail: string }}
 */
function runVerification(consumerRoot, cycle) {
	const script = path.join(__dirname, 'run-verification.cjs');
	const result = spawnSync(
		process.execPath,
		[script, consumerRoot, '--cycle', String(cycle)],
		{ encoding: 'utf8', cwd: consumerRoot },
	);
	if ((result.status ?? 1) === 0) {
		return { ok: true, detail: result.stdout?.toString() ?? '' };
	}
	return {
		ok: false,
		detail: (result.stderr || result.stdout || 'verification failed').toString(),
	};
}

/**
 * @param {string} consumerRoot
 * @param {string} line
 */
function appendLoopProgress(consumerRoot, line) {
	const dir = harnessDir(consumerRoot);
	fs.mkdirSync(dir, { recursive: true });
	const file = path.join(dir, 'loop-progress.txt');
	const stamp = new Date().toISOString();
	fs.appendFileSync(file, `[${stamp}] ${line}\n`, 'utf8');
}

/**
 * @param {string | undefined} raw
 * @returns {string}
 */
function slugify(raw) {
	return (raw ?? 'story')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 48) || 'story';
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const dryRun = Boolean(flags['dry-run']);
	const asJson = Boolean(flags.json);
	const worktree = Boolean(flags.worktree);
	const pollPermits = !flags['no-permit-poll'];
	const maxIterations =
		flags['max-iterations'] !== undefined
			? Number.parseInt(String(flags['max-iterations']), 10)
			: DEFAULT_MAX_ITERATIONS;
	const maxRetries =
		flags['max-retries'] !== undefined
			? Number.parseInt(String(flags['max-retries']), 10)
			: DEFAULT_MAX_RETRIES;
	const cycleFlag =
		flags.cycle !== undefined ? Number.parseInt(String(flags.cycle), 10) : null;
	const throughFlag =
		flags.through !== undefined
			? Number.parseInt(String(flags.through), 10)
			: null;
	const provider = typeof flags.provider === 'string' ? flags.provider : 'cursor';
	const isCursor =
		provider === 'cursor' || provider.startsWith('cursor/');
	/** Explicit --model wins; otherwise pin Composer for Cursor so loops stay off API credits. */
	const model =
		typeof flags.model === 'string'
			? flags.model
			: isCursor
				? DEFAULT_CURSOR_MODEL
				: null;
	const mode =
		typeof flags.mode === 'string'
			? flags.mode
			: isCursor
				? 'agent'
				: null;
	const waitTimeout =
		typeof flags['wait-timeout'] === 'string' ? flags['wait-timeout'] : null;
	const base = typeof flags.base === 'string' ? flags.base : 'HEAD';

	assertOrExit(Number.isFinite(maxIterations) && maxIterations > 0, 'Invalid --max-iterations');
	assertOrExit(Number.isFinite(maxRetries) && maxRetries >= 0, 'Invalid --max-retries');

	const state = readState(consumerRoot);
	assertOrExit(Boolean(state), `Missing ${statePath(consumerRoot)}`);

	const { remaining: initialRemaining } = parseCompletedRemaining(
		/** @type {string} */ (state),
	);
	const scoped = applyScope(initialRemaining, {
		cycle: cycleFlag,
		through: throughFlag,
	});

	const sections = parseMarkdownSections(/** @type {string} */ (state));
	const task = (sections.get('Current Task') ?? 'story').split('\n')[0]?.trim();
	const newBranch =
		typeof flags['new-branch'] === 'string'
			? flags['new-branch']
			: `ss-loop/${slugify(task)}`;

	if (scoped.length === 0) {
		const msg = 'Remaining is empty — nothing to loop. Run /ss-review if ready.';
		if (asJson) {
			console.log(JSON.stringify({ ok: true, complete: true, cycles: [], message: msg }));
		} else {
			console.log(msg);
		}
		process.exit(0);
	}

	if (dryRun) {
		const first = scoped[0];
		const prompt = buildCyclePrompt(/** @type {string} */ (state), first);
		if (asJson) {
			console.log(
				JSON.stringify(
					{
						ok: true,
						dryRun: true,
						provider,
						model,
						mode,
						worktree,
						cycles: scoped,
						firstCycle: first,
						prompt,
					},
					null,
					2,
				),
			);
		} else {
			console.log(`Dry-run: would walk cycles ${scoped.join(', ')}`);
			console.log(`Provider: ${provider}${model ? ` model=${model}` : ''} mode=${mode ?? '(default)'}`);
			console.log(`Worktree: ${worktree ? `yes (${newBranch} from ${base})` : 'no'}`);
			console.log('');
			console.log(`--- prompt for Cycle ${first} ---`);
			console.log(prompt);
		}
		process.exit(0);
	}

	// Fail closed before Paseo/agents: every scoped Remaining cycle needs runnable verify cmds.
	for (const cycle of scoped) {
		const pre = preflightVerificationPlan(/** @type {string} */ (state), cycle);
		assertOrExit(
			pre.ok,
			`ss-loop preflight Cycle ${cycle}: ${'detail' in pre ? pre.detail : 'invalid'} — fix Verification Plan before AFK (no agent spawned)`,
		);
	}

	assertOrExit(paseoAvailable(), 'paseo CLI not found on PATH — see docs/ss-loop.md');

	const lockPath = acquireLoopLock(consumerRoot);
	const release = () => releaseLoopLock(lockPath);
	process.on('exit', release);
	process.on('SIGINT', () => {
		release();
		process.exit(130);
	});
	process.on('SIGTERM', () => {
		release();
		process.exit(143);
	});

	/** @type {{ cycle: number; ok: boolean; agentId: string | null; detail: string }[]} */
	const results = [];
	let iterations = 0;
	/** @type {Set<number>} */
	const finished = new Set();

	while (iterations < maxIterations) {
		const liveState = readState(consumerRoot);
		assertOrExit(Boolean(liveState), `Missing ${statePath(consumerRoot)}`);
		const { remaining } = parseCompletedRemaining(/** @type {string} */ (liveState));
		const queue = applyScope(
			remaining.filter((n) => scoped.includes(n) && !finished.has(n)),
			{ cycle: cycleFlag, through: throughFlag },
		);
		if (queue.length === 0) {
			break;
		}

		const cycle = queue[0];
		let attempt = 0;
		let cycleOk = false;
		/** @type {string | null} */
		let lastAgentId = null;
		/** @type {string} */
		let lastDetail = '';

		while (attempt <= maxRetries) {
			iterations += 1;
			if (iterations > maxIterations) {
				break;
			}

			const liveForPre = readState(consumerRoot);
			const stateBefore = /** @type {string} */ (liveForPre);
			const pre = preflightVerificationPlan(stateBefore, cycle);
			if (!pre.ok) {
				lastDetail = `preflight: ${pre.detail}`;
				appendLoopProgress(consumerRoot, `preflight fail Cycle ${cycle}: ${pre.detail}`);
				break;
			}

			const prompt = buildCyclePrompt(stateBefore, cycle);
			console.error(`ss-loop: Cycle ${cycle} (attempt ${attempt + 1}/${maxRetries + 1})`);
			appendLoopProgress(
				consumerRoot,
				`start Cycle ${cycle} attempt ${attempt + 1}`,
			);

			const spawned = spawnCycleAgent({
				consumerRoot,
				prompt,
				cycle,
				provider,
				model,
				mode,
				worktree,
				newBranch: worktree ? `${newBranch}-c${cycle}` : null,
				base,
				pollPermits,
				waitTimeout,
			});
			lastAgentId = spawned.agentId;
			if (spawned.status !== 0) {
				lastDetail = spawned.stderr || `paseo agent exited ${spawned.status}`;
				appendLoopProgress(consumerRoot, `agent fail Cycle ${cycle}: ${lastDetail}`);
				// Only spawn-create failures retry — archive the orphan if one was created.
				if (spawned.agentId) {
					archiveAgent(spawned.agentId, consumerRoot);
				}
				attempt += 1;
				continue;
			}

			if (spawned.agentId) {
				const agentStatus = getAgentStatus(spawned.agentId, consumerRoot);
				if (agentStatus === 'error') {
					lastDetail = `agent ${spawned.agentId} ended in error status`;
					appendLoopProgress(consumerRoot, `agent status fail Cycle ${cycle}: ${lastDetail}`);
					break;
				}
			}

			const verify = runVerification(consumerRoot, cycle);
			if (!verify.ok) {
				lastDetail = verify.detail;
				appendLoopProgress(consumerRoot, `verify fail Cycle ${cycle}: ${lastDetail}`);
				// Do not respawn — one agent per cycle. Leave agent for inspection.
				break;
			}

			const after = /** @type {string} */ (readState(consumerRoot));
			const outcome = checkCycleAgentOutcome(stateBefore, after, cycle);
			if (!outcome.ok) {
				lastDetail = outcome.errors.join('; ');
				appendLoopProgress(
					consumerRoot,
					`outcome fail Cycle ${cycle}: ${lastDetail}`,
				);
				// Do not respawn — one agent per cycle. Leave agent for inspection.
				break;
			}

			cycleOk = true;
			finished.add(cycle);
			lastDetail = 'ok';
			appendLoopProgress(
				consumerRoot,
				`complete Cycle ${cycle} agent=${spawned.agentId ?? '?'}`,
			);
			break;
		}

		results.push({
			cycle,
			ok: cycleOk,
			agentId: lastAgentId,
			detail: lastDetail,
		});

		if (!cycleOk) {
			console.error(
				`ss-loop: stopping after Cycle ${cycle} failure — ${lastDetail.slice(0, 500)}`,
			);
			break;
		}
	}

	const finalState = readState(consumerRoot);
	const { remaining: finalRemaining } = parseCompletedRemaining(
		/** @type {string} */ (finalState),
	);
	const stillScoped = finalRemaining.filter((n) => scoped.includes(n));
	const complete = stillScoped.length === 0 && results.every((r) => r.ok);

	if (asJson) {
		console.log(
			JSON.stringify(
				{
					ok: complete,
					complete,
					iterations,
					results,
					remaining: finalRemaining,
				},
				null,
				2,
			),
		);
	} else if (complete) {
		console.log('COMPLETE — Remaining empty for scoped cycles. Next: /ss-review');
	} else {
		console.log(
			`Stopped. Scoped remaining: ${stillScoped.join(', ') || '(none)'}. See .harness/loop-progress.txt`,
		);
	}

	process.exit(complete ? 0 : 1);
}

main();
