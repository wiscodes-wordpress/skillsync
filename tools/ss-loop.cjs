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
 *   --max-retries N        Retries per cycle on verify/state failure (default: 2)
 *   --provider NAME        Paseo provider or provider/model (default: cursor)
 *   --model ID             Optional model override
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
	assertOrExit,
} = require('./lib/ss-tools.cjs');

const DEFAULT_MAX_ITERATIONS = 20;
const DEFAULT_MAX_RETRIES = 2;
const PERMIT_POLL_MS = 2500;

/**
 * @param {string} text
 * @returns {number[]}
 */
function parseCycleList(text) {
	if (!text) {
		return [];
	}
	const normalized = text.replace(/\(none\)/gi, '').trim();
	if (!normalized) {
		return [];
	}
	/** @type {number[]} */
	const ids = [];
	const re = /Cycle\s+(\d+)/gi;
	let m;
	while ((m = re.exec(normalized)) !== null) {
		ids.push(Number.parseInt(m[1], 10));
	}
	return [...new Set(ids)].sort((a, b) => a - b);
}

/**
 * @param {string} state
 * @returns {{ completed: number[]; remaining: number[] }}
 */
function parseCompletedRemaining(state) {
	const sections = parseMarkdownSections(state);
	const block =
		sections.get('Completed / Remaining') ??
		sections.get('Completed/Remaining') ??
		'';
	const completedMatch = block.match(/\*\*Completed:\*\*\s*(.+)/i);
	const remainingMatch = block.match(/\*\*Remaining:\*\*\s*(.+)/i);
	return {
		completed: parseCycleList(completedMatch?.[1] ?? ''),
		remaining: parseCycleList(remainingMatch?.[1] ?? ''),
	};
}

/**
 * @param {string} sectionContent
 * @param {number} cycle
 * @returns {string}
 */
function extractCycleBlock(sectionContent, cycle) {
	if (!sectionContent) {
		return '';
	}
	const start = sectionContent.search(
		new RegExp(`^###\\s+Cycle\\s+${cycle}\\b`, 'm'),
	);
	if (start === -1) {
		return '';
	}
	const rest = sectionContent.slice(start);
	const next = rest.search(/\n###\s+Cycle\s+\d+/);
	return (next === -1 ? rest : rest.slice(0, next)).trim();
}

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
 * @param {string} consumerRoot
 */
function allowPendingPermits(agentId, consumerRoot) {
	const listed = runPaseo(['permit', 'ls', '--json'], { cwd: consumerRoot });
	if (listed.status !== 0 || !listed.stdout.trim()) {
		return;
	}
	try {
		const rows = JSON.parse(listed.stdout);
		if (!Array.isArray(rows)) {
			return;
		}
		for (const row of rows) {
			const rowAgent =
				row.agentId ?? row.agent ?? row.agent_id ?? row.id?.agent;
			const reqId = row.requestId ?? row.reqId ?? row.id ?? row.request_id;
			if (rowAgent && String(rowAgent) !== agentId && !String(rowAgent).startsWith(agentId)) {
				continue;
			}
			if (reqId) {
				runPaseo(['permit', 'allow', agentId, String(reqId)], {
					cwd: consumerRoot,
				});
			} else {
				runPaseo(['permit', 'allow', agentId], { cwd: consumerRoot });
			}
		}
	} catch {
		// Best-effort; AFK continues via wait
	}
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
	const model = typeof flags.model === 'string' ? flags.model : null;
	const mode =
		typeof flags.mode === 'string'
			? flags.mode
			: provider === 'cursor' || provider.startsWith('cursor/')
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

	assertOrExit(paseoAvailable(), 'paseo CLI not found on PATH — see docs/ss-loop.md');

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
			const prompt = buildCyclePrompt(/** @type {string} */ (readState(consumerRoot)), cycle);
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
				attempt += 1;
				continue;
			}

			const verify = runVerification(consumerRoot, cycle);
			if (!verify.ok) {
				lastDetail = verify.detail;
				appendLoopProgress(consumerRoot, `verify fail Cycle ${cycle}: ${lastDetail}`);
				attempt += 1;
				continue;
			}

			const after = readState(consumerRoot);
			const { remaining: remAfter } = parseCompletedRemaining(
				/** @type {string} */ (after),
			);
			if (remAfter.includes(cycle)) {
				lastDetail =
					`Cycle ${cycle} still listed under Remaining after agent — fail closed (agent must update state.md)`;
				appendLoopProgress(consumerRoot, lastDetail);
				attempt += 1;
				continue;
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
