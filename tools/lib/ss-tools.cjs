#!/usr/bin/env node
/**
 * Shared helpers for skillsync ss-* deterministic tools.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

/**
 * @typedef {object} ParsedArgs
 * @property {string[]} positional
 * @property {Record<string, string | boolean>} flags
 */

/**
 * @param {string[]} argv
 * @returns {ParsedArgs}
 */
function parseArgs(argv) {
	/** @type {string[]} */
	const positional = [];
	/** @type {Record<string, string | boolean>} */
	const flags = {};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg.startsWith('--')) {
			const eq = arg.indexOf('=');
			if (eq !== -1) {
				flags[arg.slice(2, eq)] = arg.slice(eq + 1);
			} else {
				const key = arg.slice(2);
				const next = argv[i + 1];
				if (next !== undefined && !next.startsWith('--')) {
					flags[key] = next;
					i++;
				} else {
					flags[key] = true;
				}
			}
		} else {
			positional.push(arg);
		}
	}

	return { positional, flags };
}

/**
 * @param {string | undefined} arg
 * @returns {string}
 */
function resolveConsumerRoot(arg) {
	return path.resolve(arg ?? process.cwd());
}

/**
 * @param {string} consumerRoot
 * @returns {import('node:fs').PathLike}
 */
function harnessDir(consumerRoot) {
	return path.join(consumerRoot, '.harness');
}

/**
 * @param {string} consumerRoot
 * @returns {string}
 */
function statePath(consumerRoot) {
	return path.join(harnessDir(consumerRoot), 'state.md');
}

/**
 * @param {string} consumerRoot
 * @returns {string}
 */
function releaseBriefPath(consumerRoot) {
	return path.join(harnessDir(consumerRoot), 'release-brief.md');
}

/**
 * Resolve release channel pack directory.
 * Prefer `.harness/release/<version>/`, then `docs/releases/<version>/`.
 *
 * @param {string} consumerRoot
 * @param {string} version
 * @param {string | undefined} [packDirOverride]
 * @returns {string}
 */
function resolveReleasePackDir(consumerRoot, version, packDirOverride) {
	if (packDirOverride) {
		return path.resolve(consumerRoot, packDirOverride);
	}
	const harnessPack = path.join(harnessDir(consumerRoot), 'release', version);
	if (fs.existsSync(harnessPack)) {
		return harnessPack;
	}
	const docsPack = path.join(consumerRoot, 'docs', 'releases', version);
	if (fs.existsSync(docsPack)) {
		return docsPack;
	}
	return harnessPack;
}

/**
 * @param {string} consumerRoot
 * @returns {string | null}
 */
function readState(consumerRoot) {
	const file = statePath(consumerRoot);
	if (!fs.existsSync(file)) {
		return null;
	}
	return fs.readFileSync(file, 'utf8');
}

/**
 * @typedef {object} SkillsyncConfig
 * @property {string} [vendorRoot]
 * @property {string} [prBaseBranch]
 * @property {string} [issueKeyPattern]
 * @property {string} [issueKeyPrefix]
 * @property {string} [branchIssuePattern]
 * @property {string} [issueTracker]
 * @property {string} [jiraProjectKey]
 * @property {string} [githubIssueLabels]
 */

/**
 * @param {string} consumerRoot
 * @returns {SkillsyncConfig | null}
 */
function readOptionalConfig(consumerRoot) {
	const configPath = path.join(consumerRoot, 'skillsync.config.json');
	if (!fs.existsSync(configPath)) {
		return null;
	}
	try {
		return JSON.parse(fs.readFileSync(configPath, 'utf8'));
	} catch {
		return null;
	}
}

/**
 * @param {string} content
 * @param {number} level
 * @returns {Map<string, string>}
 */
function parseMarkdownSections(content, level = 2) {
	const prefix = '#'.repeat(level) + ' ';
	const lines = content.split('\n');
	/** @type {Map<string, string>} */
	const sections = new Map();
	let currentKey = null;
	/** @type {string[]} */
	let currentLines = [];

	const flush = () => {
		if (currentKey !== null) {
			sections.set(currentKey, currentLines.join('\n').trim());
		}
	};

	for (const line of lines) {
		if (line.startsWith(prefix) && !line.startsWith('#'.repeat(level + 1))) {
			flush();
			currentKey = line.slice(prefix.length).trim();
			currentLines = [];
		} else if (currentKey !== null) {
			currentLines.push(line);
		}
	}
	flush();
	return sections;
}

/**
 * @param {string} content
 * @param {string} heading
 * @param {number} [level]
 * @returns {number}
 */
function countHeading(content, heading, level = 2) {
	const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`^#{${level}}\\s+${escaped}\\s*$`, 'gm');
	const matches = content.match(re);
	return matches ? matches.length : 0;
}

/**
 * @param {string} content
 * @param {string} sectionName
 * @returns {boolean}
 */
function hasSection(content, sectionName) {
	return countHeading(content, sectionName) > 0;
}

/**
 * @param {string} sectionContent
 * @returns {string[]}
 */
function extractShellCommands(sectionContent) {
	/** @type {string[]} */
	const commands = [];

	// Fenced bash/sh/shell blocks
	const fenceRe = /```(?:bash|sh|shell|zsh)\n([\s\S]*?)```/g;
	let match;
	while ((match = fenceRe.exec(sectionContent)) !== null) {
		for (const line of match[1].split('\n')) {
			const trimmed = line.trim();
			if (
				trimmed &&
				!trimmed.startsWith('#') &&
				!trimmed.startsWith('//') &&
				!trimmed.startsWith('→') &&
				!trimmed.startsWith('expect')
			) {
				commands.push(trimmed);
			}
		}
	}

	// Numbered list lines with backticks: 1. `yarn test`
	const numberedRe = /^\d+\.\s+`([^`]+)`/gm;
	while ((match = numberedRe.exec(sectionContent)) !== null) {
		commands.push(match[1].trim());
	}

	return commands;
}

/**
 * Shell commands from ## Verification Plan, optionally scoped to ### Cycle N.
 *
 * @param {string} verificationPlan
 * @param {number | null} cycle
 * @returns {{ ok: true; commands: string[] } | { ok: false; error: string }}
 */
function commandsFromVerificationPlan(verificationPlan, cycle) {
	if (cycle !== null) {
		const cycleHeader = `### Cycle ${cycle}`;
		const idx = verificationPlan.indexOf(cycleHeader);
		if (idx === -1) {
			return { ok: false, error: `No ${cycleHeader} block in Verification Plan` };
		}
		const rest = verificationPlan.slice(idx + cycleHeader.length);
		const nextCycle = rest.search(/\n### Cycle \d+/);
		const block = nextCycle === -1 ? rest : rest.slice(0, nextCycle);
		const commands = extractShellCommands(block);
		if (commands.length === 0) {
			return {
				ok: false,
				error: `No runnable commands found in Verification Plan under ${cycleHeader}`,
			};
		}
		return { ok: true, commands };
	}
	const commands = extractShellCommands(verificationPlan);
	if (commands.length === 0) {
		return {
			ok: false,
			error: 'No runnable commands found in Verification Plan',
		};
	}
	return { ok: true, commands };
}

/**
 * @param {string} text
 * @returns {number[]}
 */
function parseCycleList(text) {
	if (!text) {
		return [];
	}
	const normalized = text.replace(/\(none\)/gi, '').trim();
	if (!normalized) {
		return [];
	}
	/** @type {number[]} */
	const ids = [];
	const re = /Cycle\s+(\d+)/gi;
	let m;
	while ((m = re.exec(normalized)) !== null) {
		ids.push(Number.parseInt(m[1], 10));
	}
	return [...new Set(ids)].sort((a, b) => a - b);
}

/**
 * @param {string} state
 * @returns {{ completed: number[]; remaining: number[] }}
 */
function parseCompletedRemaining(state) {
	const sections = parseMarkdownSections(state);
	const block =
		sections.get('Completed / Remaining') ??
		sections.get('Completed/Remaining') ??
		'';
	const completedMatch = block.match(/\*\*Completed:\*\*\s*(.+)/i);
	const remainingMatch = block.match(/\*\*Remaining:\*\*\s*(.+)/i);
	return {
		completed: parseCycleList(completedMatch?.[1] ?? ''),
		remaining: parseCycleList(remainingMatch?.[1] ?? ''),
	};
}

/**
 * @param {string} sectionContent
 * @param {number} cycle
 * @returns {string}
 */
function extractCycleBlock(sectionContent, cycle) {
	if (!sectionContent) {
		return '';
	}
	const start = sectionContent.search(
		new RegExp(`^###\\s+Cycle\\s+${cycle}\\b`, 'm'),
	);
	if (start === -1) {
		return '';
	}
	const rest = sectionContent.slice(start);
	const next = rest.search(/\n###\s+Cycle\s+\d+/);
	return (next === -1 ? rest : rest.slice(0, next)).trim();
}

/**
 * Deterministic post-agent gates for one AFK cycle (no LLM judgment).
 *
 * @param {string} stateBefore
 * @param {string} stateAfter
 * @param {number} cycle
 * @returns {{ ok: true } | { ok: false; errors: string[] }}
 */
function checkCycleAgentOutcome(stateBefore, stateAfter, cycle) {
	/** @type {string[]} */
	const errors = [];

	if (stateBefore === stateAfter) {
		errors.push(
			`state.md unchanged after agent — Cycle ${cycle} did not update harness state`,
		);
	}

	const { completed, remaining } = parseCompletedRemaining(stateAfter);
	if (remaining.includes(cycle)) {
		errors.push(
			`Cycle ${cycle} still listed under Remaining after agent`,
		);
	}
	if (!completed.includes(cycle)) {
		errors.push(
			`Cycle ${cycle} not listed under Completed after agent`,
		);
	}

	const sections = parseMarkdownSections(stateAfter);
	const redPlan =
		sections.get('RED→GREEN Plan') ??
		sections.get('RED->GREEN Plan') ??
		'';
	const cyclePlan = extractCycleBlock(redPlan, cycle);
	if (cyclePlan) {
		if (!hasSection(stateAfter, 'TDD Evidence')) {
			errors.push(
				`RED→GREEN Plan has Cycle ${cycle} but ## TDD Evidence is missing`,
			);
		} else {
			const evidence = sections.get('TDD Evidence') ?? '';
			const mentions =
				new RegExp(`Cycle\\s+${cycle}\\b`, 'i').test(evidence) ||
				new RegExp(`\\|\\s*${cycle}\\s*\\|`).test(evidence);
			if (!mentions) {
				errors.push(
					`## TDD Evidence does not mention Cycle ${cycle} after agent`,
				);
			}
		}
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}
	return { ok: true };
}

/**
 * @param {string} cwd
 * @param {string} cmd
 * @param {{ inherit?: boolean }} [opts]
 * @returns {{ stdout: string; stderr: string; status: number }}
 */
function runCommand(cwd, cmd, opts = {}) {
	try {
		const stdout = execSync(cmd, {
			cwd,
			encoding: 'utf8',
			stdio: opts.inherit ? 'inherit' : ['pipe', 'pipe', 'pipe'],
		});
		return { stdout: stdout ?? '', stderr: '', status: 0 };
	} catch (err) {
		const e = /** @type {NodeJS.ErrnoException & { stdout?: string; stderr?: string; status?: number }} */ (
			err
		);
		return {
			stdout: e.stdout?.toString() ?? '',
			stderr: e.stderr?.toString() ?? e.message,
			status: e.status ?? 1,
		};
	}
}

/**
 * @param {string | undefined} raw
 * @returns {string}
 */
function formatBranchSlug(raw) {
	const slug = (raw ?? '')
		.replace(/[-_]+/g, ' ')
		.replace(/\//g, ' ')
		.trim();
	if (!slug) {
		return '';
	}
	return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * @param {string} branch
 * @param {string | SkillsyncConfig | undefined} patternOrConfig
 * @returns {string | null}
 */
function titleFromBranch(branch, patternOrConfig) {
	/** @type {string | undefined} */
	let pattern;
	/** @type {string | undefined} */
	let prefix;
	/** @type {string | undefined} */
	let branchPattern;

	if (
		typeof patternOrConfig === 'object' &&
		patternOrConfig !== null &&
		!Array.isArray(patternOrConfig)
	) {
		pattern = patternOrConfig.issueKeyPattern;
		prefix = patternOrConfig.issueKeyPrefix;
		branchPattern = patternOrConfig.branchIssuePattern;
	} else {
		pattern = patternOrConfig;
	}

	if (prefix) {
		const re = new RegExp(
			branchPattern ?? `^${prefix.toLowerCase()}-(\\d+)[-/_.]?(.*)$`,
			'i',
		);
		const m = branch.match(re);
		if (m) {
			const key = `${prefix.toUpperCase()}-${m[1]}`;
			const titleSlug = formatBranchSlug(m[2]);
			return titleSlug ? `${key}: ${titleSlug}` : key;
		}
	}

	const defaultRe =
		pattern ?? '^([A-Z][A-Z0-9]+-\\d+)[-/_.]?(.*)$';
	const re = new RegExp(defaultRe, 'i');
	const m = branch.match(re);
	if (!m) {
		return null;
	}
	const key = m[1].toUpperCase();
	const titleSlug = formatBranchSlug(m[2]);
	return titleSlug ? `${key}: ${titleSlug}` : key;
}

/**
 * @param {string} consumerRoot
 * @returns {string}
 */
function gitCurrentBranch(consumerRoot) {
	return runCommand(consumerRoot, 'git rev-parse --abbrev-ref HEAD').stdout.trim();
}

/**
 * @param {string} consumerRoot
 * @param {string} [base]
 * @returns {string}
 */
function gitMergeBase(consumerRoot, base = 'main') {
	const result = runCommand(
		consumerRoot,
		`git merge-base HEAD origin/${base} 2>/dev/null || git merge-base HEAD ${base} 2>/dev/null || echo HEAD`,
	);
	return result.stdout.trim() || 'HEAD';
}

/**
 * @param {boolean} condition
 * @param {string} message
 */
function assertOrExit(condition, message) {
	if (!condition) {
		console.error(message);
		process.exit(1);
	}
}

/**
 * Upsert a level-2 markdown section in content. Creates the file body if empty.
 *
 * @param {string} content
 * @param {string} sectionName
 * @param {string} sectionBody
 * @returns {string}
 */
function upsertMarkdownSection(content, sectionName, sectionBody) {
	const heading = `## ${sectionName}`;
	const body = sectionBody.trim();
	const block = `${heading}\n\n${body}\n`;
	const re = new RegExp(
		`^## ${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$[\\s\\S]*?(?=^## |\\Z)`,
		'm',
	);

	if (!content || !content.trim()) {
		return `# Harness state\n\n${block}`;
	}

	if (re.test(content)) {
		return content.replace(re, `${block}\n`);
	}

	return `${content.trimEnd()}\n\n${block}`;
}

/**
 * Write harness state.md, creating `.harness/` if needed.
 *
 * @param {string} consumerRoot
 * @param {string} content
 */
function writeState(consumerRoot, content) {
	const dir = harnessDir(consumerRoot);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(statePath(consumerRoot), content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

module.exports = {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
	statePath,
	releaseBriefPath,
	resolveReleasePackDir,
	readState,
	writeState,
	readOptionalConfig,
	parseMarkdownSections,
	countHeading,
	hasSection,
	upsertMarkdownSection,
	extractShellCommands,
	commandsFromVerificationPlan,
	parseCycleList,
	parseCompletedRemaining,
	extractCycleBlock,
	checkCycleAgentOutcome,
	runCommand,
	titleFromBranch,
	gitCurrentBranch,
	gitMergeBase,
	assertOrExit,
};
