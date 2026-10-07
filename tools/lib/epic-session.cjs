/**
 * The epic-loop steps you take on a story's agent session, shared by the CLI (epic-loop.cjs)
 * and the dashboard: approving a plan you may have talked over with the planner, and releasing
 * a session the loop is holding because you messaged it.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { harnessDir } = require('./ss-tools.cjs');

/** @param {string} root @param {string} id */
const worktreeStateOf = (root, id) => path.join(harnessDir(root), 'worktrees', id, '.harness', 'state.md');

/**
 * Before a plan is approved, bring the two copies of its state together and check it.
 *
 * The planner session stays open while the plan waits for you. Whatever you change, by asking
 * the planner (it edits the worktree's .harness/state.md) or by editing <epic>/state/<id>.md
 * yourself, the newer copy wins and is copied over the other. The plan must still validate.
 * A story with no worktree yet is approved as is.
 *
 * @param {string} root main checkout
 * @param {string} epicDir
 * @param {string} id story id
 * @returns {{ ok: boolean; error: string; from: 'session' | 'state file' | '' }}
 */
function approvePlan(root, epicDir, id) {
	const session = worktreeStateOf(root, id);
	const stateFile = path.join(epicDir, 'state', `${id}.md`);
	if (!fs.existsSync(path.dirname(path.dirname(session)))) return { ok: true, error: '', from: '' };

	/** @type {'session' | 'state file' | ''} */
	let from = '';
	const mtime = (/** @type {string} */ f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : -1);
	if (mtime(session) > mtime(stateFile)) {
		fs.mkdirSync(path.dirname(stateFile), { recursive: true });
		fs.copyFileSync(session, stateFile);
		from = 'session';
	} else if (mtime(stateFile) > mtime(session)) {
		fs.mkdirSync(path.dirname(session), { recursive: true });
		fs.copyFileSync(stateFile, session);
		from = 'state file';
	}

	const res = spawnSync(process.execPath, [path.join(__dirname, '..', 'validate-state.cjs'), '.', '--mode', 'plan'], {
		cwd: path.dirname(path.dirname(session)),
		encoding: 'utf8',
	});
	if (res.status !== 0) return { ok: false, error: `plan no longer validates: ${String(res.stderr || res.stdout).trim().slice(-500)}`, from };
	return { ok: true, error: '', from };
}

/** @param {string} loopDir @param {string} id */
const releaseFileOf = (loopDir, id) => path.join(loopDir, 'release', id);

/** Ask the loop to stop holding a story's session. @param {string} loopDir @param {string} id */
function requestRelease(loopDir, id) {
	fs.mkdirSync(path.dirname(releaseFileOf(loopDir, id)), { recursive: true });
	fs.writeFileSync(releaseFileOf(loopDir, id), new Date().toISOString(), 'utf8');
}

/**
 * True once after requestRelease (the request is used up).
 * @param {string} loopDir @param {string} id
 */
function takeRelease(loopDir, id) {
	const file = releaseFileOf(loopDir, id);
	if (!fs.existsSync(file)) return false;
	fs.rmSync(file, { force: true });
	return true;
}

module.exports = { approvePlan, requestRelease, takeRelease };
