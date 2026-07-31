#!/usr/bin/env node
/**
 * Resolve living plan HTML paths for skillsync consumers.
 *
 * Canonical layout (initiative pack):
 *   .harness/initiatives/<slug>/
 *     initiative.md
 *     architecture-plan.html
 *     ux-plan.html
 *     security-posture.html
 *     assets/                 (optional)
 *     index.html              (optional lens hub from init-feature-pack)
 *
 * Legacy / simple repos may still keep a single plan at `.harness/<file>`.
 *
 * Resolve order for arch | ux | security:
 *   1. Explicit --file / opts.file
 *   2. skillsync.config.json planHtml[kind]
 *   3. --slug → initiatives/<slug>/<file>
 *   4. Exactly one initiative pack under .harness/initiatives/
 *   5. Exactly one pack that already contains the file
 *   6. Legacy: .harness/<file>
 *
 * handoff / wayfinder / app-map stay harness-root (not per-initiative).
 */

const fs = require('node:fs');
const path = require('node:path');
const { harnessDir, readOptionalConfig } = require('./ss-tools.cjs');

/** @type {Record<string, string>} */
const PLAN_FILES = {
	arch: 'architecture-plan.html',
	ux: 'ux-plan.html',
	security: 'security-posture.html',
	handoff: 'code-handoff.html',
};

/**
 * @param {string} consumerRoot
 * @returns {string[]}
 */
function listInitiativeSlugs(consumerRoot) {
	const base = path.join(harnessDir(consumerRoot), 'initiatives');
	if (!fs.existsSync(base)) {
		return [];
	}
	return fs
		.readdirSync(base, { withFileTypes: true })
		.filter((d) => d.isDirectory() && !d.name.startsWith('.'))
		.map((d) => d.name)
		.sort();
}

/**
 * @param {string} consumerRoot
 * @param {string} slug
 * @returns {string}
 */
function initiativePackDir(consumerRoot, slug) {
	return path.join(harnessDir(consumerRoot), 'initiatives', slug);
}

/**
 * True when the folder looks like an initiative pack (hub, product spec, or lens HTML).
 *
 * @param {string} dir
 * @returns {boolean}
 */
function isInitiativePackDir(dir) {
	if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
		return false;
	}
	const markers = [
		'initiative.md',
		'index.html',
		PLAN_FILES.arch,
		PLAN_FILES.ux,
		PLAN_FILES.security,
	];
	return markers.some((name) => fs.existsSync(path.join(dir, name)));
}

/**
 * @param {string} consumerRoot
 * @param {string} kind
 * @param {{ file?: string; slug?: string; config?: object | null; preferPack?: boolean }} [opts]
 * @returns {string}
 */
function resolvePlanHtmlPath(consumerRoot, kind, opts = {}) {
	const fileName = PLAN_FILES[kind];
	if (!fileName) {
		throw new Error(`Unknown plan kind "${kind}"`);
	}

	if (opts.file) {
		return path.resolve(consumerRoot, opts.file);
	}

	const config = opts.config !== undefined ? opts.config : readOptionalConfig(consumerRoot);
	const configured = /** @type {Record<string, string> | undefined} */ (
		/** @type {any} */ (config)?.planHtml
	)?.[kind];
	if (configured) {
		return path.resolve(consumerRoot, configured);
	}

	// Handoff (and similar scratch) always at harness root.
	if (kind === 'handoff') {
		return path.join(harnessDir(consumerRoot), fileName);
	}

	if (opts.slug) {
		return path.join(initiativePackDir(consumerRoot, opts.slug), fileName);
	}

	const slugs = listInitiativeSlugs(consumerRoot);
	const packSlugs = slugs.filter((slug) =>
		isInitiativePackDir(initiativePackDir(consumerRoot, slug)),
	);

	if (packSlugs.length === 1) {
		return path.join(initiativePackDir(consumerRoot, packSlugs[0]), fileName);
	}

	const hits = packSlugs.filter((slug) =>
		fs.existsSync(path.join(initiativePackDir(consumerRoot, slug), fileName)),
	);
	if (hits.length === 1) {
		return path.join(initiativePackDir(consumerRoot, hits[0]), fileName);
	}

	return path.join(harnessDir(consumerRoot), fileName);
}

/**
 * Default product-spec path for a new initiative.
 *
 * @param {string} slug
 * @returns {string}
 */
function defaultInitiativeSpecPath(slug) {
	return `.harness/initiatives/${slug}/initiative.md`;
}

module.exports = {
	PLAN_FILES,
	listInitiativeSlugs,
	initiativePackDir,
	isInitiativePackDir,
	resolvePlanHtmlPath,
	defaultInitiativeSpecPath,
};
