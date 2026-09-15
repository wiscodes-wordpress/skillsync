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
const { execFileSync } = require('node:child_process');

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
	'security-assess.cjs',
	'run-verification.cjs',
	'ss-loop.cjs',
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
	'lib/ss-tools.cjs',
	'lib/plan-md.cjs',
	'lib/plan-paths.cjs',
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
	if (fs.existsSync(path.join(temp, '.harness', 'evidence'))) {
		console.error('harness-reset: evidence/ should be deleted');
		failed = true;
	}
	console.log('OK: harness-reset integration');

	runTool(path.join(toolsDir, 'bugfix-debug-log.cjs'), ['--self-test']);
	console.log('OK: bugfix-debug-log self-test');

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

	if (failed) {
		console.error('');
		console.error('verify-tools: FAILED');
		process.exit(1);
	}

	console.log('');
	console.log('verify-tools: all checks passed');
}

main();
