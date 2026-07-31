#!/usr/bin/env node
/**
 * Deterministic grand-plan HTML: scan packs / wayfinder / state → .harness/app-map.html
 * with Mind-elixir mind-map JSON. Agents must not freehand the mind-map tree.
 *
 * Usage:
 *   node path/to/skillsync/tools/render-app-map.cjs [/path/to/consumer-repo] \
 *     --title "Product name" [--product-root "Root topic"] [--force]
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

const LENS_IDS = ['arch', 'ux', 'security'];

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
 * @param {string} dir
 * @returns {string[]}
 */
function listSubdirs(dir) {
	if (!fs.existsSync(dir)) {
		return [];
	}
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort();
}

/**
 * @param {string} html
 * @param {string} attr
 * @returns {string[]}
 */
function collectAttr(html, attr) {
	/** @type {string[]} */
	const values = [];
	const re = new RegExp(`\\b${attr}="([^"]*)"`, 'gi');
	let m;
	while ((m = re.exec(html)) !== null) {
		values.push(m[1]);
	}
	return values;
}

/**
 * @param {string} hubHtml
 * @returns {{ lenses: { id: string; status: string; required: boolean }[]; epics: string[]; title: string }}
 */
function parsePackHub(hubHtml) {
	/** @type {{ id: string; status: string; required: boolean }[]} */
	const lenses = [];
	const loose = /<tr\b([^>]*\bdata-lens="[^"]+"[^>]*)>/gi;
	let row;
	while ((row = loose.exec(hubHtml)) !== null) {
		const attrs = row[1];
		const id = attrs.match(/\bdata-lens="([^"]+)"/i)?.[1];
		const status = attrs.match(/\bdata-status="([^"]+)"/i)?.[1] ?? 'missing';
		const required = attrs.match(/\bdata-required="([^"]+)"/i)?.[1] === 'true';
		if (id) {
			lenses.push({ id, status, required });
		}
	}

	const epics = collectAttr(hubHtml, 'data-epic').sort();
	const h1 = hubHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
	const title = h1
		? h1[1].replace(/<[^>]+>/g, '').replace(/^Initiative\s*[—–-]\s*/i, '').trim()
		: '';

	return { lenses, epics, title };
}

/**
 * @param {{ lenses: { id: string; status: string; required: boolean }[]; hasWayfinder: boolean; hasKeys: boolean }} info
 * @returns {'wayfinding' | 'lenses' | 'shipping' | 'done'}
 */
function initiativeStatus(info) {
	if (info.hasWayfinder && info.lenses.every((l) => l.status === 'missing')) {
		return 'wayfinding';
	}
	const required = info.lenses.filter((l) => l.required);
	const locked =
		required.length > 0
			? required.every((l) => l.status === 'locked')
			: info.lenses.some((l) => l.status === 'locked');
	if (locked && info.hasKeys) {
		return 'shipping';
	}
	if (locked) {
		return 'shipping';
	}
	return info.hasWayfinder ? 'wayfinding' : 'lenses';
}

/**
 * @param {string} consumerRoot
 * @returns {string}
 */
function readNow(consumerRoot) {
	const stateFile = path.join(harnessDir(consumerRoot), 'state.md');
	if (!fs.existsSync(stateFile)) {
		return 'None — no `.harness/state.md`.';
	}
	const text = fs.readFileSync(stateFile, 'utf8');
	const task = text.match(/^#\s+Task:\s*(.+)$/m);
	const pack = text.match(/^Pack:\s*(.+)$/m);
	const parts = [];
	if (task) {
		parts.push(task[1].trim());
	}
	if (pack) {
		parts.push(`Pack: ${pack[1].trim()}`);
	}
	return parts.length > 0 ? parts.join(' · ') : 'State file present (no Task heading).';
}

/**
 * @param {string} consumerRoot
 * @param {string} title
 * @param {string} productRoot
 * @returns {{ nodeData: object; initiativesHtml: string; wayfinderHtml: string; keysHtml: string; nowText: string }}
 */
function buildModel(consumerRoot, title, productRoot) {
	const h = harnessDir(consumerRoot);
	const initDir = path.join(h, 'initiatives');
	const wfDir = path.join(h, 'wayfinder');
	const initSlugs = listSubdirs(initDir);
	const wfSlugs = listSubdirs(wfDir);

	/** @type {object[]} */
	const children = [];
	/** @type {string[]} */
	const initiativeRows = [];
	/** @type {string[]} */
	const keyRows = [];
	/** @type {string[]} */
	const wfLinks = [];

	const allSlugs = [...new Set([...initSlugs, ...wfSlugs])].sort();

	for (const slug of allSlugs) {
		const hubPath = path.join(initDir, slug, 'index.html');
		const mapPath = path.join(wfDir, slug, 'map.html');
		const hasWayfinder = fs.existsSync(mapPath);
		/** @type {{ lenses: { id: string; status: string; required: boolean }[]; epics: string[]; title: string }} */
		let parsed = { lenses: [], epics: [], title: slug };

		if (fs.existsSync(hubPath)) {
			parsed = parsePackHub(fs.readFileSync(hubPath, 'utf8'));
			if (!parsed.title) {
				parsed.title = slug;
			}
		}

		const status = initiativeStatus({
			lenses: parsed.lenses,
			hasWayfinder,
			hasKeys: parsed.epics.length > 0,
		});

		/** @type {object[]} */
		const lensChildren = [];
		for (const lensId of LENS_IDS) {
			const row = parsed.lenses.find((l) => l.id === lensId);
			const lensStatus = row
				? row.status
				: hasWayfinder && !fs.existsSync(hubPath)
					? 'optional'
					: 'missing';
			lensChildren.push({
				id: `lens-${lensId}-${slug}`,
				topic: `${lensId}: ${lensStatus}`,
				status: lensStatus,
			});
		}
		if (hasWayfinder) {
			lensChildren.push({
				id: `wf-${slug}`,
				topic: 'wayfinder',
				href: `wayfinder/${slug}/map.html`,
				status: 'wayfinding',
			});
			wfLinks.push(
				`<li><a class="underline" href="wayfinder/${escapeHtml(slug)}/map.html">${escapeHtml(parsed.title || slug)}</a> <span class="font-mono text-xs">(${escapeHtml(slug)})</span></li>`,
			);
		}

		const node = {
			id: `init-${slug}`,
			topic: parsed.title || slug,
			status,
			children: lensChildren,
		};
		if (fs.existsSync(hubPath)) {
			node.href = `initiatives/${slug}/index.html`;
		}
		children.push(node);

		const lensStrip = LENS_IDS.map((id) => {
			const row = parsed.lenses.find((l) => l.id === id);
			return `${id}:${row ? row.status : '—'}`;
		}).join(' · ');

		initiativeRows.push(
			[
				'<tr>',
				`<td>${escapeHtml(parsed.title || slug)}</td>`,
				`<td class="font-mono text-xs">${escapeHtml(slug)}</td>`,
				`<td>${escapeHtml(status)}</td>`,
				`<td class="font-mono text-xs">${escapeHtml(lensStrip)}</td>`,
				`<td>${fs.existsSync(hubPath) ? `<a class="underline" href="initiatives/${escapeHtml(slug)}/index.html">hub</a>` : '—'}</td>`,
				'</tr>',
			].join(''),
		);

		for (const epic of parsed.epics) {
			keyRows.push(
				`<tr data-epic="${escapeHtml(epic)}"><td class="font-mono">${escapeHtml(epic)}</td><td>${escapeHtml(slug)}</td></tr>`,
			);
		}
	}

	const nodeData = {
		id: 'product',
		topic: productRoot || title,
		children,
	};

	const initiativesHtml =
		initiativeRows.length > 0
			? initiativeRows.join('\n')
			: '<tr><td colspan="5">No initiatives or wayfinder maps under `.harness/` yet.</td></tr>';

	const wayfinderHtml =
		wfLinks.length > 0 ? `<ul>${wfLinks.join('\n')}</ul>` : '<p>None.</p>';

	const keysHtml =
		keyRows.length > 0
			? keyRows.join('\n')
			: '<tr><td colspan="2">No Jira keys yet — appear after /ss-roadmap publish.</td></tr>';

	return {
		nodeData,
		initiativesHtml,
		wayfinderHtml,
		keysHtml,
		nowText: readNow(consumerRoot),
	};
}

/**
 * @param {object} opts
 * @returns {string}
 */
function renderHtml(opts) {
	const { title, nodeData, initiativesHtml, wayfinderHtml, keysHtml, nowText } = opts;
	const json = JSON.stringify({ nodeData }, null, '\t');

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>App map — ${escapeHtml(title)}</title>
		<script src="https://cdn.tailwindcss.com"></script>
		<link
			rel="stylesheet"
			href="https://cdn.jsdelivr.net/npm/mind-elixir@4.5.0/dist/MindElixir.min.css"
		/>
		<script src="https://cdn.jsdelivr.net/npm/mind-elixir@4.5.0/dist/MindElixir.min.js"></script>
		<style>
			html { scroll-behavior: smooth; }
			section[id] { scroll-margin-top: 5rem; }
			#mindmap { min-height: 24rem; height: 28rem; border: 1px solid #e7e5e4; background: #fff; }
		</style>
	</head>
	<body class="bg-stone-50 text-slate-900 font-sans">
		<nav class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 px-4 py-2 text-xs">
			<a href="#mindmap" class="font-medium">Mind map</a>
			<a href="#spine">Legend</a>
			<a href="#initiatives">Initiatives</a>
			<a href="#wayfinder">Wayfinder</a>
			<a href="#now">Now</a>
			<a href="#keys">Keys</a>
		</nav>
		<main class="max-w-5xl mx-auto px-6 py-10 space-y-14">
			<header>
				<p class="text-xs uppercase tracking-wider">Grand plan</p>
				<h1 class="font-serif text-3xl">App map — ${escapeHtml(title)}</h1>
				<p class="text-sm">Generated by <span class="font-mono">render-app-map.cjs</span>. Do not freehand the mind-map JSON.</p>
			</header>
			<section id="mindmap">
				<h2 class="font-serif text-2xl mb-3">Mind map</h2>
				<div id="mindmap-canvas" class="w-full" style="min-height:24rem;height:28rem"></div>
			</section>
			<script type="application/json" id="mindmap-data">
${json}
			</script>
			<script>
				(function () {
					var el = document.getElementById('mindmap-data');
					var canvas = document.getElementById('mindmap-canvas');
					if (!el || !canvas || typeof MindElixir === 'undefined') return;
					var payload = JSON.parse(el.textContent);
					var mind = new MindElixir({
						el: canvas,
						direction: MindElixir.SIDE,
						draggable: true,
						contextMenu: false,
						toolBar: true,
						nodeMenu: false,
						locale: 'en',
					});
					mind.init(payload.nodeData);
				})();
			</script>
			<section id="spine">
				<h2 class="font-serif text-2xl">Legend</h2>
				<p>Initiative status: <code>wayfinding</code> · <code>lenses</code> · <code>shipping</code> · <code>done</code>. Lens leaves: <code>missing</code> · <code>draft</code> · <code>locked</code>.</p>
			</section>
			<section id="initiatives">
				<h2 class="font-serif text-2xl">Initiatives</h2>
				<table class="w-full text-sm">
					<tr><th>Title</th><th>Slug</th><th>Status</th><th>Lenses</th><th>Hub</th></tr>
${initiativesHtml}
				</table>
			</section>
			<section id="wayfinder">
				<h2 class="font-serif text-2xl">Active wayfinder</h2>
${wayfinderHtml}
			</section>
			<section id="now">
				<h2 class="font-serif text-2xl">Now</h2>
				<p>${escapeHtml(nowText)}</p>
			</section>
			<section id="keys">
				<h2 class="font-serif text-2xl">Jira keys</h2>
				<table class="w-full text-sm">
					<tr><th>Key</th><th>Initiative</th></tr>
${keysHtml}
				</table>
			</section>
		</main>
	</body>
</html>
`;
}

/**
 * @param {object} node
 * @param {string} pathLabel
 * @returns {string[]}
 */
function validateNode(node, pathLabel) {
	/** @type {string[]} */
	const errors = [];
	if (!node || typeof node !== 'object') {
		errors.push(`${pathLabel}: not an object`);
		return errors;
	}
	if (typeof node.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(node.id)) {
		errors.push(`${pathLabel}.id invalid`);
	}
	if (typeof node.topic !== 'string' || node.topic.length < 1) {
		errors.push(`${pathLabel}.topic required`);
	}
	if (node.children !== undefined) {
		if (!Array.isArray(node.children)) {
			errors.push(`${pathLabel}.children must be an array`);
		} else {
			node.children.forEach((child, i) => {
				errors.push(...validateNode(child, `${pathLabel}.children[${i}]`));
			});
		}
	}
	return errors;
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const title = typeof flags.title === 'string' ? flags.title : '';
	assertOrExit(title.length > 0, 'Provide --title "Product name".');
	const productRoot =
		typeof flags['product-root'] === 'string' ? flags['product-root'] : title;

	const outPath = path.join(harnessDir(consumerRoot), 'app-map.html');
	const model = buildModel(consumerRoot, title, productRoot);
	const schemaErrors = validateNode(model.nodeData, 'nodeData');
	assertOrExit(schemaErrors.length === 0, schemaErrors.join('; '));

	fs.mkdirSync(harnessDir(consumerRoot), { recursive: true });
	fs.writeFileSync(
		outPath,
		renderHtml({
			title,
			nodeData: model.nodeData,
			initiativesHtml: model.initiativesHtml,
			wayfinderHtml: model.wayfinderHtml,
			keysHtml: model.keysHtml,
			nowText: model.nowText,
		}),
		'utf8',
	);

	console.log(`Wrote ${path.relative(consumerRoot, outPath)}`);
}

if (require.main === module) {
	main();
}

module.exports = { buildModel, validateNode, renderHtml, parsePackHub };
