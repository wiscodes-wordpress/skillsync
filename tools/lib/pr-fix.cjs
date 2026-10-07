/**
 * Fix a pull request's failing CI checks with one fresh agent, then commit and push.
 * Shared by tools/pr-watch.cjs and tools/epic-loop.cjs.
 */

const path = require('node:path');
const { runCommand } = require('./ss-tools.cjs');
const { failedLog } = require('./pr-checks.cjs');
const { runAgent } = require('./agent-runner.cjs');

/**
 * @param {string} cwd
 * @returns {boolean}
 */
function isClean(cwd) {
	return runCommand(cwd, 'git status --porcelain').stdout.trim() === '';
}

/**
 * Stage everything in the checkout except `.harness/` (local planning files, never shipped)
 * and the agent's `.claude/settings.local.json` (see paseo-agent.cjs), and commit. Only call on a checkout the loop owns (a story worktree, or a tree verified
 * clean before the agent ran).
 *
 * @param {string} cwd
 * @param {string} message
 * @returns {{ committed: boolean; sha: string; error: string }}
 */
function commitAll(cwd, message) {
	runCommand(cwd, "git add -A -- . ':(exclude).harness' ':(exclude).claude/settings.local.json'");
	if (runCommand(cwd, 'git diff --cached --quiet').status === 0) return { committed: false, sha: '', error: '' };
	const res = runCommand(cwd, `git commit -m ${JSON.stringify(message)}`);
	if (res.status !== 0) return { committed: false, sha: '', error: res.stderr || res.stdout };
	return { committed: true, sha: runCommand(cwd, 'git rev-parse HEAD').stdout.trim(), error: '' };
}

/**
 * Fold the branch's commits since `base` into one, tree unchanged. The loop commits each cycle
 * as a local checkpoint (a later cycle's re-break can `git stash` / `git checkout --`), then
 * squashes before the first push so the PR carries one commit. Once the branch is on origin
 * nothing is rewritten: CI fixes land as their own commits.
 *
 * @param {string} cwd story worktree
 * @param {string} branch
 * @param {string} base base branch, e.g. `master`
 * @param {string} message
 * @returns {{ squashed: boolean; error: string }}
 */
function squashUnpushed(cwd, branch, base, message) {
	if (runCommand(cwd, `git rev-parse --verify --quiet ${JSON.stringify(`refs/remotes/origin/${branch}`)}`).status === 0) {
		return { squashed: false, error: '' };
	}
	const mergeBase = runCommand(cwd, `git merge-base HEAD ${JSON.stringify(`origin/${base}`)}`).stdout.trim();
	if (!mergeBase) return { squashed: false, error: `no merge base with origin/${base}` };
	if (Number(runCommand(cwd, `git rev-list --count ${mergeBase}..HEAD`).stdout.trim()) < 2) return { squashed: false, error: '' };
	const reset = runCommand(cwd, `git reset --soft ${mergeBase}`);
	if (reset.status !== 0) return { squashed: false, error: reset.stderr || reset.stdout };
	const res = runCommand(cwd, `git commit -m ${JSON.stringify(message)}`);
	if (res.status !== 0) {
		runCommand(cwd, 'git reset --soft ORIG_HEAD'); // back to the cycle commits
		return { squashed: false, error: res.stderr || res.stdout };
	}
	return { squashed: true, error: '' };
}

/**
 * @param {string} cwd
 * @param {string} branch
 * @returns {{ ok: boolean; error: string }}
 */
function push(cwd, branch) {
	const res = runCommand(cwd, `git push -u origin ${JSON.stringify(branch)}`);
	return { ok: res.status === 0, error: res.status === 0 ? '' : res.stderr };
}

/**
 * @param {import('./pr-checks.cjs').PrSummary} pr
 * @param {Record<string, string>} logs check name → failed-step log tail
 * @returns {string}
 */
function buildFixPrompt(pr, logs) {
	const sections = pr.failing.map((c) =>
		[`### ${c.name}`, c.url, '', '```text', (logs[c.name] || '(log unavailable — open the URL)').trim(), '```'].join('\n'),
	);
	return [
		`CI is failing on pull request #${pr.number} (branch ${pr.branch}, commit ${pr.headSha.slice(0, 7)}).`,
		'',
		'Fix only what this branch broke. Rules:',
		'- Read the failing log below, find the root cause, make the smallest fix.',
		'- Run the same check locally (the command the CI step runs) and confirm it passes.',
		'- Do not weaken, skip or delete tests to get green. If the failure is flaky or unrelated to this branch, change nothing and say why.',
		'- Do not commit or push; the loop does that after you stop.',
		'- Finish with one line: FIXED: <what changed> or NOT FIXED: <why>.',
		'',
		'## Failing checks',
		'',
		...sections,
	].join('\n');
}

/**
 * @param {object} opts
 * @param {string} opts.cwd checkout on the PR branch
 * @param {import('./pr-checks.cjs').PrSummary} opts.pr
 * @param {string} opts.logDir
 * @param {Record<string, any> | null} opts.config
 * @param {boolean} [opts.dryRun]
 * @returns {{ ok: boolean; detail: string; logFile: string }}
 */
function fixFailingChecks(opts) {
	const { cwd, pr } = opts;
	const branch = runCommand(cwd, 'git rev-parse --abbrev-ref HEAD').stdout.trim();
	if (branch !== pr.branch) {
		return { ok: false, detail: `checkout is on ${branch}, PR head is ${pr.branch}`, logFile: '' };
	}
	if (!isClean(cwd)) {
		return { ok: false, detail: 'working tree has uncommitted changes; refusing to let an agent mix in', logFile: '' };
	}

	/** @type {Record<string, string>} */
	const logs = {};
	for (const c of pr.failing) {
		if (c.runId && !opts.dryRun) logs[c.name] = failedLog(cwd, c.runId);
	}
	const logFile = path.join(opts.logDir, `fix-pr${pr.number}-${pr.headSha.slice(0, 7)}-${Date.now()}.log`);
	const run = runAgent({
		cwd,
		prompt: buildFixPrompt(pr, logs),
		logFile,
		config: opts.config,
		phase: 'fix',
		dryRun: opts.dryRun,
		title: `Fix CI on PR #${pr.number}`,
		labels: { phase: 'fix', pr: String(pr.number) },
		// A loop worktree keeps the agent's settings file; your own checkout gets it back as it was.
		ownsCwd: cwd.includes(`${path.sep}.harness${path.sep}worktrees${path.sep}`),
		// A fix session you talked to is done once it changed something.
		ready: () => !isClean(cwd),
	});
	if (opts.dryRun) return { ok: true, detail: 'dry run: fix agent not started', logFile };
	if (run.status !== 0) return { ok: false, detail: `fix agent exited ${run.status}`, logFile };

	const commit = commitAll(cwd, `Fix CI: ${pr.failing.map((c) => c.name).join(', ')}`);
	if (commit.error) return { ok: false, detail: `commit failed: ${commit.error.trim()}`, logFile };
	if (!commit.committed) return { ok: false, detail: 'fix agent changed nothing (see log)', logFile };
	const pushed = push(cwd, pr.branch);
	if (!pushed.ok) return { ok: false, detail: `push failed: ${pushed.error.trim()}`, logFile };
	return { ok: true, detail: `pushed ${commit.sha.slice(0, 7)}`, logFile };
}

module.exports = {
	isClean,
	commitAll,
	squashUnpushed,
	push,
	buildFixPrompt,
	fixFailingChecks,
};
