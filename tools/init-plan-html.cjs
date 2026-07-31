#!/usr/bin/env node
/**
 * Scaffold chrome-only living HTML for architecture / UX / security / code handoff.
 *
 * Usage:
 *   node path/to/skillsync/tools/init-plan-html.cjs [/path/to/consumer-repo] \
 *     --kind arch|ux|security|handoff \
 *     [--slug ai-chatbot] \
 *     [--product "Demo Plugin"] [--task "DEMO-310 title"] \
 *     [--branch feature/x] [--base main] [--force]
 *
 * Path resolve: see tools/lib/plan-paths.cjs (initiative pack preferred; harness root fallback).
 * Placeholders only — no AI prose. Refuses overwrite unless --force.
 * After write, runs validate-plan-html --mode structure (must pass).
 *
 * Templates: tools/templates/plan-{arch,ux,security,handoff}.html
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
	parseArgs,
	resolveConsumerRoot,
	readOptionalConfig,
	assertOrExit,
} = require('./lib/ss-tools.cjs');
const { resolvePlanHtmlPath } = require('./lib/plan-paths.cjs');
const { KINDS } = require('./validate-plan-html.cjs');

const TEMPLATE_BY_KIND = {
	arch: 'plan-arch.html',
	ux: 'plan-ux.html',
	security: 'plan-security.html',
	handoff: 'plan-handoff.html',
};

/**
 * @param {string} consumerRoot
 * @param {string} kind
 * @param {import('./lib/ss-tools.cjs').SkillsyncConfig | null} config
 * @param {string | undefined} slug
 * @returns {string}
 */
function defaultPlanPath(consumerRoot, kind, config, slug) {
	return resolvePlanHtmlPath(consumerRoot, kind, { config, slug });
}

/**
 * @param {string} template
 * @param {Record<string, string>} vars
 * @returns {string}
 */
function applyTokens(template, vars) {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
		Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`,
	);
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const config = readOptionalConfig(consumerRoot);

	const kind = typeof flags.kind === 'string' ? flags.kind : '';
	assertOrExit(
		Object.prototype.hasOwnProperty.call(TEMPLATE_BY_KIND, kind),
		`Missing or invalid --kind. Use arch, ux, security, or handoff.`,
	);

	const templateName = TEMPLATE_BY_KIND[kind];
	const templatePath = path.join(__dirname, 'templates', templateName);
	assertOrExit(fs.existsSync(templatePath), `Missing template ${templatePath}`);

	const slug = typeof flags.slug === 'string' ? flags.slug : undefined;
	const outPath = defaultPlanPath(consumerRoot, kind, config, slug);
	if (fs.existsSync(outPath) && !flags.force) {
		console.error(`Refusing to overwrite ${outPath} (use --force).`);
		process.exit(1);
	}

	const product =
		typeof flags.product === 'string' && flags.product.trim()
			? flags.product.trim()
			: path.basename(consumerRoot);
	const task =
		typeof flags.task === 'string' && flags.task.trim()
			? flags.task.trim()
			: kind === 'handoff'
				? 'Fill intent from .harness/state.md'
				: 'Draft plan';
	const branch =
		typeof flags.branch === 'string' && flags.branch.trim()
			? flags.branch.trim()
			: '(current)';
	const base =
		typeof flags.base === 'string' && flags.base.trim()
			? flags.base.trim()
			: typeof config?.prBaseBranch === 'string'
				? config.prBaseBranch
				: 'main';
	const updated = new Date().toISOString().slice(0, 10);

	const html = applyTokens(fs.readFileSync(templatePath, 'utf8'), {
		product,
		task,
		branch,
		base,
		updated,
	});

	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, html, 'utf8');

	const validateTool = path.join(__dirname, 'validate-plan-html.cjs');
	const result = spawnSync(
		process.execPath,
		[validateTool, consumerRoot, '--kind', kind, '--file', outPath, '--mode', 'structure'],
		{ encoding: 'utf8' },
	);
	if (result.stdout) {
		process.stdout.write(result.stdout);
	}
	if (result.stderr) {
		process.stderr.write(result.stderr);
	}
	if (result.status !== 0) {
		console.error(`init-plan-html: wrote ${outPath} but structure validate failed`);
		process.exit(result.status ?? 1);
	}

	console.log(outPath);
}

module.exports = { TEMPLATE_BY_KIND, applyTokens, defaultPlanPath };

if (require.main === module) {
	main();
}
