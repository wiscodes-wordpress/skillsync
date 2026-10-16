#!/usr/bin/env node
/**
 * Smoke-test ss-* deterministic tools and fixtures.
 *
 * Usage:
 *   node path/to/skillsync/tools/verify-tools.cjs
 *
 * Always resolves tools relative to the skillsync checkout containing this script
 * (safe to run from a consumer via `.cursor/vendor/skillsync/tools/verify-tools.cjs`).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const skillsyncRoot = path.join(__dirname, '..');
const toolsDir = path.join(skillsyncRoot, 'tools');
const fixturesDir = path.join(toolsDir, 'fixtures');

const REQUIRED_TOOLS = [
	'harness-reset.cjs',
	'bugfix-debug-log.cjs',
	'validate-state.cjs',
	'init-state.cjs',
	'render-pr-body.cjs',
	'open-pr.cjs',
	'preflight-local.cjs',
	'tdd-audit.cjs',
	'security-audit.cjs',
	'review-handoff-evidence.cjs',
	'lib/review-handoff-evidence.cjs',
	'security-assess.cjs',
	'run-verification.cjs',
	'ss-loop.cjs',
	'epic-loop.cjs',
	'pr-watch.cjs',
	'lib/epic.cjs',
	'lib/pr-checks.cjs',
	'lib/pr-fix.cjs',
	'lib/agent-runner.cjs',
	'lib/paseo-agent.cjs',
	'lib/epic-session.cjs',
	'paseo-set-feature.cjs',
	'paseo-permit-watch.cjs',
	're-break.cjs',
	'publish-slices-from-state.cjs',
	'jira-close.cjs',
	'init-release-brief.cjs',
	'validate-release-brief.cjs',
	'validate-release-pack.cjs',
	'validate-plan-html.cjs',
	'init-plan-html.cjs',
	'render-plan-html.cjs',
	'watch-plan-html.cjs',
	'init-feature-pack.cjs',
	'validate-feature-pack.cjs',
	'render-app-map.cjs',
	'mine-review-patterns.cjs',
	'lib/review-scrub.cjs',
	'lib/ss-tools.cjs',
	'lib/plan-md.cjs',
	'lib/plan-paths.cjs',
	'ensure-skillsync.cjs',
	'install-git-hooks.cjs',
	'link-global-rules.cjs',
];

/**
 * @param {string} script
 * @param {string[]} args
 * @param {{ expectFail?: boolean }} [opts]
 */
function runTool(script, args, opts = {}) {
	try {
		const out = execFileSync(process.execPath, [script, ...args], {
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		if (opts.expectFail) {
			console.error(`Expected failure but tool succeeded: ${path.basename(script)}`);
			process.exit(1);
		}
		return out;
	} catch (err) {
		if (opts.expectFail) {
			return '';
		}
		const e = /** @type {NodeJS.ErrnoException & { stderr?: Buffer }} */ (err);
		console.error(`Tool failed: ${path.basename(script)} ${args.join(' ')}`);
		console.error(e.stderr?.toString() ?? e.message);
		process.exit(1);
	}
}

/**
 * @returns {string}
 */
function makeTempConsumer() {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'skillsync-verify-'));
}

function main() {
	let failed = false;

	for (const tool of REQUIRED_TOOLS) {
		const full = path.join(toolsDir, tool);
		if (!fs.existsSync(full)) {
			console.error(`MISSING: tools/${tool}`);
			failed = true;
		} else {
			console.log(`OK: tools/${tool}`);
		}
	}

	const temp = makeTempConsumer();
	fs.mkdirSync(path.join(temp, '.harness'), { recursive: true });

	const harnessReset = path.join(toolsDir, 'harness-reset.cjs');
	runTool(harnessReset, [temp, '--dry-run']);
	fs.writeFileSync(path.join(temp, '.harness', 'pr-body.md'), 'draft', 'utf8');
	fs.writeFileSync(path.join(temp, '.harness', 'code-handoff.html'), 'walkthrough', 'utf8');
	fs.writeFileSync(path.join(temp, '.harness', 'code-handoff.md'), 'legacy', 'utf8');
	fs.writeFileSync(path.join(temp, '.harness', 'feature-evidence.md'), 'watch', 'utf8');
	fs.writeFileSync(path.join(temp, '.harness', 'review-handoff-evidence.md'), 'card', 'utf8');
	fs.mkdirSync(path.join(temp, '.harness', 'evidence'), { recursive: true });
	fs.writeFileSync(path.join(temp, '.harness', 'evidence', 'save-draft.webm'), 'clip', 'utf8');
	runTool(harnessReset, [temp]);

	const stateFile = path.join(temp, '.harness', 'state.md');
	if (fs.readFileSync(stateFile, 'utf8') !== '') {
		console.error('harness-reset: state.md should be empty');
		failed = true;
	}
	if (fs.existsSync(path.join(temp, '.harness', 'pr-body.md'))) {
		console.error('harness-reset: pr-body.md should be deleted');
		failed = true;
	}
	if (fs.existsSync(path.join(temp, '.harness', 'code-handoff.html'))) {
		console.error('harness-reset: code-handoff.html should be deleted');
		failed = true;
	}
	if (fs.existsSync(path.join(temp, '.harness', 'code-handoff.md'))) {
		console.error('harness-reset: code-handoff.md (SoT) should be deleted');
		failed = true;
	}
	if (fs.existsSync(path.join(temp, '.harness', 'feature-evidence.md'))) {
		console.error('harness-reset: feature-evidence.md should be deleted');
		failed = true;
	}
	if (fs.existsSync(path.join(temp, '.harness', 'review-handoff-evidence.md'))) {
		console.error('harness-reset: review-handoff-evidence.md should be deleted');
		failed = true;
	}
	if (fs.existsSync(path.join(temp, '.harness', 'evidence'))) {
		console.error('harness-reset: evidence/ should be deleted');
		failed = true;
	}
	console.log('OK: harness-reset integration');

	const reviewHandoffLib = require('./lib/review-handoff-evidence.cjs');
	const reviewTemp = makeTempConsumer();
	fs.mkdirSync(path.join(reviewTemp, '.harness'), { recursive: true });
	fs.writeFileSync(
		path.join(reviewTemp, 'skillsync.config.json'),
		JSON.stringify({ reviewHandoffHumanEvidence: 'required' }),
		'utf8',
	);
	const notOk = reviewHandoffLib.evaluateReviewHandoff(reviewTemp);
	if (notOk.ok) {
		console.error('review-handoff: should fail when card missing');
		failed = true;
	}
	fs.writeFileSync(
		path.join(reviewTemp, '.harness', 'review-handoff-evidence.md'),
		'- [x] Accept — continue to `/ss-security-audit`\n',
		'utf8',
	);
	fs.writeFileSync(path.join(reviewTemp, '.harness', 'code-handoff.html'), '<html></html>', 'utf8');
	const ok = reviewHandoffLib.evaluateReviewHandoff(reviewTemp);
	if (!ok.ok) {
		console.error(`review-handoff: expected OK after accept: ${ok.reason}`);
		failed = true;
	}
	console.log('OK: review-handoff-evidence gate');

	runTool(path.join(toolsDir, 'bugfix-debug-log.cjs'), ['--self-test']);
	console.log('OK: bugfix-debug-log self-test');

	const { scrubText, nameTokens, hashToken } = require('./lib/review-scrub.cjs');
	const reviewNames = nameTokens(['jane-doe42', 'Jane Doe', 'copilot-pull-request-reviewer']);
	const scrubbed = scrubText(
		'@jane-doe42 see ABC-123 at https://x.example/y, token: abcd1234, cc jane@x.io ```const a = 1``` per Jane; a separate request from 3f9c2a1b',
		reviewNames,
		['acme'],
	);
	for (const leak of ['jane', 'ABC-123', 'https', 'abcd1234', 'const a', '3f9c2a1b']) {
		if (scrubbed.toLowerCase().includes(leak.toLowerCase())) {
			console.error(`review-scrub: leaked "${leak}" in: ${scrubbed}`);
			failed = true;
		}
	}
	if (!scrubbed.includes('separate request')) {
		console.error(`review-scrub: over-redacted a role word in: ${scrubbed}`);
		failed = true;
	}
	const reviewDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-review-patterns-'));
	const salt = 'fixture';
	const corpusPath = path.join(reviewDir, 'corpus.json');
	fs.writeFileSync(
		corpusPath,
		JSON.stringify({
			meta: { salt, nameHashes: reviewNames.map((n) => hashToken(salt, n)), termHashes: [hashToken(salt, 'acme')] },
			comments: [
				{ id: 'c1', pr: 'p1', reviewer: 'r1' },
				{ id: 'c2', pr: 'p2', reviewer: 'r2' },
				{ id: 'c3', pr: 'p3', reviewer: 'r1' },
			],
		}),
	);
	const candidatesPath = path.join(reviewDir, 'candidates.json');
	const writeCandidates = (/** @type {any[]} */ principles) =>
		fs.writeFileSync(candidatesPath, JSON.stringify({ principles }));
	const reviewTool = path.join(toolsDir, 'mine-review-patterns.cjs');
	const checkArgs = ['check', '--candidates', candidatesPath, '--corpus', corpusPath];
	writeCandidates([{ id: 'ok', principle: 'Ask how the change was tested.', evidence: ['c1', 'c2', 'c3'] }]);
	runTool(reviewTool, checkArgs);
	writeCandidates([{ id: 'thin', principle: 'Ask how it was tested.', evidence: ['c1', 'c3'] }]);
	runTool(reviewTool, checkArgs, { expectFail: true });
	writeCandidates([{ id: 'named', principle: 'Jane prefers small PRs at Acme.', evidence: ['c1', 'c2', 'c3'] }]);
	runTool(reviewTool, checkArgs, { expectFail: true });
	fs.rmSync(reviewDir, { recursive: true, force: true });
	console.log('OK: mine-review-patterns scrub + check gate');

	const rulesHome = fs.mkdtempSync(path.join(os.tmpdir(), 'skillsync-rules-home-'));
	fs.mkdirSync(path.join(rulesHome, '.kiro', 'steering'), { recursive: true });
	fs.writeFileSync(path.join(rulesHome, '.kiro', 'steering', 'Mine.md'), 'keep', 'utf8');
	fs.symlinkSync(
		path.join(skillsyncRoot, 'rules', 'ss-delivery-voice.mdc'),
		path.join(rulesHome, '.kiro', 'steering', 'ss-delivery-voice.md'),
	);
	runTool(path.join(toolsDir, 'link-global-rules.cjs'), ['--home', rulesHome]);
	const steering = fs.readdirSync(path.join(rulesHome, '.kiro', 'steering')).sort();
	const claudeRules = fs.readdirSync(path.join(rulesHome, '.claude', 'rules'));
	if (
		!steering.includes('react-patterns.md') ||
		!steering.includes('Mine.md') ||
		steering.includes('ss-delivery-voice.md') ||
		steering.some((f) => f.endsWith('.mdc')) ||
		!claudeRules.includes('index.md') ||
		!claudeRules.includes('react-patterns.mdc')
	) {
		console.error(`link-global-rules: unexpected links ${JSON.stringify({ steering, claudeRules })}`);
		failed = true;
	} else {
		console.log('OK: link-global-rules links Claude + Kiro, prunes stale links, keeps real files');
	}
	fs.rmSync(rulesHome, { recursive: true, force: true });

	const planConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(planConsumer, '.harness'), { recursive: true });
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-valid-state.md'),
		path.join(planConsumer, '.harness', 'state.md'),
	);
	runTool(path.join(toolsDir, 'validate-state.cjs'), [planConsumer, '--mode', 'plan']);
	console.log('OK: validate-state plan mode');

	const implementConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(implementConsumer, '.harness'), { recursive: true });
	fs.copyFileSync(
		path.join(fixturesDir, 'implement-valid-state.md'),
		path.join(implementConsumer, '.harness', 'state.md'),
	);
	runTool(path.join(toolsDir, 'validate-state.cjs'), [
		implementConsumer,
		'--mode',
		'implement',
	]);
	runTool(path.join(toolsDir, 'run-verification.cjs'), [implementConsumer]);
	console.log('OK: validate-state implement + run-verification');

	const loopConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(loopConsumer, '.harness'), { recursive: true });
	fs.writeFileSync(
		path.join(loopConsumer, '.harness', 'state.md'),
		`# Harness state

## Current Task

LOOP-1 dry-run fixture

## Status

implementing

## RED→GREEN Plan

### Cycle 1 — B1

| Field | Content |
|-------|---------|
| **Behavior ID** | B1 |
| **name** | Dry run |
| **expectation** | run > pass |

## Verification Plan

### Cycle 1

1. \`node -e "process.exit(0)"\`

## Next Action

**Actor:** harness-loop  
**Do:** AFK Cycle 1.

## Completed / Remaining

**Completed:** (none)  
**Remaining:** Cycle 1
`,
		'utf8',
	);
	const loopDry = runTool(path.join(toolsDir, 'ss-loop.cjs'), [
		loopConsumer,
		'--dry-run',
		'--json',
	]);
	if (!loopDry.includes('"dryRun": true') || !loopDry.includes('Cycle 1')) {
		console.error('ss-loop: expected dry-run JSON mentioning Cycle 1');
		failed = true;
	} else if (
		!loopDry.includes('"provider": "cursor"') ||
		!loopDry.includes('"model": "composer-2.5"')
	) {
		console.error(
			'ss-loop: expected default provider=cursor model=composer-2.5 in dry-run JSON',
		);
		failed = true;
	} else {
		console.log('OK: ss-loop dry-run');
	}

	const setFeatureHelp = execFileSync(
		process.execPath,
		[path.join(toolsDir, 'paseo-set-feature.cjs'), '--help'],
		{ encoding: 'utf8' },
	);
	if (!String(setFeatureHelp).includes('paseo-set-feature')) {
		console.error('paseo-set-feature --help missing usage');
		failed = true;
	} else {
		console.log('OK: paseo-set-feature --help');
	}

	const loopPreflight = makeTempConsumer();
	fs.mkdirSync(path.join(loopPreflight, '.harness'), { recursive: true });
	fs.writeFileSync(
		path.join(loopPreflight, '.harness', 'state.md'),
		`# Harness state

## Current Task

LOOP-2 preflight fixture

## Status

implementing

## RED→GREEN Plan

### Cycle 1 — B1

| Field | Content |
|-------|---------|
| **name** | Has verify |

### Cycle 2 — B2

| Field | Content |
|-------|---------|
| **name** | Empty verify |

## Verification Plan

### Cycle 1

1. \`node -e "process.exit(0)"\`

### Cycle 2

(no commands — should fail preflight)

## Next Action

**Actor:** harness-loop  
**Do:** AFK.

## Completed / Remaining

**Completed:** (none)  
**Remaining:** Cycle 1, Cycle 2
`,
		'utf8',
	);
	runTool(path.join(toolsDir, 'ss-loop.cjs'), [loopPreflight], { expectFail: true });
	console.log('OK: ss-loop preflight blocks empty Verification Plan (no agent)');

	const ssTools = require(path.join(toolsDir, 'lib/ss-tools.cjs'));
	const beforeOutcome = `# Harness state

## Completed / Remaining

**Completed:** (none)
**Remaining:** Cycle 1

## RED→GREEN Plan

### Cycle 1 — B1

| Field | Content |
|-------|---------|
| **name** | Demo |

## TDD Evidence

| Cycle | Behavior ID | RED cmd | RED fail snippet | GREEN cmd | GREEN | Test Δ | Re-break |
|-------|-------------|---------|------------------|-----------|-------|--------|----------|
`;
	const noopOutcome = ssTools.checkCycleAgentOutcome(beforeOutcome, beforeOutcome, 1);
	if (noopOutcome.ok) {
		console.error('checkCycleAgentOutcome: expected fail on unchanged state');
		failed = true;
	}
	const badRemaining = beforeOutcome.replace(
		'**Remaining:** Cycle 1',
		'**Remaining:** Cycle 1\n**Completed:** Cycle 1',
	);
	// Still in Remaining + Completed — should fail Remaining gate
	const stillRem = ssTools.checkCycleAgentOutcome(
		beforeOutcome,
		badRemaining.replace('**Remaining:** Cycle 1\n', '**Remaining:** Cycle 1\n'),
		1,
	);
	if (stillRem.ok) {
		console.error('checkCycleAgentOutcome: expected fail when still Remaining');
		failed = true;
	}
	const goodAfter = `# Harness state

## Completed / Remaining

**Completed:** Cycle 1
**Remaining:** (none)

## RED→GREEN Plan

### Cycle 1 — B1

| Field | Content |
|-------|---------|
| **name** | Demo |

## TDD Evidence

| Cycle | Behavior ID | RED cmd | RED fail snippet | GREEN cmd | GREEN | Test Δ | Re-break |
|-------|-------------|---------|------------------|-----------|-------|--------|----------|
| Cycle 1 | B1 | yarn test | FAIL | yarn test | PASS | +1 | PASS |
`;
	const goodOutcome = ssTools.checkCycleAgentOutcome(beforeOutcome, goodAfter, 1);
	if (!goodOutcome.ok) {
		console.error(
			`checkCycleAgentOutcome: expected pass, got ${goodOutcome.errors?.join('; ')}`,
		);
		failed = true;
	} else {
		console.log('OK: checkCycleAgentOutcome deterministic postflight');
	}

	const initConsumer = makeTempConsumer();
	runTool(path.join(toolsDir, 'init-state.cjs'), [
		initConsumer,
		'--task',
		'DEMO-1 init fixture',
	]);
	runTool(path.join(toolsDir, 'init-state.cjs'), [initConsumer], { expectFail: true });
	console.log('OK: init-state writes skeleton and refuses overwrite');

	const bugInitConsumer = makeTempConsumer();
	runTool(path.join(toolsDir, 'init-state.cjs'), [
		bugInitConsumer,
		'--mode',
		'bug',
		'--task',
		'DEMO-2 bug fixture',
	]);
	runTool(path.join(toolsDir, 'validate-state.cjs'), [
		bugInitConsumer,
		'--mode',
		'bug-fix',
	]);
	console.log('OK: init-state bug mode + validate-state bug-fix mode');

	const renderConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(renderConsumer, '.harness'), { recursive: true });
	const bodyPath = runTool(path.join(toolsDir, 'render-pr-body.cjs'), [
		renderConsumer,
	]).trim();
	const bodyText = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath, 'utf8') : '';
	if (
		!bodyText.includes('## Purpose of PR') ||
		!bodyText.includes('## Changes Made') ||
		bodyText.includes('Harness summary') ||
		bodyText.includes('## Test plan')
	) {
		console.error(
			'render-pr-body: expected terse Purpose/Changes template, no Test plan / Harness summary',
		);
		failed = true;
	} else {
		console.log('OK: render-pr-body');
	}

	fs.writeFileSync(
		path.join(renderConsumer, '.harness', 'pr-body.md'),
		'## Purpose of PR\n\nShip fix.\n\n## Changes Made\n\n- fix auth\n',
		'utf8',
	);
	const draftBodyPath = runTool(path.join(toolsDir, 'render-pr-body.cjs'), [
		renderConsumer,
	]).trim();
	const draftBody = fs.existsSync(draftBodyPath)
		? fs.readFileSync(draftBodyPath, 'utf8')
		: '';
	if (!draftBody.includes('Ship fix.') || !draftBody.includes('fix auth')) {
		console.error('render-pr-body: draft .harness/pr-body.md should pass through unchanged');
		failed = true;
	} else {
		console.log('OK: render-pr-body draft passthrough');
	}

	const publishConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(publishConsumer, '.harness'), { recursive: true });
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-valid-state.md'),
		path.join(publishConsumer, '.harness', 'state.md'),
	);
	const dryOut = runTool(path.join(toolsDir, 'publish-slices-from-state.cjs'), [
		publishConsumer,
		'--parent',
		'DEMO-100',
	]);
	if (!dryOut.includes('Dry-run only')) {
		console.error('publish-slices: expected dry-run message');
		failed = true;
	} else {
		console.log('OK: publish-slices dry-run');
	}

	const tddAudit = require(path.join(toolsDir, 'tdd-audit.cjs'));
	const planState = fs.readFileSync(
		path.join(fixturesDir, 'plan-valid-state.md'),
		'utf8',
	);
	const cards = tddAudit.parseContractCards(planState);
	if (cards.length !== 1 || cards[0].id !== 'B1') {
		console.error('tdd-audit: expected to parse B1 contract card from plan fixture');
		failed = true;
	} else if (
		!cards[0].name.includes('Save') ||
		!cards[0].expectation.includes('>') ||
		tddAudit.expectationLastHop(cards[0].expectation) !== 'see confirmation toast'
	) {
		console.error('tdd-audit: contract card name/expectation parse mismatch');
		failed = true;
	} else {
		const shape = tddAudit.auditContractShape(cards);
		if (shape.errors.length > 0) {
			console.error('tdd-audit: plan fixture shape errors:', shape.errors.join('; '));
			failed = true;
		} else {
			console.log('OK: tdd-audit contract card parse');
		}
	}

	const completedState = `${planState.replace(
		'**Completed:** (none)',
		'**Completed:** Cycle 1',
	).replace('**Remaining:** Cycle 1', '**Remaining:** (none)')}`;
	const miss = tddAudit.auditContractsVsDiff(
		completedState,
		'+it("unrelated", () => {})\n',
		['save.test.ts'],
	);
	if (!miss.errors.some((e) => e.includes('**name** not found'))) {
		console.error('tdd-audit: expected name-missing error for completed cycle');
		failed = true;
	} else {
		const hit = tddAudit.auditContractsVsDiff(
			completedState,
			'+it("Feature: Save, when draft valid, shows confirmation", () => {\n+  expect(toast).toContain("confirmation")\n+})\n',
			['save.test.ts'],
		);
		if (hit.errors.length > 0) {
			console.error('tdd-audit: unexpected errors when name present:', hit.errors.join('; '));
			failed = true;
		} else {
			console.log('OK: tdd-audit completed-cycle name gate');
		}
	}

	const renameDiff = [
		'diff --git a/x.test.ts b/x.test.ts',
		'@@ -1,3 +1,3 @@',
		"-  it('lists ref and translation', () => {",
		"+  it('lists book, chapter and verse', () => {",
		'     expect(rows).toEqual([])',
	].join('\n');
	const deleteDiff = [
		'diff --git a/x.test.ts b/x.test.ts',
		'@@ -1,3 +0,0 @@',
		"-  it('lists ref and translation', () => {",
		'-    expect(rows).toEqual([])',
		'-  })',
		'@@ -9,0 +7,1 @@',
		"+  it('unrelated new test', () => {})",
	].join('\n');
	const renamed = tddAudit.analyzeTestDiff(renameDiff);
	const deleted = tddAudit.analyzeTestDiff(deleteDiff);
	if (renamed.removedTests !== 0 || renamed.renamedTests.length !== 1) {
		console.error('tdd-audit: a renamed test in one hunk should count as a rename, not a removal');
		failed = true;
	} else if (deleted.removedTests !== 1) {
		console.error('tdd-audit: a test deleted in one hunk and added in another should still count as removed');
		failed = true;
	} else {
		console.log('OK: tdd-audit rename vs removal');
	}

	const { upsertMarkdownSection } = require(path.join(toolsDir, 'lib', 'ss-tools.cjs'));
	const lastSection = '# State\n\n## Notes\n\nkeep\n\n## Security Evidence\n\n**Ran at:** 2026-10-01T15:35:35.590Z\n\nold tail\n';
	const upserted = upsertMarkdownSection(lastSection, 'Security Evidence', '**Ran at:** 2026-10-02T09:00:00.000Z\n\nnew tail');
	if (
		upserted.split('## Security Evidence').length !== 2 ||
		upserted.includes('old tail') ||
		!upserted.includes('new tail') ||
		!upserted.includes('keep')
	) {
		console.error('ss-tools: upsertMarkdownSection should replace a last section whole, even when it contains "Z"');
		failed = true;
	} else {
		console.log('OK: upsertMarkdownSection replaces the last section whole');
	}

	const securityAudit = require(path.join(toolsDir, 'security-audit.cjs'));
	const secConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(secConsumer, '.harness'), { recursive: true });
	fs.mkdirSync(path.join(secConsumer, 'includes'), { recursive: true });
	fs.writeFileSync(
		path.join(secConsumer, 'includes', 'bad.php'),
		"<?php\neval($_GET['x']);\n",
		'utf8',
	);
	runTool(path.join(toolsDir, 'security-audit.cjs'), [secConsumer, '--write-state'], {
		expectFail: true,
	});
	const badState = fs.readFileSync(path.join(secConsumer, '.harness', 'state.md'), 'utf8');
	if (!badState.includes('## Security Evidence') || !badState.includes('**Phase A:** FAIL')) {
		console.error('security-audit: expected Phase A FAIL evidence for eval+superglobal fixture');
		failed = true;
	} else {
		console.log('OK: security-audit Phase A FAIL + write-state');
	}

	const cleanConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(cleanConsumer, '.harness'), { recursive: true });
	fs.mkdirSync(path.join(cleanConsumer, 'includes'), { recursive: true });
	fs.writeFileSync(
		path.join(cleanConsumer, 'includes', 'ok.php'),
		"<?php\n// safe plugin stub\n",
		'utf8',
	);
	runTool(path.join(toolsDir, 'security-audit.cjs'), [cleanConsumer, '--write-state']);
	runTool(path.join(toolsDir, 'security-audit.cjs'), [
		cleanConsumer,
		'--set-phase-b',
		'PASS',
	]);
	runTool(path.join(toolsDir, 'security-audit.cjs'), [cleanConsumer, '--check-state']);
	const parsed = securityAudit.parseSecurityEvidence(
		fs.readFileSync(path.join(cleanConsumer, '.harness', 'state.md'), 'utf8'),
	);
	if (!parsed || parsed.status !== 'PASS' || parsed.phaseB !== 'PASS') {
		console.error('security-audit: expected overall PASS after --set-phase-b PASS');
		failed = true;
	} else {
		console.log('OK: security-audit Phase B + check-state');
	}

	const assessConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(assessConsumer, '.harness'), { recursive: true });
	fs.mkdirSync(path.join(assessConsumer, 'includes'), { recursive: true });
	fs.writeFileSync(
		path.join(assessConsumer, 'includes', 'ok.php'),
		"<?php\n// safe plugin stub\n",
		'utf8',
	);
	fs.writeFileSync(
		path.join(assessConsumer, 'skillsync.config.json'),
		JSON.stringify({ securityAssess: { wordfence: 'off' } }, null, '\t'),
		'utf8',
	);
	runTool(path.join(toolsDir, 'security-assess.cjs'), [
		assessConsumer,
		'--write-state',
		'--skip-semgrep',
		'--wordfence',
		'off',
	]);
	const assessState = fs.readFileSync(
		path.join(assessConsumer, '.harness', 'state.md'),
		'utf8',
	);
	const assessJsonPath = path.join(
		assessConsumer,
		'.harness',
		'security-assess.json',
	);
	if (
		!assessState.includes('## Security Assess') ||
		!fs.existsSync(assessJsonPath)
	) {
		console.error('security-assess: expected ## Security Assess + JSON report');
		failed = true;
	} else {
		const assessReport = JSON.parse(fs.readFileSync(assessJsonPath, 'utf8'));
		if (assessReport.kind !== 'security-assess') {
			console.error('security-assess: unexpected report kind');
			failed = true;
		} else {
			console.log('OK: security-assess write-state + JSON');
		}
	}

	const releaseConsumer = makeTempConsumer();
	runTool(path.join(toolsDir, 'init-release-brief.cjs'), [
		releaseConsumer,
		'--version',
		'1.2.3',
	]);
	runTool(path.join(toolsDir, 'init-release-brief.cjs'), [releaseConsumer], {
		expectFail: true,
	});
	runTool(path.join(toolsDir, 'validate-release-brief.cjs'), [
		releaseConsumer,
		'--mode',
		'structure',
	]);
	runTool(
		path.join(toolsDir, 'validate-release-brief.cjs'),
		[releaseConsumer, '--mode', 'ready'],
		{ expectFail: true },
	);
	const briefPath = path.join(releaseConsumer, '.harness', 'release-brief.md');
	fs.writeFileSync(
		briefPath,
		`# Release Brief

- **Version:** 1.2.3
- **Date:** 2026-07-18
- **Audience:** Plugin authors

## Features (3–5 bullets)

- Bulk edit ACF fields on selected posts
- Preserve existing values when a field is left blank
- Show validation errors inline in the bulk panel

## Proof assets

- (pending)

## Primary CTA

- **Label:** Read the release notes
- **URL:** https://example.com/releases/1.2.3

## Out of scope / do-not-claim

- Does not migrate legacy field groups automatically

## Tone

- **TONE.md path:** (optional)
`,
		'utf8',
	);
	runTool(path.join(toolsDir, 'validate-release-brief.cjs'), [
		releaseConsumer,
		'--mode',
		'ready',
	]);
	const packDir = path.join(releaseConsumer, '.harness', 'release', '1.2.3');
	fs.mkdirSync(packDir, { recursive: true });
	for (const name of ['README.md', 'email.md', 'social.md', 'youtube.md', 'blog.md']) {
		fs.writeFileSync(path.join(packDir, name), `# ${name}\n\nDraft content.\n`, 'utf8');
	}
	runTool(path.join(toolsDir, 'validate-release-pack.cjs'), [
		releaseConsumer,
		'--version',
		'1.2.3',
	]);
	console.log('OK: release-brief init/validate + release-pack validate');

	const planHtmlConsumer = makeTempConsumer();
	const planHarness = path.join(planHtmlConsumer, '.harness');
	fs.mkdirSync(planHarness, { recursive: true });
	const validatePlanHtmlTool = path.join(toolsDir, 'validate-plan-html.cjs');
	/** @type {[string, string][]} */
	const planFixtures = [
		['plan-arch-valid.html', 'architecture-plan.html'],
		['plan-ux-valid.html', 'ux-plan.html'],
		['plan-security-valid.html', 'security-posture.html'],
		['plan-handoff-valid.html', 'code-handoff.html'],
	];
	for (const [fixture, target] of planFixtures) {
		fs.copyFileSync(path.join(fixturesDir, fixture), path.join(planHarness, target));
	}
	fs.writeFileSync(
		path.join(planHarness, 'security-assess.json'),
		JSON.stringify(
			{
				kind: 'security-assess',
				completeness: 'complete',
				reasons: [],
				ranAt: '2026-07-25T00:00:00.000Z',
				probes: [],
				errors: [],
				warnings: [],
			},
			null,
			2,
		),
		'utf8',
	);
	for (const kind of ['arch', 'ux', 'security', 'handoff']) {
		runTool(validatePlanHtmlTool, [planHtmlConsumer, '--kind', kind]);
	}
	fs.mkdirSync(path.join(planHarness, 'wayfinder', 'demo-chat'), { recursive: true });
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-wayfinder-valid.html'),
		path.join(planHarness, 'wayfinder', 'demo-chat', 'map.html'),
	);
	runTool(validatePlanHtmlTool, [
		planHtmlConsumer,
		'--kind',
		'wayfinder',
		'--file',
		'.harness/wayfinder/demo-chat/map.html',
	]);
	console.log('OK: validate-plan-html arch/ux/security/handoff/wayfinder fixtures');

	const planHtmlLib = require(validatePlanHtmlTool);
	const archHtml = fs.readFileSync(path.join(fixturesDir, 'plan-arch-valid.html'), 'utf8');
	const securityHtml = fs.readFileSync(
		path.join(fixturesDir, 'plan-security-valid.html'),
		'utf8',
	);

	/**
	 * @param {string} label
	 * @param {{ html: string; kind: string; assessReport?: object | null }} opts
	 * @param {string} needle
	 */
	function expectPlanError(label, opts, needle) {
		const { errors } = planHtmlLib.validatePlanHtml(opts);
		if (!errors.some((e) => e.includes(needle))) {
			console.error(`validate-plan-html: ${label} — expected error containing "${needle}"`);
			console.error(`  got: ${errors.join('; ') || '(none)'}`);
			failed = true;
			return false;
		}
		return true;
	}

	const negatives = [
		expectPlanError(
			'stub section',
			{
				html: archHtml.replace(
					/<section id="nongoals">[\s\S]*?<\/section>/,
					'<section id="nongoals">…</section>',
				),
				kind: 'arch',
			},
			'still a stub',
		),
		expectPlanError(
			'missing required section',
			{
				html: archHtml.replace(/<section id="stages">[\s\S]*?<\/section>/, ''),
				kind: 'arch',
			},
			'Missing required section: #stages',
		),
		expectPlanError(
			'dangling nav anchor',
			{ html: archHtml.replace('href="#locks"', 'href="#glossary"'), kind: 'arch' },
			'no element carries that id',
		),
		expectPlanError(
			'third-party script',
			{
				html: archHtml.replace(
					'https://cdn.tailwindcss.com',
					'https://analytics.example.com/track.js',
				),
				kind: 'arch',
			},
			'Disallowed script src',
		),
		expectPlanError(
			'green status with incomplete assess',
			{
				html: securityHtml,
				kind: 'security',
				assessReport: {
					completeness: 'incomplete',
					reasons: ['semgrep: missing'],
					errors: [],
					warnings: [],
				},
			},
			'spec requires Red',
		),
		expectPlanError(
			'stale ERROR count',
			{
				html: securityHtml,
				kind: 'security',
				assessReport: {
					completeness: 'complete',
					reasons: [],
					errors: [{ id: 'a' }, { id: 'b' }],
					warnings: [],
				},
			},
			'ERROR findings but security-assess.json reports 2',
		),
		expectPlanError(
			'invented posture grade',
			{
				html: securityHtml.replace('Green', 'Green — security grade 4 / 5'),
				kind: 'security',
			},
			'Invented metric',
		),
	];
	if (negatives.every(Boolean)) {
		console.log('OK: validate-plan-html hard gates (stubs, anchors, scripts, assess facts)');
	}

	const initPlanHtml = path.join(toolsDir, 'init-plan-html.cjs');
	for (const kind of ['arch', 'ux', 'security', 'handoff']) {
		const initConsumer = makeTempConsumer();
		runTool(initPlanHtml, [
			initConsumer,
			'--kind',
			kind,
			'--product',
			'Demo Plugin',
			'--task',
			'DEMO-1 scaffold',
		]);
		runTool(validatePlanHtmlTool, [initConsumer, '--kind', kind, '--mode', 'structure']);
		const mdName =
			kind === 'arch'
				? 'architecture-plan.md'
				: kind === 'ux'
					? 'ux-plan.md'
					: kind === 'security'
						? 'security-posture.md'
						: 'code-handoff.md';
		if (!fs.existsSync(path.join(initConsumer, '.harness', mdName))) {
			console.error(`init-plan-html: expected .harness/${mdName}`);
			failed = true;
		}
		runTool(initPlanHtml, [initConsumer, '--kind', kind], { expectFail: true });
	}
	console.log('OK: init-plan-html scaffold + structure validate + overwrite refuse');

	const renderPlanHtml = path.join(toolsDir, 'render-plan-html.cjs');
	const renderMdConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(renderMdConsumer, '.harness'), { recursive: true });
	const mdFixtures = [
		['arch', 'plan-arch-valid.md', 'architecture-plan.md'],
		['ux', 'plan-ux-valid.md', 'ux-plan.md'],
		['security', 'plan-security-valid.md', 'security-posture.md'],
		['handoff', 'plan-handoff-valid.md', 'code-handoff.md'],
	];
	for (const [kind, fixture, dest] of mdFixtures) {
		fs.copyFileSync(
			path.join(fixturesDir, fixture),
			path.join(renderMdConsumer, '.harness', dest),
		);
		runTool(renderPlanHtml, [renderMdConsumer, '--kind', kind, '--validate']);
		runTool(validatePlanHtmlTool, [renderMdConsumer, '--kind', kind, '--mode', 'ready']);
	}
	fs.mkdirSync(path.join(renderMdConsumer, '.harness', 'wayfinder', 'demo-chat'), {
		recursive: true,
	});
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-wayfinder-valid.md'),
		path.join(renderMdConsumer, '.harness', 'wayfinder', 'demo-chat', 'map.md'),
	);
	runTool(renderPlanHtml, [
		renderMdConsumer,
		'--kind',
		'wayfinder',
		'--slug',
		'demo-chat',
		'--validate',
	]);
	runTool(validatePlanHtmlTool, [
		renderMdConsumer,
		'--kind',
		'wayfinder',
		'--file',
		'.harness/wayfinder/demo-chat/map.html',
		'--mode',
		'ready',
	]);
	console.log('OK: render-plan-html from MD fixtures + ready validate');

	const watchPlanHtml = path.join(toolsDir, 'watch-plan-html.cjs');
	const watchLib = require(watchPlanHtml);
	const classifyCases = [
		['.harness/architecture-plan.md', 'arch', undefined],
		['.harness/initiatives/demo/ux-plan.md', 'ux', 'demo'],
		['.harness/code-handoff.md', 'handoff', undefined],
		['.harness/wayfinder/chat/map.md', 'wayfinder', 'chat'],
		['.harness/notes.md', null, undefined],
	];
	for (const [rel, kind, slug] of classifyCases) {
		const hit = watchLib.classifyPlanMdPath('/tmp/consumer', path.join('/tmp/consumer', rel));
		if (kind === null) {
			if (hit !== null) {
				console.error(`watch-plan-html classify: expected null for ${rel}`);
				failed = true;
			}
			continue;
		}
		if (!hit || hit.kind !== kind || hit.slug !== slug) {
			console.error(
				`watch-plan-html classify: ${rel} → ${JSON.stringify(hit)} (expected kind=${kind} slug=${slug})`,
			);
			failed = true;
		}
	}
	const watchOnceConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(watchOnceConsumer, '.harness'), { recursive: true });
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-arch-valid.md'),
		path.join(watchOnceConsumer, '.harness', 'architecture-plan.md'),
	);
	runTool(watchPlanHtml, [watchOnceConsumer, '--once']);
	if (
		!fs.existsSync(path.join(watchOnceConsumer, '.harness', 'architecture-plan.html'))
	) {
		console.error('watch-plan-html --once: expected architecture-plan.html');
		failed = true;
	} else {
		console.log('OK: watch-plan-html classify + --once render');
	}

	const packConsumer = makeTempConsumer();
	const initFeaturePack = path.join(toolsDir, 'init-feature-pack.cjs');
	const validateFeaturePackTool = path.join(toolsDir, 'validate-feature-pack.cjs');
	runTool(initFeaturePack, [
		packConsumer,
		'--slug',
		'ai-chatbot',
		'--title',
		'AI chatbot',
		'--epics',
		'DEMO-245,DEMO-400',
		'--lenses',
		'arch,security',
	]);
	runTool(initFeaturePack, [packConsumer, '--slug', 'ai-chatbot'], { expectFail: true });
	// Required lenses (arch, security) have no files yet → hard fail.
	runTool(validateFeaturePackTool, [packConsumer, '--slug', 'ai-chatbot'], {
		expectFail: true,
	});
	const packDirPath = path.join(packConsumer, '.harness', 'initiatives', 'ai-chatbot');
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-arch-valid.html'),
		path.join(packDirPath, 'architecture-plan.html'),
	);
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-security-valid.html'),
		path.join(packDirPath, 'security-posture.html'),
	);
	runTool(validateFeaturePackTool, [packConsumer, '--slug', 'ai-chatbot']);
	console.log('OK: feature-pack init + required-lens gate + key parity pass');

	// Pack-aware init-plan-html --slug writes into the initiative folder.
	const packInitConsumer = makeTempConsumer();
	runTool(initFeaturePack, [packInitConsumer, '--slug', 'demo-pack', '--lenses', 'arch']);
	runTool(initPlanHtml, [
		packInitConsumer,
		'--kind',
		'arch',
		'--slug',
		'demo-pack',
		'--product',
		'Demo',
		'--task',
		'DEMO-2',
	]);
	const packArch = path.join(
		packInitConsumer,
		'.harness',
		'initiatives',
		'demo-pack',
		'architecture-plan.html',
	);
	const packArchMd = path.join(
		packInitConsumer,
		'.harness',
		'initiatives',
		'demo-pack',
		'architecture-plan.md',
	);
	if (!fs.existsSync(packArch) || !fs.existsSync(packArchMd)) {
		console.error(`init-plan-html --slug: expected ${packArch} and ${packArchMd}`);
		failed = true;
	} else {
		runTool(validatePlanHtmlTool, [
			packInitConsumer,
			'--kind',
			'arch',
			'--slug',
			'demo-pack',
			'--mode',
			'structure',
		]);
		console.log('OK: init-plan-html --slug writes into initiative pack');
	}

	const featurePackLib = require(validateFeaturePackTool);
	const hubHtml = fs.readFileSync(path.join(packDirPath, 'index.html'), 'utf8');
	const parityCheck = featurePackLib.validateFeaturePack({
		hubHtml: hubHtml.replace('data-epic="DEMO-400"', 'data-epic="DEMO-999"'),
		lensFiles: new Map([
			['arch', { exists: true, html: archHtml }],
			['ux', { exists: false, html: '' }],
			['security', { exists: true, html: securityHtml }],
		]),
	});
	if (!parityCheck.errors.some((e) => e.includes('data-epic="DEMO-400"'))) {
		console.error('validate-feature-pack: expected key-parity error for unlisted DEMO-400');
		failed = true;
	} else {
		console.log('OK: feature-pack epic key parity gate');
	}

	const renderAppMap = path.join(toolsDir, 'render-app-map.cjs');
	const appMapConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(appMapConsumer, '.harness', 'initiatives', 'ai-chatbot'), {
		recursive: true,
	});
	fs.copyFileSync(
		path.join(packDirPath, 'index.html'),
		path.join(appMapConsumer, '.harness', 'initiatives', 'ai-chatbot', 'index.html'),
	);
	fs.mkdirSync(path.join(appMapConsumer, '.harness', 'wayfinder', 'ai-chatbot'), {
		recursive: true,
	});
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-wayfinder-valid.html'),
		path.join(appMapConsumer, '.harness', 'wayfinder', 'ai-chatbot', 'map.html'),
	);
	fs.writeFileSync(
		path.join(appMapConsumer, '.harness', 'state.md'),
		'# Task: DEMO-1 First story\n\nPack: .harness/initiatives/ai-chatbot/index.html\n',
		'utf8',
	);
	runTool(renderAppMap, [appMapConsumer, '--title', 'Demo Plugin']);
	runTool(validatePlanHtmlTool, [appMapConsumer, '--kind', 'app-map']);
	console.log('OK: render-app-map + validate app-map');

	const preflightLocal = path.join(toolsDir, 'preflight-local.cjs');
	const preflightConsumer = makeTempConsumer();
	fs.writeFileSync(
		path.join(preflightConsumer, 'package.json'),
		JSON.stringify(
			{
				name: 'preflight-consumer',
				private: true,
				scripts: { preflight: 'node -e "process.exit(0)"' },
			},
			null,
			'\t',
		) + '\n',
		'utf8',
	);
	runTool(preflightLocal, [preflightConsumer]);
	console.log('OK: preflight-local consumer package script');

	const preflightStoryConsumer = makeTempConsumer();
	const storyMarker = path.join(preflightStoryConsumer, 'story-e2e.txt');
	fs.mkdirSync(path.join(preflightStoryConsumer, '.harness'), { recursive: true });
	fs.writeFileSync(
		path.join(preflightStoryConsumer, 'package.json'),
		JSON.stringify(
			{
				name: 'preflight-story-e2e',
				private: true,
				scripts: {
					test: 'node -e "process.exit(0)"',
					e2e: 'node -e "require(\'fs\').writeFileSync(\'full-suite.txt\',\'bad\'); process.exit(1)"',
				},
			},
			null,
			'\t',
		) + '\n',
		'utf8',
	);
	fs.writeFileSync(
		path.join(preflightStoryConsumer, '.harness', 'state.md'),
		[
			'# Task: DEMO-1',
			'',
			'## Verification Plan',
			'',
			'1. `node -e "require(\'fs\').writeFileSync(\'story-e2e.txt\',\'ok\')" # e2e/checkout.spec.ts`',
			'',
		].join('\n'),
		'utf8',
	);
	runTool(preflightLocal, [preflightStoryConsumer]);
	if (!fs.existsSync(storyMarker)) {
		console.error('preflight-local did not run story Verification Plan e2e command');
		failed = true;
	} else if (fs.existsSync(path.join(preflightStoryConsumer, 'full-suite.txt'))) {
		console.error('preflight-local ran full e2e suite instead of story-scoped commands');
		failed = true;
	} else {
		console.log('OK: preflight-local story-scoped E2E from Verification Plan');
	}

	const preflightDiffConsumer = makeTempConsumer();
	const diffMarker = path.join(preflightDiffConsumer, 'diff-e2e.txt');
	fs.mkdirSync(path.join(preflightDiffConsumer, 'e2e'), { recursive: true });
	fs.writeFileSync(
		path.join(preflightDiffConsumer, 'run-e2e.cjs'),
		[
			"const fs = require('node:fs');",
			'const files = process.argv.slice(2);',
			"if (!files.some((f) => f.includes('e2e/'))) process.exit(2);",
			"fs.writeFileSync('diff-e2e.txt', files.join(','));",
		].join('\n') + '\n',
		'utf8',
	);
	fs.writeFileSync(
		path.join(preflightDiffConsumer, 'package.json'),
		JSON.stringify(
			{
				name: 'preflight-diff-e2e',
				private: true,
				scripts: {
					test: 'node -e "process.exit(0)"',
					e2e: 'node run-e2e.cjs',
				},
			},
			null,
			'\t',
		) + '\n',
		'utf8',
	);
	fs.writeFileSync(
		path.join(preflightDiffConsumer, 'e2e', 'checkout.spec.ts'),
		"test('checkout', async () => {});",
		'utf8',
	);
	execFileSync('git', ['init'], { cwd: preflightDiffConsumer, stdio: 'pipe' });
	execFileSync('git', ['add', 'package.json', 'run-e2e.cjs'], {
		cwd: preflightDiffConsumer,
		stdio: 'pipe',
	});
	execFileSync(
		'git',
		[
			'-c',
			'user.email=test@example.com',
			'-c',
			'user.name=Test',
			'commit',
			'-m',
			'init',
		],
		{ cwd: preflightDiffConsumer, stdio: 'pipe' },
	);
	runTool(preflightLocal, [preflightDiffConsumer]);
	if (!fs.existsSync(diffMarker)) {
		console.error('preflight-local did not run diff-scoped e2e for changed e2e files');
		failed = true;
	} else {
		console.log('OK: preflight-local diff-scoped E2E from git changes');
	}

	const preflightNoE2eConsumer = makeTempConsumer();
	fs.writeFileSync(
		path.join(preflightNoE2eConsumer, 'package.json'),
		JSON.stringify(
			{
				name: 'preflight-no-e2e',
				private: true,
				scripts: {
					test: 'node -e "process.exit(0)"',
					e2e: 'node -e "require(\'fs\').writeFileSync(\'full-suite.txt\',\'bad\'); process.exit(1)"',
				},
			},
			null,
			'\t',
		) + '\n',
		'utf8',
	);
	runTool(preflightLocal, [preflightNoE2eConsumer]);
	if (fs.existsSync(path.join(preflightNoE2eConsumer, 'full-suite.txt'))) {
		console.error('preflight-local ran full e2e suite with no story/diff scope');
		failed = true;
	} else {
		console.log('OK: preflight-local skips full e2e suite without story/diff scope');
	}

	const preflightFullConsumer = makeTempConsumer();
	const fullMarker = path.join(preflightFullConsumer, 'full-suite.txt');
	fs.writeFileSync(
		path.join(preflightFullConsumer, 'package.json'),
		JSON.stringify(
			{
				name: 'preflight-full-e2e',
				private: true,
				scripts: {
					test: 'node -e "process.exit(0)"',
					e2e: 'node -e "require(\'fs\').writeFileSync(\'full-suite.txt\',\'ok\')"',
				},
			},
			null,
			'\t',
		) + '\n',
		'utf8',
	);
	runTool(preflightLocal, [preflightFullConsumer, '--full']);
	if (!fs.existsSync(fullMarker)) {
		console.error('preflight-local --full did not run full e2e suite');
		failed = true;
	} else {
		console.log('OK: preflight-local --full runs full e2e suite');
	}

	fs.rmSync(temp, { recursive: true, force: true });
	fs.rmSync(planConsumer, { recursive: true, force: true });
	fs.rmSync(implementConsumer, { recursive: true, force: true });
	fs.rmSync(loopConsumer, { recursive: true, force: true });
	fs.rmSync(initConsumer, { recursive: true, force: true });
	fs.rmSync(renderConsumer, { recursive: true, force: true });
	fs.rmSync(publishConsumer, { recursive: true, force: true });
	fs.rmSync(secConsumer, { recursive: true, force: true });
	fs.rmSync(cleanConsumer, { recursive: true, force: true });
	fs.rmSync(assessConsumer, { recursive: true, force: true });
	fs.rmSync(releaseConsumer, { recursive: true, force: true });
	fs.rmSync(planHtmlConsumer, { recursive: true, force: true });
	fs.rmSync(packConsumer, { recursive: true, force: true });
	fs.rmSync(packInitConsumer, { recursive: true, force: true });
	fs.rmSync(appMapConsumer, { recursive: true, force: true });
	fs.rmSync(renderMdConsumer, { recursive: true, force: true });
	fs.rmSync(watchOnceConsumer, { recursive: true, force: true });
	fs.rmSync(preflightConsumer, { recursive: true, force: true });
	fs.rmSync(preflightStoryConsumer, { recursive: true, force: true });
	fs.rmSync(preflightDiffConsumer, { recursive: true, force: true });
	fs.rmSync(preflightNoE2eConsumer, { recursive: true, force: true });
	fs.rmSync(preflightFullConsumer, { recursive: true, force: true });

	const ensureConsumer = makeTempConsumer();
	const ensureVendorRelative = '.cursor/vendor/skillsync';
	fs.mkdirSync(path.join(ensureConsumer, '.cursor', 'commands'), {
		recursive: true,
	});
	fs.cpSync(skillsyncRoot, path.join(ensureConsumer, ensureVendorRelative), {
		recursive: true,
	});
	fs.writeFileSync(
		path.join(ensureConsumer, 'skillsync.config.json'),
		JSON.stringify(
			{
				vendorRoot: ensureVendorRelative,
				linkedSkills: ['anti-slop'],
				linkedRules: ['ss-delivery-voice.mdc'],
				linkedCommands: ['ss-flow.md'],
			},
			null,
			'\t',
		) + '\n',
		'utf8',
	);
	runTool(path.join(toolsDir, 'ensure-skillsync.cjs'), [ensureConsumer, '--quiet']);
	runTool(path.join(toolsDir, 'verify-commands.cjs'), [ensureConsumer]);
	runTool(path.join(toolsDir, 'verify-skills.cjs'), [ensureConsumer]);
	runTool(path.join(toolsDir, 'verify-rules.cjs'), [ensureConsumer]);
	console.log('OK: ensure-skillsync links ss-* assets');
	fs.rmSync(ensureConsumer, { recursive: true, force: true });

	// epic-loop: next-story selection, status, approve gate, generated story table
	const epicConsumer = makeTempConsumer();
	const epicDir = path.join(epicConsumer, '.harness', 'epics', 'E9');
	fs.cpSync(path.join(fixturesDir, 'epic'), epicDir, { recursive: true });
	const epicLoop = path.join(toolsDir, 'epic-loop.cjs');
	const epicArgs = [epicConsumer, '--epic', epicDir, '--json'];

	const epicDry = JSON.parse(runTool(epicLoop, [...epicArgs, '--dry-run']));
	if (epicDry.story !== 'E9-S2' || epicDry.action !== 'start') {
		console.error(`epic-loop: expected dry run to skip E9-S1 (waits on E9-S2) and start E9-S2, got ${JSON.stringify(epicDry)}`);
		failed = true;
	} else {
		console.log('OK: epic-loop picks first story whose dependencies are merged');
	}

	const s1File = path.join(epicDir, 'stories', 'E9-S1-reference.md');
	fs.writeFileSync(s1File, fs.readFileSync(s1File, 'utf8').replace('status: todo', 'status: awaiting-approval'), 'utf8');
	const epicActive = JSON.parse(runTool(epicLoop, [...epicArgs, '--dry-run']));
	if (epicActive.story !== 'E9-S1' || epicActive.action !== 'await-approval') {
		console.error(`epic-loop: expected in-progress E9-S1 to win over ready E9-S2, got ${JSON.stringify(epicActive)}`);
		failed = true;
	} else {
		console.log('OK: epic-loop keeps one story in progress at a time');
	}

	// --story: a second loop can take a ready story while another one is in progress
	const epicPinned = JSON.parse(runTool(epicLoop, [...epicArgs, '--dry-run', '--story', 'E9-S2']));
	const epicNotReady = JSON.parse(runTool(epicLoop, [...epicArgs, '--dry-run', '--story', 'E9-S3']));
	if (epicPinned.story !== 'E9-S2' || epicPinned.action !== 'start') {
		console.error(`epic-loop --story: expected E9-S2 → start beside in-progress E9-S1, got ${JSON.stringify(epicPinned)}`);
		failed = true;
	} else if (epicNotReady.action !== 'idle' || !String(epicNotReady.detail).includes('blocked by backend API keys')) {
		console.error(`epic-loop --story: expected blocked E9-S3 to be idle, got ${JSON.stringify(epicNotReady)}`);
		failed = true;
	} else {
		console.log('OK: epic-loop --story runs one ready story and refuses one that is not ready');
	}

	// A story claimed by another live loop (this verify process stands in for it) is skipped.
	const claimsDir = path.join(epicConsumer, '.harness', 'epic-loop', 'claims');
	fs.mkdirSync(claimsDir, { recursive: true });
	fs.writeFileSync(path.join(claimsDir, 'E9-S1.pid'), String(process.pid), 'utf8');
	const epicSkip = JSON.parse(runTool(epicLoop, [...epicArgs, '--dry-run']));
	const epicTaken = JSON.parse(runTool(epicLoop, [...epicArgs, '--dry-run', '--story', 'E9-S1']));
	if (epicSkip.story !== 'E9-S2' || epicSkip.action !== 'start') {
		console.error(`epic-loop claims: expected default loop to skip claimed E9-S1 and start E9-S2, got ${JSON.stringify(epicSkip)}`);
		failed = true;
	} else if (epicTaken.action !== 'idle' || !String(epicTaken.detail).includes('another epic-loop')) {
		console.error(`epic-loop claims: expected --story on a claimed story to be idle, got ${JSON.stringify(epicTaken)}`);
		failed = true;
	} else {
		console.log('OK: epic-loop skips stories claimed by another loop');
	}
	fs.rmSync(claimsDir, { recursive: true, force: true });

	runTool(epicLoop, [...epicArgs, '--approve', 'E9-S1']);
	const s1After = fs.readFileSync(s1File, 'utf8');
	const epicTable = fs.readFileSync(path.join(epicDir, 'epic.md'), 'utf8');
	if (!s1After.includes('status: implementing')) {
		console.error('epic-loop --approve: expected E9-S1 status implementing');
		failed = true;
	} else if (!epicTable.includes('<!-- epic-loop:stories:start -->') || !/\| \[E9-S1\]\([^)]+\) \| Reference module \| E9-S2 \| implementing \|/.test(epicTable)) {
		console.error('epic-loop --approve: expected generated story table in epic.md');
		failed = true;
	} else {
		console.log('OK: epic-loop --approve + generated story table');
	}
	runTool(epicLoop, [...epicArgs, '--approve', 'E9-S1'], { expectFail: true });
	console.log('OK: epic-loop --approve refuses a story not awaiting approval');
	runTool(epicLoop, [...epicArgs, '--release', 'E9-S1'], { expectFail: true });
	console.log('OK: epic-loop --release refuses a story with no session held');

	const epicStatus = JSON.parse(runTool(epicLoop, [...epicArgs, '--status']));
	const s3 = epicStatus.stories.find((/** @type {{ id: string }} */ s) => s.id === 'E9-S3');
	if (epicStatus.next !== 'E9-S1' || s3?.status !== 'todo') {
		console.error(`epic-loop --status: unexpected ${JSON.stringify(epicStatus)}`);
		failed = true;
	} else {
		console.log('OK: epic-loop --status');
	}
	const { readDashboardState } = require('./lib/epic-dashboard.cjs');
	const dash = readDashboardState({ root: epicConsumer, epicDir, loopDir: path.join(epicConsumer, '.harness', 'epic-loop') });
	if (dash.stories.length !== 4 || dash.next.story !== 'E9-S1' || dash.loop.pid !== null || dash.agent !== null) {
		console.error(`epic dashboard state: unexpected ${JSON.stringify({ n: dash.stories.length, next: dash.next, loop: dash.loop })}`);
		failed = true;
	} else {
		console.log('OK: epic dashboard state');
	}

	// Preview: the review agent's `## Preview` routes reach the dashboard; the dev server runs in the story worktree
	fs.mkdirSync(path.join(epicDir, 'state'), { recursive: true });
	fs.writeFileSync(path.join(epicDir, 'state', 'E9-S1.md'), '## Preview\n\n- `/docs/reference` — endpoint list renders\n- /docs/reference/verses — params table\n', 'utf8');
	fs.writeFileSync(path.join(epicDir, 'state', 'E9-S2.md'), '## Preview\n\n- none — library only\n', 'utf8');
	const previewPort = 41000 + (process.pid % 1000);
	const previewCfg = { command: `${JSON.stringify(process.execPath)} -e "require('node:http').createServer((q, s) => s.end('preview ok')).listen({port})"`, basePort: previewPort };
	const { createPreviews } = require('./lib/epic-preview.cjs');
	const dashPreview = readDashboardState({ root: epicConsumer, epicDir, loopDir: path.join(epicConsumer, '.harness', 'epic-loop'), previews: createPreviews({ root: epicConsumer, loopDir: path.join(epicConsumer, '.harness', 'epic-loop'), config: previewCfg }) });
	const s1 = dashPreview.stories.find((s) => s.id === 'E9-S1')?.preview;
	const s2 = dashPreview.stories.find((s) => s.id === 'E9-S2')?.preview;
	if (
		!dashPreview.previewEnabled ||
		JSON.stringify(s1?.routes) !== JSON.stringify([{ path: '/docs/reference', check: 'endpoint list renders' }, { path: '/docs/reference/verses', check: 'params table' }]) ||
		s2?.routes.length !== 0 ||
		s2?.note !== 'none — library only'
	) {
		console.error(`epic dashboard preview: unexpected ${JSON.stringify({ enabled: dashPreview.previewEnabled, s1, s2 })}`);
		failed = true;
	} else {
		console.log('OK: dashboard shows the review agent’s preview routes');
	}
	// Start / Retry buttons: which stories are ready to start, and where a blocked one resumes
	const s0File = dashPreview.stories.find((s) => s.id === 'E9-S3');
	const readyIds = dashPreview.stories.filter((s) => s.ready).map((s) => s.id);
	const e9s3 = path.join(epicDir, 'stories', 'E9-S3-try-it.md');
	const e9s3Before = fs.readFileSync(e9s3, 'utf8');
	fs.writeFileSync(e9s3, e9s3Before.replace(/^status: .*$/m, 'status: blocked\nblocked_from: implementing\nblocked_reason: boom'), 'utf8');
	const dashBlocked = readDashboardState({ root: epicConsumer, epicDir, loopDir: path.join(epicConsumer, '.harness', 'epic-loop') });
	fs.writeFileSync(e9s3, e9s3Before, 'utf8');
	if (!s0File || JSON.stringify(readyIds) !== JSON.stringify(['E9-S2']) || dashBlocked.stories.find((s) => s.id === 'E9-S3')?.retryAt !== 'implementing') {
		console.error(`epic dashboard start/retry: unexpected ${JSON.stringify({ readyIds, retryAt: dashBlocked.stories.find((s) => s.id === 'E9-S3')?.retryAt })}`);
		failed = true;
	} else {
		console.log('OK: dashboard knows which stories can start and where a blocked one resumes');
	}
	fs.mkdirSync(path.join(epicConsumer, '.harness', 'worktrees', 'E9-S1'), { recursive: true });
	const previewScript = path.join(epicConsumer, 'preview-check.cjs');
	fs.writeFileSync(
		previewScript,
		`const { createPreviews } = require(${JSON.stringify(path.join(toolsDir, 'lib', 'epic-preview.cjs'))});
const p = createPreviews({ root: ${JSON.stringify(epicConsumer)}, loopDir: ${JSON.stringify(path.join(epicConsumer, '.harness', 'epic-loop'))}, config: ${JSON.stringify(previewCfg)} });
(async () => {
	const started = await p.start('E9-S1', 2);
	const body = started.url ? await (await fetch(started.url.replace('localhost', '127.0.0.1'))).text() : '';
	const again = await p.start('E9-S1', 2);
	const noTree = await p.start('E9-S3', 3);
	p.stop('E9-S1');
	await new Promise((r) => setTimeout(r, 500));
	const after = await fetch('http://127.0.0.1:' + (${previewPort} + 2)).then(() => 'up', () => 'down');
	console.log(JSON.stringify({ url: started.url, error: started.error, body, again: again.url, noTree: noTree.error ?? '', after }));
})();
`,
	);
	const previewRun = spawnSync(process.execPath, [previewScript], { encoding: 'utf8', timeout: 60_000 });
	/** @type {any} */
	let pv = {};
	try {
		pv = JSON.parse(previewRun.stdout.trim());
	} catch {
		pv = { raw: previewRun.stdout + previewRun.stderr };
	}
	const agentLogsDir = path.join(epicConsumer, '.harness', 'epic-loop', 'logs');
	const previewInAgentLogs = fs.existsSync(agentLogsDir) && fs.readdirSync(agentLogsDir).some((f) => f.startsWith('preview-'));
	if (pv.url !== `http://localhost:${previewPort + 2}` || pv.body !== 'preview ok' || pv.again !== pv.url || !/no worktree/.test(pv.noTree) || pv.after !== 'down' || previewInAgentLogs) {
		console.error(`epic preview server: unexpected ${JSON.stringify({ ...pv, previewInAgentLogs })}`);
		failed = true;
	} else {
		console.log('OK: preview server starts in the story worktree on its port and stops');
	}
	fs.rmSync(epicConsumer, { recursive: true, force: true });

	// pr-watch: latest run per check wins, CANCELLED ignored, failing → exit 3
	const prWatch = spawnSync(
		process.execPath,
		[path.join(toolsDir, 'pr-watch.cjs'), '--fixture', path.join(fixturesDir, 'pr-checks-failing.example.json'), '--json'],
		{ encoding: 'utf8' },
	);
	const prSummary = prWatch.stdout ? JSON.parse(prWatch.stdout.trim().split('\n')[0]) : null;
	if (
		prWatch.status !== 3 ||
		prSummary?.state !== 'failing' ||
		prSummary.failing.length !== 1 ||
		prSummary.failing[0].name !== 'CI / Frontend (test and lint)' ||
		prSummary.failing[0].runId !== '200' ||
		prSummary.pending.join() !== 'CI / Docker build'
	) {
		console.error(`pr-watch --fixture: unexpected exit ${prWatch.status} ${prWatch.stdout}${prWatch.stderr}`);
		failed = true;
	} else {
		console.log('OK: pr-watch summarizes failing checks');
	}

	// loop commits never include local .harness/ files, even when the base branch doesn't ignore them
	const commitRepo = makeTempConsumer();
	const git = (/** @type {string} */ cmd) => execFileSync('sh', ['-c', cmd], { cwd: commitRepo, encoding: 'utf8' });
	git('git init -q && git config user.email t@t && git config user.name t && git commit -q --allow-empty -m init');
	fs.mkdirSync(path.join(commitRepo, '.harness'), { recursive: true });
	fs.writeFileSync(path.join(commitRepo, '.harness', 'state.md'), 'local', 'utf8');
	fs.writeFileSync(path.join(commitRepo, 'CONTEXT.md'), 'glossary', 'utf8');
	const { commitAll } = require('./lib/pr-fix.cjs');
	const committed = commitAll(commitRepo, 'test');
	const tracked = git('git ls-files').trim().split('\n');
	if (!committed.committed || tracked.includes('.harness/state.md') || !tracked.includes('CONTEXT.md')) {
		console.error(`commitAll: expected CONTEXT.md committed and .harness/ left out, got ${JSON.stringify(tracked)}`);
		failed = true;
	} else if (commitAll(commitRepo, 'again').committed) {
		console.error('commitAll: only .harness/ changes left, expected no commit');
		failed = true;
	} else {
		console.log('OK: loop commits leave .harness/ out');
	}
	fs.rmSync(commitRepo, { recursive: true, force: true });

	// cycle commits are local checkpoints: squashed into one before the first push, never after
	const squashRepo = makeTempConsumer();
	const sq = (/** @type {string} */ cmd) => execFileSync('sh', ['-c', cmd], { cwd: squashRepo, encoding: 'utf8' }).trim();
	sq('git init -q -b master && git config user.email t@t && git config user.name t && git commit -q --allow-empty -m init');
	sq('git init -q --bare origin.git && git remote add origin ./origin.git && echo origin.git > .git/info/exclude && git push -q origin master');
	sq('git checkout -q -b feature/s1 && for n in 1 2 3; do echo $n > f$n.txt && git add f$n.txt && git commit -q -m "S1: Cycle $n"; done');
	const treeBefore = sq('git rev-parse HEAD^{tree}');
	const { squashUnpushed } = require('./lib/pr-fix.cjs');
	const squashed = squashUnpushed(squashRepo, 'feature/s1', 'master', 'S1: Story title');
	const squashedLog = sq('git log --format=%s origin/master..HEAD');
	sq('git push -q -u origin feature/s1 && echo 4 > f4.txt && git add f4.txt && git commit -q -m "Fix CI: lint" && echo 5 > f5.txt && git add f5.txt && git commit -q -m "Fix CI: test"');
	const afterPush = squashUnpushed(squashRepo, 'feature/s1', 'master', 'S1: again');
	if (!squashed.squashed || squashedLog !== 'S1: Story title' || sq('git rev-parse HEAD~2^{tree}') !== treeBefore) {
		console.error(`squashUnpushed: expected one commit with the same tree, got ${JSON.stringify({ squashed, squashedLog })}`);
		failed = true;
	} else if (afterPush.squashed || afterPush.error || sq('git rev-list --count origin/master..HEAD') !== '3') {
		console.error(`squashUnpushed: rewrote a pushed branch ${JSON.stringify(afterPush)}`);
		failed = true;
	} else {
		console.log('OK: cycle commits squash into one before the first push, never after');
	}
	fs.rmSync(squashRepo, { recursive: true, force: true });

	const { formatStreamLine } = require('./lib/agent-runner.cjs');
	const toolLine = formatStreamLine(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }] } }));
	const doneLine = formatStreamLine(JSON.stringify({ type: 'result', subtype: 'success', duration_ms: 5000, total_cost_usd: 0.1 }));
	if (toolLine !== '→ Bash: npm test' || doneLine !== 'agent finished (success) in 5s, $0.10' || formatStreamLine('{"type":"stream_event"}') !== null) {
		console.error(`formatStreamLine: unexpected ${JSON.stringify([toolLine, doneLine])}`);
		failed = true;
	} else {
		console.log('OK: agent stream lines render for --tail');
	}

	// agent.model: one id, or per phase with a default; passed to claude as --model
	const { resolveModel, runAgent } = require('./lib/agent-runner.cjs');
	const perPhase = { epicLoop: { agent: { runner: 'claude', model: { plan: 'opus-x', default: 'sonnet-x' } } } };
	const modelLog = path.join(os.tmpdir(), `skillsync-model-${process.pid}.log`);
	const modelRun = runAgent({ cwd: os.tmpdir(), prompt: 'p', logFile: modelLog, config: perPhase, phase: 'plan', dryRun: true });
	const pinnedArgs = runAgent({ cwd: os.tmpdir(), prompt: 'p', logFile: modelLog, config: { epicLoop: { agent: { args: ['-p', '--model', 'mine'], model: 'opus-x' } } }, phase: 'plan', dryRun: true });
	fs.rmSync(modelLog, { force: true });
	const picks = [
		resolveModel(perPhase, 'plan'),
		resolveModel(perPhase, 'cycle3'),
		resolveModel({ epicLoop: { agent: { model: { cycle: 'c-x' } } } }, 'cycle12'),
		resolveModel({ epicLoop: { agent: { model: { plan: 'opus-x' } } } }, 'review'),
		resolveModel({ epicLoop: { agent: { model: 'one-x' } } }, 'fix'),
		resolveModel(null, 'plan'),
	];
	if (JSON.stringify(picks) !== JSON.stringify(['opus-x', 'sonnet-x', 'c-x', null, 'one-x', null])) {
		console.error(`resolveModel: unexpected ${JSON.stringify(picks)}`);
		failed = true;
	} else if (!modelRun.command.includes('--model opus-x') || pinnedArgs.command.includes('opus-x')) {
		console.error(`runAgent --model: unexpected ${JSON.stringify([modelRun.command, pinnedArgs.command])}`);
		failed = true;
	} else {
		console.log('OK: agent model resolves per phase and reaches claude as --model');
	}

	// Unattended agents: auto mode approves routine shell work; commit/push stay denied (the loop owns them)
	const denied = modelRun.command.split('--disallowedTools ')[1] ?? '';
	if (!modelRun.command.includes('--permission-mode auto') || !/^\S*Bash\(git commit:\*\)/.test(denied) || !/Bash\(git push:\*\)/.test(denied)) {
		console.error(`runAgent permissions: expected --permission-mode auto with git commit/push denied, got ${modelRun.command}`);
		failed = true;
	} else {
		console.log('OK: agents run in auto permission mode with git commit/push denied');
	}

	// Paseo runner (default): one chat per phase, model and labels on `paseo run`
	const { resolveAgent } = require('./lib/agent-runner.cjs');
	const paseoDry = runAgent({ cwd: os.tmpdir(), prompt: 'p', logFile: modelLog, config: { epicLoop: { agent: { model: { plan: 'opus-x' } } } }, phase: 'plan', labels: { story: 'E9-S1' }, dryRun: true });
	fs.rmSync(modelLog, { force: true });
	const runners = [resolveAgent(null).runner, resolveAgent({ epicLoop: { agent: { args: ['-p'] } } }).runner, resolveAgent({ epicLoop: { agent: { runner: 'claude' } } }).runner];
	if (
		JSON.stringify(runners) !== JSON.stringify(['paseo', 'claude', 'claude']) ||
		!/ run -d --json --provider claude --mode auto --model opus-x .*--label story=E9-S1 /.test(paseoDry.command) ||
		paseoDry.runner !== 'paseo'
	) {
		console.error(`paseo runner: unexpected ${JSON.stringify({ runners, command: paseoDry.command })}`);
		failed = true;
	} else {
		console.log('OK: agents default to Paseo sessions; a custom command or runner: claude keeps claude -p');
	}

	formatStreamLine('[Shell] npm test') === '→ Shell: npm test' && formatStreamLine('[User] why this?') === '» why this?'
		? console.log('OK: Paseo timeline lines render for --tail')
		: ((failed = true), console.error(`formatStreamLine paseo: ${JSON.stringify([formatStreamLine('[Shell] npm test'), formatStreamLine('[User] why this?')])}`));

	// A fake paseo CLI with the real one's JSON shapes. FAKE_HUMAN=1 stamps a message from you
	// after the loop's own; the agent record lives where Paseo keeps it ($PASEO_HOME/agents/…).
	const paseoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillsync-paseo-'));
	const fakePaseo = path.join(paseoDir, 'paseo');
	fs.writeFileSync(
		fakePaseo,
		`#!${process.execPath}
const fs = require('node:fs'), path = require('node:path');
const [cmd, ...rest] = process.argv.slice(2);
const home = process.env.PASEO_HOME;
fs.appendFileSync(path.join(home, 'calls.log'), [cmd, ...rest.filter((a) => !a.includes('\\n'))].join(' ') + '\\n');
const out = (v) => process.stdout.write(JSON.stringify(v));
if (cmd === 'status') out({ localDaemon: 'running', providers: [{ provider: 'claude', available: true, error: null }] });
else if (cmd === 'run') {
  fs.mkdirSync(path.join(home, 'agents', 'ws'), { recursive: true });
  const human = process.env.FAKE_HUMAN === '1' ? 60000 : 5;
  fs.writeFileSync(path.join(home, 'agents', 'ws', 'agent-1.json'), JSON.stringify({ lastUserMessageAt: new Date(Date.now() + human).toISOString() }));
  out({ agentId: 'agent-1', status: 'running' });
} else if (cmd === 'inspect') out({ Status: 'idle', Archived: false, PendingPermissions: [] });
else if (cmd === 'logs') console.log('[User] p\\n[Shell] npm test');
else if (cmd === 'ls') out([{ id: 'agent-1' }, { id: 'agent-2' }]);
else out({});
`,
	);
	fs.chmodSync(fakePaseo, 0o755);
	const paseoCwd = path.join(paseoDir, 'wt');
	fs.mkdirSync(paseoCwd);
	spawnSync('git', ['init', '-q'], { cwd: paseoCwd });
	const paseoConfig = { epicLoop: { agent: { paseo: fakePaseo } } };
	const savedHome = process.env.PASEO_HOME;
	process.env.PASEO_HOME = paseoDir;
	/** @param {Record<string, any>} extra */
	const paseoRun = (extra) => {
		/** @type {boolean[]} */
		const holds = [];
		const run = runAgent({ cwd: paseoCwd, prompt: 'p', logFile: path.join(paseoDir, 'agent.log'), config: paseoConfig, phase: 'cycle1', addDirs: ['/skills'], ownsCwd: true, pollMs: 20, waitSec: 1, onHold: (/** @type {boolean} */ h) => holds.push(h), ...extra });
		return { ...run, holds };
	};
	try {
		delete process.env.FAKE_HUMAN;
		const alone = paseoRun({ ready: () => false });
		const settings = JSON.parse(fs.readFileSync(path.join(paseoCwd, '.claude', 'settings.local.json'), 'utf8')).permissions;
		const status = spawnSync('git', ['status', '--porcelain'], { cwd: paseoCwd, encoding: 'utf8' }).stdout.trim();
		const aloneLog = fs.readFileSync(alone.logFile, 'utf8');
		if (alone.status !== 0 || alone.intervened || alone.holds.length || !settings.deny.includes('Bash(git commit:*)') || !settings.additionalDirectories.includes('/skills') || status !== '' || aloneLog.split('[Shell] npm test').length !== 2) {
			console.error(`paseo runner, nobody joins: unexpected ${JSON.stringify({ alone, settings, status, aloneLog })}`);
			failed = true;
		} else {
			console.log('OK: Paseo phase ends when the agent goes idle; commit/push denied via a git-excluded settings file');
		}

		process.env.FAKE_HUMAN = '1';
		let polls = 0;
		const heldRun = paseoRun({ ready: () => false, released: () => ++polls >= 3 });
		const readyRun = paseoRun({ ready: () => true, released: () => false });
		if (heldRun.status !== 0 || !heldRun.intervened || JSON.stringify(heldRun.holds) !== '[true,false]' || polls !== 3 || !readyRun.intervened || readyRun.holds.length) {
			console.error(`paseo runner, you join: unexpected ${JSON.stringify({ heldRun, polls, readyRun })}`);
			failed = true;
		} else {
			console.log('OK: a session you messaged is held until its check passes or you release it');
		}

		// Not the loop's checkout (pr-watch --fix on yours): your settings file comes back as it was
		delete process.env.FAKE_HUMAN;
		const mine = '{ "permissions": { "allow": ["Bash(ls:*)"] } }\n';
		fs.writeFileSync(path.join(paseoCwd, '.claude', 'settings.local.json'), mine);
		paseoRun({ ownsCwd: false });
		const restored = fs.readFileSync(path.join(paseoCwd, '.claude', 'settings.local.json'), 'utf8');
		const { archiveSessions } = require('./lib/paseo-agent.cjs');
		const archivedCount = archiveSessions(fakePaseo, paseoCwd, { story: 'E9-S1' });
		const calls = fs.readFileSync(path.join(paseoDir, 'calls.log'), 'utf8');
		if (restored !== mine || archivedCount !== 2 || !calls.includes('ls -g --json --label story=E9-S1')) {
			console.error(`paseo runner, your checkout / archive: unexpected ${JSON.stringify({ restored, archivedCount })}`);
			failed = true;
		} else {
			console.log('OK: settings restored outside loop worktrees; a merged story archives its sessions');
		}
	} finally {
		if (savedHome === undefined) delete process.env.PASEO_HOME;
		else process.env.PASEO_HOME = savedHome;
		delete process.env.FAKE_HUMAN;
		fs.rmSync(paseoDir, { recursive: true, force: true });
	}

	// Approve after talking to the planner: the newer copy of the plan wins and must still validate
	const { approvePlan } = require('./lib/epic-session.cjs');
	const approveRoot = makeTempConsumer();
	const approveEpic = path.join(approveRoot, '.harness', 'epics', 'E9');
	const sessionState = path.join(approveRoot, '.harness', 'worktrees', 'E9-S1', '.harness', 'state.md');
	const epicState = path.join(approveEpic, 'state', 'E9-S1.md');
	fs.mkdirSync(path.dirname(sessionState), { recursive: true });
	fs.mkdirSync(path.dirname(epicState), { recursive: true });
	const validPlan = fs.readFileSync(path.join(fixturesDir, 'plan-valid-state.md'), 'utf8');
	fs.writeFileSync(epicState, '# old plan\n');
	fs.writeFileSync(sessionState, validPlan);
	fs.utimesSync(epicState, new Date(Date.now() - 60_000), new Date(Date.now() - 60_000));
	const fromSession = approvePlan(approveRoot, approveEpic, 'E9-S1');
	const copied = fs.readFileSync(epicState, 'utf8') === validPlan;
	fs.writeFileSync(sessionState, '# broken\n');
	const broken = approvePlan(approveRoot, approveEpic, 'E9-S1');
	const noWorktree = approvePlan(approveRoot, approveEpic, 'E9-S2');
	fs.rmSync(approveRoot, { recursive: true, force: true });
	if (!fromSession.ok || fromSession.from !== 'session' || !copied || broken.ok || !noWorktree.ok) {
		console.error(`approvePlan: unexpected ${JSON.stringify({ fromSession, copied, broken, noWorktree })}`);
		failed = true;
	} else {
		console.log('OK: approve takes the planner session’s changes and refuses a plan that no longer validates');
	}

	// Retry a blocked story: back to the column it was blocked from; older blocks fall back to a safe guess
	const { retryStory } = require('./lib/epic.cjs');
	/** @param {Record<string, any>} over @param {Record<string, string>} [meta] */
	const blockedStory = (over, meta = {}) => ({ id: 'X', title: 'X', status: 'blocked', dependsOn: [], blockedBy: '', branch: 'feature/x', pr: null, attempts: 2, body: '', file: '', meta: { blocked_reason: 'boom', ...meta }, ...over });
	const fromReview = blockedStory({}, { blocked_from: 'reviewing' });
	const fromPr = blockedStory({ pr: 7 }, { blocked_from: 'pr-open', fix_attempts: '3', fixed_sha: 'abc' });
	const retried = [
		retryStory(fromReview, ''),
		retryStory(fromPr, ''),
		retryStory(blockedStory({ pr: 12 }), ''),
		retryStory(blockedStory({ branch: '' }), ''),
		retryStory(blockedStory({}), '## Remaining\n\nCycle 1, Cycle 2\n'),
		retryStory(blockedStory({}), '## Completed\n\nCycle 1\n\n## Remaining\n\nCycle 2\n'),
		retryStory(blockedStory({}), '## Completed\n\nCycle 1, Cycle 2\n\n## Remaining\n\n(none)\n'),
	];
	const expectRetried = ['reviewing', 'pr-open', 'pr-open', 'todo', 'planning', 'implementing', 'reviewing'];
	if (
		JSON.stringify(retried) !== JSON.stringify(expectRetried) ||
		fromReview.status !== 'reviewing' ||
		fromReview.attempts !== 0 ||
		fromReview.meta.blocked_reason !== undefined ||
		fromReview.meta.blocked_from !== undefined ||
		fromPr.meta.fix_attempts !== undefined ||
		fromPr.meta.fixed_sha !== undefined
	) {
		console.error(`retryStory: unexpected ${JSON.stringify({ retried, fromReview: fromReview.meta, fromPr: fromPr.meta })}`);
		failed = true;
	} else {
		console.log('OK: retry sends a blocked story back to where it was blocked, counters reset');
	}

	// Beads-style: --ready lists what can start now; --file adds discovered work as a todo story
	{
		const consumer = makeTempConsumer();
		const dir = path.join(consumer, '.harness', 'epics', 'E9');
		fs.cpSync(path.join(fixturesDir, 'epic'), dir, { recursive: true });
		const loop = path.join(toolsDir, 'epic-loop.cjs');
		const args = [consumer, '--epic', dir, '--json'];
		const ready = JSON.parse(runTool(loop, [...args, '--ready']));
		const ids = (/** @type {{ id: string }[]} */ list) => list.map((x) => x.id).join(',');
		if (ids(ready.ready) !== 'E9-S2' || ids(ready.waiting) !== 'E9-S1,E9-S3' || ready.waiting[0].waitsOn[0] !== 'E9-S2' || ready.waiting[1].waitsOn[0] !== 'backend API keys') {
			console.error(`epic-loop --ready: unexpected ${JSON.stringify(ready)}`);
			failed = true;
		} else {
			console.log('OK: epic-loop --ready lists ready and waiting stories with what they wait on');
		}
		const filed = JSON.parse(runTool(loop, [...args, '--file', 'Fix the nav focus ring', '--from', 'E9-S2', '--depends-on', 'E9-S0', '--note', 'Focus ring hidden on dark theme']));
		const again = JSON.parse(runTool(loop, [...args, '--file', 'fix the nav  focus ring', '--from', 'E9-S2']));
		const { loadEpic } = require('./lib/epic.cjs');
		const after = loadEpic(dir);
		const s4 = after.stories.find((x) => x.id === 'E9-S4');
		const readyAfter = JSON.parse(runTool(loop, [...args, '--ready']));
		const table = fs.readFileSync(path.join(dir, 'epic.md'), 'utf8');
		const progressLog = fs.readFileSync(path.join(consumer, '.harness', 'epic-loop', 'progress.log'), 'utf8');
		if (
			filed.id !== 'E9-S4' || !filed.created || again.id !== 'E9-S4' || again.created ||
			s4?.status !== 'todo' || s4.meta.discovered_from !== 'E9-S2' || s4.dependsOn.join() !== 'E9-S0' || !s4.body.includes('Focus ring hidden') ||
			ids(readyAfter.ready) !== 'E9-S2,E9-S4' || !table.includes('E9-S4') || !/E9-S4: filed \(found in E9-S2\)/.test(progressLog)
		) {
			console.error(`epic-loop --file: unexpected ${JSON.stringify({ filed, again, s4: s4 && { status: s4.status, meta: s4.meta, deps: s4.dependsOn }, ready: ids(readyAfter.ready) })}`);
			failed = true;
		} else {
			console.log('OK: epic-loop --file adds a todo story with the next id, once per title');
		}
		runTool(loop, [...args, '--file', 'Needs a ghost', '--depends-on', 'E9-S99'], { expectFail: true });
		runTool(loop, [...args, '--file', 'Second', '--from', 'E9-S2']);
		runTool(loop, [...args, '--file', 'Third', '--from', 'E9-S2']);
		runTool(loop, [...args, '--file', 'Fourth', '--from', 'E9-S2'], { expectFail: true });
		console.log('OK: epic-loop --file refuses unknown dependencies and caps stories filed per story');
		// Parallel: E9-S2 for this loop, the filed E9-S4/S5/S6 for --story loops, up to the limit
		const par1 = JSON.parse(runTool(loop, [...args, '--dry-run']));
		const par3 = JSON.parse(runTool(loop, [...args, '--dry-run', '--parallel', '3']));
		const claims = path.join(consumer, '.harness', 'epic-loop', 'claims');
		fs.mkdirSync(claims, { recursive: true });
		fs.writeFileSync(path.join(claims, 'E9-S4.pid'), String(process.pid), 'utf8');
		const par3Claimed = JSON.parse(runTool(loop, [...args, '--dry-run', '--parallel', '3']));
		if (par1.parallel.length || par3.story !== 'E9-S2' || par3.parallel.join() !== 'E9-S4,E9-S5' || par3Claimed.parallel.join() !== 'E9-S5') {
			console.error(`epic-loop --parallel: unexpected ${JSON.stringify({ par1: par1.parallel, par3: [par3.story, par3.parallel], claimed: par3Claimed.parallel })}`);
			failed = true;
		} else {
			console.log('OK: epic-loop --parallel starts other ready stories up to the limit, counting running loops');
		}
		fs.rmSync(consumer, { recursive: true, force: true });
	}

	// Critic verdict: also read when the agent puts it in a same-level heading under `## Last Critic Verdict`
	const { criticVerdict } = require('./epic-loop.cjs');
	const verdicts = [
		criticVerdict('## Last Critic Verdict\n\nPASS — all good\n\n## Notes\n\nFAIL earlier\n'),
		criticVerdict('## Last Critic Verdict\n\n## Critic Verdict: PASS\n\nScores…\n'),
		criticVerdict('## Last Critic Verdict\n\n## Critic Verdict\n\n**FAIL** — two findings\n'),
		criticVerdict('## Last Critic Verdict\n\n## TDD Evidence\n\n| 1 | PASS |\n'),
	];
	if (JSON.stringify(verdicts) !== JSON.stringify(['PASS', 'PASS', 'FAIL', null])) {
		console.error(`criticVerdict: unexpected ${JSON.stringify(verdicts)}`);
		failed = true;
	} else {
		console.log('OK: critic verdict read even when written as its own heading');
	}

	// A plain `kill` of the loop also stops the agent it is blocked on
	const killDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillsync-kill-'));
	const agentPidFile = path.join(killDir, 'agent.pid');
	fs.writeFileSync(path.join(killDir, 'agent.cjs'), `require('node:fs').writeFileSync(${JSON.stringify(agentPidFile)}, String(process.pid)); setTimeout(() => {}, 60000);\n`);
	const killConfig = { epicLoop: { agent: { command: process.execPath, args: [path.join(killDir, 'agent.cjs')] } } };
	fs.writeFileSync(
		path.join(killDir, 'loop.cjs'),
		`require(${JSON.stringify(path.join(toolsDir, 'lib', 'agent-runner.cjs'))}).runAgent({ cwd: ${JSON.stringify(killDir)}, prompt: 'p', logFile: ${JSON.stringify(path.join(killDir, 'agent.log'))}, config: ${JSON.stringify(killConfig)} });\n`,
	);
	const killScript = [
		`${JSON.stringify(process.execPath)} loop.cjs & L=$!`,
		'for i in $(seq 50); do [ -s agent.pid ] && break; sleep 0.1; done',
		'kill $L; sleep 2',
		'kill -0 "$(cat agent.pid)" 2>/dev/null && { echo alive; kill "$(cat agent.pid)"; } || echo stopped',
	].join('\n');
	const killed = spawnSync('sh', ['-c', killScript], { cwd: killDir, encoding: 'utf8' }).stdout.trim();
	fs.rmSync(killDir, { recursive: true, force: true });
	if (killed !== 'stopped') {
		console.error(`runAgent: agent still running after the loop was killed (${killed || 'no output'})`);
		failed = true;
	} else {
		console.log('OK: killing the loop stops the running agent');
	}

	// Startup check: a configured model the installed CLI cannot run is caught before any story starts
	const { checkAgentModels } = require('./lib/agent-runner.cjs');
	const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'skillsync-claude-'));
	fs.writeFileSync(
		path.join(fakeBin, 'claude'),
		[
			'#!/bin/sh',
			'case "$*" in',
			'  *--version*) echo "1.0.0 (Claude Code)" ;;',
			`  *new-model*) echo '{"type":"result","is_error":true,"result":"model needs a newer CLI"}' ;;`,
			`  *) echo '{"type":"result","is_error":false,"result":"OK"}' ;;`,
			'esac',
			'',
		].join('\n'),
		{ mode: 0o755 },
	);
	const savedPath = process.env.PATH;
	process.env.PATH = `${fakeBin}${path.delimiter}${savedPath}`;
	let modelProblems;
	let modelFine;
	try {
		modelProblems = checkAgentModels({ epicLoop: { agent: { model: { plan: 'new-model', default: 'old-model' } } } }, fakeBin);
		modelFine = checkAgentModels({ epicLoop: { agent: { model: 'old-model' } } }, fakeBin);
	} finally {
		process.env.PATH = savedPath;
		fs.rmSync(fakeBin, { recursive: true, force: true });
	}
	if (modelProblems.length !== 1 || !/new-model/.test(modelProblems[0]) || !/needs a newer CLI/.test(modelProblems[0]) || !/1\.0\.0/.test(modelProblems[0]) || modelFine.length !== 0) {
		console.error(`checkAgentModels: unexpected ${JSON.stringify({ modelProblems, modelFine })}`);
		failed = true;
	} else {
		console.log('OK: startup check catches a model the agent CLI cannot run');
	}

	const { parseCompletedRemaining } = require('./lib/ss-tools.cjs');
	const split = parseCompletedRemaining('## Completed\n\nCycle 1\n\n## Remaining\n\nCycle 2, Cycle 3\n');
	if (split.completed.join() !== '1' || split.remaining.join() !== '2,3') {
		console.error(`parseCompletedRemaining: separate sections not read: ${JSON.stringify(split)}`);
		failed = true;
	} else {
		console.log('OK: parseCompletedRemaining reads separate Completed / Remaining sections');
	}

	if (failed) {
		console.error('');
		console.error('verify-tools: FAILED');
		process.exit(1);
	}

	console.log('');
	console.log('verify-tools: all checks passed');
}

main();
