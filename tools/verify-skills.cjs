#!/usr/bin/env node
/**
 * Verifies skillsync-linked skills resolve to real SKILL.md files on disk.
 * Run after link-skills.cjs and after Cursor reload to validate symlink/copy installs.
 *
 * Usage:
 *   node path/to/skillsync/tools/verify-skills.cjs /path/to/consumer-repo
 *
 * If the path argument is omitted, the consumer repo root defaults to `process.cwd()`.
 */

const fs = require('node:fs');
const path = require('node:path');

const consumerRoot = path.resolve(process.argv[2] ?? process.cwd());
const configPath = path.join(consumerRoot, 'skillsync.config.json');

function readConfig() {
	if (!fs.existsSync(configPath)) {
		console.error(`Missing ${path.relative(consumerRoot, configPath)}.`);
		process.exit(1);
	}

	const raw = fs.readFileSync(configPath, 'utf8');
	const parsed = JSON.parse(raw);
	if (!Array.isArray(parsed.linkedSkills)) {
		console.error('skillsync.config.json: "linkedSkills" must be an array.');
		process.exit(1);
	}

	return { linkedSkills: parsed.linkedSkills };
}

function main() {
	const { linkedSkills } = readConfig();

	if (linkedSkills.length === 0) {
		console.log(
			'skillsync:verify — linkedSkills is empty — nothing to verify.',
		);
		return;
	}

	let failed = false;

	for (const name of linkedSkills) {
		const skillDir = path.join(consumerRoot, '.cursor', 'skills', name);

		if (!fs.existsSync(skillDir)) {
			console.error(`MISSING: ${path.relative(consumerRoot, skillDir)}`);
			failed = true;
			continue;
		}

		let realSkillDir;
		try {
			realSkillDir = fs.realpathSync(skillDir);
		} catch {
			console.error(`BROKEN LINK: ${path.relative(consumerRoot, skillDir)}`);
			failed = true;
			continue;
		}

		const resolvedSkillMd = path.join(realSkillDir, 'SKILL.md');
		if (!fs.existsSync(resolvedSkillMd)) {
			console.error(
				`MISSING SKILL.md: ${path.relative(consumerRoot, resolvedSkillMd)}`,
			);
			failed = true;
			continue;
		}

		const stat = fs.lstatSync(skillDir);
		const mode = stat.isSymbolicLink() ? 'symlink' : 'directory';
		console.log(
			`OK (${mode}): ${name} → ${path.relative(consumerRoot, resolvedSkillMd)}`,
		);
	}

	if (failed) {
		console.error('');
		console.error(
			'Verification failed. Run link-skills.cjs after fixing vendor/submodule paths.',
		);
		process.exit(1);
	}
}

main();
