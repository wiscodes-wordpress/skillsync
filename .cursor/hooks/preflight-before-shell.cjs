#!/usr/bin/env node
/**
 * Cursor beforeShellExecution hook: block git commit / push / gh pr create
 * until local preflight passes (avoids burning GitHub Actions on red checks).
 *
 * - git commit / git push → scoped preflight (story/diff E2E)
 * - gh pr create → full preflight (incl. full E2E when present)
 * - open-pr.cjs is not gated here; it runs preflight --full itself
 *
 * Reads JSON from stdin; writes permission JSON to stdout.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/**
 * @param {string} command
 * @returns {'none' | 'scoped' | 'full'}
 */
function gateMode(command) {
	const c = command.trim();
	if (!c) {
		return 'none';
	}
	if (/\b--dry-run\b/.test(c) || /\bgh pr view\b/.test(c) || /\bgit status\b/.test(c)) {
		return 'none';
	}
	// open-pr.cjs runs preflight --full internally — avoid double suite.
	if (/\bopen-pr\.cjs\b/.test(c)) {
		return 'none';
	}
	if (/\bgh\s+pr\s+create\b/.test(c)) {
		return 'full';
	}
	if (/\bgit\s+commit\b/.test(c) || /\bgit\s+push\b/.test(c)) {
		return 'scoped';
	}
	return 'none';
}

/**
 * @returns {string}
 */
function findPreflightScript() {
	const cwd = process.cwd();
	const candidates = [
		path.join(cwd, 'tools', 'preflight-local.cjs'),
		path.join(cwd, '.cursor', 'vendor', 'skillsync', 'tools', 'preflight-local.cjs'),
	];
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}
	return '';
}

function allow(extra = {}) {
	process.stdout.write(JSON.stringify({ permission: 'allow', ...extra }));
}

function deny(userMessage, agentMessage) {
	process.stdout.write(
		JSON.stringify({
			permission: 'deny',
			user_message: userMessage,
			agent_message: agentMessage,
		}),
	);
}

function main() {
	const raw = fs.readFileSync(0, 'utf8');
	let input = {};
	try {
		input = raw ? JSON.parse(raw) : {};
	} catch {
		allow();
		return;
	}

	const command = typeof input.command === 'string' ? input.command : '';
	const mode = gateMode(command);
	if (mode === 'none') {
		allow();
		return;
	}

	const script = findPreflightScript();
	if (!script) {
		deny(
			'Local preflight script not found. Add tools/preflight-local.cjs or vendor skillsync.',
			'Blocked commit/push/PR: preflight-local.cjs missing. Run from skillsync root or a consumer with vendored skillsync.',
		);
		return;
	}

	/** @type {string[]} */
	const args = [script, process.cwd()];
	if (mode === 'full') {
		args.push('--full');
	}

	const result = spawnSync(process.execPath, args, {
		cwd: process.cwd(),
		encoding: 'utf8',
	});

	if (result.status === 0) {
		allow();
		return;
	}

	const detail = (result.stderr || result.stdout || '').trim().slice(-1500);
	const label = mode === 'full' ? 'full preflight' : 'preflight';
	deny(
		`Local ${label} failed. Fix checks before commit/push/PR to avoid wasting GitHub Actions.`,
		`preflight-local failed (exit ${result.status}). Fix before retrying.\n${detail}`,
	);
}

main();
