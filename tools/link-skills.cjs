#!/usr/bin/env node
/**
 * Links (or copies) generic Agent Skills from a vendored skillsync checkout into
 * the consumer's `.cursor/skills/<name>/` so Cursor discovers them like any other
 * project skill.
 *
 * Usage (from any cwd):
 *   node path/to/skillsync/tools/link-skills.cjs /path/to/consumer-repo
 *
 * If the path argument is omitted, the consumer repo root defaults to `process.cwd()`.
 *
 * Config: `skillsync.config.json` at the consumer repository root (see
 * `skillsync.config.example.json` in this repository).
 *
 * Symlinks keep a single `git pull` / submodule update authoritative. If symlink
 * creation fails (common on Windows without Developer Mode), set `linkMode` to
 * `"copy"` in the config and re-run.
 */

const fs = require('node:fs');
const path = require('node:path');

const consumerRoot = path.resolve(process.argv[2] ?? process.cwd());
const configPath = path.join(consumerRoot, 'skillsync.config.json');

/**
 * @typedef {object} SkillsyncConfig
 * @property {string} [vendorRoot]
 * @property {"symlink" | "copy"} [linkMode]
 * @property {string[]} linkedSkills
 */

function readConfig() {
	if (!fs.existsSync(configPath)) {
		console.error(
			`Missing ${path.relative(consumerRoot, configPath)}. Copy skillsync.config.example.json from the skillsync repo into the consumer root and adjust.`,
		);
		process.exit(1);
	}

	const raw = fs.readFileSync(configPath, 'utf8');
	/** @type {SkillsyncConfig} */
	const parsed = JSON.parse(raw);

	if (!Array.isArray(parsed.linkedSkills)) {
		console.error(
			'skillsync.config.json: "linkedSkills" must be an array of skill folder names.',
		);
		process.exit(1);
	}

	const vendorRoot = path.join(
		consumerRoot,
		parsed.vendorRoot ?? '.cursor/vendor/skillsync',
	);
	const linkMode = parsed.linkMode === 'copy' ? 'copy' : 'symlink';

	return { vendorRoot, linkMode, linkedSkills: parsed.linkedSkills };
}

function ensureVendorPresent(vendorRoot) {
	const skillsDir = path.join(vendorRoot, 'skills');
	if (!fs.existsSync(skillsDir)) {
		console.error(
			[
				`Vendor skills directory not found: ${path.relative(consumerRoot, skillsDir)}`,
				'',
				'Typical fix:',
				'  git submodule update --init --recursive ".cursor/vendor/skillsync"',
				'',
				'Or clone skillsync elsewhere and point vendorRoot at that checkout.',
			].join('\n'),
		);
		process.exit(1);
	}
}

/**
 * @param {string} fromDir
 * @param {string} toDir
 * @param {"symlink" | "copy"} linkMode
 */
function linkOrCopySkill(fromDir, toDir, linkMode) {
	if (!fs.existsSync(fromDir)) {
		console.error(`Missing source skill folder: ${fromDir}`);
		process.exit(1);
	}

	const skillMd = path.join(fromDir, 'SKILL.md');
	if (!fs.existsSync(skillMd)) {
		console.error(`Missing SKILL.md in source skill folder: ${fromDir}`);
		process.exit(1);
	}

	if (fs.existsSync(toDir)) {
		const stat = fs.lstatSync(toDir);
		if (stat.isSymbolicLink()) {
			fs.unlinkSync(toDir);
		} else if (stat.isDirectory()) {
			console.error(
				[
					`Refusing to overwrite a real directory (not a symlink): ${toDir}`,
					'Rename/remove the local skill or remove its name from linkedSkills.',
				].join('\n'),
			);
			process.exit(1);
		} else {
			fs.unlinkSync(toDir);
		}
	}

	if (linkMode === 'copy') {
		fs.cpSync(fromDir, toDir, { recursive: true });
		return;
	}

	const relativeTarget = path.relative(path.dirname(toDir), fromDir);
	fs.symlinkSync(relativeTarget, toDir, 'dir');
}

function main() {
	const { vendorRoot, linkMode, linkedSkills } = readConfig();

	if (linkedSkills.length === 0) {
		console.log('skillsync: linkedSkills is empty — nothing to do.');
		return;
	}

	ensureVendorPresent(vendorRoot);

	const cursorSkillsRoot = path.join(consumerRoot, '.cursor', 'skills');
	fs.mkdirSync(cursorSkillsRoot, { recursive: true });

	for (const name of linkedSkills) {
		const fromDir = path.join(vendorRoot, 'skills', name);
		const toDir = path.join(cursorSkillsRoot, name);
		linkOrCopySkill(fromDir, toDir, linkMode);
		console.log(`${linkMode === 'copy' ? 'copied' : 'linked'}: ${name}`);
	}

	console.log('');
	console.log(
		'Next: run verify-skills.cjs for the same consumer root, then confirm skills appear in Cursor Settings → Rules → Skills.',
	);
}

main();
