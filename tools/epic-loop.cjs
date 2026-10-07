#!/usr/bin/env node
/**
 * Deliver an epic's stories one at a time: plan → (you approve) → implement cycle by cycle
 * → review + security → commit, push, open PR → watch CI and fix failures → after you merge,
 * start the next story whose dependencies are merged.
 *
 * Usage:
 *   node path/to/skillsync/tools/epic-loop.cjs [/path/to/repo] --epic <epic dir>
 *     [--once] [--interval 60] [--dry-run] [--json] [--story <story id>]
 *   node path/to/skillsync/tools/epic-loop.cjs [/path/to/repo] --epic <dir> --status   (also refreshes the table in epic.md)
 *   node path/to/skillsync/tools/epic-loop.cjs [/path/to/repo] --epic <dir> --approve <story id>
 *   node path/to/skillsync/tools/epic-loop.cjs [/path/to/repo] --epic <dir> --release <story id>  (done talking to a held session)
 *   node path/to/skillsync/tools/epic-loop.cjs [/path/to/repo] --epic <dir> --ready [--json]   (what can start now)
 *   node path/to/skillsync/tools/epic-loop.cjs [/path/to/repo] --epic <dir> --file "<title>" [--from <story id>]
 *     [--depends-on <id,id>] [--note "<what and why>"]   (add a story: work found outside the current one)
 *   node path/to/skillsync/tools/epic-loop.cjs [/path/to/repo] --tail      (follow the loop and the running agent live)
 *   node path/to/skillsync/tools/epic-loop.cjs [/path/to/repo] --dashboard [--port 4747]   (live web view on 127.0.0.1)
 *
 * The epic dir holds epic.md and stories/*.md (frontmatter: see tools/lib/epic.cjs).
 * `--epic` may be omitted when skillsync.config.json sets `epicLoop.epic`.
 *
 * Each story runs in its own git worktree at .harness/worktrees/<id> on its own branch,
 * so your main checkout is never touched. The loop commits each completed cycle as a local
 * checkpoint, squashes them into one commit before the first push, and pushes that branch
 * only. Story harness state is kept at <epic>/state/<id>.md and copied into the worktree's
 * .harness/state.md around each agent.
 *
 * You stay in charge of two steps: approving each plan (--approve) and merging each PR.
 *
 * Agents run as Paseo sessions by default (tools/lib/paseo-agent.cjs): open one in Paseo to
 * read it or message it. Once you message a session, the loop holds that phase until its check
 * passes or you --release the story. The planner stays open while its plan waits for approval;
 * --approve takes whatever you and the planner changed.
 *
 * Parallel stories: `--story <id>` runs one ready story in its own process, beside the
 * default loop (one default loop per repo, one `--story` loop per story). Each process
 * claims its story in .harness/epic-loop/claims/, and the others skip it. A `--story`
 * loop exits once its story merges, or straight away if it is not ready.
 * With `epicLoop.parallel` (or `--parallel N`) above 1, the default loop starts those
 * `--story` loops itself for the other ready stories, up to N stories at once, and keeps
 * waiting while they run instead of exiting.
 *
 * Discovered work: agents file stories they find outside their own (`--file`), the way beads
 * agents file "discovered from" issues. A filed story is `todo` and needs plan approval
 * like any other; `epicLoop.maxFiledPerStory` (default 3) caps how many one story can file.
 *
 * Config (skillsync.config.json → epicLoop): epic, base, setup (shell commands run once in
 * a new worktree), maxAttempts (default 2), maxFixes (default 3), intervalSec (default 60),
 * notify (macOS notification, default true), parallel (default 1), maxFiledPerStory (default 3),
 * agent (see tools/lib/agent-runner.cjs).
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
	readOptionalConfig,
	runCommand,
	parseMarkdownSections,
	parseCompletedRemaining,
	extractCycleBlock,
	checkCycleAgentOutcome,
	gitExclude,
	assertOrExit,
} = require('./lib/ss-tools.cjs');
const { ACTIVE_STATUSES, loadEpic, writeStory, nextStory, readyStories, fileStory, writeStoryTable, renderStoryTable } = require('./lib/epic.cjs');
const { runAgent, checkAgentModels, formatStreamLine, resolveAgent, paseoReady } = require('./lib/agent-runner.cjs');
const { archiveSessions } = require('./lib/paseo-agent.cjs');
const { approvePlan, requestRelease, takeRelease } = require('./lib/epic-session.cjs');
const { fetchPr } = require('./lib/pr-checks.cjs');
const { commitAll, squashUnpushed, push, fixFailingChecks } = require('./lib/pr-fix.cjs');
const { startDashboard, launchStoryLoop } = require('./lib/epic-dashboard.cjs');

const TOOLS_DIR = __dirname;

/** @param {number} ms */
function sleep(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** @param {string} raw */
function slugify(raw) {
	return raw
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50);
}

/**
 * @typedef {object} Ctx
 * @property {string} root main checkout
 * @property {ReturnType<typeof loadEpic>} epic
 * @property {Record<string, any>} cfg epicLoop config
 * @property {Record<string, any> | null} config whole skillsync.config.json
 * @property {string} loopDir .harness/epic-loop
 * @property {Map<string, number>} [spawned] story id → pid of `--story` loops this process started (parallel)
 * @property {boolean} [json] --json: progress lines go to stderr
 * @property {string} [only] `--story <id>`: this process works that one story, then exits
 */

/**
 * @typedef {import('./lib/epic.cjs').Story} Story
 * @typedef {{ action: string; detail: string; wait: boolean }} TickResult
 */

/** @param {Ctx} ctx @param {Story} story */
const worktreeOf = (ctx, story) => path.join(harnessDir(ctx.root), 'worktrees', story.id);
/** @param {Ctx} ctx @param {Story} story */
const stateFileOf = (ctx, story) => path.join(ctx.epic.dir, 'state', `${story.id}.md`);
/** @param {Ctx} ctx @param {Story} story @param {string} phase */
const logFileOf = (ctx, story, phase) =>
	path.join(ctx.loopDir, 'logs', `${story.id}-${phase}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/** @param {Ctx} ctx @param {string} line */
function progress(ctx, line) {
	const stamped = `${new Date().toISOString()} ${line}`;
	// With --json, stdout carries only JSON.
	(ctx.json ? console.error : console.log)(line);
	fs.mkdirSync(ctx.loopDir, { recursive: true });
	fs.appendFileSync(path.join(ctx.loopDir, 'progress.log'), `${stamped}\n`, 'utf8');
}

/** @param {Ctx} ctx @param {string} message */
function notify(ctx, message) {
	if (ctx.cfg.notify === false || process.platform !== 'darwin') return;
	runCommand(ctx.root, `osascript -e ${JSON.stringify(`display notification ${JSON.stringify(message)} with title "epic-loop"`)}`);
}

/** @param {Ctx} ctx @param {Story} story @param {Partial<Story>} patch */
function save(ctx, story, patch) {
	Object.assign(story, patch);
	writeStory(story);
	// Re-read from disk: another loop process may have moved a different story since we loaded.
	writeStoryTable(ctx.epic.file, loadEpic(ctx.epic.dir).stories);
}

// ---------------------------------------------------------------- story claims
// Each loop process claims the story it works on (.harness/epic-loop/claims/<id>.pid), so a
// `--story` loop and the default loop never pick the same story.

/** @param {number} pid */
function pidAlive(pid) {
	if (!Number.isInteger(pid) || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/** @param {Ctx} ctx */
const claimsDir = (ctx) => path.join(ctx.loopDir, 'claims');

/** @param {Ctx} ctx @returns {Map<string, number>} story id → pid of another live loop */
function claimsByOthers(ctx) {
	/** @type {Map<string, number>} */
	const others = new Map();
	const dir = claimsDir(ctx);
	if (!fs.existsSync(dir)) return others;
	for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.pid'))) {
		const pid = Number.parseInt(fs.readFileSync(path.join(dir, f), 'utf8'), 10);
		if (pid !== process.pid && pidAlive(pid)) others.set(f.slice(0, -'.pid'.length), pid);
	}
	return others;
}

/** Drop this process's claims, optionally keeping one story. @param {Ctx} ctx @param {string} [keep] */
function releaseClaims(ctx, keep) {
	const dir = claimsDir(ctx);
	if (!fs.existsSync(dir)) return;
	for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.pid'))) {
		if (f === `${keep}.pid`) continue;
		const file = path.join(dir, f);
		try {
			if (fs.readFileSync(file, 'utf8') === String(process.pid)) fs.unlinkSync(file);
		} catch {
			// already gone
		}
	}
}

/** @param {Ctx} ctx @param {string} id */
function claim(ctx, id) {
	releaseClaims(ctx, id);
	fs.mkdirSync(claimsDir(ctx), { recursive: true });
	fs.writeFileSync(path.join(claimsDir(ctx), `${id}.pid`), String(process.pid), 'utf8');
}

/** @param {Ctx} ctx @param {Story} story @param {string} reason */
function block(ctx, story, reason) {
	story.meta.blocked_reason = reason;
	story.meta.blocked_from = story.status; // where Retry (dashboard) sends it back to
	save(ctx, story, { status: 'blocked' });
	progress(ctx, `${story.id}: blocked — ${reason}`);
	notify(ctx, `${story.id} blocked: ${reason}`);
	return { action: 'blocked', detail: reason, wait: false };
}

/**
 * Count a failed attempt; block the story once the cap is passed.
 * @param {Ctx} ctx @param {Story} story @param {string} reason
 * @returns {TickResult}
 */
function failAttempt(ctx, story, reason) {
	const attempts = story.attempts + 1;
	const max = Number(ctx.cfg.maxAttempts ?? 2);
	if (attempts > max) return block(ctx, story, `${reason} (after ${max} attempts)`);
	save(ctx, story, { attempts });
	progress(ctx, `${story.id}: attempt ${attempts}/${max} failed — ${reason}`);
	return { action: 'retry', detail: reason, wait: false };
}

/** Copy story state into the worktree before an agent runs. @param {Ctx} ctx @param {Story} story */
function stateIn(ctx, story) {
	const src = stateFileOf(ctx, story);
	// A session left running by a stopped loop still works on the worktree's copy; the loop
	// reattaches to it, so keep that copy and hand back the state from before the phase.
	if (story.meta.session_open === 'yes') return fs.existsSync(src) ? fs.readFileSync(src, 'utf8') : '';
	const dest = path.join(worktreeOf(ctx, story), '.harness', 'state.md');
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	if (fs.existsSync(src)) fs.copyFileSync(src, dest);
	else if (fs.existsSync(dest)) fs.rmSync(dest);
	return fs.existsSync(src) ? fs.readFileSync(src, 'utf8') : '';
}

/** Copy the worktree's state back after an agent runs. @param {Ctx} ctx @param {Story} story */
function stateOut(ctx, story) {
	const src = path.join(worktreeOf(ctx, story), '.harness', 'state.md');
	if (!fs.existsSync(src)) return '';
	const dest = stateFileOf(ctx, story);
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.copyFileSync(src, dest);
	return fs.readFileSync(dest, 'utf8');
}

const SESSION_NOTE = [
	'',
	'## If the human messages you',
	'This session can be opened in Paseo. If the human writes to you, answer them and follow their direction,',
	'then finish the task above (update .harness/state.md as it asks). Their message overrides the defaults above.',
].join('\n');

/**
 * Beads-style discovered work: out-of-scope work becomes a new story instead of scope creep.
 * @param {Ctx} ctx @param {Story} story
 */
const discoveredNote = (ctx, story) =>
	[
		'',
		'## Work outside this story',
		'If you find work this story should not do (a bug elsewhere, missing groundwork, a follow-up), do not do it here. File it:',
		`  node ${JSON.stringify(path.join(TOOLS_DIR, 'epic-loop.cjs'))} ${JSON.stringify(ctx.root)} --epic ${JSON.stringify(ctx.epic.dir)} --file "<short title>" --from ${story.id} --note "<what and why>" [--depends-on <story ids>]`,
		'Add --depends-on only for stories that must merge first. It prints the new story id: mention it in .harness/state.md.',
		'Filing does not start the story; the human approves its plan like any other. File only real, separate work.',
	].join('\n');

/** @param {Ctx} ctx */
const epicLabel = (ctx) => ctx.epic.meta.id || path.basename(ctx.epic.dir);

/**
 * Run one phase's agent. With the Paseo runner the phase is a chat you can open: the story
 * records it as `session` (kept after the phase, for reading and the dashboard's Open button).
 * While it runs, `session_open` lets a restarted loop reattach to it instead of starting a
 * second agent in the same worktree. Once you message it, the loop holds the phase
 * (`session_held`) until `ready` passes or you release it.
 *
 * @param {Ctx} ctx @param {Story} story @param {string} phase @param {string} prompt
 * @param {() => boolean} [ready] the phase's own check, run on an idle session you talked to
 */
function agent(ctx, story, phase, prompt, ready) {
	const logFile = logFileOf(ctx, story, phase);
	progress(ctx, `${story.id}: ${phase} agent started (log: ${path.relative(ctx.root, logFile)})`);
	const m = story.meta;
	const resume = m.session_open === 'yes' && m.session_phase === phase && m.session ? { id: m.session, sentAt: Number(m.session_sent_at) || 0 } : null;
	// Agents work in the story worktree but need the skillsync tools/skills and the epic's plan files.
	const addDirs = [path.dirname(TOOLS_DIR), ctx.epic.dir];
	takeRelease(ctx.loopDir, story.id); // a release left over from an earlier hold is not for this one
	const run = runAgent({
		cwd: worktreeOf(ctx, story),
		prompt: prompt + discoveredNote(ctx, story) + SESSION_NOTE,
		logFile,
		config: ctx.config,
		phase,
		addDirs,
		ownsCwd: true,
		title: `${story.id} ${phase} — ${story.title}`,
		labels: { epicLoop: epicLabel(ctx), story: story.id, phase },
		resume,
		ready,
		released: () => takeRelease(ctx.loopDir, story.id),
		onSession: ({ id, sentAt }) => {
			Object.assign(m, { session: id, session_phase: phase, session_sent_at: String(sentAt), session_open: 'yes' });
			save(ctx, story, {});
			progress(ctx, `${story.id}: ${phase} ${resume ? 'reattached to' : 'is'} Paseo session ${id.slice(0, 8)}; open it in Paseo to read or talk to it`);
		},
		onHold: (held) => {
			if (held) m.session_held = 'yes';
			else delete m.session_held;
			save(ctx, story, {});
			if (held) {
				progress(ctx, `${story.id}: ${phase} held: you messaged the session. It continues when its check passes, or run --release ${story.id}`);
				notify(ctx, `${story.id} ${phase} is waiting on you in Paseo`);
			}
		},
		onAttention: (reason) => {
			progress(ctx, `${story.id}: ${phase} needs you: ${reason}`);
			notify(ctx, `${story.id} ${phase}: ${reason}`);
		},
	});
	delete m.session_open;
	delete m.session_held;
	save(ctx, story, {});
	if (run.fallback) progress(ctx, `${story.id}: ${phase} ran headless (claude -p): ${run.fallback}`);
	progress(ctx, `${story.id}: ${phase} agent exited ${run.status}${run.intervened ? ' (you joined the session)' : ''}`);
	return run;
}

/** @param {Ctx} ctx */
function baseBranch(ctx) {
	if (typeof ctx.cfg.base === 'string') return ctx.cfg.base;
	const res = runCommand(ctx.root, 'gh repo view --json defaultBranchRef -q .defaultBranchRef.name');
	return res.status === 0 && res.stdout.trim() ? res.stdout.trim() : 'main';
}

/** @param {Ctx} ctx @param {Story} story */
function storyContext(ctx, story) {
	const epicBody = fs.readFileSync(ctx.epic.file, 'utf8');
	return [
		`## Story ${story.id} — ${story.title}`,
		'',
		story.body.trim(),
		'',
		'## Epic (context only)',
		'',
		epicBody.trim(),
	].join('\n');
}

// ---------------------------------------------------------------- phases

/** @param {Ctx} ctx @param {Story} story @returns {TickResult} */
function startStory(ctx, story) {
	const base = baseBranch(ctx);
	const branch = story.branch || `feature/${slugify(`${story.id}-${story.title}`)}`;
	const wt = worktreeOf(ctx, story);

	// The base branch may not ignore .harness/ yet; keep it out of every worktree's index.
	gitExclude(ctx.root, '.harness/');

	if (!fs.existsSync(wt)) {
		runCommand(ctx.root, `git fetch origin ${base}`);
		const exists = runCommand(ctx.root, `git rev-parse --verify --quiet ${JSON.stringify(branch)}`).status === 0;
		const add = exists
			? `git worktree add ${JSON.stringify(wt)} ${JSON.stringify(branch)}`
			: `git worktree add -b ${JSON.stringify(branch)} ${JSON.stringify(wt)} origin/${base}`;
		const res = runCommand(ctx.root, add);
		if (res.status !== 0) return block(ctx, story, `git worktree add failed: ${res.stderr.trim()}`);
		for (const cmd of ctx.cfg.setup ?? []) {
			progress(ctx, `${story.id}: setup — ${cmd}`);
			const setup = runCommand(wt, cmd);
			if (setup.status !== 0) return block(ctx, story, `setup "${cmd}" failed: ${setup.stderr.trim().slice(-500)}`);
		}
	}
	save(ctx, story, { branch, status: 'planning', attempts: 0 });
	progress(ctx, `${story.id}: started on ${branch} (worktree ${path.relative(ctx.root, wt)})`);
	return { action: 'started', detail: branch, wait: false };
}

/**
 * Why the worktree's plan isn't ready for approval yet, or '' when it is.
 * @param {Ctx} ctx @param {Story} story
 */
function planProblem(ctx, story) {
	const state = stateOut(ctx, story);
	const valid = runCommand(worktreeOf(ctx, story), `node ${JSON.stringify(path.join(TOOLS_DIR, 'validate-state.cjs'))} . --mode plan`);
	if (!state || valid.status !== 0) return `plan invalid: ${(valid.stderr || valid.stdout).trim()}`;
	if (parseCompletedRemaining(state).remaining.length === 0) return 'plan lists no Remaining cycles';
	return '';
}

/** @param {Ctx} ctx @param {Story} story @returns {TickResult} */
function planStory(ctx, story) {
	stateIn(ctx, story);
	const prompt = [
		`Plan story ${story.id} with the ss-plan skill (domain grill → TDD grill → harness-planner-tdd) and write .harness/state.md.`,
		'',
		'You are running inside the epic loop. Do not stop to ask questions: nobody is watching by default.',
		'- For each major decision, choose your recommended option and record it under a `## Open Decisions` section',
		'  (decision, options, choice, one-line why). The human reviews these before approving the plan.',
		'- List minor defaults you assumed under `## Assumptions`.',
		'- Use real paths from this checkout; read AGENTS.md / CLAUDE.md / README first.',
		'- State must pass: node ' + path.join(TOOLS_DIR, 'validate-state.cjs') + ' . --mode plan',
		'- Remaining must list every planned cycle (e.g. `## Remaining` → `Cycle 1, Cycle 2`).',
		'- Do not write production code or tests. Do not commit.',
		'',
		storyContext(ctx, story),
	].join('\n');
	const run = agent(ctx, story, 'plan', prompt, () => planProblem(ctx, story) === '');
	stateOut(ctx, story);
	if (run.status !== 0) return failAttempt(ctx, story, `plan agent exited ${run.status}`);
	const problem = planProblem(ctx, story);
	if (problem) return failAttempt(ctx, story, problem);

	save(ctx, story, { status: 'awaiting-approval', attempts: 0 });
	const rel = path.relative(ctx.root, stateFileOf(ctx, story));
	progress(ctx, `${story.id}: plan ready for review — ${rel}. Approve with --approve ${story.id}`);
	notify(ctx, `${story.id} plan ready for your approval`);
	return { action: 'planned', detail: rel, wait: false };
}

/**
 * Approve a plan without waiting for a human, when `epicLoop.autoApprove` is set. Mirrors the
 * `--approve` flag: takes whatever the planner session left (session or state file, newest wins)
 * and validates it through `approvePlan` before moving on. A plan that fails validation keeps the
 * story waiting instead of implementing something invalid, so this skips the human, not the check.
 * @param {Ctx} ctx
 * @param {Story} story
 * @returns {TickResult}
 */
function autoApproveStory(ctx, story) {
	const approved = approvePlan(ctx.root, ctx.epic.dir, story.id);
	if (!approved.ok) {
		return { action: 'waiting', detail: `auto-approve blocked: ${approved.error.trim()}`, wait: true };
	}
	save(ctx, story, { status: 'implementing', attempts: 0 });
	progress(
		ctx,
		`${story.id}: plan auto-approved${approved.from === 'session' ? " (with the planner session's changes)" : ''} → implementing`,
	);
	return { action: 'approved', detail: 'auto-approved', wait: false };
}

/** @param {Ctx} ctx @param {Story} story @returns {TickResult} */
function implementStory(ctx, story) {
	const before = stateIn(ctx, story);
	const { remaining } = parseCompletedRemaining(before);
	if (remaining.length === 0) {
		save(ctx, story, { status: 'reviewing', attempts: 0 });
		progress(ctx, `${story.id}: all cycles done → review`);
		return { action: 'implemented', detail: 'no Remaining cycles', wait: false };
	}

	const cycle = remaining[0];
	const sections = parseMarkdownSections(before);
	const plan = sections.get('RED→GREEN Plan') ?? sections.get('RED->GREEN Plan') ?? '';
	const prompt = [
		`Implement Cycle ${cycle} only of story ${story.id}, following the ss-implement skill (harness-generator + tdd) with scope "only Cycle ${cycle}".`,
		'',
		'You are running unattended inside the epic loop.',
		`- RED: write the planned test, run the Verification Plan command for Cycle ${cycle}, confirm it FAILS for the planned reason.`,
		'- GREEN: smallest production change; same command PASSES; do not weaken the test.',
		'- Re-break: revert the production change, confirm FAIL, restore, confirm PASS.',
		`- Update .harness/state.md: append the TDD Evidence row, move Cycle ${cycle} from Remaining to Completed.`,
		'- Run the suite-level checks from the Verification Plan if this was the last cycle.',
		'- Do not commit or push; the loop commits after you stop. Do not start other cycles.',
		'',
		`## Cycle ${cycle} plan`,
		extractCycleBlock(plan, cycle) || '(see .harness/state.md)',
	].join('\n');
	const run = agent(ctx, story, `cycle${cycle}`, prompt, () => checkCycleAgentOutcome(before, stateOut(ctx, story), cycle).ok);
	const after = stateOut(ctx, story);
	if (run.status !== 0) return failAttempt(ctx, story, `Cycle ${cycle} agent exited ${run.status}`);

	const outcome = checkCycleAgentOutcome(before, after, cycle);
	if (!outcome.ok) return failAttempt(ctx, story, `Cycle ${cycle}: ${outcome.errors.join('; ')}`);

	const name = (extractCycleBlock(plan, cycle).match(/\*\*name\*\*\s*\|\s*([^|\n]+)/)?.[1] ?? '').trim();
	const commit = commitAll(worktreeOf(ctx, story), name || story.title);
	if (commit.error) return block(ctx, story, `commit failed: ${commit.error.trim()}`);
	save(ctx, story, { attempts: 0 });
	progress(ctx, `${story.id}: Cycle ${cycle} done${commit.committed ? ` (${commit.sha.slice(0, 7)})` : ''}`);
	return { action: 'cycle', detail: `Cycle ${cycle}`, wait: false };
}

/**
 * PASS / FAIL from `## Last Critic Verdict`. Agents sometimes write the verdict as a heading of
 * the same level right under it (`## Critic Verdict: PASS`), which ends that section, so a
 * `## Critic Verdict…` section counts too.
 * @param {string} state
 * @returns {'PASS' | 'FAIL' | null}
 */
function criticVerdict(state) {
	const sections = parseMarkdownSections(state);
	const candidates = [
		sections.get('Last Critic Verdict') ?? '',
		...[...sections.keys()].filter((k) => /^Critic Verdict\b/.test(k)).map((k) => `${k}\n${sections.get(k)}`),
	];
	for (const text of candidates) {
		const m = text.match(/\b(PASS|FAIL)\b/);
		if (m) return /** @type {'PASS' | 'FAIL'} */ (m[1]);
	}
	return null;
}

/** @param {Ctx} ctx @param {Story} story @returns {TickResult} */
function reviewStory(ctx, story) {
	const wt = worktreeOf(ctx, story);
	const base = baseBranch(ctx);
	stateIn(ctx, story);
	const prompt = [
		`Review story ${story.id} on this branch against origin/${base}, unattended, inside the epic loop.`,
		'',
		'1. Run the ss-review skill (harness-critic): check every cycle against Behavior & Test Contracts and Acceptance Criteria.',
		'   Write `## Last Critic Verdict` in .harness/state.md with PASS or FAIL and the findings.',
		'   On FAIL with fixable findings: add new cycles for them to the RED→GREEN Plan, Verification Plan and `## Remaining`.',
		`2. Run the ss-security-audit skill so that \`node ${path.join(TOOLS_DIR, 'security-audit.cjs')} . --check-state\` passes, or record why it fails.`,
		'3. Run the full gate from the Verification Plan (all tests, lint, build; E2E if the repo has it).',
		'4. Write .harness/pr-body.md per the submit-github-pr skill: Purpose, Changes Made, optional Visual checks. Terse.',
		'5. Write `## Preview` in .harness/state.md for the human who tries the change in the running app before merging.',
		'   One line per app route this story changed or added: `- /route — what to look at and what should happen`.',
		'   If nothing is visible in the app (library, config or test-only change), write one line: `none — <why>`.',
		'Do not commit, push or open the PR; the loop does that.',
		'',
		storyContext(ctx, story),
	].join('\n');
	const run = agent(ctx, story, 'review', prompt, () => criticVerdict(stateOut(ctx, story)) !== null);
	const state = stateOut(ctx, story);
	if (run.status !== 0) return failAttempt(ctx, story, `review agent exited ${run.status}`);

	const verdict = criticVerdict(state);
	if (verdict !== 'PASS') {
		if (parseCompletedRemaining(state).remaining.length > 0) {
			save(ctx, story, { status: 'implementing' });
			progress(ctx, `${story.id}: review FAIL → fix cycles added, back to implement`);
			return { action: 'review-fail', detail: 'new cycles', wait: false };
		}
		return failAttempt(ctx, story, `review verdict ${verdict ?? 'missing'}`);
	}
	const sec = runCommand(wt, `node ${JSON.stringify(path.join(TOOLS_DIR, 'security-audit.cjs'))} . --check-state`);
	if (sec.status !== 0) return failAttempt(ctx, story, `security gate: ${(sec.stderr || sec.stdout).trim()}`);

	const commit = commitAll(wt, 'Address review findings');
	if (commit.error) return block(ctx, story, `commit failed: ${commit.error.trim()}`);
	const squash = squashUnpushed(wt, story.branch, base, story.title);
	if (squash.error) return block(ctx, story, `squash failed: ${squash.error.trim()}`);
	const pushed = push(wt, story.branch);
	if (!pushed.ok) return block(ctx, story, `push failed: ${pushed.error.trim()}`);

	const bodyFile = path.join(wt, '.harness', 'pr-body.md');
	if (!fs.existsSync(bodyFile)) fs.writeFileSync(bodyFile, `## Purpose of PR\n\n${story.title}\n`, 'utf8');
	const create = runCommand(
		wt,
		`gh pr create --base ${base} --head ${JSON.stringify(story.branch)} --title ${JSON.stringify(story.title)} --body-file ${JSON.stringify(bodyFile)}`,
	);
	const url = (create.stdout.match(/https:\/\/\S+\/pull\/\d+/) ?? create.stderr.match(/https:\/\/\S+\/pull\/\d+/))?.[0];
	if (!url) return block(ctx, story, `gh pr create failed: ${create.stderr.trim()}`);
	const pr = Number(url.split('/').pop());
	save(ctx, story, { status: 'pr-open', pr, attempts: 0 });
	progress(ctx, `${story.id}: PR opened ${url}`);
	notify(ctx, `${story.id} PR #${pr} opened`);
	return { action: 'pr-opened', detail: url, wait: false };
}

/** @param {Ctx} ctx @param {Story} story @returns {TickResult} */
function watchStoryPr(ctx, story) {
	const wt = worktreeOf(ctx, story);
	const pr = fetchPr(fs.existsSync(wt) ? wt : ctx.root, story.pr ?? story.branch);
	if (!pr) return { action: 'waiting', detail: `PR ${story.pr} not readable via gh`, wait: true };

	if (pr.state === 'merged') {
		if (fs.existsSync(wt)) runCommand(ctx.root, `git worktree remove --force ${JSON.stringify(wt)}`);
		if (resolveAgent(ctx.config).runner === 'paseo') {
			const ready = paseoReady(ctx.config);
			// Archived chats stay readable in Paseo (show archived).
			if (ready.ok) archiveSessions(ready.bin, ctx.root, { epicLoop: epicLabel(ctx), story: story.id });
		}
		save(ctx, story, { status: 'merged' });
		progress(ctx, `${story.id}: PR #${pr.number} merged`);
		notify(ctx, `${story.id} merged — starting the next story`);
		return { action: 'merged', detail: `#${pr.number}`, wait: false };
	}
	if (pr.state === 'closed') return block(ctx, story, `PR #${pr.number} closed without merge`);

	if (pr.state === 'failing' && story.meta.fixed_sha !== pr.headSha) {
		const fixes = Number(story.meta.fix_attempts ?? 0);
		const max = Number(ctx.cfg.maxFixes ?? 3);
		if (fixes >= max) return block(ctx, story, `CI still failing after ${max} fix attempts: ${pr.failing.map((c) => c.name).join(', ')}`);
		story.meta.fixed_sha = pr.headSha;
		story.meta.fix_attempts = String(fixes + 1);
		save(ctx, story, {});
		progress(ctx, `${story.id}: CI failing (${pr.failing.map((c) => c.name).join(', ')}) — fix attempt ${fixes + 1}/${max}`);
		// Stories started outside the loop have no worktree; fixFailingChecks checks the branch and a clean tree.
		const cwd = fs.existsSync(wt) ? wt : ctx.root;
		const result = fixFailingChecks({ cwd, pr, logDir: path.join(ctx.loopDir, 'logs'), config: ctx.config });
		progress(ctx, `${story.id}: ${result.ok ? 'fix pushed' : 'no fix'} — ${result.detail}`);
		return { action: 'ci-fix', detail: result.detail, wait: true };
	}
	const detail = pr.state === 'green' ? 'CI green — waiting for you to merge' : `CI ${pr.state}`;
	return { action: 'waiting', detail, wait: true };
}

// ---------------------------------------------------------------- live view

/**
 * Follow progress.log and the newest agent log, printing readable lines. Runs until Ctrl-C.
 * @param {string} loopDir
 */
function tail(loopDir) {
	const logsDir = path.join(loopDir, 'logs');
	const progressFile = path.join(loopDir, 'progress.log');
	/** @type {Map<string, number>} */
	const offsets = new Map();
	/** @type {Map<string, string>} */
	const partial = new Map();
	let current = '';

	/** @param {string} file @param {(line: string) => void} onLine @param {boolean} fromEnd */
	const follow = (file, onLine, fromEnd) => {
		if (!fs.existsSync(file)) return;
		const size = fs.statSync(file).size;
		if (!offsets.has(file)) offsets.set(file, fromEnd ? size : 0);
		const start = /** @type {number} */ (offsets.get(file));
		if (size <= start) return;
		const fd = fs.openSync(file, 'r');
		const buf = Buffer.alloc(size - start);
		fs.readSync(fd, buf, 0, buf.length, start);
		fs.closeSync(fd);
		offsets.set(file, size);
		const lines = ((partial.get(file) ?? '') + buf.toString('utf8')).split('\n');
		partial.set(file, lines.pop() ?? '');
		for (const line of lines) onLine(line);
	};

	console.log(`epic-loop --tail: watching ${path.relative(process.cwd(), loopDir) || loopDir} (Ctrl-C to stop)`);
	for (;;) {
		follow(progressFile, (line) => line && console.log(`[loop] ${line.replace(/^\S+ /, '')}`), true);
		const newest = fs.existsSync(logsDir)
			? fs
					.readdirSync(logsDir)
					.filter((f) => f.endsWith('.log'))
					.map((f) => path.join(logsDir, f))
					.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]
			: undefined;
		if (newest && newest !== current) {
			current = newest;
			console.log(`[agent] ${path.basename(newest, '.log')}`);
		}
		if (current) {
			let inOutput = offsets.has(current);
			follow(
				current,
				(line) => {
					if (line === '--- output ---') inOutput = true;
					if (!inOutput) return;
					const out = line.startsWith('--- ') ? line : formatStreamLine(line);
					if (out) console.log(out.replace(/^/gm, '        '));
				},
				false,
			);
		}
		sleep(1000);
	}
}

// ---------------------------------------------------------------- driver

/** @param {Ctx} ctx @param {boolean} dryRun @returns {TickResult & { story: string | null }} */
function tick(ctx, dryRun) {
	const others = claimsByOthers(ctx);
	// A story loop this process just started may not have claimed its story yet.
	for (const [id, pid] of ctx.spawned ?? []) if (pidAlive(pid) && !others.has(id)) others.set(id, pid);
	if (ctx.only && others.has(ctx.only)) {
		return { story: ctx.only, action: 'idle', detail: `${ctx.only} is already run by another epic-loop (pid ${others.get(ctx.only)})`, wait: false };
	}
	const { story, reason } = nextStory(ctx.epic.stories, { only: ctx.only, skip: new Set(others.keys()) });
	if (!story) return { story: null, action: 'idle', detail: reason, wait: false };
	if (!dryRun) claim(ctx, story.id);

	/** @type {Record<string, string>} */
	const plannedAction = {
		todo: 'start',
		planning: 'plan',
		'awaiting-approval': 'await-approval',
		implementing: 'implement',
		reviewing: 'review',
		'pr-open': 'watch-pr',
	};
	if (dryRun) return { story: story.id, action: plannedAction[story.status], detail: reason, wait: false };

	/** @type {TickResult} */
	let result;
	switch (story.status) {
		case 'todo':
			result = startStory(ctx, story);
			break;
		case 'planning':
			result = planStory(ctx, story);
			break;
		case 'awaiting-approval':
			result = ctx.cfg.autoApprove
				? autoApproveStory(ctx, story)
				: { action: 'waiting', detail: `plan awaiting approval (--approve ${story.id})`, wait: true };
			break;
		case 'implementing':
			result = implementStory(ctx, story);
			break;
		case 'reviewing':
			result = reviewStory(ctx, story);
			break;
		default:
			result = watchStoryPr(ctx, story);
	}
	return { story: story.id, ...result };
}

/**
 * Parallel stories: which ready stories to hand to new `--story` loops so that `parallel`
 * stories run at once (this loop's own story counts as one).
 * @param {Ctx} ctx @param {number} parallel @param {Map<string, number>} spawned story id → pid started here
 * @returns {{ ids: string[]; running: number }}
 */
function parallelPlan(ctx, parallel, spawned) {
	if (parallel <= 1 || ctx.only) return { ids: [], running: 0 };
	for (const [id, pid] of spawned) if (!pidAlive(pid)) spawned.delete(id);
	const busy = new Set([...claimsByOthers(ctx).keys(), ...spawned.keys()]);
	const mine = nextStory(ctx.epic.stories, { skip: busy }).story;
	if (mine) busy.add(mine.id);
	const ids = readyStories(ctx.epic.stories, busy)
		.slice(0, Math.max(0, parallel - busy.size))
		.map((s) => s.id);
	return { ids, running: busy.size };
}

/** @param {Ctx} ctx @param {number} parallel @param {Map<string, number>} spawned */
function startParallelLoops(ctx, parallel, spawned) {
	let { ids, running } = parallelPlan(ctx, parallel, spawned);
	for (const id of ids) {
		const pid = launchStoryLoop({ root: ctx.root, epicDir: ctx.epic.dir, loopDir: ctx.loopDir }, id);
		spawned.set(id, pid);
		running += 1;
		progress(ctx, `${id}: started (parallel, ${running}/${parallel} running), epic-loop --story pid ${pid}`);
	}
}

/**
 * One default loop per repo, plus at most one `--story <id>` loop per story.
 * @param {Ctx} ctx
 */
function acquireLock(ctx) {
	const lock = path.join(harnessDir(ctx.root), ctx.only ? `epic-loop.${ctx.only}.lock` : 'epic-loop.lock');
	fs.mkdirSync(path.dirname(lock), { recursive: true });
	if (fs.existsSync(lock)) {
		const pid = Number.parseInt(fs.readFileSync(lock, 'utf8'), 10);
		assertOrExit(!pidAlive(pid), `epic-loop${ctx.only ? ` --story ${ctx.only}` : ''} already running (pid ${pid}, ${lock}).`);
	}
	fs.writeFileSync(lock, String(process.pid), 'utf8');
	const release = () => {
		releaseClaims(ctx);
		try {
			if (fs.readFileSync(lock, 'utf8') === String(process.pid)) fs.unlinkSync(lock);
		} catch {
			// already gone
		}
	};
	process.on('exit', release);
	// No SIGINT/SIGTERM handlers: the loop blocks in spawnSync and sleep(), where a JS handler
	// never runs, so a plain `kill` would wait for the agent to finish. Default signal death is
	// immediate; agent-guard then stops the agent, and the lock and claims it leaves behind are
	// ignored once their pid is dead.
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	if (flags.help) {
		console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
		return;
	}
	const root = resolveConsumerRoot(positional[0]);
	if (flags.tail) {
		tail(path.join(harnessDir(root), 'epic-loop'));
		return;
	}
	const config = readOptionalConfig(root);
	const cfg = config?.epicLoop ?? {};
	const epicArg = typeof flags.epic === 'string' ? flags.epic : cfg.epic;
	assertOrExit(typeof epicArg === 'string', 'Missing --epic <dir> (or epicLoop.epic in skillsync.config.json)');

	/** @type {Ctx} */
	const ctx = {
		root,
		epic: loadEpic(path.resolve(root, epicArg)),
		cfg,
		config,
		loopDir: path.join(harnessDir(root), 'epic-loop'),
	};
	if (flags.story !== undefined) {
		assertOrExit(typeof flags.story === 'string', 'Usage: --story <story id>');
		const id = /** @type {string} */ (flags.story);
		assertOrExit(ctx.epic.stories.some((s) => s.id === id), `No story ${id} in ${ctx.epic.dir}`);
		ctx.only = id;
	}
	const asJson = Boolean(flags.json);
	ctx.json = asJson;

	if (flags.dashboard) {
		const port = Number(flags.port ?? cfg.dashboardPort ?? 4747);
		startDashboard({ root, epicDir: ctx.epic.dir, loopDir: ctx.loopDir, port, preview: cfg.preview, config });
		console.log(`epic-loop dashboard: http://127.0.0.1:${port}  (Ctrl-C to stop; the loop runs separately)`);
		return;
	}

	if (flags.status) {
		writeStoryTable(ctx.epic.file, ctx.epic.stories);
		const next = nextStory(ctx.epic.stories);
		if (asJson) {
			console.log(JSON.stringify({ next: next.story?.id ?? null, reason: next.reason, stories: ctx.epic.stories.map(({ id, status, pr, branch }) => ({ id, status, pr, branch })) }, null, 2));
		} else {
			console.log(renderStoryTable(ctx.epic.stories));
			console.log(`\nNext: ${next.reason}`);
		}
		return;
	}

	if (flags.ready) {
		const others = claimsByOthers(ctx);
		const by = (/** @type {Story} */ s) => ({ id: s.id, title: s.title, status: s.status, dependsOn: s.dependsOn, pr: s.pr });
		const merged = new Set(ctx.epic.stories.filter((s) => s.status === 'merged').map((s) => s.id));
		const report = {
			ready: readyStories(ctx.epic.stories, new Set(others.keys())).map(by),
			inProgress: ctx.epic.stories.filter((s) => ACTIVE_STATUSES.includes(s.status)).map((s) => ({ ...by(s), loopPid: others.get(s.id) ?? null })),
			waiting: ctx.epic.stories
				.filter((s) => s.status === 'todo' && (s.blockedBy || !s.dependsOn.every((d) => merged.has(d))))
				.map((s) => ({ ...by(s), waitsOn: s.blockedBy ? [s.blockedBy] : s.dependsOn.filter((d) => !merged.has(d)) })),
			blocked: ctx.epic.stories.filter((s) => s.status === 'blocked').map((s) => ({ ...by(s), reason: s.meta.blocked_reason ?? '' })),
		};
		if (asJson) {
			console.log(JSON.stringify(report, null, 2));
		} else {
			const line = (/** @type {{ id: string; title: string }} */ s, extra = '') => `  ${s.id}  ${s.title}${extra ? `  (${extra})` : ''}`;
			console.log(`Ready (${report.ready.length}):\n${report.ready.map((s) => line(s)).join('\n') || '  none'}`);
			if (report.inProgress.length) console.log(`In progress:\n${report.inProgress.map((s) => line(s, s.status)).join('\n')}`);
			if (report.waiting.length) console.log(`Waiting:\n${report.waiting.map((s) => line(s, `on ${s.waitsOn.join(', ')}`)).join('\n')}`);
			if (report.blocked.length) console.log(`Blocked:\n${report.blocked.map((s) => line(s, s.reason)).join('\n')}`);
		}
		return;
	}

	if (flags.file !== undefined) {
		assertOrExit(typeof flags.file === 'string' && flags.file.trim() !== '', 'Usage: --file "<title>" [--from <story id>] [--depends-on <id,id>] [--note "<text>"]');
		const from = typeof flags.from === 'string' ? flags.from : '';
		/** @type {{ story: Story; created: boolean }} */
		let filed;
		try {
			filed = fileStory(ctx.epic.dir, {
				title: /** @type {string} */ (flags.file),
				note: typeof flags.note === 'string' ? flags.note : '',
				dependsOn: typeof flags['depends-on'] === 'string' ? flags['depends-on'].split(',').map((x) => x.trim()) : [],
				discoveredFrom: from,
				maxPerStory: Number(cfg.maxFiledPerStory ?? 3),
			});
		} catch (err) {
			assertOrExit(false, `epic-loop --file: ${/** @type {Error} */ (err).message}`);
			return;
		}
		const { story, created } = filed;
		if (created) {
			progress(ctx, `${story.id}: filed${from ? ` (found in ${from})` : ''} — ${story.title}`);
			notify(ctx, `${story.id} filed${from ? ` from ${from}` : ''}: ${story.title}`);
		}
		console.log(asJson ? JSON.stringify({ id: story.id, created, file: path.relative(root, story.file) }) : `${created ? 'filed' : 'already filed'}: ${story.id} — ${story.title}`);
		return;
	}

	if (typeof flags.approve === 'string') {
		const story = ctx.epic.stories.find((s) => s.id === flags.approve);
		assertOrExit(Boolean(story), `No story ${flags.approve} in ${ctx.epic.dir}`);
		const s = /** @type {Story} */ (story);
		assertOrExit(s.status === 'awaiting-approval', `${s.id} is ${s.status}, not awaiting-approval`);
		const approved = approvePlan(root, ctx.epic.dir, s.id);
		assertOrExit(approved.ok, `${s.id}: not approved, ${approved.error}`);
		save(ctx, s, { status: 'implementing', attempts: 0 });
		progress(ctx, `${s.id}: plan approved${approved.from === 'session' ? ' (with the planner session\'s changes)' : ''} → implementing`);
		return;
	}

	if (typeof flags.release === 'string') {
		const story = ctx.epic.stories.find((s) => s.id === flags.release);
		assertOrExit(Boolean(story), `No story ${flags.release} in ${ctx.epic.dir}`);
		const s = /** @type {Story} */ (story);
		assertOrExit(s.meta.session_held === 'yes', `${s.id} has no session held for you`);
		requestRelease(ctx.loopDir, s.id);
		progress(ctx, `${s.id}: session released, the loop runs its checks and moves on`);
		return;
	}

	const dryRun = Boolean(flags['dry-run']);
	const parallel = Math.max(1, Number(flags.parallel ?? cfg.parallel ?? 1) || 1);
	if (dryRun) {
		const result = tick(ctx, true);
		const alongside = parallelPlan(ctx, parallel, new Map()).ids;
		console.log(
			asJson
				? JSON.stringify({ dryRun: true, ...result, parallel: alongside }, null, 2)
				: `dry run: ${result.story ?? '—'} → ${result.action} (${result.detail})${alongside.length ? `; also starts ${alongside.join(', ')} in parallel` : ''}`,
		);
		return;
	}

	const agentProblems = checkAgentModels(config, root);
	assertOrExit(
		agentProblems.length === 0,
		`epic-loop: agent check failed — fix this before any story runs (update the CLI with \`claude update\`, or change epicLoop.agent.model):\n  ${agentProblems.join('\n  ')}`,
	);
	acquireLock(ctx);
	if (resolveAgent(config).runner === 'paseo') {
		const ready = paseoReady(config);
		progress(ctx, ready.ok ? 'epic-loop: agents run as Paseo sessions (open them in Paseo to read or talk to them)' : `epic-loop: Paseo not reachable, agents run headless until it is: ${ready.reason}`);
	}
	const intervalMs = Number(flags.interval ?? cfg.intervalSec ?? 60) * 1000;
	/** @type {Map<string, number>} */
	const spawned = new Map();
	ctx.spawned = spawned;
	let lastWait = '';
	for (;;) {
		ctx.epic = loadEpic(ctx.epic.dir); // pick up --approve, manual edits, merges, filed stories
		startParallelLoops(ctx, parallel, spawned);
		const result = tick(ctx, false);
		if (asJson) console.log(JSON.stringify(result));
		if (result.action === 'idle') {
			// Story loops still running can merge and unblock more work: wait for them.
			const others = ctx.only ? 0 : claimsByOthers(ctx).size;
			if (others === 0 || flags.once) {
				progress(ctx, `epic-loop: ${result.detail}`);
				return;
			}
			const line = `epic-loop: ${result.detail} (waiting on ${others} story ${others === 1 ? 'loop' : 'loops'})`;
			if (line !== lastWait) progress(ctx, line);
			lastWait = line;
			sleep(intervalMs);
			continue;
		}
		if (flags.once) return;
		if (result.wait) {
			const line = `${result.story}: ${result.detail}`;
			if (line !== lastWait) progress(ctx, line);
			lastWait = line;
			sleep(intervalMs);
		} else {
			lastWait = '';
		}
	}
}

if (require.main === module) {
	main();
}

module.exports = { tick, criticVerdict };
