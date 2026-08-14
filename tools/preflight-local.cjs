#!/usr/bin/env node
/**
 * Local CI preflight — run before commit / push / open PR to catch failures
 * without spending GitHub Actions minutes.
 *
 * Usage:
 *   node path/to/skillsync/tools/preflight-local.cjs [/path/to/repo] [--base main] [--full]
 *
 * Skillsync root: verify-tools (+ structural skill/command presence).
 * Consumer (default): verify/test + story/diff-scoped E2E only.
 * Consumer (--full): same, then full e2e/test:e2e (or playwright/cypress suite) when present —
 *   use before opening a PR so Actions is confirmation, not discovery.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
	parseArgs,
	resolveConsumerRoot,
	readOptionalConfig,
	readState,
	parseMarkdownSections,
	commandsFromVerificationPlan,
	runCommand,
	gitMergeBase,
} = require('./lib/ss-tools.cjs');

const skillsyncRoot = path.join(__dirname, '..');

/**
 * @param {string} root
 * @returns {boolean}
 */
function isSkillsyncCheckout(root) {
	const pkgPath = path.join(root, 'package.json');
	if (!fs.existsSync(pkgPath)) {
		return false;
	}
	try {
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
		return (
			pkg.name === 'skillsync' &&
			fs.existsSync(path.join(root, 'tools', 'verify-tools.cjs')) &&
			fs.existsSync(path.join(root, 'skills')) &&
			fs.existsSync(path.join(root, 'commands'))
		);
	} catch {
		return false;
	}
}

/**
 * @param {string} cwd
 * @param {string} command
 * @param {string[]} args
 */
function run(cwd, command, args) {
	console.log(`> ${command} ${args.join(' ')}`);
	execFileSync(command, args, {
		cwd,
		stdio: 'inherit',
		encoding: 'utf8',
	});
}

/**
 * @param {string} root
 * @returns {Record<string, string> | null}
 */
function readPackageScripts(root) {
	const pkgPath = path.join(root, 'package.json');
	if (!fs.existsSync(pkgPath)) {
		return null;
	}
	try {
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
		return pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : null;
	} catch {
		return null;
	}
}

/**
 * @param {string} root
 * @returns {'yarn' | 'npm'}
 */
function packageRunner(root) {
	return fs.existsSync(path.join(root, 'yarn.lock')) ? 'yarn' : 'npm';
}

/**
 * @param {string} root
 * @param {string} scriptName
 * @param {string[]} [extraArgs]
 */
function runPackageScript(root, scriptName, extraArgs = []) {
	const runner = packageRunner(root);
	if (runner === 'yarn') {
		const args =
			extraArgs.length > 0 ? [scriptName, '--', ...extraArgs] : [scriptName];
		run(root, 'yarn', args);
	} else {
		const args =
			extraArgs.length > 0
				? ['run', scriptName, '--', ...extraArgs]
				: ['run', scriptName];
		run(root, 'npm', args);
	}
}

/**
 * @param {string} root
 */
function assertSkillsyncStructure(root) {
	const skillsRoot = path.join(root, 'skills');
	const commandsRoot = path.join(root, 'commands');
	let failed = false;

	/** @type {string[]} */
	const skillDirs = [];
	for (const category of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
		if (!category.isDirectory() || category.name.startsWith('.')) {
			continue;
		}
		const categoryPath = path.join(skillsRoot, category.name);
		for (const entry of fs.readdirSync(categoryPath, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name.startsWith('.')) {
				continue;
			}
			skillDirs.push(path.join(categoryPath, entry.name));
		}
	}

	for (const dir of skillDirs) {
		const skillMd = path.join(dir, 'SKILL.md');
		if (!fs.existsSync(skillMd)) {
			console.error(`MISSING SKILL.md: ${path.relative(root, skillMd)}`);
			failed = true;
		}
	}

	const commandFiles = fs
		.readdirSync(commandsRoot)
		.filter((name) => name.startsWith('ss-') && name.endsWith('.md'));
	if (commandFiles.length === 0) {
		console.error('MISSING: no commands/ss-*.md files');
		failed = true;
	}

	if (failed) {
		process.exit(1);
	}
	console.log(
		`OK: skillsync structure (${skillDirs.length} skills, ${commandFiles.length} ss-* commands)`,
	);
}

/**
 * @param {string} root
 */
function runSkillsyncPreflight(root) {
	assertSkillsyncStructure(root);
	run(root, process.execPath, [path.join(root, 'tools', 'verify-tools.cjs'), root]);
}

/**
 * @param {string} root
 * @returns {string}
 */
function resolveVendorToolsDir(root) {
	const configPath = path.join(root, 'skillsync.config.json');
	if (fs.existsSync(configPath)) {
		try {
			const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
			const vendorRoot = path.join(
				root,
				parsed.vendorRoot ?? '.cursor/vendor/skillsync',
			);
			const toolsDir = path.join(vendorRoot, 'tools');
			if (fs.existsSync(toolsDir)) {
				return toolsDir;
			}
		} catch {
			// fall through
		}
	}
	return path.join(skillsyncRoot, 'tools');
}

/**
 * @param {string} cmd
 * @returns {boolean}
 */
function isE2eCommand(cmd) {
	const c = cmd.toLowerCase();
	return (
		/\be2e\b/.test(c) ||
		/\bplaywright\b/.test(c) ||
		/\bcypress\b/.test(c) ||
		/test:e2e/.test(c) ||
		/\/e2e\//.test(c) ||
		/\.e2e\./.test(c)
	);
}

/**
 * @param {string} file
 * @returns {boolean}
 */
function isE2ePath(file) {
	return (
		file.includes('/e2e/') ||
		file.startsWith('e2e/') ||
		/\.e2e\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file) ||
		/(?:^|\/)cypress\/(?:e2e|integration)\//.test(file) ||
		/(?:^|\/)tests\/e2e\//.test(file)
	);
}

/**
 * Story-scoped E2E commands from `.harness/state.md` Verification Plan.
 * @param {string} root
 * @returns {string[]}
 */
function storyE2eCommands(root) {
	const state = readState(root);
	if (!state) {
		return [];
	}
	const plan = parseMarkdownSections(state).get('Verification Plan');
	if (!plan) {
		return [];
	}
	const parsed = commandsFromVerificationPlan(plan, null);
	if (!parsed.ok) {
		return [];
	}
	return parsed.commands.filter(isE2eCommand);
}

/**
 * E2E files changed vs merge-base (includes untracked).
 * @param {string} root
 * @param {string} base
 * @returns {string[]}
 */
function changedE2ePaths(root, base) {
	const mergeBase = gitMergeBase(root, base);
	const nameOnly = runCommand(root, `git diff --name-only ${mergeBase}`);
	const untracked = runCommand(root, 'git ls-files --others --exclude-standard');
	return [...nameOnly.stdout.split('\n'), ...untracked.stdout.split('\n')]
		.map((p) => p.trim())
		.filter(Boolean)
		.filter(isE2ePath)
		.filter((p, i, arr) => arr.indexOf(p) === i)
		.filter((p) => fs.existsSync(path.join(root, p)));
}

/**
 * @param {string} root
 * @param {string} cmd
 */
function runShell(root, cmd) {
	console.log(`> ${cmd}`);
	const result = runCommand(root, cmd);
	if (result.status !== 0) {
		if (result.stderr) {
			console.error(result.stderr.slice(0, 4000));
		}
		if (result.stdout) {
			console.error(result.stdout.slice(0, 2000));
		}
		process.exit(result.status || 1);
	}
}

/**
 * Run E2E only for the related story or git diff — never the full suite by default.
 * @param {string} root
 * @param {string} base
 * @param {Record<string, string>} scripts
 * @returns {boolean} true when an E2E command actually ran
 */
function runScopedE2e(root, base, scripts) {
	const storyCmds = storyE2eCommands(root);
	if (storyCmds.length > 0) {
		console.log(
			`preflight-local: story-scoped E2E (${storyCmds.length} Verification Plan command(s))`,
		);
		for (const cmd of storyCmds) {
			runShell(root, cmd);
		}
		return true;
	}

	const files = changedE2ePaths(root, base);
	if (files.length === 0) {
		console.log(
			'preflight-local: no story Verification Plan E2E and no changed e2e files — skipping full e2e suite',
		);
		return false;
	}

	console.log(`preflight-local: diff-scoped E2E (${files.join(', ')})`);

	const hasPlaywright =
		fs.existsSync(path.join(root, 'node_modules', '@playwright', 'test')) ||
		fs.existsSync(path.join(root, 'playwright.config.ts')) ||
		fs.existsSync(path.join(root, 'playwright.config.js')) ||
		fs.existsSync(path.join(root, 'playwright.config.mjs'));
	if (hasPlaywright || /\bplaywright\b/i.test(scripts.e2e || scripts['test:e2e'] || '')) {
		run(root, 'npx', ['playwright', 'test', ...files]);
		return true;
	}

	const hasCypress =
		fs.existsSync(path.join(root, 'node_modules', 'cypress')) ||
		fs.existsSync(path.join(root, 'cypress.config.ts')) ||
		fs.existsSync(path.join(root, 'cypress.config.js'));
	if (hasCypress || /\bcypress\b/i.test(scripts.e2e || scripts['test:e2e'] || '')) {
		run(root, 'npx', ['cypress', 'run', '--spec', files.join(',')]);
		return true;
	}

	if (scripts['test:e2e']) {
		runPackageScript(root, 'test:e2e', files);
		return true;
	}
	if (scripts.e2e) {
		runPackageScript(root, 'e2e', files);
		return true;
	}

	console.error(
		'preflight-local: changed e2e files detected but no playwright/cypress/e2e runner found.',
	);
	console.error(`Files: ${files.join(', ')}`);
	process.exit(1);
}

/**
 * Full E2E suite (PR gate). No-op when no runner is configured.
 * @param {string} root
 * @param {Record<string, string>} scripts
 * @returns {boolean}
 */
function runFullE2e(root, scripts) {
	if (scripts['test:e2e']) {
		console.log('preflight-local: full E2E (test:e2e)');
		runPackageScript(root, 'test:e2e');
		return true;
	}
	if (scripts.e2e) {
		console.log('preflight-local: full E2E (e2e)');
		runPackageScript(root, 'e2e');
		return true;
	}

	const hasPlaywright =
		fs.existsSync(path.join(root, 'node_modules', '@playwright', 'test')) ||
		fs.existsSync(path.join(root, 'playwright.config.ts')) ||
		fs.existsSync(path.join(root, 'playwright.config.js')) ||
		fs.existsSync(path.join(root, 'playwright.config.mjs'));
	if (hasPlaywright) {
		console.log('preflight-local: full E2E (npx playwright test)');
		run(root, 'npx', ['playwright', 'test']);
		return true;
	}

	const hasCypress =
		fs.existsSync(path.join(root, 'node_modules', 'cypress')) ||
		fs.existsSync(path.join(root, 'cypress.config.ts')) ||
		fs.existsSync(path.join(root, 'cypress.config.js'));
	if (hasCypress) {
		console.log('preflight-local: full E2E (npx cypress run)');
		run(root, 'npx', ['cypress', 'run']);
		return true;
	}

	console.log('preflight-local: --full requested but no e2e/test:e2e/playwright/cypress — skipping full E2E');
	return false;
}

/**
 * @param {string} root
 */
function runLinkVerifies(root) {
	const toolsDir = resolveVendorToolsDir(root);
	const checks = [
		['verify-skills.cjs', true],
		['verify-rules.cjs', false],
		['verify-commands.cjs', false],
	];

	for (const [script, required] of checks) {
		const full = path.join(toolsDir, script);
		if (!fs.existsSync(full)) {
			if (required) {
				console.error(`MISSING: ${full}`);
				process.exit(1);
			}
			continue;
		}
		run(root, process.execPath, [full, root]);
	}
}

/**
 * @param {string} root
 * @param {string} base
 * @param {boolean} full
 */
function runConsumerPreflight(root, base, full) {
	const scripts = readPackageScripts(root) ?? {};
	const config = readOptionalConfig(root);

	if (scripts.preflight) {
		if (full && scripts['preflight:full']) {
			runPackageScript(root, 'preflight:full');
			return;
		}
		runPackageScript(root, 'preflight');
		if (full) {
			runFullE2e(root, scripts);
		}
		return;
	}

	let ran = false;

	if (scripts['skillsync:verify']) {
		runPackageScript(root, 'skillsync:verify');
		ran = true;
	} else if (config) {
		runLinkVerifies(root);
		ran = true;
	}

	if (scripts.test) {
		runPackageScript(root, 'test');
		ran = true;
	} else if (scripts.lint) {
		runPackageScript(root, 'lint');
		ran = true;
	}

	if (full) {
		const e2eRan = runFullE2e(root, scripts);
		ran = ran || e2eRan;
	} else {
		const e2eRan = runScopedE2e(root, base, scripts);
		ran = ran || e2eRan;
	}

	if (!ran) {
		console.error(
			'preflight-local: nothing to run (no preflight/test/lint/skillsync:verify, no config, no e2e).',
		);
		console.error(
			'Add package scripts, skillsync.config.json, or story Verification Plan / changed e2e files.',
		);
		process.exit(1);
	}
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const root = resolveConsumerRoot(positional[0]);
	const config = readOptionalConfig(root);
	const base =
		(typeof flags.base === 'string' && flags.base) ||
		config?.prBaseBranch ||
		'main';
	const full = Boolean(flags.full);

	console.log(`preflight-local: ${root}${full ? ' (--full)' : ''}`);

	if (isSkillsyncCheckout(root)) {
		runSkillsyncPreflight(root);
	} else {
		runConsumerPreflight(root, base, full);
	}

	console.log('preflight-local: passed');
}

main();
