#!/usr/bin/env node
/**
 * Publish RED→GREEN or Sprint Plan slices from state to issue tracker (dry-run default).
 *
 * Usage:
 *   node path/to/skillsync/tools/publish-slices-from-state.cjs [/path/to/consumer-repo] [--parent PROJECT-100] [--publish] [--approved] [--voice agent|workplace]
 */

const fs = require('node:fs');
const {
	parseArgs,
	resolveConsumerRoot,
	readState,
	readOptionalConfig,
	runCommand,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

/**
 * @typedef {{ title: string; body: string; index: number }} Slice
 */

function workplaceAcceptance(acceptance) {
	return acceptance.replace(/^### .+\n/, '').trim() || '- [ ] Matches the plan';
}

/**
 * @param {'agent' | 'workplace'} voice
 * @param {string} parent
 * @param {string} what
 * @param {string} acceptance
 * @returns {string}
 */
function formatBody(voice, parent, what, acceptance) {
	if (voice === 'workplace') {
		return `${what}

**Acceptance criteria**

${workplaceAcceptance(acceptance)}
`.trimEnd();
	}

	return `## Parent

${parent || '(set --parent)'}

## What to build

${what}

## Acceptance criteria

${acceptance}

## Blocked by

**None — can start immediately**
`;
}

/**
 * @param {string} state
 * @param {string} parent
 * @param {'agent' | 'workplace'} voice
 * @returns {Slice[]}
 */
function parseSlices(state, parent, voice) {
	/** @type {Slice[]} */
	const slices = [];

	const redGreenIdx = state.indexOf('## RED→GREEN Plan');
	const sprintIdx = state.indexOf('## Sprint Plan');
	const start =
		redGreenIdx !== -1
			? redGreenIdx
			: sprintIdx !== -1
				? sprintIdx
				: -1;
	assertOrExit(start !== -1, 'No ## RED→GREEN Plan or ## Sprint Plan in state.md');

	const endMarkers = [
		'\n## Acceptance Criteria',
		'\n## Risk Register',
		'\n## Verification Plan',
	];
	let end = state.length;
	for (const marker of endMarkers) {
		const idx = state.indexOf(marker, start);
		if (idx !== -1 && idx < end) {
			end = idx;
		}
	}

	const block = state.slice(start, end);
	const cycleRe = /### (?:Cycle|Sprint slice|Slice) (\d+)[^\n]*\n([\s\S]*?)(?=\n### (?:Cycle|Sprint slice|Slice) \d+|\n## |$)/g;
	let match;
	while ((match = cycleRe.exec(block)) !== null) {
		const index = Number.parseInt(match[1], 10);
		const section = match[2];
		const titleMatch =
			section.match(/\*\*Behavior\*\*\s*\|\s*([^|\n]+)/) ||
			section.match(/\*\*Title\*\*\s*\|\s*([^|\n]+)/) ||
			section.match(/^#\s+(.+)/m);
		const title = (titleMatch?.[1] ?? `Slice ${index}`).trim();
		const behaviorMatch = section.match(/\*\*Behavior\*\*\s*\|\s*([^|\n]+)/);
		const what = behaviorMatch?.[1]?.trim() ?? title;

		const acStart = state.indexOf('## Acceptance Criteria');
		let acceptance = '(see parent plan)';
		if (acStart !== -1) {
			const acBlock = state.slice(acStart);
			const cycleAc = acBlock.match(
				new RegExp(
					`### (?:Cycle|Sprint slice|Slice) ${index}[\\s\\S]*?(?=\\n### |\\n## |$)`,
				),
			);
			if (cycleAc) {
				acceptance = cycleAc[0].trim();
			}
		}

		const body = formatBody(voice, parent, what, acceptance);
		slices.push({ index, title, body });
	}

	assertOrExit(slices.length > 0, 'No slices parsed from plan section');
	return slices.sort((a, b) => a.index - b.index);
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const config = readOptionalConfig(consumerRoot);
	const publish = Boolean(flags.publish);
	const approved = Boolean(flags.approved);
	const parent =
		(typeof flags.parent === 'string' && flags.parent) ||
		process.env.SS_PARENT_ISSUE ||
		'';
	const voiceFlag = typeof flags.voice === 'string' ? flags.voice : '';
	const voiceFromConfig = config?.toIssuesVoice;
	const dcdParent = /\bDCD-\d+/i.test(parent);
	/** @type {'agent' | 'workplace'} */
	const voice =
		voiceFlag === 'workplace' || voiceFlag === 'agent'
			? voiceFlag
			: dcdParent
				? 'workplace'
				: voiceFromConfig === 'workplace' || voiceFromConfig === 'agent'
					? voiceFromConfig
					: 'agent';
	assertOrExit(
		voiceFlag === '' || voiceFlag === 'agent' || voiceFlag === 'workplace',
		'--voice must be agent or workplace',
	);

	const state = readState(consumerRoot);
	assertOrExit(Boolean(state), 'Missing .harness/state.md');

	const slices = parseSlices(/** @type {string} */ (state), parent, voice);

	console.log('| Slice | Title | Voice | Mode |');
	console.log('|-------|-------|-------|------|');
	for (const slice of slices) {
		console.log(
			`| ${slice.index} | ${slice.title} | ${voice} | ${publish ? 'publish' : 'dry-run'} |`,
		);
	}

	if (!publish) {
		console.log('\nDry-run only. Pass --publish --approved to create issues.');
		for (const slice of slices) {
			console.log(`\n--- Slice ${slice.index}: ${slice.title} ---\n`);
			console.log(slice.body);
		}
		return;
	}

	assertOrExit(approved, 'Publishing requires --approved (HITL gate)');

	const tracker = config?.issueTracker ?? 'github';
	for (const slice of slices) {
		if (tracker === 'github') {
			const labels = config?.githubIssueLabels ?? '';
			const labelArg = labels ? `--label "${labels}"` : '';
			const title = `[Slice ${slice.index}] ${slice.title}`;
			const tmpBody = `${consumerRoot}/.harness/.slice-${slice.index}.md`;
			fs.mkdirSync(`${consumerRoot}/.harness`, { recursive: true });
			fs.writeFileSync(tmpBody, slice.body, 'utf8');
			const create = runCommand(
				consumerRoot,
				`gh issue create --title ${JSON.stringify(title)} --body-file ${JSON.stringify(tmpBody)} ${labelArg}`.trim(),
			);
			fs.unlinkSync(tmpBody);
			if (create.status !== 0) {
				console.error(`Failed slice ${slice.index}:`);
				console.error(create.stderr || create.stdout);
				process.exit(1);
			}
			console.log(`Created: ${create.stdout.trim()}`);
		} else {
			console.error(
				`issueTracker "${tracker}" publish not configured. Use dry-run output or Atlassian MCP via /ss-to-issues.`,
			);
			process.exit(1);
		}
	}
}

main();
