/**
 * Shared Jira Cloud REST helpers (Basic auth via email + API token).
 *
 * Env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
 */

const path = require('node:path');
const { loadEnv } = require('./load-env.cjs');

const skillsyncRoot = path.join(__dirname, '..', '..');

/**
 * @returns {{ baseUrl: string, email: string, token: string }}
 */
function loadJiraEnv() {
	loadEnv(skillsyncRoot);
	return {
		baseUrl: String(process.env.JIRA_BASE_URL || '').replace(/\/$/, ''),
		email: String(process.env.JIRA_EMAIL || '').trim(),
		token: String(process.env.JIRA_API_TOKEN || '').trim(),
	};
}

/**
 * @param {{ baseUrl?: string, email?: string, token?: string }} [creds]
 * @returns {{ ok: true, baseUrl: string, email: string, token: string } | { ok: false, error: string }}
 */
function resolveJiraCreds(creds) {
	const fromEnv = loadJiraEnv();
	const baseUrl = String(creds?.baseUrl || fromEnv.baseUrl || '').replace(/\/$/, '');
	const email = String(creds?.email || fromEnv.email || '').trim();
	const token = String(creds?.token || fromEnv.token || '').trim();
	if (!baseUrl || !email || !token) {
		return {
			ok: false,
			error: 'Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN',
		};
	}
	return { ok: true, baseUrl, email, token };
}

/**
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} token
 * @param {string} pathname
 * @param {RequestInit} [init]
 */
async function jiraFetch(baseUrl, email, token, pathname, init = {}) {
	const url = `${baseUrl.replace(/\/$/, '')}${pathname}`;
	const auth = Buffer.from(`${email}:${token}`).toString('base64');
	const res = await fetch(url, {
		...init,
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(init.headers ?? {}),
		},
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Jira ${res.status} ${pathname}: ${text.slice(0, 500)}`);
	}
	if (res.status === 204) return null;
	const text = await res.text();
	if (!text) return null;
	return JSON.parse(text);
}

module.exports = {
	loadJiraEnv,
	resolveJiraCreds,
	jiraFetch,
};
