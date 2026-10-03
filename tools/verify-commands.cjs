#!/usr/bin/env node
/**
 * Verifies skillsync-linked command `.md` files resolve under `.cursor/commands/`
 * and `.claude/commands/`. Run after link-commands.cjs.
 *
 * Usage:
 *   node path/to/skillsync/tools/verify-commands.cjs /path/to/consumer-repo
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
	const linkedCommands = Array.isArray(parsed.linkedCommands)
		? parsed.linkedCommands
		: [];

	return { linkedCommands };
}

function main() {
	const { linkedCommands } = readConfig();

	if (linkedCommands.length === 0) {
		console.log(
			'skillsync:verify-commands — linkedCommands is empty or missing — nothing to verify.',
		);
		return;
	}

	let failed = false;

	for (const name of linkedCommands) {
		for (const relDir of ['.cursor/commands', '.claude/commands']) {
			const commandFile = path.join(consumerRoot, relDir, name);

			if (!fs.existsSync(commandFile)) {
				console.error(`MISSING: ${path.relative(consumerRoot, commandFile)}`);
				failed = true;
				continue;
			}

			let realFile;
			try {
				realFile = fs.realpathSync(commandFile);
			} catch {
				console.error(
					`BROKEN LINK: ${path.relative(consumerRoot, commandFile)}`,
				);
				failed = true;
				continue;
			}

			const stat = fs.lstatSync(commandFile);
			const mode = stat.isSymbolicLink() ? 'symlink' : 'file';
			console.log(
				`OK (${mode}): ${relDir}/${name} → ${path.relative(consumerRoot, realFile)}`,
			);
		}
	}

	if (failed) {
		console.error('');
		console.error(
			'Command verification failed. Run link-commands.cjs after fixing vendor/submodule paths.',
		);
		process.exit(1);
	}
}

main();
