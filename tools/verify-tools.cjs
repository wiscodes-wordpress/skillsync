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
	'validate-state.cjs',
	'init-state.cjs',
	'render-pr-body.cjs',
	'open-pr.cjs',
	'tdd-audit.cjs',
	'security-audit.cjs',
	'security-assess.cjs',
	'run-verification.cjs',
	're-break.cjs',
	'publish-slices-from-state.cjs',
	'jira-close.cjs',
	'init-release-brief.cjs',
	'validate-release-brief.cjs',
	'validate-release-pack.cjs',
	'validate-plan-html.cjs',
	'init-plan-html.cjs',
	'init-feature-pack.cjs',
	'validate-feature-pack.cjs',
	'lib/ss-tools.cjs',
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
		console.error('harness-reset: legacy code-handoff.md should be deleted');
		failed = true;
	}
	console.log('OK: harness-reset integration');

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

	const initConsumer = makeTempConsumer();
	runTool(path.join(toolsDir, 'init-state.cjs'), [
		initConsumer,
		'--task',
		'DEMO-1 init fixture',
	]);
	runTool(path.join(toolsDir, 'init-state.cjs'), [initConsumer], { expectFail: true });
	console.log('OK: init-state writes skeleton and refuses overwrite');

	const renderConsumer = makeTempConsumer();
	fs.mkdirSync(path.join(renderConsumer, '.harness'), { recursive: true });
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-valid-state.md'),
		path.join(renderConsumer, '.harness', 'state.md'),
	);
	const bodyPath = runTool(path.join(toolsDir, 'render-pr-body.cjs'), [
		renderConsumer,
	]).trim();
	if (!fs.existsSync(bodyPath) || !fs.readFileSync(bodyPath, 'utf8').includes('Harness summary')) {
		console.error('render-pr-body: expected Harness summary section');
		failed = true;
	} else {
		console.log('OK: render-pr-body');
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
	console.log('OK: validate-plan-html arch/ux/security/handoff fixtures');

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
		runTool(initPlanHtml, [initConsumer, '--kind', kind], { expectFail: true });
	}
	console.log('OK: init-plan-html scaffold + structure validate + overwrite refuse');

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
		path.join(packDirPath, 'architecture.html'),
	);
	fs.copyFileSync(
		path.join(fixturesDir, 'plan-security-valid.html'),
		path.join(packDirPath, 'security.html'),
	);
	runTool(validateFeaturePackTool, [packConsumer, '--slug', 'ai-chatbot']);
	console.log('OK: feature-pack init + required-lens gate + key parity pass');

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

	fs.rmSync(temp, { recursive: true, force: true });
	fs.rmSync(planConsumer, { recursive: true, force: true });
	fs.rmSync(implementConsumer, { recursive: true, force: true });
	fs.rmSync(initConsumer, { recursive: true, force: true });
	fs.rmSync(renderConsumer, { recursive: true, force: true });
	fs.rmSync(publishConsumer, { recursive: true, force: true });
	fs.rmSync(secConsumer, { recursive: true, force: true });
	fs.rmSync(cleanConsumer, { recursive: true, force: true });
	fs.rmSync(assessConsumer, { recursive: true, force: true });
	fs.rmSync(releaseConsumer, { recursive: true, force: true });
	fs.rmSync(planHtmlConsumer, { recursive: true, force: true });
	fs.rmSync(packConsumer, { recursive: true, force: true });

	if (failed) {
		console.error('');
		console.error('verify-tools: FAILED');
		process.exit(1);
	}

	console.log('');
	console.log('verify-tools: all checks passed');
}

main();
