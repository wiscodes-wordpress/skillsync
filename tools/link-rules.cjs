#!/usr/bin/env node
/**
 * Links (or copies) shared Cursor project rules (`.mdc`) from a vendored skillsync
 * checkout into the consumer's `.cursor/rules/` so Cursor loads them as project rules.
 *
 * Cursor discovers project rules from `.cursor/rules/` only — not from paths under
 * `vendor/`. Canonical `.mdc` files live under `<vendorRoot>/rules/`; list basenames
 * in `skillsync.config.json` → `linkedRules`.
 *
 * Usage:
 *   node path/to/skillsync/tools/link-rules.cjs /path/to/consumer-repo
 *
 * Config: optional `linkedRules` string array (basenames under `<vendorRoot>/rules/`).
 * If omitted or empty, exits with nothing to do.
 */

const fs = require('node:fs');
const path = require('node:path');

const consumerRoot = path.resolve(process.argv[2] ?? process.cwd());
const configPath = path.join(consumerRoot, 'skillsync.config.json');

/**
 * @typedef {object} SkillsyncConfig
 * @property {string} [vendorRoot]
 * @property {"symlink" | "copy"} [linkMode]
 * @property {string[]} [linkedRules]
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
	const linkedRules = Array.isArray(parsed.linkedRules)
		? parsed.linkedRules
		: [];

	return { vendorRoot, linkMode, linkedRules };
}

function ensureRulesVendorPresent(vendorRoot) {
	const rulesDir = path.join(vendorRoot, 'rules');
	if (!fs.existsSync(rulesDir)) {
		console.error(
			[
				`Vendor rules directory not found: ${path.relative(consumerRoot, rulesDir)}`,
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
 * @param {string} fromFile
 * @param {string} toFile
 * @param {"symlink" | "copy"} linkMode
 */
function linkOrCopyRuleFile(fromFile, toFile, linkMode) {
	if (!fs.existsSync(fromFile)) {
		console.error(`Missing source rule file: ${fromFile}`);
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
					'Remove/rename the local rule or remove its name from linkedRules.',
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
	const { vendorRoot, linkMode, linkedRules } = readConfig();

	if (linkedRules.length === 0) {
		console.log(
			'skillsync: linkedRules is empty or missing — no shared rules to link.',
		);
		return;
	}

	ensureRulesVendorPresent(vendorRoot);

	const cursorRulesRoot = path.join(consumerRoot, '.cursor', 'rules');
	fs.mkdirSync(cursorRulesRoot, { recursive: true });

	for (const name of linkedRules) {
		if (name.includes('/') || name.includes('..')) {
			console.error(
				`Invalid linkedRules entry (expected basename only): ${JSON.stringify(name)}`,
			);
			process.exit(1);
		}
		if (!name.endsWith('.mdc')) {
			console.error(
				`Invalid linkedRules entry (expected .mdc basename): ${JSON.stringify(name)}`,
			);
			process.exit(1);
		}
		const fromFile = path.join(vendorRoot, 'rules', name);
		const toFile = path.join(cursorRulesRoot, name);
		linkOrCopyRuleFile(fromFile, toFile, linkMode);
		console.log(
			`${linkMode === 'copy' ? 'copied' : 'linked'} rule: ${name} → .cursor/rules/${name}`,
		);
	}

	console.log('');
	console.log(
		'Next: run verify-rules.cjs, reload Cursor, and confirm under Settings → Rules → Project Rules.',
	);
}

main();
