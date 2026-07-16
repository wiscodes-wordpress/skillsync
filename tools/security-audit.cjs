#!/usr/bin/env node
/**
 * Security hard gates (Phase A) — deterministic inventory + pattern checks.
 * Phase B (agent judgment) is driven by harness/harness-security-audit.md;
 * this tool records Phase A evidence and optional Phase B status in state.md.
 *
 * Usage:
 *   node path/to/skillsync/tools/security-audit.cjs [/path/to/consumer-repo]
 *     [--base main] [--write-state] [--json] [--deps]
 *     [--set-phase-b PASS|FAIL|NEEDS_HUMAN|PENDING]
 *     [--check-state] [--allow-skip-phase-b]
 *
 * Exit codes:
 *   0 — Phase A OK (or --check-state: overall Security Evidence PASS)
 *   1 — Phase A failures / overall Status not PASS
 *   2 — usage / state errors
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	readState,
	writeState,
	readOptionalConfig,
	parseMarkdownSections,
	hasSection,
	upsertMarkdownSection,
	runCommand,
	gitMergeBase,
	assertOrExit,
} = require('./lib/ss-tools.cjs');

const SKIP_DIR = new Set([
	'node_modules',
	'vendor',
	'.git',
	'.harness',
	'dist',
	'build',
	'coverage',
	'.next',
	'.turbo',
	'.cache',
]);

const SUPERGLOBAL_RE = /\$_(GET|POST|REQUEST|COOKIE)\s*\[/g;
const SANITIZE_HINT_RE =
	/\b(sanitize_|esc_|wp_unslash|absint|intval|floatval|wp_verify_nonce|check_ajax_referer|check_admin_referer|wp_kses)\w*/;

/**
 * @typedef {object} Finding
 * @property {'error' | 'warning'} severity
 * @property {string} id
 * @property {string} message
 * @property {string} [file]
 * @property {number} [line]
 */

/**
 * @typedef {object} Entrypoint
 * @property {string} kind
 * @property {string} file
 * @property {number} line
 * @property {string} detail
 * @property {boolean} [hasPermissionCallback]
 */

/**
 * @param {string} dir
 * @param {(file: string) => boolean} filter
 * @param {string[]} [acc]
 * @returns {string[]}
 */
function walkFiles(dir, filter, acc = []) {
	if (!fs.existsSync(dir)) {
		return acc;
	}
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return acc;
	}
	for (const ent of entries) {
		if (ent.name.startsWith('.') && ent.name !== '.php') {
			if (ent.isDirectory() && SKIP_DIR.has(ent.name)) {
				continue;
			}
			if (ent.isDirectory() && ent.name !== '.') {
				// skip other dotdirs
				if (ent.name !== '..') {
					continue;
				}
			}
		}
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) {
			if (SKIP_DIR.has(ent.name)) {
				continue;
			}
			walkFiles(full, filter, acc);
		} else if (ent.isFile() && filter(full)) {
			acc.push(full);
		}
	}
	return acc;
}

/**
 * @param {string} consumerRoot
 * @returns {string[]}
 */
function listPhpFiles(consumerRoot) {
	return walkFiles(consumerRoot, (f) => f.endsWith('.php'));
}

/**
 * @param {string} consumerRoot
 * @returns {boolean}
 */
function hasFrontendSources(consumerRoot) {
	const hits = walkFiles(
		consumerRoot,
		(f) =>
			/\.(tsx?|jsx?|mjs|cjs)$/.test(f) &&
			!f.includes(`${path.sep}tests${path.sep}`) &&
			!f.includes(`${path.sep}e2e${path.sep}`),
	);
	return hits.length > 0;
}

/**
 * @param {string} consumerRoot
 * @param {string[]} phpFiles
 * @returns {{ entrypoints: Entrypoint[]; findings: Finding[] }}
 */
function scanPhpSecurity(consumerRoot, phpFiles) {
	/** @type {Entrypoint[]} */
	const entrypoints = [];
	/** @type {Finding[]} */
	const findings = [];

	for (const file of phpFiles) {
		const rel = path.relative(consumerRoot, file);
		let content;
		try {
			content = fs.readFileSync(file, 'utf8');
		} catch {
			continue;
		}
		const lines = content.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineNo = i + 1;

			if (/register_rest_route\s*\(/.test(line)) {
				const window = lines.slice(i, Math.min(lines.length, i + 50)).join('\n');
				const hasPermissionCallback = /permission_callback\s*=>/.test(window);
				const detailMatch = line.match(/register_rest_route\s*\(\s*([^,]+)/);
				entrypoints.push({
					kind: 'rest',
					file: rel,
					line: lineNo,
					detail: (detailMatch?.[1] ?? 'register_rest_route').trim(),
					hasPermissionCallback,
				});
				if (!hasPermissionCallback) {
					findings.push({
						severity: 'error',
						id: 'rest-missing-permission-callback',
						message:
							'register_rest_route without permission_callback in following ~50 lines',
						file: rel,
						line: lineNo,
					});
				} else if (/permission_callback\s*=>\s*['"]?__return_true/.test(window)) {
					findings.push({
						severity: 'warning',
						id: 'rest-public-permission',
						message:
							'permission_callback is __return_true — confirm intentional public route',
						file: rel,
						line: lineNo,
					});
				}
			}

			const ajax = line.match(
				/add_action\s*\(\s*['"](wp_ajax(?:_nopriv)?_[^'"]+)['"]/,
			);
			if (ajax) {
				entrypoints.push({
					kind: ajax[1].includes('nopriv') ? 'ajax_nopriv' : 'ajax',
					file: rel,
					line: lineNo,
					detail: ajax[1],
				});
			}

			const adminPost = line.match(
				/add_action\s*\(\s*['"](admin_post(?:_nopriv)?_[^'"]+)['"]/,
			);
			if (adminPost) {
				entrypoints.push({
					kind: 'admin_post',
					file: rel,
					line: lineNo,
					detail: adminPost[1],
				});
			}

			if (/\beval\s*\(/.test(line) || /\bassert\s*\(/.test(line)) {
				findings.push({
					severity: 'error',
					id: 'dangerous-eval-assert',
					message: 'Dangerous eval/assert usage',
					file: rel,
					line: lineNo,
				});
			}
			if (/create_function\s*\(/.test(line)) {
				findings.push({
					severity: 'error',
					id: 'dangerous-create-function',
					message: 'create_function is unsafe/deprecated',
					file: rel,
					line: lineNo,
				});
			}
			if (/extract\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)/.test(line)) {
				findings.push({
					severity: 'error',
					id: 'dangerous-extract-superglobal',
					message: 'extract() on request superglobal',
					file: rel,
					line: lineNo,
				});
			}

			SUPERGLOBAL_RE.lastIndex = 0;
			if (SUPERGLOBAL_RE.test(line) && !SANITIZE_HINT_RE.test(line)) {
				findings.push({
					severity: 'error',
					id: 'unsanitized-superglobal',
					message:
						'Superglobal read without sanitize/nonce helper on the same line',
					file: rel,
					line: lineNo,
				});
			}

			if (
				/\$wpdb->(query|get_results|get_var|get_row|get_col)\s*\(/.test(line) &&
				/\$[a-zA-Z_]/.test(line) &&
				!/\$wpdb->prepare/.test(line) &&
				!/['"][^'"]*['"]\s*\)/.test(line.replace(/\$wpdb->\w+\s*\(\s*/, ''))
			) {
				// Heuristic: $wpdb->query(...$var...) without prepare on same line
				if (!/prepare\s*\(/.test(line)) {
					findings.push({
						severity: 'warning',
						id: 'wpdb-unprepared-heuristic',
						message:
							'$wpdb query with variables — confirm $wpdb->prepare or safe builder',
						file: rel,
						line: lineNo,
					});
				}
			}

			if (
				/\b(api[_-]?key|secret_key|private_key|auth_token|password)\b\s*[=:]\s*['"][^'"]{12,}['"]/i.test(
					line,
				) &&
				!/getenv|env\(|process\.env|defined\s*\(/.test(line)
			) {
				findings.push({
					severity: 'error',
					id: 'hardcoded-secret-heuristic',
					message: 'Possible hardcoded secret/token',
					file: rel,
					line: lineNo,
				});
			}
		}
	}

	return { entrypoints, findings };
}

/**
 * @param {string} consumerRoot
 * @param {string} base
 * @returns {Finding[]}
 */
function runFallowSecurity(consumerRoot, base) {
	/** @type {Finding[]} */
	const findings = [];
	const bin = path.join(consumerRoot, 'node_modules', '.bin', 'fallow');
	const hasLocal = fs.existsSync(bin);
	const cmd = hasLocal
		? `"${bin}" security --format json --quiet --gate new --changed-since ${base}`
		: null;

	if (!cmd) {
		findings.push({
			severity: 'warning',
			id: 'fallow-not-installed',
			message:
				'fallow not found in node_modules/.bin — skip FE security candidates (optional: npm i -D fallow)',
		});
		return findings;
	}

	const result = runCommand(consumerRoot, cmd);
	if (result.status !== 0 && !result.stdout.trim()) {
		findings.push({
			severity: 'warning',
			id: 'fallow-failed',
			message: `fallow security exited ${result.status}: ${(result.stderr || result.stdout).slice(0, 200)}`,
		});
		return findings;
	}

	try {
		const json = JSON.parse(result.stdout || '{}');
		const list = Array.isArray(json.security_findings)
			? json.security_findings
			: Array.isArray(json.findings)
				? json.findings
				: [];
		for (const item of list) {
			findings.push({
				severity: 'error',
				id: `fallow:${item.category ?? item.kind ?? 'candidate'}`,
				message: String(item.evidence ?? item.message ?? item.kind ?? 'security candidate'),
				file: item.path ?? item.file,
				line: item.line,
			});
		}
		if (result.status !== 0 && list.length === 0) {
			findings.push({
				severity: 'error',
				id: 'fallow-gate-failed',
				message: `fallow security --gate new failed (exit ${result.status})`,
			});
		}
	} catch {
		if (result.status !== 0) {
			findings.push({
				severity: 'error',
				id: 'fallow-gate-failed',
				message: `fallow security --gate new failed (exit ${result.status})`,
			});
		}
	}

	return findings;
}

/**
 * @param {string} consumerRoot
 * @returns {Finding[]}
 */
function runDependencyAudits(consumerRoot) {
	/** @type {Finding[]} */
	const findings = [];

	if (fs.existsSync(path.join(consumerRoot, 'composer.lock'))) {
		const r = runCommand(consumerRoot, 'composer audit --format=json 2>/dev/null || composer audit 2>&1');
		if (r.status !== 0) {
			findings.push({
				severity: 'error',
				id: 'composer-audit',
				message: 'composer audit reported issues (run composer audit for details)',
			});
		}
	}

	const pkgLock =
		fs.existsSync(path.join(consumerRoot, 'package-lock.json')) ||
		fs.existsSync(path.join(consumerRoot, 'yarn.lock')) ||
		fs.existsSync(path.join(consumerRoot, 'pnpm-lock.yaml'));
	if (pkgLock && fs.existsSync(path.join(consumerRoot, 'package.json'))) {
		const r = runCommand(consumerRoot, 'npm audit --json 2>/dev/null || npm audit 2>&1');
		if (r.status !== 0) {
			try {
				const j = JSON.parse(r.stdout || '{}');
				const vulns = j.metadata?.vulnerabilities;
				const high = (vulns?.high ?? 0) + (vulns?.critical ?? 0);
				if (high > 0) {
					findings.push({
						severity: 'error',
						id: 'npm-audit-high',
						message: `npm audit: ${high} high/critical advisories`,
					});
				} else {
					findings.push({
						severity: 'warning',
						id: 'npm-audit',
						message: 'npm audit reported non-zero exit (review advisories)',
					});
				}
			} catch {
				findings.push({
					severity: 'warning',
					id: 'npm-audit',
					message: 'npm audit reported issues',
				});
			}
		}
	}

	return findings;
}

/**
 * @param {Finding[]} findings
 * @returns {{ errors: Finding[]; warnings: Finding[] }}
 */
function splitFindings(findings) {
	return {
		errors: findings.filter((f) => f.severity === 'error'),
		warnings: findings.filter((f) => f.severity === 'warning'),
	};
}

/**
 * @param {object} report
 * @returns {string}
 */
function formatEvidenceSection(report) {
	const {
		phaseAStatus,
		phaseBStatus,
		overallStatus,
		base,
		mergeBase,
		ranAt,
		entrypoints,
		errors,
		warnings,
	} = report;

	/** @type {string[]} */
	const lines = [];
	lines.push(`**Status:** ${overallStatus}`);
	lines.push(`**Phase A:** ${phaseAStatus}`);
	lines.push(`**Phase B:** ${phaseBStatus}`);
	lines.push(`**Ran at:** ${ranAt}`);
	lines.push(`**Base:** ${base} @ \`${mergeBase}\``);
	lines.push('');
	lines.push('### Machine gates (Phase A)');
	lines.push('');
	lines.push(`- Entrypoints inventoried: **${entrypoints.length}**`);
	lines.push(`- Errors: **${errors.length}**`);
	lines.push(`- Warnings: **${warnings.length}**`);
	lines.push('');

	if (entrypoints.length > 0) {
		lines.push('### Entrypoint inventory');
		lines.push('');
		for (const ep of entrypoints.slice(0, 80)) {
			const perm =
				ep.kind === 'rest'
					? ep.hasPermissionCallback
						? ' permission_callback=yes'
						: ' permission_callback=MISSING'
					: '';
			lines.push(`- \`${ep.kind}\` ${ep.file}:${ep.line} — ${ep.detail}${perm}`);
		}
		if (entrypoints.length > 80) {
			lines.push(`- … ${entrypoints.length - 80} more`);
		}
		lines.push('');
	}

	if (errors.length > 0) {
		lines.push('### Failures');
		lines.push('');
		for (const e of errors) {
			const loc = e.file ? `${e.file}${e.line ? `:${e.line}` : ''}` : '';
			lines.push(`- **${e.id}**${loc ? ` (\`${loc}\`)` : ''}: ${e.message}`);
		}
		lines.push('');
	}

	if (warnings.length > 0) {
		lines.push('### Warnings');
		lines.push('');
		for (const w of warnings) {
			const loc = w.file ? `${w.file}${w.line ? `:${w.line}` : ''}` : '';
			lines.push(`- **${w.id}**${loc ? ` (\`${loc}\`)` : ''}: ${w.message}`);
		}
		lines.push('');
	}

	lines.push('### Phase B notes');
	lines.push('');
	lines.push(
		phaseBStatus === 'PENDING'
			? '(Agent completes Phase B per harness-security-audit.md, then `--set-phase-b PASS|FAIL|NEEDS_HUMAN`.)'
			: `(Phase B set to ${phaseBStatus}.)`,
	);

	return lines.join('\n');
}

/**
 * @param {string | null} state
 * @returns {{ status: string; phaseA: string; phaseB: string } | null}
 */
function parseSecurityEvidence(state) {
	if (!state || !hasSection(state, 'Security Evidence')) {
		return null;
	}
	const body = parseMarkdownSections(state).get('Security Evidence') ?? '';
	const status = body.match(/\*\*Status:\*\*\s*(\w+)/)?.[1] ?? '';
	const phaseA = body.match(/\*\*Phase A:\*\*\s*(\w+)/)?.[1] ?? '';
	const phaseB = body.match(/\*\*Phase B:\*\*\s*(\w+)/)?.[1] ?? '';
	return { status, phaseA, phaseB };
}

/**
 * @param {string} consumerRoot
 * @param {string} phaseB
 * @param {{ allowSkipPhaseB?: boolean }} [opts]
 */
function setPhaseB(consumerRoot, phaseB, opts = {}) {
	const allowed = ['PASS', 'FAIL', 'NEEDS_HUMAN', 'PENDING', 'SKIPPED'];
	assertOrExit(allowed.includes(phaseB), `Invalid --set-phase-b "${phaseB}". Use ${allowed.join('|')}.`);
	if (phaseB === 'SKIPPED' && !opts.allowSkipPhaseB) {
		console.error('Refusing Phase B SKIPPED without --allow-skip-phase-b');
		process.exit(2);
	}

	let state = readState(consumerRoot);
	assertOrExit(Boolean(state && hasSection(state, 'Security Evidence')), 'Missing ## Security Evidence — run security-audit with --write-state first.');

	const evidence = parseSecurityEvidence(state);
	assertOrExit(Boolean(evidence), 'Could not parse Security Evidence');
	const phaseA = evidence.phaseA;
	const overall =
		phaseA === 'PASS' && (phaseB === 'PASS' || (phaseB === 'SKIPPED' && opts.allowSkipPhaseB))
			? 'PASS'
			: phaseB === 'NEEDS_HUMAN'
				? 'NEEDS_HUMAN'
				: 'FAIL';

	let body = parseMarkdownSections(state).get('Security Evidence') ?? '';
	body = body
		.replace(/\*\*Status:\*\*\s*\w+/, `**Status:** ${overall}`)
		.replace(/\*\*Phase B:\*\*\s*\w+/, `**Phase B:** ${phaseB}`);

	if (!body.includes('### Phase B notes')) {
		body += `\n\n### Phase B notes\n\n(Phase B set to ${phaseB}.)\n`;
	} else {
		body = body.replace(
			/### Phase B notes[\s\S]*?(?=### |\s*$)/,
			`### Phase B notes\n\n(Phase B set to ${phaseB}.)\n\n`,
		);
	}

	state = upsertMarkdownSection(state, 'Security Evidence', body);
	writeState(consumerRoot, state);
	console.log(`security-audit: Phase B → ${phaseB}; Status → ${overall}`);
	if (overall !== 'PASS') {
		process.exit(1);
	}
}

/**
 * @param {string} consumerRoot
 * @param {{ allowSkipPhaseB?: boolean }} [opts]
 */
function checkState(consumerRoot, opts = {}) {
	const state = readState(consumerRoot);
	if (!state || !hasSection(state, 'Security Evidence')) {
		console.error(
			'security-audit --check-state: missing ## Security Evidence (run /ss-security-audit first)',
		);
		process.exit(1);
	}
	const evidence = parseSecurityEvidence(state);
	if (!evidence) {
		console.error('security-audit --check-state: could not parse Security Evidence');
		process.exit(2);
	}
	const ok =
		evidence.status === 'PASS' &&
		evidence.phaseA === 'PASS' &&
		(evidence.phaseB === 'PASS' ||
			(opts.allowSkipPhaseB && evidence.phaseB === 'SKIPPED'));
	if (!ok) {
		console.error(
			`security-audit --check-state: Status=${evidence.status} PhaseA=${evidence.phaseA} PhaseB=${evidence.phaseB} (need PASS)`,
		);
		process.exit(1);
	}
	console.log('security-audit --check-state: OK (Security Evidence PASS)');
}

/**
 * @param {string} consumerRoot
 * @param {object} opts
 */
function runPhaseA(consumerRoot, opts) {
	const config = readOptionalConfig(consumerRoot);
	const base =
		(typeof opts.base === 'string' && opts.base) ||
		config?.prBaseBranch ||
		'main';
	const mergeBase = gitMergeBase(consumerRoot, base);
	const phpFiles = listPhpFiles(consumerRoot);
	const { entrypoints, findings: phpFindings } = scanPhpSecurity(
		consumerRoot,
		phpFiles,
	);

	/** @type {Finding[]} */
	const findings = [...phpFindings];

	if (hasFrontendSources(consumerRoot)) {
		findings.push(...runFallowSecurity(consumerRoot, mergeBase));
	}

	if (opts.deps) {
		findings.push(...runDependencyAudits(consumerRoot));
	}

	if (phpFiles.length === 0 && !hasFrontendSources(consumerRoot)) {
		findings.push({
			severity: 'warning',
			id: 'no-surfaces',
			message: 'No PHP or frontend sources found — Phase A has nothing to inventory',
		});
	}

	const { errors, warnings } = splitFindings(findings);
	const phaseAStatus = errors.length === 0 ? 'PASS' : 'FAIL';
	const phaseBStatus = 'PENDING';
	const overallStatus = phaseAStatus === 'PASS' ? 'IN_PROGRESS' : 'FAIL';
	const ranAt = new Date().toISOString();

	const report = {
		phaseAStatus,
		phaseBStatus,
		overallStatus,
		base,
		mergeBase,
		ranAt,
		entrypoints,
		errors,
		warnings,
		phpFileCount: phpFiles.length,
	};

	if (opts.writeState) {
		const section = formatEvidenceSection(report);
		const prev = readState(consumerRoot) ?? '';
		const next = upsertMarkdownSection(prev, 'Security Evidence', section);
		writeState(consumerRoot, next);
		console.log('Wrote ## Security Evidence to .harness/state.md');
	}

	if (opts.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(`security-audit Phase A: ${phaseAStatus}`);
		console.log(`  PHP files: ${phpFiles.length}`);
		console.log(`  Entrypoints: ${entrypoints.length}`);
		console.log(`  Errors: ${errors.length}`);
		console.log(`  Warnings: ${warnings.length}`);
		for (const e of errors) {
			const loc = e.file ? `${e.file}${e.line ? `:${e.line}` : ''}` : '';
			console.error(`  ERROR [${e.id}] ${loc} ${e.message}`);
		}
		for (const w of warnings) {
			const loc = w.file ? `${w.file}${w.line ? `:${w.line}` : ''}` : '';
			console.warn(`  WARN [${w.id}] ${loc} ${w.message}`);
		}
		if (phaseAStatus === 'PASS') {
			console.log(
				'Next: complete Phase B (harness-security-audit.md), then --set-phase-b PASS',
			);
		}
	}

	if (phaseAStatus !== 'PASS') {
		process.exit(1);
	}
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const allowSkipPhaseB = Boolean(flags['allow-skip-phase-b']);

	if (flags['check-state']) {
		checkState(consumerRoot, { allowSkipPhaseB });
		return;
	}

	if (typeof flags['set-phase-b'] === 'string') {
		setPhaseB(consumerRoot, flags['set-phase-b'].toUpperCase(), {
			allowSkipPhaseB,
		});
		return;
	}

	runPhaseA(consumerRoot, {
		base: flags.base,
		writeState: Boolean(flags['write-state']),
		json: Boolean(flags.json),
		deps: Boolean(flags.deps),
	});
}

if (require.main === module) {
	main();
}

module.exports = {
	scanPhpSecurity,
	splitFindings,
	parseSecurityEvidence,
	formatEvidenceSection,
	listPhpFiles,
};
