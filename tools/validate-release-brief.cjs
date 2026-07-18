#!/usr/bin/env node
/**
 * Validate .harness/release-brief.md section contract for /ss-release.
 *
 * Usage:
 *   node path/to/skillsync/tools/validate-release-brief.cjs [/path/to/consumer-repo] [--mode structure|ready] [--brief path]
 *
 * --mode structure: required headings only (post-init)
 * --mode ready: headings + filled version, ≥3 feature bullets, CTA label+URL (default)
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	releaseBriefPath,
	hasSection,
	parseMarkdownSections,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

const REQUIRED_SECTIONS = [
	'Features (3–5 bullets)',
	'Proof assets',
	'Primary CTA',
	'Out of scope / do-not-claim',
];

/**
 * @param {string} content
 * @param {string} field
 * @returns {string}
 */
function metaField(content, field) {
	const re = new RegExp(
		`\\*\\*${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\*\\*\\s*(.*)$`,
		'm',
	);
	const m = content.match(re);
	return m ? m[1].trim() : '';
}

/**
 * @param {string} sectionBody
 * @returns {string[]}
 */
function realBullets(sectionBody) {
	return sectionBody
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => /^[-*]\s+\S/.test(line))
		.map((line) => line.replace(/^[-*]\s+/, '').trim())
		.filter(
			(text) =>
				text.length > 0 &&
				text !== '-' &&
				!text.startsWith('(filled') &&
				!text.startsWith('(optional'),
		);
}

/**
 * @param {string} content
 * @param {string} mode
 * @returns {string[]}
 */
function validate(content, mode) {
	/** @type {string[]} */
	const errors = [];

	if (!/^#\s+Release Brief\s*$/m.test(content)) {
		errors.push('Missing top heading: # Release Brief');
	}

	for (const section of REQUIRED_SECTIONS) {
		if (!hasSection(content, section)) {
			errors.push(`Missing required section: ## ${section}`);
		}
	}

	if (mode === 'structure') {
		return errors;
	}

	const version = metaField(content, 'Version');
	if (!version) {
		errors.push('Ready mode: **Version:** must be non-empty');
	}

	const sections = parseMarkdownSections(content, 2);
	const features = sections.get('Features (3–5 bullets)') ?? '';
	const bullets = realBullets(features);
	if (bullets.length < 3) {
		errors.push(
			`Ready mode: ## Features needs ≥3 real bullets (found ${bullets.length})`,
		);
	}
	if (bullets.length > 5) {
		errors.push(
			`Ready mode: ## Features should be 3–5 bullets (found ${bullets.length})`,
		);
	}

	const cta = sections.get('Primary CTA') ?? '';
	const ctaLabelMatch = cta.match(/\*\*Label:\*\*\s*(.*)$/m);
	const ctaUrlMatch = cta.match(/\*\*URL:\*\*\s*(.*)$/m);
	const ctaLabel = ctaLabelMatch ? ctaLabelMatch[1].trim() : '';
	const ctaUrl = ctaUrlMatch ? ctaUrlMatch[1].trim() : '';

	if (!ctaLabel) {
		errors.push('Ready mode: Primary CTA **Label:** must be non-empty');
	}
	if (!ctaUrl || !/^https?:\/\//i.test(ctaUrl)) {
		errors.push(
			'Ready mode: Primary CTA **URL:** must be a non-empty http(s) URL',
		);
	}

	const outOfScope = sections.get('Out of scope / do-not-claim') ?? '';
	const scopeBullets = realBullets(outOfScope);
	if (scopeBullets.length < 1) {
		errors.push(
			'Ready mode: ## Out of scope / do-not-claim needs ≥1 real bullet',
		);
	}

	return errors;
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const mode = String(flags.mode ?? 'ready');
	assertOrExit(
		['structure', 'ready'].includes(mode),
		`Invalid --mode "${mode}". Use structure or ready.`,
	);

	const file =
		typeof flags.brief === 'string'
			? path.resolve(consumerRoot, flags.brief)
			: releaseBriefPath(consumerRoot);

	if (!fs.existsSync(file)) {
		console.error(`Missing ${file}`);
		process.exit(1);
	}

	const content = fs.readFileSync(file, 'utf8').trim();
	if (!content) {
		console.error('release-brief.md is empty');
		process.exit(1);
	}

	const errors = validate(content, mode);
	if (errors.length > 0) {
		console.error(`validate-release-brief (${mode}): FAILED`);
		for (const err of errors) {
			console.error(`  - ${err}`);
		}
		process.exit(1);
	}

	console.log(`validate-release-brief (${mode}): OK`);
}

main();
