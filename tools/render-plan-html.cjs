#!/usr/bin/env node
/**
 * Derive living plan HTML from Markdown source of truth.
 *
 * Usage:
 *   node path/to/skillsync/tools/render-plan-html.cjs [/path/to/consumer-repo] \
 *     --kind arch|ux|security|handoff|wayfinder \
 *     [--slug ai-chatbot] \
 *     [--file .harness/architecture-plan.md] \
 *     [--out .harness/architecture-plan.html] \
 *     [--validate]
 *
 * Agents edit the .md; humans open the .html. Do not hand-edit derived HTML.
 * app-map stays on render-app-map.cjs (not this tool).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
	parseArgs,
	resolveConsumerRoot,
	readOptionalConfig,
	assertOrExit,
	harnessDir,
} = require('./lib/ss-tools.cjs');
const { resolvePlanHtmlPath, resolvePlanMdPath } = require('./lib/plan-paths.cjs');
const { renderPlanMarkdown, PLAN_MD_FILES } = require('./lib/plan-md.cjs');

/**
 * @param {string} consumerRoot
 * @param {string} kind
 * @param {import('./lib/ss-tools.cjs').SkillsyncConfig | null} config
 * @param {string | undefined} slug
 * @returns {string}
 */
function defaultMdPath(consumerRoot, kind, config, slug) {
	if (kind === 'wayfinder') {
		assertOrExit(slug, 'wayfinder requires --slug');
		return path.join(harnessDir(consumerRoot), 'wayfinder', slug, PLAN_MD_FILES.wayfinder);
	}
	return resolvePlanMdPath(consumerRoot, kind, { config, slug });
}

/**
 * @param {string} consumerRoot
 * @param {string} kind
 * @param {import('./lib/ss-tools.cjs').SkillsyncConfig | null} config
 * @param {string | undefined} slug
 * @returns {string}
 */
function defaultHtmlPath(consumerRoot, kind, config, slug) {
	if (kind === 'wayfinder') {
		assertOrExit(slug, 'wayfinder requires --slug');
		return path.join(harnessDir(consumerRoot), 'wayfinder', slug, 'map.html');
	}
	return resolvePlanHtmlPath(consumerRoot, kind, { config, slug });
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const config = readOptionalConfig(consumerRoot);

	const kind = typeof flags.kind === 'string' ? flags.kind : '';
	assertOrExit(
		Object.prototype.hasOwnProperty.call(PLAN_MD_FILES, kind),
		`Missing or invalid --kind. Use arch, ux, security, handoff, or wayfinder.`,
	);

	const slug = typeof flags.slug === 'string' ? flags.slug : undefined;
	const mdPath =
		typeof flags.file === 'string' && flags.file.trim()
			? path.resolve(consumerRoot, flags.file)
			: defaultMdPath(consumerRoot, kind, config, slug);

	assertOrExit(fs.existsSync(mdPath), `Markdown source not found: ${mdPath}`);

	const outPath =
		typeof flags.out === 'string' && flags.out.trim()
			? path.resolve(consumerRoot, flags.out)
			: defaultHtmlPath(consumerRoot, kind, config, slug);

	const mdSource = fs.readFileSync(mdPath, 'utf8');
	const relMd = path.relative(consumerRoot, mdPath).replace(/\\/g, '/');
	const { html } = renderPlanMarkdown(mdSource, kind, { mdPath: relMd });

	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, html, 'utf8');

	if (flags.validate) {
		const validateTool = path.join(__dirname, 'validate-plan-html.cjs');
		const result = spawnSync(
			process.execPath,
			[validateTool, consumerRoot, '--kind', kind, '--file', outPath, '--mode', 'structure'],
			{ encoding: 'utf8' },
		);
		if (result.stdout) process.stdout.write(result.stdout);
		if (result.stderr) process.stderr.write(result.stderr);
		if (result.status !== 0) {
			console.error(`render-plan-html: wrote ${outPath} but structure validate failed`);
			process.exit(result.status ?? 1);
		}
	}

	console.log(outPath);
}

module.exports = { defaultMdPath, defaultHtmlPath };

if (require.main === module) {
	main();
}
