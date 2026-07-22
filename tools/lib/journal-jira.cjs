/**
 * Resolve Jira browse URLs for journal bullets (story / epic keys).
 *
 * Bases (first match wins), keyed by project prefix (e.g. DCD from DCD-6903):
 *   1. Explicit map passed by caller
 *   2. skillsync.config.json → journal.jiraBases (cwd walk-up)
 *   3. JOURNAL_JIRA_BASES JSON env: {"DCD":"https://lifeway.atlassian.net",...}
 *   4. JOURNAL_JIRA_BASE_URL env (single site for any prefix)
 */

const fs = require('node:fs');
const path = require('node:path');

const KEY_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/g;
const MD_LINK_RE = /\[[^\]]*\]\([^)]+\)/g;

/**
 * @param {string} cwd
 * @returns {Record<string, string>}
 */
function loadConfigBases(cwd = process.cwd()) {
	let dir = path.resolve(cwd);
	for (let i = 0; i < 8; i++) {
		const cfgPath = path.join(dir, 'skillsync.config.json');
		if (fs.existsSync(cfgPath)) {
			try {
				const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
				const bases = cfg?.journal?.jiraBases;
				if (bases && typeof bases === 'object') {
					/** @type {Record<string, string>} */
					const out = {};
					for (const [k, v] of Object.entries(bases)) {
						if (typeof v === 'string' && v.trim()) {
							out[String(k).toUpperCase()] = v.replace(/\/$/, '');
						}
					}
					return out;
				}
			} catch {
				/* ignore bad config */
			}
			return {};
		}
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return {};
}

/**
 * @returns {Record<string, string>}
 */
function loadEnvBases() {
	/** @type {Record<string, string>} */
	const out = {};
	const raw = process.env.JOURNAL_JIRA_BASES;
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === 'object') {
				for (const [k, v] of Object.entries(parsed)) {
					if (typeof v === 'string' && v.trim()) {
						out[String(k).toUpperCase()] = v.replace(/\/$/, '');
					}
				}
			}
		} catch {
			/* ignore */
		}
	}
	return out;
}

/**
 * @param {Record<string, string>} [extra]
 * @returns {Record<string, string>}
 */
function resolveBases(extra) {
	return {
		...loadEnvBases(),
		...loadConfigBases(),
		...(extra || {}),
	};
}

/**
 * @param {string} key e.g. DCD-6903
 * @param {Record<string, string>} [bases]
 * @returns {string | null} browse URL or null
 */
function browseUrlForKey(key, bases) {
	const m = String(key || '')
		.trim()
		.toUpperCase()
		.match(/^([A-Z][A-Z0-9]+)-\d+$/);
	if (!m) return null;
	const prefix = m[1];
	const map = resolveBases(bases);
	const site = map[prefix] || process.env.JOURNAL_JIRA_BASE_URL || '';
	if (!site || typeof site !== 'string') return null;
	const base = site.replace(/\/$/, '').replace(/\/browse\/?$/i, '');
	return `${base}/browse/${key.toUpperCase()}`;
}

/**
 * Markdown link for a key when a base is known; otherwise bare key.
 * @param {string} key
 * @param {Record<string, string>} [bases]
 */
function linkKey(key, bases) {
	const k = String(key || '').trim().toUpperCase();
	const url = browseUrlForKey(k, bases);
	return url ? `[${k}](${url})` : k;
}

/**
 * Replace bare ISSUE-123 tokens with markdown links (skip existing md links).
 * @param {string} text
 * @param {Record<string, string>} [bases]
 */
function linkifyIssueKeys(text, bases) {
	const s = String(text || '');
	if (!s) return s;

	/** @type {{ start: number, end: number }[]} */
	const protectedSpans = [];
	let m;
	const linkRe = new RegExp(MD_LINK_RE.source, 'g');
	while ((m = linkRe.exec(s)) !== null) {
		protectedSpans.push({ start: m.index, end: m.index + m[0].length });
	}

	const inProtected = (idx) =>
		protectedSpans.some((p) => idx >= p.start && idx < p.end);

	return s.replace(KEY_RE, (match, _g1, offset) => {
		if (inProtected(offset)) return match;
		return linkKey(match, bases);
	});
}

module.exports = {
	browseUrlForKey,
	linkKey,
	linkifyIssueKeys,
	resolveBases,
	loadConfigBases,
	KEY_RE,
};
