#!/usr/bin/env node
/**
 * Scaffold an initiative feature pack: .harness/initiatives/<slug>/index.html hub.
 *
 * The hub joins one roadmap initiative to its living plan lenses (architecture / UX /
 * security posture). Lens HTML files are written later by /ss-arch-plan, /ss-ui-ux-plan,
 * and /ss-security-plan into the same pack directory; this tool writes chrome + data only.
 *
 * Usage:
 *   node path/to/skillsync/tools/init-feature-pack.cjs [/path/to/consumer-repo] \
 *     --slug ai-chatbot [--title "AI chatbot"] [--spec docs/initiatives/initiative-ai-chatbot.md] \
 *     [--epics DEMO-245,DEMO-400] [--lenses arch,ux,security] [--force]
 *
 * --lenses marks which lenses the roadmap gates require; omitted lenses stay optional.
 * Refuses to overwrite an existing hub unless --force.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

const LENSES = [
	{ id: 'arch', label: 'Architecture', file: 'architecture.html', command: '/ss-arch-plan' },
	{ id: 'ux', label: 'UX', file: 'ux.html', command: '/ss-ui-ux-plan' },
	{ id: 'security', label: 'Security posture', file: 'security.html', command: '/ss-security-plan' },
];

/**
 * @param {string} consumerRoot
 * @param {string} slug
 * @returns {string}
 */
function packDir(consumerRoot, slug) {
	return path.join(harnessDir(consumerRoot), 'initiatives', slug);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * @param {object} opts
 * @param {string} opts.slug
 * @param {string} opts.title
 * @param {string} opts.spec
 * @param {string[]} opts.epics
 * @param {string[]} opts.requiredLenses
 * @returns {string}
 */
function renderHub({ slug, title, spec, epics, requiredLenses }) {
	const lensRows = LENSES.map((lens) => {
		const required = requiredLenses.includes(lens.id);
		return [
			`\t\t\t\t\t<tr data-lens="${lens.id}" data-required="${required}" data-status="missing">`,
			`\t\t\t\t\t\t<td>${lens.label}</td>`,
			`\t\t\t\t\t\t<td><a class="underline" href="${lens.file}">${lens.file}</a></td>`,
			`\t\t\t\t\t\t<td>${required ? 'required' : 'optional'}</td>`,
			`\t\t\t\t\t\t<td>missing</td>`,
			`\t\t\t\t\t\t<td>${lens.command}</td>`,
			'\t\t\t\t\t</tr>',
		].join('\n');
	}).join('\n');

	const epicRows =
		epics.length > 0
			? epics
					.map(
						(key) =>
							`\t\t\t\t\t<tr data-epic="${escapeHtml(key)}"><td class="font-mono">${escapeHtml(key)}</td><td>capability epic</td></tr>`,
					)
					.join('\n')
			: '\t\t\t\t\t<tr><td colspan="2">No epic keys yet — publish epics from the roadmap, then rewrite this table.</td></tr>';

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>Initiative — ${escapeHtml(title)}</title>
		<script src="https://cdn.tailwindcss.com"></script>
		<style>
			html { scroll-behavior: smooth; }
			section[id] { scroll-margin-top: 5rem; }
		</style>
	</head>
	<body class="bg-stone-50 text-slate-900 font-sans">
		<nav class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 px-4 py-2 text-xs">
			<a href="#phase">Phase</a>
			<a href="#path">Path</a>
			<a href="#lenses" class="font-medium">Lenses</a>
			<a href="#keys">Epics</a>
		</nav>
		<main class="max-w-5xl mx-auto px-6 py-10 space-y-14">
			<header>
				<p class="text-xs uppercase tracking-wider">${escapeHtml(slug)}</p>
				<h1 class="font-serif text-3xl">Initiative — ${escapeHtml(title)}</h1>
				<p class="text-sm">Roadmap source of truth: <span class="font-mono">${escapeHtml(spec)}</span></p>
					<p>This hub joins the roadmap to its living plan lenses. Lens files are the plan sources of truth; this page carries status and keys only. Plugin grand plan: <a class="underline" href="../../app-map.html">app-map.html</a>.</p>
			</header>
			<section id="phase">
				<h2 class="font-serif text-2xl">Phase we are at</h2>
				<ol>
					<li>/ss-roadmap — initiative spec + Jira epics published</li>
					<li><strong>Draft required lens plans — current</strong></li>
					<li>/ss-plan per v1 story (reads this pack)</li>
				</ol>
			</section>
			<section id="path">
				<h2 class="font-serif text-2xl">Path</h2>
				<p>Index only — journey and stage detail live in lens HTML. After lenses lock, regenerate the plugin mind map with <span class="font-mono">render-app-map.cjs</span>.</p>
			</section>
			<section id="lenses">
				<h2 class="font-serif text-2xl">Lenses</h2>
				<table>
					<tr><th>Lens</th><th>File</th><th>Gate</th><th>Status</th><th>Command</th></tr>
${lensRows}
				</table>
				<p>Status: missing → draft → locked. Rewrite this table as lens plans land.</p>
			</section>
			<section id="keys">
				<h2 class="font-serif text-2xl">Epic keys</h2>
				<table>
					<tr><th>Key</th><th>Role</th></tr>
${epicRows}
				</table>
				<p>Every data-epic used inside a lens file must be listed here.</p>
			</section>
			<footer>
				<p>Next: run the required lens commands, then /ss-plan for the first v1 story.</p>
			</footer>
		</main>
	</body>
</html>
`;
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);

	const slug = typeof flags.slug === 'string' ? flags.slug : '';
	assertOrExit(/^[a-z0-9][a-z0-9-]*$/.test(slug), 'Provide --slug in kebab-case (e.g. --slug ai-chatbot).');

	const title =
		typeof flags.title === 'string'
			? flags.title
			: slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
	const spec =
		typeof flags.spec === 'string' ? flags.spec : `docs/initiatives/initiative-${slug}.md`;
	const epics =
		typeof flags.epics === 'string'
			? flags.epics
					.split(',')
					.map((k) => k.trim().toUpperCase())
					.filter(Boolean)
			: [];
	const requiredLenses =
		typeof flags.lenses === 'string'
			? flags.lenses
					.split(',')
					.map((l) => l.trim().toLowerCase())
					.filter(Boolean)
			: [];
	for (const lens of requiredLenses) {
		assertOrExit(
			LENSES.some((l) => l.id === lens),
			`Unknown lens "${lens}". Use arch, ux, security.`,
		);
	}

	const dir = packDir(consumerRoot, slug);
	const hubPath = path.join(dir, 'index.html');
	if (fs.existsSync(hubPath) && !flags.force) {
		console.error(`Refusing to overwrite ${hubPath} (use --force).`);
		process.exit(1);
	}

	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(hubPath, renderHub({ slug, title, spec, epics, requiredLenses }), 'utf8');
	console.log(hubPath);
}

module.exports = { LENSES, packDir, renderHub };

if (require.main === module) {
	main();
}
