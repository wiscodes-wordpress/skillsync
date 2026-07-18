#!/usr/bin/env node
/**
 * Write skeleton .harness/release-brief.md for /ss-release.
 *
 * Usage:
 *   node path/to/skillsync/tools/init-release-brief.cjs [/path/to/consumer-repo] [--version 1.2.3] [--force]
 */

const fs = require('node:fs');
const {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
	releaseBriefPath,
} = require('./lib/ss-tools.cjs');

/**
 * @param {string | undefined} version
 * @returns {string}
 */
function buildSkeleton(version) {
	const ver = version?.trim() || '';
	const today = new Date().toISOString().slice(0, 10);
	return `# Release Brief

- **Version:** ${ver}
- **Date:** ${today}
- **Audience:**

## Features (3–5 bullets)

-

## Proof assets

- (filled by release-distribution: clips, stills, E2E tags)

## Primary CTA

- **Label:**
- **URL:**

## Out of scope / do-not-claim

-

## Tone

- **TONE.md path:** (optional)

## Demo seed

- **Command:** (consumer entrypoint — filled by release-distribution)
`;
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const version = typeof flags.version === 'string' ? flags.version : undefined;
	const force = Boolean(flags.force);
	const file = releaseBriefPath(consumerRoot);

	fs.mkdirSync(harnessDir(consumerRoot), { recursive: true });

	if (fs.existsSync(file)) {
		const existing = fs.readFileSync(file, 'utf8').trim();
		if (existing && !force) {
			console.error(
				`Refusing to overwrite non-empty ${file}. Pass --force to replace.`,
			);
			process.exit(1);
		}
	}

	fs.writeFileSync(file, buildSkeleton(version), 'utf8');
	console.log(`init-release-brief: wrote ${file}`);
}

main();
