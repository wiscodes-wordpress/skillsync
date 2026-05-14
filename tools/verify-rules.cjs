#!/usr/bin/env node
/**
 * Verifies skillsync-linked rule `.mdc` files resolve under `.cursor/rules/`.
 * Run after link-rules.cjs.
 *
 * Usage:
 *   node path/to/skillsync/tools/verify-rules.cjs /path/to/consumer-repo
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
	const linkedRules = Array.isArray(parsed.linkedRules)
		? parsed.linkedRules
		: [];

	return { linkedRules };
}

function main() {
	const { linkedRules } = readConfig();

	if (linkedRules.length === 0) {
		console.log(
			'skillsync:verify-rules — linkedRules is empty or missing — nothing to verify.',
		);
		return;
	}

	let failed = false;

	for (const name of linkedRules) {
		const ruleFile = path.join(consumerRoot, '.cursor', 'rules', name);

		if (!fs.existsSync(ruleFile)) {
			console.error(`MISSING: ${path.relative(consumerRoot, ruleFile)}`);
			failed = true;
			continue;
		}

		let realFile;
		try {
			realFile = fs.realpathSync(ruleFile);
		} catch {
			console.error(`BROKEN LINK: ${path.relative(consumerRoot, ruleFile)}`);
			failed = true;
			continue;
		}

		const stat = fs.lstatSync(ruleFile);
		const mode = stat.isSymbolicLink() ? 'symlink' : 'file';
		console.log(
			`OK (${mode}): ${name} → ${path.relative(consumerRoot, realFile)}`,
		);
	}

	if (failed) {
		console.error('');
		console.error(
			'Rule verification failed. Run link-rules.cjs after fixing vendor/submodule paths.',
		);
		process.exit(1);
	}
}

main();
