#!/usr/bin/env node
/**
 * Validate an initiative feature pack: hub + lens files + epic key parity.
 *
 * Usage:
 *   node path/to/skillsync/tools/validate-feature-pack.cjs [/path/to/consumer-repo] \
 *     [--slug ai-chatbot] [--strict-warn]
 *
 * Without --slug, auto-detects when exactly one pack exists under .harness/initiatives/.
 *
 * Hard fails:
 *   - hub (index.html) missing or without a lens table
 *   - lens marked data-required="true" whose file is missing
 *   - data-epic key used in a lens file but not listed in the hub #keys table
 * Warnings:
 *   - lens file exists but hub row still says data-status="missing"
 *   - hub has no epic keys while a lens file is already keyed
 *
 * Exit codes: 0 pass · 1 hard fail · 2 warnings-only with --strict-warn
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
	assertOrExit,
} = require('./lib/ss-tools.cjs');
const { LENSES, packDir } = require('./init-feature-pack.cjs');

/**
 * @param {string} html
 * @param {string} attr
 * @returns {string[]}
 */
function attrValues(html, attr) {
	/** @type {string[]} */
	const values = [];
	const re = new RegExp(`\\b${attr}="([^"]+)"`, 'g');
	let m;
	while ((m = re.exec(html)) !== null) {
		values.push(m[1]);
	}
	return values;
}

/**
 * Parse hub lens rows: data-lens / data-required / data-status.
 *
 * @param {string} hubHtml
 * @returns {Map<string, { required: boolean; status: string }>}
 */
function parseLensRows(hubHtml) {
	/** @type {Map<string, { required: boolean; status: string }>} */
	const rows = new Map();
	const re = /<tr\b[^>]*\bdata-lens="([^"]+)"[^>]*>/g;
	let m;
	while ((m = re.exec(hubHtml)) !== null) {
		const tag = m[0];
		const required = /\bdata-required="true"/.test(tag);
		const status = tag.match(/\bdata-status="([^"]+)"/)?.[1] ?? 'missing';
		rows.set(m[1], { required, status });
	}
	return rows;
}

/**
 * @param {object} opts
 * @param {string} opts.hubHtml
 * @param {Map<string, { exists: boolean; html: string }>} opts.lensFiles  keyed by lens id
 * @returns {{ errors: string[]; warnings: string[] }}
 */
function validateFeaturePack({ hubHtml, lensFiles }) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	const rows = parseLensRows(hubHtml);
	if (rows.size === 0) {
		errors.push('Hub index.html has no lens table rows (data-lens attributes)');
		return { errors, warnings };
	}

	const hubEpics = new Set(attrValues(hubHtml, 'data-epic'));

	for (const lens of LENSES) {
		const row = rows.get(lens.id);
		const file = lensFiles.get(lens.id) ?? { exists: false, html: '' };

		if (!row) {
			warnings.push(`Hub is missing a row for lens "${lens.id}"`);
			continue;
		}
		if (row.required && !file.exists) {
			errors.push(
				`Lens "${lens.id}" is required by the roadmap gates but ${lens.file} is missing — run ${lens.command}`,
			);
		}
		if (file.exists && row.status === 'missing') {
			warnings.push(
				`${lens.file} exists but the hub row still says status "missing" — rewrite the hub lens table`,
			);
		}
		if (!file.exists) {
			continue;
		}

		const lensEpics = new Set(attrValues(file.html, 'data-epic'));
		for (const key of lensEpics) {
			if (!hubEpics.has(key)) {
				errors.push(
					`${lens.file} uses data-epic="${key}" but the hub #keys table does not list it`,
				);
			}
		}
		if (lensEpics.size > 0 && hubEpics.size === 0) {
			warnings.push('Hub #keys table is empty while lens files are already keyed');
		}
	}

	return { errors, warnings };
}

/**
 * @param {string} consumerRoot
 * @returns {string | null}
 */
function autodetectSlug(consumerRoot) {
	const base = path.join(harnessDir(consumerRoot), 'initiatives');
	if (!fs.existsSync(base)) {
		return null;
	}
	const dirs = fs
		.readdirSync(base, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
	return dirs.length === 1 ? dirs[0] : null;
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);

	let slug = typeof flags.slug === 'string' ? flags.slug : null;
	if (!slug) {
		slug = autodetectSlug(consumerRoot);
		assertOrExit(
			slug !== null,
			'Pass --slug (auto-detect needs exactly one pack under .harness/initiatives/).',
		);
	}

	const dir = packDir(consumerRoot, /** @type {string} */ (slug));
	const hubPath = path.join(dir, 'index.html');
	if (!fs.existsSync(hubPath)) {
		console.error(`Missing ${hubPath} — run init-feature-pack.cjs first.`);
		process.exit(1);
	}

	const hubHtml = fs.readFileSync(hubPath, 'utf8');
	/** @type {Map<string, { exists: boolean; html: string }>} */
	const lensFiles = new Map();
	for (const lens of LENSES) {
		const file = path.join(dir, lens.file);
		const exists = fs.existsSync(file);
		lensFiles.set(lens.id, {
			exists,
			html: exists ? fs.readFileSync(file, 'utf8') : '',
		});
	}

	const { errors, warnings } = validateFeaturePack({ hubHtml, lensFiles });

	for (const w of warnings) {
		console.warn(`WARN: ${w}`);
	}
	if (errors.length > 0) {
		console.error(`validate-feature-pack (${slug}): FAILED`);
		for (const e of errors) {
			console.error(`  - ${e}`);
		}
		process.exit(1);
	}
	if (warnings.length > 0 && flags['strict-warn']) {
		console.error('validate-feature-pack: warnings treated as failure (--strict-warn)');
		process.exit(2);
	}
	console.log(`validate-feature-pack (${slug}): OK`);
}

module.exports = { validateFeaturePack, parseLensRows, attrValues };

if (require.main === module) {
	main();
}
