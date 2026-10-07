/**
 * On-demand preview servers for the epic dashboard: the app's dev server, run in a story's
 * worktree so a human can try the change before merging the PR.
 *
 *   "epicLoop": { "preview": { "command": "cd frontend && npm run dev -- --port {port} --strictPort", "basePort": 5180 } }
 *
 * `{port}` is replaced (PORT is also set). Each story gets basePort + its index in the epic, so
 * a story keeps the same URL across restarts. Servers run in their own process group and are
 * stopped from the dashboard, or when the dashboard exits.
 */

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { harnessDir } = require('./ss-tools.cjs');

/** @param {number} ms */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Dev servers bind to 127.0.0.1 or ::1 depending on the tool, so try both. @param {number} port */
async function reachable(port) {
	for (const host of ['127.0.0.1', '::1']) {
		const ok = await new Promise((resolve) => {
			const socket = net.connect({ port, host });
			socket.once('connect', () => {
				socket.end();
				resolve(true);
			});
			socket.once('error', () => resolve(false));
		});
		if (ok) return true;
	}
	return false;
}

/**
 * @param {{ root: string; loopDir: string; config?: { command?: string; basePort?: number } | null }} opts
 */
function createPreviews(opts) {
	const command = typeof opts.config?.command === 'string' ? opts.config.command : '';
	const basePort = Number(opts.config?.basePort) > 0 ? Number(opts.config?.basePort) : 5180;
	/** @type {Map<string, { pid: number; url: string }>} */
	const running = new Map();

	/** @param {string} id */
	function stop(id) {
		const server = running.get(id);
		running.delete(id);
		if (!server) return;
		try {
			process.kill(process.platform === 'win32' ? server.pid : -server.pid, 'SIGTERM');
		} catch {
			// already gone
		}
	}

	/**
	 * Start (or reuse) the preview for a story; resolves once its port answers.
	 * @param {string} id @param {number} index the story's position in the epic
	 * @returns {Promise<{ url?: string; error?: string }>}
	 */
	async function start(id, index) {
		if (!command) return { error: 'no epicLoop.preview.command in skillsync.config.json' };
		const port = basePort + index;
		const url = `http://localhost:${port}`;
		if (running.has(id) && (await reachable(port))) return { url };
		const cwd = path.join(harnessDir(opts.root), 'worktrees', id);
		if (!fs.existsSync(cwd)) return { error: `${id} has no worktree (not started, or already merged)` };
		if (await reachable(port)) return { error: `port ${port} is already in use by another process` };

		// Not in logs/: the dashboard and --tail treat the newest file there as the running agent.
		const logFile = path.join(opts.loopDir, 'previews', `${id}.log`);
		fs.mkdirSync(path.dirname(logFile), { recursive: true });
		const fd = fs.openSync(logFile, 'w');
		const child = spawn(command.replaceAll('{port}', String(port)), {
			cwd,
			shell: true,
			detached: process.platform !== 'win32',
			stdio: ['ignore', fd, fd],
			env: { ...process.env, PORT: String(port) },
		});
		fs.closeSync(fd);
		let exited = false;
		child.on('exit', () => {
			exited = true;
			if (running.get(id)?.pid === child.pid) running.delete(id);
		});
		if (!child.pid) return { error: `could not run: ${command}` };
		running.set(id, { pid: child.pid, url });

		for (let i = 0; i < 120 && !exited; i++) {
			if (await reachable(port)) return { url };
			await wait(500);
		}
		stop(id);
		const tail = fs.readFileSync(logFile, 'utf8').trim().split('\n').slice(-5).join(' | ');
		return { error: `preview did not start (${path.relative(opts.root, logFile)}): ${tail || 'no output'}` };
	}

	return {
		enabled: Boolean(command),
		start,
		stop,
		stopAll: () => [...running.keys()].forEach(stop),
		/** @param {string} id */
		urlOf: (id) => running.get(id)?.url ?? null,
	};
}

module.exports = { createPreviews };
