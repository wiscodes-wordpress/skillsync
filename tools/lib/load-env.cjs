#!/usr/bin/env node
/**
 * Load skillsync/.env into process.env (does not override existing env).
 * @param {string} [root] skillsync root
 */
const fs = require('node:fs');
const path = require('node:path');

/**
 * @param {string} [root]
 */
function loadEnv(root) {
	const envPath = path.join(root || path.join(__dirname, '..'), '.env');
	if (!fs.existsSync(envPath)) return;
	const text = fs.readFileSync(envPath, 'utf8');
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let val = trimmed.slice(eq + 1).trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}
		if (key && process.env[key] === undefined) {
			process.env[key] = val;
		}
	}
}

module.exports = { loadEnv };
