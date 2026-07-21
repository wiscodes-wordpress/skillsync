#!/usr/bin/env node
/**
 * List open ready-for-review GitHub PRs (configured people × scopes).
 *
 * Usage:
 *   node tools/list-prs.cjs
 *   node tools/list-prs.cjs --vault "/path/to/DenMercs"
 *   node tools/list-prs.cjs --json
 */

const path = require('node:path');
const { loadEnv } = require('./lib/load-env.cjs');
const { listOpenPrs, DEFAULT_VAULT } = require('./lib/github-prs.cjs');

loadEnv(path.join(__dirname, '..'));

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let vault = DEFAULT_VAULT;
	let json = false;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--vault' && argv[i + 1]) vault = argv[++i];
		if (argv[i] === '--json') json = true;
	}
	return { vault: path.resolve(vault), json };
}

async function main() {
	const { vault, json } = parseArgs(process.argv.slice(2));
	const result = await listOpenPrs(vault);
	if (json) {
		console.log(JSON.stringify(result, null, 2));
		if (!result.ok && !result.prs.length) process.exitCode = 1;
		return;
	}

	console.log(
		`Open PRs (ready for review) · ${result.prs.length} · people: ${
			result.people.map((p) => p.label).join(', ') || '—'
		}`,
	);
	if (!result.prs.length) {
		console.log('  (none)');
	} else {
		for (const pr of result.prs) {
			const when = pr.updatedAt
				? new Date(pr.updatedAt).toLocaleString()
				: '';
			console.log(
				`  - [${pr.track}] ${pr.repo}#${pr.number} · ${pr.authorLabel} · ${pr.title}`,
			);
			console.log(`    ${pr.url}${when ? ` · updated ${when}` : ''}`);
		}
	}
	for (const w of result.warnings || []) {
		console.log(`Note: ${w}`);
	}
	if (!result.ok && !result.prs.length) process.exitCode = 1;
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exitCode = 1;
});
