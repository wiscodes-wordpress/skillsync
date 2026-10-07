#!/usr/bin/env node
/**
 * Run an agent command so it stops when whoever started it stops.
 *
 *   node agent-guard.cjs <command> [args...]
 *
 * runAgent waits on this with spawnSync, which blocks the loop's event loop, so the loop
 * cannot react to a signal itself. Instead the loop dies on the default signal action and
 * this guard notices: it kills the agent's whole process group (the agent's own shells and
 * test runners too) when its parent goes away, or when it is signalled itself (Ctrl-C,
 * spawnSync's timeout). stdin/stdout/stderr pass straight through.
 */

const { spawn } = require('node:child_process');

const [command, ...args] = process.argv.slice(2);
const parent = process.ppid;
const child = spawn(command, args, { stdio: 'inherit', detached: process.platform !== 'win32' });

/** @param {NodeJS.Signals} signal */
function stop(signal) {
	try {
		if (child.pid) process.kill(process.platform === 'win32' ? child.pid : -child.pid, signal);
	} catch {
		// already gone
	}
}

for (const signal of /** @type {NodeJS.Signals[]} */ (['SIGINT', 'SIGTERM', 'SIGHUP'])) {
	process.on(signal, () => {
		stop('SIGTERM');
		process.exit(128 + (signal === 'SIGINT' ? 2 : signal === 'SIGTERM' ? 15 : 1));
	});
}

// Once the loop is gone this process is re-parented, so ppid changes.
const watch = setInterval(() => {
	if (process.ppid !== parent) {
		stop('SIGTERM');
		process.exit(143);
	}
}, 500);

child.on('error', (err) => {
	clearInterval(watch);
	console.error(`agent-guard: ${command}: ${err.message}`);
	process.exit(127);
});
child.on('exit', (code) => {
	clearInterval(watch);
	process.exit(code ?? 1);
});
