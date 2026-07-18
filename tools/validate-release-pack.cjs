#!/usr/bin/env node
/**
 * Validate release channel pack files for /ss-release-marketing.
 *
 * Usage:
 *   node path/to/skillsync/tools/validate-release-pack.cjs [/path/to/consumer-repo] [--version 1.2.3] [--pack-dir path]
 *
 * Resolves pack dir: --pack-dir, else .harness/release/<version>/, else docs/releases/<version>/.
 * Version defaults from .harness/release-brief.md **Version:** when omitted.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	releaseBriefPath,
	resolveReleasePackDir,
} = require('./lib/ss-tools.cjs');

const REQUIRED_FILES = [
	'README.md',
	'email.md',
	'social.md',
	'youtube.md',
	'blog.md',
];

/**
 * @param {string} content
 * @returns {string}
 */
function versionFromBrief(content) {
	const m = content.match(/\*\*Version:\*\*\s*(.+)$/m);
	return m ? m[1].trim() : '';
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);

	let version = typeof flags.version === 'string' ? flags.version.trim() : '';
	if (!version) {
		const briefFile = releaseBriefPath(consumerRoot);
		if (fs.existsSync(briefFile)) {
			version = versionFromBrief(fs.readFileSync(briefFile, 'utf8'));
		}
	}

	if (!version) {
		console.error(
			'Missing version. Pass --version <ver> or set **Version:** in .harness/release-brief.md',
		);
		process.exit(1);
	}

	const packDir = resolveReleasePackDir(
		consumerRoot,
		version,
		typeof flags['pack-dir'] === 'string' ? flags['pack-dir'] : undefined,
	);

	if (!fs.existsSync(packDir) || !fs.statSync(packDir).isDirectory()) {
		console.error(`Missing pack directory: ${packDir}`);
		process.exit(1);
	}

	/** @type {string[]} */
	const errors = [];
	for (const name of REQUIRED_FILES) {
		const file = path.join(packDir, name);
		if (!fs.existsSync(file)) {
			errors.push(`Missing ${name}`);
			continue;
		}
		const body = fs.readFileSync(file, 'utf8').trim();
		if (!body) {
			errors.push(`${name} is empty`);
		}
	}

	if (errors.length > 0) {
		console.error(`validate-release-pack (${version}): FAILED`);
		console.error(`  pack: ${packDir}`);
		for (const err of errors) {
			console.error(`  - ${err}`);
		}
		process.exit(1);
	}

	console.log(`validate-release-pack (${version}): OK`);
	console.log(`  pack: ${packDir}`);
}

main();
