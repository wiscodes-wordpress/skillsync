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
	'run-verification.cjs',
	're-break.cjs',
	'publish-slices-from-state.cjs',
	'jira-close.cjs',
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

	fs.rmSync(temp, { recursive: true, force: true });
	fs.rmSync(planConsumer, { recursive: true, force: true });
	fs.rmSync(implementConsumer, { recursive: true, force: true });
	fs.rmSync(initConsumer, { recursive: true, force: true });
	fs.rmSync(renderConsumer, { recursive: true, force: true });
	fs.rmSync(publishConsumer, { recursive: true, force: true });

	if (failed) {
		console.error('');
		console.error('verify-tools: FAILED');
		process.exit(1);
	}

	console.log('');
	console.log('verify-tools: all checks passed');
}

main();
