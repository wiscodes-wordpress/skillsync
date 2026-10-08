#!/usr/bin/env node
/**
 * Links the shared engineering rules into each CLI agent's global rules folder, so
 * Claude Code and Kiro get the same rules in every repo (Cursor gets them per repo
 * via link-rules.cjs).
 *
 * The rule list is read from `rules/claude-code-index.md` (its `@~/.claude/rules/<name>.mdc`
 * lines) — that file stays the one place to add or remove a rule.
 *
 *   ~/.claude/rules/index.md     → rules/claude-code-index.md
 *   ~/.claude/rules/<name>.mdc   → rules/<name>.mdc
 *   ~/.kiro/steering/<name>.md   → rules/<name>.mdc   (Kiro only loads *.md)
 *
 * Symlinks are absolute. Stale symlinks into this checkout's rules/ are removed; real
 * files are never overwritten.
 *
 * Usage:
 *   node path/to/skillsync/tools/link-global-rules.cjs [--home <dir>]
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const rulesDir = path.join(__dirname, '..', 'rules');
const indexFile = path.join(rulesDir, 'claude-code-index.md');

function parseHome() {
	const i = process.argv.indexOf('--home');
	return i === -1 ? os.homedir() : path.resolve(process.argv[i + 1] ?? '');
}

/**
 * @returns {string[]} rule basenames (`<name>.mdc`) listed in the index
 */
function readIndexedRules() {
	const text = fs.readFileSync(indexFile, 'utf8');
	const names = [...text.matchAll(/^- @~\/\.claude\/rules\/([\w.-]+\.mdc)\s*$/gm)].map(
		(m) => m[1],
	);
	for (const name of names) {
		if (!fs.existsSync(path.join(rulesDir, name))) {
			console.error(`claude-code-index.md lists a rule that does not exist: rules/${name}`);
			process.exit(1);
		}
	}
	return names;
}

/**
 * @param {string} fromFile
 * @param {string} toFile
 */
function linkFile(fromFile, toFile) {
	const existing = fs.lstatSync(toFile, { throwIfNoEntry: false });
	if (existing && !existing.isSymbolicLink()) {
		console.error(`Refusing to overwrite a real file (not a symlink): ${toFile}`);
		process.exit(1);
	}
	if (existing) {
		fs.unlinkSync(toFile);
	}
	fs.symlinkSync(fromFile, toFile, 'file');
}

/**
 * Removes symlinks in `dir` that point into rules/ but are not in `keep`.
 * @param {string} dir
 * @param {Set<string>} keep
 */
function pruneStale(dir, keep) {
	for (const entry of fs.readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (keep.has(entry) || !fs.lstatSync(full).isSymbolicLink()) {
			continue;
		}
		const target = path.resolve(dir, fs.readlinkSync(full));
		if (path.dirname(target) === path.resolve(rulesDir)) {
			fs.unlinkSync(full);
			console.log(`removed stale rule link: ${full}`);
		}
	}
}

function main() {
	const home = parseHome();
	const rules = readIndexedRules();
	const resolvedRulesDir = path.resolve(rulesDir);

	/** @type {{ dir: string, links: [string, string][] }[]} */
	const targets = [
		{
			dir: path.join(home, '.claude', 'rules'),
			links: [
				['index.md', 'claude-code-index.md'],
				...rules.map((name) => /** @type {[string, string]} */ ([name, name])),
			],
		},
		{
			dir: path.join(home, '.kiro', 'steering'),
			links: rules.map((name) => [name.replace(/\.mdc$/, '.md'), name]),
		},
	];

	for (const { dir, links } of targets) {
		fs.mkdirSync(dir, { recursive: true });
		for (const [linkName, source] of links) {
			linkFile(path.join(resolvedRulesDir, source), path.join(dir, linkName));
			console.log(`linked rule: ${path.join(dir, linkName)} → rules/${source}`);
		}
		pruneStale(dir, new Set(links.map(([linkName]) => linkName)));
	}
}

main();
