#!/usr/bin/env node
/**
 * Links (or copies) shared Cursor slash-command bodies (`.md`) from a vendored
 * skillsync checkout into the consumer's `.cursor/commands/` so Cursor discovers them.
 *
 * Cursor discovers project commands from `.cursor/commands/` — not from arbitrary
 * paths under `vendor/`. Same pattern as skills and rules.
 *
 * Usage:
 *   node path/to/skillsync/tools/link-commands.cjs /path/to/consumer-repo
 *
 * Config: optional `linkedCommands` string array in `skillsync.config.json`
 * (basenames under `<vendorRoot>/commands/`). If omitted or empty, exits with
 * nothing to do.
 */

const fs = require('node:fs');
const path = require('node:path');

const consumerRoot = path.resolve(process.argv[2] ?? process.cwd());
const configPath = path.join(consumerRoot, 'skillsync.config.json');

/**
 * @typedef {object} SkillsyncConfig
 * @property {string} [vendorRoot]
 * @property {"symlink" | "copy"} [linkMode]
 * @property {string[]} [linkedCommands]
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

	const vendorRoot = path.join(
		consumerRoot,
		parsed.vendorRoot ?? '.cursor/vendor/skillsync',
	);
	const linkMode = parsed.linkMode === 'copy' ? 'copy' : 'symlink';
	const linkedCommands = Array.isArray(parsed.linkedCommands)
		? parsed.linkedCommands
		: [];

	return { vendorRoot, linkMode, linkedCommands };
}

function ensureCommandsVendorPresent(vendorRoot) {
	const commandsDir = path.join(vendorRoot, 'commands');
	if (!fs.existsSync(commandsDir)) {
		console.error(
			[
				`Vendor commands directory not found: ${path.relative(consumerRoot, commandsDir)}`,
				'',
				'Typical fix:',
				'  git submodule update --init --recursive ".cursor/vendor/skillsync"',
			].join('\n'),
		);
		process.exit(1);
	}
}

/**
 * @param {string} fromFile
 * @param {string} toFile
 * @param {"symlink" | "copy"} linkMode
 */
function linkOrCopyCommandFile(fromFile, toFile, linkMode) {
	if (!fs.existsSync(fromFile)) {
		console.error(`Missing source command file: ${fromFile}`);
		process.exit(1);
	}

	if (fs.existsSync(toFile)) {
		const stat = fs.lstatSync(toFile);
		if (stat.isSymbolicLink()) {
			fs.unlinkSync(toFile);
		} else if (stat.isFile()) {
			console.error(
				[
					`Refusing to overwrite a real file (not a symlink): ${toFile}`,
					'Remove/rename the local command or remove its name from linkedCommands.',
				].join('\n'),
			);
			process.exit(1);
		} else {
			fs.unlinkSync(toFile);
		}
	}

	if (linkMode === 'copy') {
		fs.copyFileSync(fromFile, toFile);
		return;
	}

	const relativeTarget = path.relative(path.dirname(toFile), fromFile);
	fs.symlinkSync(relativeTarget, toFile, 'file');
}

function main() {
	const { vendorRoot, linkMode, linkedCommands } = readConfig();

	if (linkedCommands.length === 0) {
		console.log(
			'skillsync: linkedCommands is empty or missing — no shared commands to link.',
		);
		return;
	}

	ensureCommandsVendorPresent(vendorRoot);

	const cursorCommandsRoot = path.join(consumerRoot, '.cursor', 'commands');
	fs.mkdirSync(cursorCommandsRoot, { recursive: true });

	for (const name of linkedCommands) {
		if (name.includes('/') || name.includes('..')) {
			console.error(
				`Invalid linkedCommands entry (expected basename only): ${JSON.stringify(name)}`,
			);
			process.exit(1);
		}
		const fromFile = path.join(vendorRoot, 'commands', name);
		const toFile = path.join(cursorCommandsRoot, name);
		linkOrCopyCommandFile(fromFile, toFile, linkMode);
		console.log(
			`${linkMode === 'copy' ? 'copied' : 'linked'} command: ${name} → .cursor/commands/${name}`,
		);
	}

	console.log('');
	console.log(
		'Next: run verify-commands.cjs, reload Cursor, and confirm slash commands (e.g. /ss-plan).',
	);
}

main();
