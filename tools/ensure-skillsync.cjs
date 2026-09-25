#!/usr/bin/env node
/**
 * Self-heal skillsync vendor + linked Cursor assets after clone, checkout, or worktree add.
 *
 * Paseo worktree workspaces (and `git worktree add`) copy tracked files only — gitignored
 * `.cursor/vendor/skillsync` and symlinked `.cursor/commands/ss-*.md` are local. Run this
 * after every new worktree (postinstall, git post-checkout hook, or manually).
 *
 * Usage:
 *   node path/to/skillsync/tools/ensure-skillsync.cjs [/path/to/consumer-repo] [--quiet] [--check-only]
 *
 * Vendor bootstrap (first match wins):
 *   1. Vendor tools already present
 *   2. git submodule update --init (when .gitmodules lists vendor path)
 *   3. Symlink vendor dir from another worktree of the same repo (shared checkout)
 *   4. Shallow git clone when skillsync.config.json → vendorGitUrl is set
 */

const { execFileSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs, resolveConsumerRoot } = require('./lib/ss-tools.cjs');

const DEFAULT_VENDOR_GIT_URL =
	'https://github.com/wiscodes-wordpress/skillsync.git';

/**
 * @typedef {object} SkillsyncConfig
 * @property {string} [vendorRoot]
 * @property {string} [vendorGitUrl]
 * @property {string[]} [linkedSkills]
 * @property {string[]} [linkedRules]
 * @property {string[]} [linkedCommands]
 * @property {string[]} [postLink]
 */

/**
 * @param {string} message
 * @param {boolean} quiet
 */
function log(message, quiet) {
	if (!quiet) {
		console.log(message);
	}
}

/**
 * @param {string} message
 * @param {boolean} quiet
 */
function warn(message, quiet) {
	if (!quiet) {
		console.warn(message);
	}
}

/**
 * @param {string} consumerRoot
 * @param {string} vendorRoot
 * @returns {boolean}
 */
function vendorReady(consumerRoot, vendorRoot) {
	return fs.existsSync(
		path.join(consumerRoot, vendorRoot, 'tools', 'link-skills.cjs'),
	);
}

/**
 * @param {string} consumerRoot
 * @returns {SkillsyncConfig | null}
 */
function readConfig(consumerRoot) {
	const configPath = path.join(consumerRoot, 'skillsync.config.json');
	if (!fs.existsSync(configPath)) {
		return null;
	}

	try {
		return JSON.parse(fs.readFileSync(configPath, 'utf8'));
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'invalid JSON';
		throw new Error(`skillsync.config.json: ${message}`);
	}
}

/**
 * @param {string} consumerRoot
 * @returns {boolean}
 */
function isGitCheckout(consumerRoot) {
	return fs.existsSync(path.join(consumerRoot, '.git'));
}

/**
 * @param {string} consumerRoot
 * @param {string} vendorRelative
 * @param {boolean} quiet
 * @returns {boolean}
 */
function initSubmoduleVendor(consumerRoot, vendorRelative, quiet) {
	const gitmodulesPath = path.join(consumerRoot, '.gitmodules');
	if (!fs.existsSync(gitmodulesPath)) {
		return false;
	}

	const gitmodules = fs.readFileSync(gitmodulesPath, 'utf8');
	if (!gitmodules.includes(`path = ${vendorRelative}`)) {
		return false;
	}

	log('ensure-skillsync: initializing skillsync submodule…', quiet);
	try {
		execFileSync(
			'git',
			['submodule', 'update', '--init', '--recursive', vendorRelative],
			{ cwd: consumerRoot, stdio: quiet ? 'pipe' : 'inherit' },
		);
		return true;
	} catch {
		warn(
			'ensure-skillsync: submodule init failed (git or network unavailable).',
			quiet,
		);
		return false;
	}
}

/**
 * @param {string} consumerRoot
 * @returns {{ path: string, bare: boolean }[]}
 */
function listWorktrees(consumerRoot) {
	try {
		const out = execFileSync('git', ['worktree', 'list', '--porcelain'], {
			cwd: consumerRoot,
			encoding: 'utf8',
		});
		/** @type {{ path: string, bare: boolean }[]} */
		const worktrees = [];
		/** @type {{ path: string, bare: boolean } | null} */
		let current = null;

		for (const line of out.split('\n')) {
			if (line.startsWith('worktree ')) {
				if (current) {
					worktrees.push(current);
				}
				current = { path: line.slice('worktree '.length), bare: false };
			} else if (line === 'bare' && current) {
				current.bare = true;
			}
		}
		if (current) {
			worktrees.push(current);
		}
		return worktrees;
	} catch {
		return [];
	}
}

/**
 * @param {string} consumerRoot
 * @param {string} vendorRelative
 * @param {boolean} quiet
 * @returns {boolean}
 */
function borrowVendorFromWorktree(consumerRoot, vendorRelative, quiet) {
	const vendorAbs = path.join(consumerRoot, vendorRelative);
	if (fs.existsSync(vendorAbs)) {
		return vendorReady(consumerRoot, vendorRelative);
	}

	for (const worktree of listWorktrees(consumerRoot)) {
		if (worktree.bare) {
			continue;
		}
		if (path.resolve(worktree.path) === path.resolve(consumerRoot)) {
			continue;
		}

		const donor = path.join(worktree.path, vendorRelative);
		if (!fs.existsSync(path.join(donor, 'tools', 'link-skills.cjs'))) {
			continue;
		}

		fs.mkdirSync(path.dirname(vendorAbs), { recursive: true });
		const relativeTarget = path.relative(path.dirname(vendorAbs), donor);
		fs.symlinkSync(relativeTarget, vendorAbs);
		log(
			`ensure-skillsync: linked vendor from worktree ${worktree.path}`,
			quiet,
		);
		return true;
	}

	return false;
}

/**
 * @param {string} consumerRoot
 * @param {string} vendorRelative
 * @param {string} vendorGitUrl
 * @param {boolean} quiet
 * @returns {boolean}
 */
function cloneVendor(consumerRoot, vendorRelative, vendorGitUrl, quiet) {
	const vendorAbs = path.join(consumerRoot, vendorRelative);
	if (fs.existsSync(vendorAbs)) {
		return vendorReady(consumerRoot, vendorRelative);
	}

	fs.mkdirSync(path.dirname(vendorAbs), { recursive: true });
	log(`ensure-skillsync: cloning vendor from ${vendorGitUrl}…`, quiet);

	try {
		execFileSync(
			'git',
			['clone', '--depth', '1', vendorGitUrl, vendorAbs],
			{ cwd: consumerRoot, stdio: quiet ? 'pipe' : 'inherit' },
		);
		return vendorReady(consumerRoot, vendorRelative);
	} catch {
		warn('ensure-skillsync: vendor clone failed.', quiet);
		return false;
	}
}

/**
 * @param {string} consumerRoot
 * @param {string} vendorRelative
 * @param {SkillsyncConfig} config
 * @param {boolean} quiet
 * @returns {boolean}
 */
function ensureVendor(consumerRoot, vendorRelative, config, quiet) {
	if (vendorReady(consumerRoot, vendorRelative)) {
		return true;
	}

	if (!isGitCheckout(consumerRoot)) {
		warn(
			'ensure-skillsync: vendor missing and this is not a git checkout — skipping.',
			quiet,
		);
		return false;
	}

	if (initSubmoduleVendor(consumerRoot, vendorRelative, quiet)) {
		if (vendorReady(consumerRoot, vendorRelative)) {
			return true;
		}
	}

	if (borrowVendorFromWorktree(consumerRoot, vendorRelative, quiet)) {
		return true;
	}

	const vendorGitUrl = config.vendorGitUrl ?? DEFAULT_VENDOR_GIT_URL;
	if (config.vendorGitUrl || !fs.existsSync(path.join(consumerRoot, '.gitmodules'))) {
		if (cloneVendor(consumerRoot, vendorRelative, vendorGitUrl, quiet)) {
			return true;
		}
	}

	warn(
		[
			'ensure-skillsync: vendor still missing.',
			'Fix: git submodule update --init --recursive .cursor/vendor/skillsync',
			'  or yarn skillsync:update / skillsync:update on a checkout that already has vendor.',
		].join('\n'),
		quiet,
	);
	return false;
}

/**
 * @param {string} consumerRoot
 * @param {string} name
 * @returns {boolean}
 */
function linkedPathOk(consumerRoot, name) {
	const target = path.join(consumerRoot, name);
	if (!fs.existsSync(target)) {
		return false;
	}
	try {
		fs.realpathSync(target);
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} consumerRoot
 * @param {SkillsyncConfig} config
 * @returns {boolean}
 */
function linksNeedRefresh(consumerRoot, config) {
	const linkedSkills = Array.isArray(config.linkedSkills)
		? config.linkedSkills
		: [];
	const linkedRules = Array.isArray(config.linkedRules) ? config.linkedRules : [];
	const linkedCommands = Array.isArray(config.linkedCommands)
		? config.linkedCommands
		: [];

	if (linkedSkills.length === 0 && linkedRules.length === 0 && linkedCommands.length === 0) {
		return false;
	}

	for (const skill of linkedSkills) {
		if (
			!linkedPathOk(
				consumerRoot,
				path.join('.cursor', 'skills', skill, 'SKILL.md'),
			)
		) {
			return true;
		}
	}

	for (const rule of linkedRules) {
		if (!linkedPathOk(consumerRoot, path.join('.cursor', 'rules', rule))) {
			return true;
		}
	}

	for (const command of linkedCommands) {
		if (
			!linkedPathOk(consumerRoot, path.join('.cursor', 'commands', command))
		) {
			return true;
		}
	}

	return false;
}

/**
 * @param {string} consumerRoot
 * @param {string} vendorRelative
 * @param {boolean} quiet
 */
function runLinkScripts(consumerRoot, vendorRelative, quiet) {
	const toolsDir = path.join(consumerRoot, vendorRelative, 'tools');
	const stdio = quiet ? 'pipe' : 'inherit';

	for (const script of ['link-skills.cjs', 'link-rules.cjs', 'link-commands.cjs']) {
		execFileSync(process.execPath, [path.join(toolsDir, script), consumerRoot], {
			cwd: consumerRoot,
			stdio,
		});
	}
}

/**
 * @param {string} consumerRoot
 * @param {string[]} commands
 * @param {boolean} quiet
 */
function runPostLink(consumerRoot, commands, quiet) {
	for (const command of commands) {
		execSync(command, {
			cwd: consumerRoot,
			stdio: quiet ? 'pipe' : 'inherit',
		});
	}
}

/**
 * @param {string} consumerRoot
 * @param {{ quiet: boolean, checkOnly: boolean }} opts
 * @returns {boolean} true when healthy (or check-only and would be fixable)
 */
function ensureSkillsync(consumerRoot, opts) {
	const config = readConfig(consumerRoot);
	if (!config) {
		return true;
	}

	const vendorRelative = config.vendorRoot ?? '.cursor/vendor/skillsync';

	if (!ensureVendor(consumerRoot, vendorRelative, config, opts.quiet)) {
		return false;
	}

	const needsLink = linksNeedRefresh(consumerRoot, config);
	if (opts.checkOnly) {
		return !needsLink;
	}

	if (needsLink) {
		log('ensure-skillsync: refreshing linked skills, rules, and commands…', opts.quiet);
		runLinkScripts(consumerRoot, vendorRelative, opts.quiet);
	}

	const postLink = Array.isArray(config.postLink) ? config.postLink : [];
	if (postLink.length > 0 && needsLink) {
		runPostLink(consumerRoot, postLink, opts.quiet);
	}

	return !linksNeedRefresh(consumerRoot, config);
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const quiet = Boolean(flags.quiet);
	const checkOnly = Boolean(flags['check-only']);

	try {
		const ok = ensureSkillsync(consumerRoot, { quiet, checkOnly });
		if (!ok) {
			process.exit(checkOnly ? 1 : 0);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`ensure-skillsync: ${message}`);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = { ensureSkillsync, vendorReady, linksNeedRefresh };
