#!/usr/bin/env node
/**
 * Auto-allow pending Paseo permission prompts (ACP / shell “execute” cards).
 *
 * Prefer turning on **Auto Accept** in the Paseo agent controls (green shield) —
 * that approves prompts inside the Cursor ACP session. This watcher is the
 * fallback when Auto Accept is off or a prompt still lands in `paseo permit ls`.
 *
 * Usage:
 *   node tools/paseo-permit-watch.cjs [--once] [--interval SEC] [--agent ID]
 *   node tools/paseo-permit-watch.cjs --agent dbde7ee
 *
 * Ctrl+C to stop (default: poll forever).
 */

const { spawnSync } = require('node:child_process');

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	/** @type {Record<string, string | boolean>} */
	const flags = {};
	const positional = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--once') {
			flags.once = true;
			continue;
		}
		if (a === '--interval' || a === '--agent') {
			flags[a.slice(2)] = argv[++i] ?? '';
			continue;
		}
		if (a.startsWith('--')) {
			const eq = a.indexOf('=');
			if (eq !== -1) {
				flags[a.slice(2, eq)] = a.slice(eq + 1);
			} else {
				flags[a.slice(2)] = true;
			}
			continue;
		}
		positional.push(a);
	}
	return { flags, positional };
}

/**
 * @param {string[]} args
 * @returns {{ status: number; stdout: string; stderr: string }}
 */
function runPaseo(args) {
	const result = spawnSync('paseo', args, {
		encoding: 'utf8',
		env: process.env,
	});
	return {
		status: result.status ?? 1,
		stdout: result.stdout?.toString() ?? '',
		stderr: result.stderr?.toString() ?? '',
	};
}

/**
 * @returns {object[]}
 */
function listPending() {
	const listed = runPaseo(['permit', 'ls', '--json']);
	if (listed.status !== 0 || !listed.stdout.trim()) {
		return [];
	}
	try {
		const rows = JSON.parse(listed.stdout);
		return Array.isArray(rows) ? rows : [];
	} catch {
		return [];
	}
}

/**
 * @param {string} agentId
 * @returns {number} allowed count estimate
 */
function allowAllForAgent(agentId) {
	const before = listPending().filter((row) => {
		const id = String(row.agentId ?? row.agent ?? '');
		return id === agentId || id.startsWith(agentId) || agentId.startsWith(id);
	}).length;
	const bulk = runPaseo(['permit', 'allow', agentId, '--all']);
	if (bulk.status === 0) {
		return before;
	}
	let n = 0;
	for (const row of listPending()) {
		const id = String(row.agentId ?? row.agent ?? '');
		if (!(id === agentId || id.startsWith(agentId) || agentId.startsWith(id))) {
			continue;
		}
		const reqId = row.requestId ?? row.reqId ?? row.id ?? row.request_id;
		const args = reqId
			? ['permit', 'allow', agentId, String(reqId)]
			: ['permit', 'allow', agentId];
		if (runPaseo(args).status === 0) {
			n += 1;
		}
	}
	return n;
}

/**
 * @param {string | null} onlyAgent
 * @returns {number}
 */
function allowPending(onlyAgent) {
	const rows = listPending();
	if (rows.length === 0) {
		return 0;
	}
	/** @type {Set<string>} */
	const agents = new Set();
	for (const row of rows) {
		const id = row.agentId ?? row.agent;
		if (!id) {
			continue;
		}
		const s = String(id);
		if (onlyAgent) {
			if (
				s === onlyAgent ||
				s.startsWith(onlyAgent) ||
				onlyAgent.startsWith(s)
			) {
				agents.add(s);
			}
		} else {
			agents.add(s);
		}
	}
	let total = 0;
	for (const agentId of agents) {
		total += allowAllForAgent(agentId);
	}
	return total;
}

function main() {
	const { flags } = parseArgs(process.argv.slice(2));
	const once = Boolean(flags.once);
	const intervalSec = Math.max(
		1,
		Number.parseInt(String(flags.interval ?? '2'), 10) || 2,
	);
	const onlyAgent =
		typeof flags.agent === 'string' && flags.agent.trim()
			? flags.agent.trim()
			: null;

	const which = runPaseo(['--version']);
	if (which.status !== 0) {
		console.error('paseo CLI not on PATH (start Paseo Desktop / install CLI).');
		process.exit(1);
	}

	console.log(
		once
			? 'paseo-permit-watch: allowing pending once'
			: `paseo-permit-watch: polling every ${intervalSec}s (Ctrl+C to stop)`,
	);
	console.log(
		'Tip: in Paseo, enable Auto Accept (shield) on Cursor agents so fewer prompts appear.',
	);

	for (;;) {
		const n = allowPending(onlyAgent);
		if (n > 0) {
			const stamp = new Date().toISOString();
			console.log(`[${stamp}] allowed ~${n} pending permission(s)`);
		}
		if (once) {
			break;
		}
		spawnSync('sleep', [String(intervalSec)], { stdio: 'ignore' });
	}
}

main();
