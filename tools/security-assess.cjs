#!/usr/bin/env node
/**
 * Whole-plugin security assess (not the per-PR ship gate).
 *
 * Stage 2 health probe: surface census + Semgrep + dependency advisories +
 * Wordfence CLI (required for complete WP health when wordpressRoot is set).
 * Writes facts for /ss-security-plan living HTML — does not PASS/FAIL a PR.
 *
 * Usage:
 *   node path/to/skillsync/tools/security-assess.cjs [/path/to/consumer-repo]
 *     [--write-state] [--json] [--strict]
 *     [--wordpress-root /path/to/wp]
 *     [--wordfence required|off]
 *     [--skip-semgrep] [--skip-deps] [--skip-wordfence]
 *
 * Exit codes:
 *   0 — report written (findings may still exist; completeness may be incomplete)
 *   1 — --strict and (ERROR findings or incomplete), or probe crash when required
 *   2 — usage / config errors
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	parseArgs,
	resolveConsumerRoot,
	readState,
	writeState,
	readOptionalConfig,
	upsertMarkdownSection,
	runCommand,
	harnessDir,
} = require('./lib/ss-tools.cjs');

const {
	listPhpFiles,
	scanPhpSecurity,
	runDependencyAudits,
} = require('./security-audit.cjs');

/**
 * @typedef {'ERROR' | 'WARNING' | 'INFO'} Severity
 */

/**
 * @typedef {object} ProbeFinding
 * @property {Severity} severity
 * @property {string} id
 * @property {string} message
 * @property {string} [file]
 * @property {number} [line]
 * @property {string} [probe]
 */

/**
 * @typedef {object} ProbeResult
 * @property {string} id
 * @property {'ran' | 'skipped' | 'missing' | 'blocked' | 'failed'} status
 * @property {string} detail
 * @property {ProbeFinding[]} findings
 * @property {Record<string, unknown>} [meta]
 */

/**
 * Resolve skillsync tools root (directory containing this script's parent tools/).
 * @returns {string}
 */
function skillsyncToolsRoot() {
	return __dirname;
}

/**
 * @param {string} name
 * @returns {string | null}
 */
function findOnPath(name) {
	const r = runCommand(
		process.cwd(),
		`command -v ${name} 2>/dev/null || which ${name} 2>/dev/null || true`,
	);
	const line = (r.stdout || '').trim().split('\n').filter(Boolean)[0];
	return line || null;
}

/**
 * @param {unknown} config
 * @returns {{
 *   wordpressRoot: string | null;
 *   wordfence: 'required' | 'off';
 *   semgrepExtraConfigs: string[];
 * }}
 */
function resolveAssessConfig(config, flags) {
	const sa =
		config && typeof config === 'object' && config.securityAssess
			? config.securityAssess
			: {};
	const wordpressRootFlag =
		typeof flags['wordpress-root'] === 'string' ? flags['wordpress-root'] : null;
	const wordpressRootRaw =
		wordpressRootFlag ||
		(typeof sa.wordpressRoot === 'string' && sa.wordpressRoot.trim()
			? sa.wordpressRoot.trim()
			: null);

	let wordfence = 'required';
	if (flags.wordfence === 'off' || flags.wordfence === 'required') {
		wordfence = flags.wordfence;
	} else if (sa.wordfence === 'off' || sa.wordfence === 'required') {
		wordfence = sa.wordfence;
	}
	if (flags['skip-wordfence']) {
		wordfence = 'off';
	}

	const semgrepExtraConfigs = Array.isArray(sa.semgrepExtraConfigs)
		? sa.semgrepExtraConfigs.filter((c) => typeof c === 'string')
		: [];

	return {
		wordpressRoot: wordpressRootRaw,
		wordfence,
		semgrepExtraConfigs,
	};
}

/**
 * @param {string} consumerRoot
 * @param {string | null} wordpressRoot
 * @returns {string | null}
 */
function resolveWordpressRoot(consumerRoot, wordpressRoot) {
	if (!wordpressRoot) {
		return null;
	}
	const abs = path.isAbsolute(wordpressRoot)
		? wordpressRoot
		: path.resolve(consumerRoot, wordpressRoot);
	return abs;
}

/**
 * @param {string} consumerRoot
 * @returns {ProbeResult}
 */
function runSurfaceCensus(consumerRoot) {
	const phpFiles = listPhpFiles(consumerRoot);
	const { entrypoints, findings } = scanPhpSecurity(consumerRoot, phpFiles);
	/** @type {ProbeFinding[]} */
	const mapped = findings.map((f) => ({
		severity: f.severity === 'error' ? 'ERROR' : 'WARNING',
		id: f.id,
		message: f.message,
		file: f.file,
		line: f.line,
		probe: 'surfaces',
	}));
	return {
		id: 'surfaces',
		status: 'ran',
		detail: `${phpFiles.length} PHP files; ${entrypoints.length} entrypoints`,
		findings: mapped,
		meta: {
			phpFileCount: phpFiles.length,
			entrypointCount: entrypoints.length,
			entrypoints: entrypoints.slice(0, 100),
		},
	};
}

/**
 * @param {string} consumerRoot
 * @param {string[]} extraConfigs
 * @returns {ProbeResult}
 */
function runSemgrep(consumerRoot, extraConfigs) {
	const bin = findOnPath('semgrep');
	if (!bin) {
		return {
			id: 'semgrep',
			status: 'missing',
			detail:
				'semgrep not on PATH — install: pipx install semgrep  (or brew install semgrep)',
			findings: [],
		};
	}

	const rulesDir = path.join(
		skillsyncToolsRoot(),
		'semgrep-rules',
		'wordpress-plugin',
	);
	/** @type {string[]} */
	const configs = [];
	if (fs.existsSync(rulesDir)) {
		configs.push(rulesDir);
	}
	// Optional community PHP pack when network/login allows; still works offline with local rules.
	configs.push('p/php');
	for (const c of extraConfigs) {
		configs.push(c);
	}

	const configArgs = configs.map((c) => `--config=${c}`).join(' ');
	const cmd = `${bin} scan ${configArgs} --json --metrics=off --quiet --error --timeout=120 "${consumerRoot}"`;
	const result = runCommand(consumerRoot, cmd);

	/** @type {ProbeFinding[]} */
	const findings = [];
	let parsed = null;
	try {
		parsed = JSON.parse(result.stdout || '{}');
	} catch {
		return {
			id: 'semgrep',
			status: 'failed',
			detail: `semgrep JSON parse failed (exit ${result.status}): ${(result.stderr || result.stdout).slice(0, 300)}`,
			findings: [],
		};
	}

	const results = Array.isArray(parsed.results) ? parsed.results : [];
	for (const item of results) {
		const sevRaw = String(item.extra?.severity || item.severity || 'WARNING').toUpperCase();
		const severity =
			sevRaw === 'ERROR' || sevRaw === 'CRITICAL' || sevRaw === 'HIGH'
				? 'ERROR'
				: sevRaw === 'INFO'
					? 'INFO'
					: 'WARNING';
		const checkId = item.check_id || item.extra?.fingerprint || 'semgrep';
		findings.push({
			severity,
			id: `semgrep:${checkId}`,
			message: String(item.extra?.message || item.message || checkId),
			file: item.path
				? path.relative(consumerRoot, item.path) || item.path
				: undefined,
			line: item.start?.line,
			probe: 'semgrep',
		});
	}

	if (result.status !== 0 && findings.length === 0) {
		// Non-zero with no findings often means config/network (p/php) failure — retry local-only.
		if (fs.existsSync(rulesDir)) {
			const localCmd = `${bin} scan --config=${rulesDir} --json --metrics=off --quiet --error --timeout=120 "${consumerRoot}"`;
			const local = runCommand(consumerRoot, localCmd);
			try {
				const localParsed = JSON.parse(local.stdout || '{}');
				const localResults = Array.isArray(localParsed.results)
					? localParsed.results
					: [];
				for (const item of localResults) {
					const sevRaw = String(
						item.extra?.severity || item.severity || 'WARNING',
					).toUpperCase();
					const severity =
						sevRaw === 'ERROR' || sevRaw === 'CRITICAL' || sevRaw === 'HIGH'
							? 'ERROR'
							: 'WARNING';
					findings.push({
						severity,
						id: `semgrep:${item.check_id || 'local'}`,
						message: String(item.extra?.message || item.check_id || 'finding'),
						file: item.path
							? path.relative(consumerRoot, item.path) || item.path
							: undefined,
						line: item.start?.line,
						probe: 'semgrep',
					});
				}
				return {
					id: 'semgrep',
					status: 'ran',
					detail: `local skillsync rules only (${findings.length} findings); p/php unavailable`,
					findings,
					meta: { configs: [rulesDir], exit: local.status },
				};
			} catch {
				return {
					id: 'semgrep',
					status: 'failed',
					detail: `semgrep failed (exit ${result.status}): ${(result.stderr || '').slice(0, 300)}`,
					findings: [],
				};
			}
		}
		return {
			id: 'semgrep',
			status: 'failed',
			detail: `semgrep failed (exit ${result.status}): ${(result.stderr || '').slice(0, 300)}`,
			findings: [],
		};
	}

	return {
		id: 'semgrep',
		status: 'ran',
		detail: `${findings.length} findings (${configs.join(', ')})`,
		findings,
		meta: { configs, exit: result.status },
	};
}

/**
 * @param {string} consumerRoot
 * @returns {ProbeResult}
 */
function runDeps(consumerRoot) {
	const findingsRaw = runDependencyAudits(consumerRoot);
	/** @type {ProbeFinding[]} */
	const findings = findingsRaw.map((f) => ({
		severity: f.severity === 'error' ? 'ERROR' : 'WARNING',
		id: f.id,
		message: f.message,
		file: f.file,
		line: f.line,
		probe: 'deps',
	}));

	const hasLock =
		fs.existsSync(path.join(consumerRoot, 'composer.lock')) ||
		fs.existsSync(path.join(consumerRoot, 'package-lock.json')) ||
		fs.existsSync(path.join(consumerRoot, 'yarn.lock')) ||
		fs.existsSync(path.join(consumerRoot, 'pnpm-lock.yaml'));

	return {
		id: 'deps',
		status: 'ran',
		detail: hasLock
			? `${findings.length} advisory signals`
			: 'no lockfiles — nothing to audit',
		findings,
		meta: { hasLock },
	};
}

/**
 * @param {string} consumerRoot
 * @param {{ wordfence: 'required' | 'off'; wordpressRoot: string | null }} opts
 * @returns {ProbeResult}
 */
function runWordfence(consumerRoot, opts) {
	if (opts.wordfence === 'off') {
		return {
			id: 'wordfence',
			status: 'skipped',
			detail: 'wordfence=off in config/flags',
			findings: [],
		};
	}

	const wpRoot = resolveWordpressRoot(consumerRoot, opts.wordpressRoot);
	if (!wpRoot) {
		return {
			id: 'wordfence',
			status: 'blocked',
			detail:
				'set securityAssess.wordpressRoot in skillsync.config.json (or --wordpress-root) to a WordPress install path — required for complete WP health',
			findings: [],
		};
	}

	if (!fs.existsSync(wpRoot)) {
		return {
			id: 'wordfence',
			status: 'failed',
			detail: `wordpressRoot does not exist: ${wpRoot}`,
			findings: [
				{
					severity: 'ERROR',
					id: 'wordfence-root-missing',
					message: `wordpressRoot missing: ${wpRoot}`,
					probe: 'wordfence',
				},
			],
		};
	}

	const bin = findOnPath('wordfence');
	if (!bin) {
		return {
			id: 'wordfence',
			status: 'missing',
			detail:
				'wordfence not on PATH — install: pip install wordfence  (license may be required for signatures)',
			findings: [
				{
					severity: 'ERROR',
					id: 'wordfence-missing',
					message:
						'Wordfence CLI required for complete WP health but not installed',
					probe: 'wordfence',
				},
			],
		};
	}

	const cmd = `${bin} vuln-scan --output-format json "${wpRoot}" 2>/dev/null || ${bin} vuln-scan "${wpRoot}"`;
	const result = runCommand(consumerRoot, cmd);

	/** @type {ProbeFinding[]} */
	const findings = [];
	let vulnCount = 0;

	try {
		const parsed = JSON.parse(result.stdout || 'null');
		const list = Array.isArray(parsed)
			? parsed
			: Array.isArray(parsed?.vulnerabilities)
				? parsed.vulnerabilities
				: Array.isArray(parsed?.results)
					? parsed.results
					: null;
		if (list) {
			vulnCount = list.length;
			for (const item of list.slice(0, 50)) {
				const title =
					item.title ||
					item.vulnerability ||
					item.slug ||
					item.id ||
					JSON.stringify(item).slice(0, 120);
				findings.push({
					severity: 'ERROR',
					id: `wordfence:${item.slug || item.id || 'vuln'}`,
					message: String(title),
					probe: 'wordfence',
				});
			}
		}
	} catch {
		// Text output — treat non-zero as findings signal
		if (result.status !== 0) {
			const snippet = (result.stdout || result.stderr || '').slice(0, 400);
			findings.push({
				severity: 'WARNING',
				id: 'wordfence-vuln-scan',
				message: `wordfence vuln-scan exit ${result.status}: ${snippet || 'see CLI output'}`,
				probe: 'wordfence',
			});
		}
	}

	if (result.status !== 0 && findings.length === 0) {
		return {
			id: 'wordfence',
			status: 'failed',
			detail: `wordfence vuln-scan exit ${result.status}: ${(result.stderr || result.stdout).slice(0, 300)}`,
			findings: [
				{
					severity: 'ERROR',
					id: 'wordfence-failed',
					message: 'wordfence vuln-scan failed',
					probe: 'wordfence',
				},
			],
			meta: { wordpressRoot: wpRoot, exit: result.status },
		};
	}

	return {
		id: 'wordfence',
		status: 'ran',
		detail: `vuln-scan on ${wpRoot} — ${vulnCount || findings.length} signals`,
		findings,
		meta: { wordpressRoot: wpRoot, exit: result.status, vulnCount },
	};
}

/**
 * @param {ProbeResult[]} probes
 * @param {{ wordfence: 'required' | 'off' }} opts
 * @returns {{ completeness: 'complete' | 'incomplete'; reasons: string[] }}
 */
function computeCompleteness(probes, opts) {
	/** @type {string[]} */
	const reasons = [];
	const byId = Object.fromEntries(probes.map((p) => [p.id, p]));

	const semgrep = byId.semgrep;
	if (!semgrep || semgrep.status !== 'ran') {
		reasons.push(`semgrep: ${semgrep?.status ?? 'missing'} — ${semgrep?.detail ?? ''}`);
	}

	const deps = byId.deps;
	if (!deps || deps.status !== 'ran') {
		reasons.push(`deps: ${deps?.status ?? 'missing'}`);
	}

	if (opts.wordfence === 'required') {
		const wf = byId.wordfence;
		if (!wf || wf.status !== 'ran') {
			reasons.push(
				`wordfence: ${wf?.status ?? 'missing'} — ${wf?.detail ?? 'required for complete WP health'}`,
			);
		}
	}

	return {
		completeness: reasons.length === 0 ? 'complete' : 'incomplete',
		reasons,
	};
}

/**
 * @param {object} report
 * @returns {string}
 */
function formatAssessSection(report) {
	const { completeness, reasons, ranAt, probes, errors, warnings } = report;
	/** @type {string[]} */
	const lines = [];
	lines.push(`**Completeness:** ${completeness}`);
	lines.push(`**Ran at:** ${ranAt}`);
	lines.push(`**ERROR findings:** ${errors.length}`);
	lines.push(`**WARNING findings:** ${warnings.length}`);
	lines.push('');
	lines.push('### Probes');
	lines.push('');
	for (const p of probes) {
		lines.push(`- **${p.id}:** ${p.status} — ${p.detail}`);
	}
	if (reasons.length > 0) {
		lines.push('');
		lines.push('### Incomplete because');
		lines.push('');
		for (const r of reasons) {
			lines.push(`- ${r}`);
		}
	}
	if (errors.length > 0) {
		lines.push('');
		lines.push('### ERROR findings');
		lines.push('');
		for (const e of errors.slice(0, 60)) {
			const loc = e.file ? `${e.file}${e.line ? `:${e.line}` : ''}` : '';
			lines.push(`- **${e.id}**${loc ? ` (\`${loc}\`)` : ''}: ${e.message}`);
		}
	}
	if (warnings.length > 0) {
		lines.push('');
		lines.push('### WARNING findings');
		lines.push('');
		for (const w of warnings.slice(0, 40)) {
			const loc = w.file ? `${w.file}${w.line ? `:${w.line}` : ''}` : '';
			lines.push(`- **${w.id}**${loc ? ` (\`${loc}\`)` : ''}: ${w.message}`);
		}
	}
	lines.push('');
	lines.push('### Next');
	lines.push('');
	lines.push(
		'Fold into `.harness/security-posture.html` (`#assess`) via `/ss-security-plan`. Does **not** replace `/ss-security-audit`.',
	);
	return lines.join('\n');
}

/**
 * @param {string} consumerRoot
 * @param {object} opts
 */
function runAssess(consumerRoot, opts) {
	const config = readOptionalConfig(consumerRoot);
	const assessCfg = resolveAssessConfig(config, opts.flags || {});
	const wordpressRoot = assessCfg.wordpressRoot;

	/** @type {ProbeResult[]} */
	const probes = [];

	probes.push(runSurfaceCensus(consumerRoot));

	if (opts.skipSemgrep) {
		probes.push({
			id: 'semgrep',
			status: 'skipped',
			detail: '--skip-semgrep',
			findings: [],
		});
	} else {
		probes.push(runSemgrep(consumerRoot, assessCfg.semgrepExtraConfigs));
	}

	if (opts.skipDeps) {
		probes.push({
			id: 'deps',
			status: 'skipped',
			detail: '--skip-deps',
			findings: [],
		});
	} else {
		probes.push(runDeps(consumerRoot));
	}

	probes.push(
		runWordfence(consumerRoot, {
			wordfence: assessCfg.wordfence,
			wordpressRoot,
		}),
	);

	const { completeness, reasons } = computeCompleteness(probes, {
		wordfence: assessCfg.wordfence,
	});

	/** @type {ProbeFinding[]} */
	const allFindings = probes.flatMap((p) => p.findings);
	const errors = allFindings.filter((f) => f.severity === 'ERROR');
	const warnings = allFindings.filter((f) => f.severity === 'WARNING');
	const ranAt = new Date().toISOString();

	const report = {
		kind: 'security-assess',
		completeness,
		reasons,
		ranAt,
		wordpressRoot: resolveWordpressRoot(consumerRoot, wordpressRoot),
		wordfenceMode: assessCfg.wordfence,
		probes,
		errors,
		warnings,
		info: allFindings.filter((f) => f.severity === 'INFO'),
	};

	const outJson = path.join(harnessDir(consumerRoot), 'security-assess.json');
	fs.mkdirSync(harnessDir(consumerRoot), { recursive: true });
	fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

	if (opts.writeState) {
		const section = formatAssessSection(report);
		const prev = readState(consumerRoot) ?? '';
		const next = upsertMarkdownSection(prev, 'Security Assess', section);
		writeState(consumerRoot, next);
		console.log('Wrote ## Security Assess to .harness/state.md');
	}

	if (opts.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(`security-assess: completeness=${completeness}`);
		console.log(`  Wrote ${outJson}`);
		for (const p of probes) {
			console.log(`  [${p.id}] ${p.status} — ${p.detail}`);
		}
		console.log(`  ERROR: ${errors.length}  WARNING: ${warnings.length}`);
		if (reasons.length > 0) {
			console.log('  Incomplete:');
			for (const r of reasons) {
				console.log(`    - ${r}`);
			}
		}
		for (const e of errors.slice(0, 20)) {
			const loc = e.file ? `${e.file}${e.line ? `:${e.line}` : ''}` : '';
			console.error(`  ERROR [${e.id}] ${loc} ${e.message}`);
		}
		console.log(
			'Next: fold into /ss-security-plan HTML #assess (not a PR gate).',
		);
	}

	if (opts.strict) {
		if (completeness !== 'complete' || errors.length > 0) {
			process.exit(1);
		}
	}
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);

	if (flags.help || flags.h) {
		console.log(`Usage: security-assess.cjs [consumerRoot] [--write-state] [--json] [--strict]
  [--wordpress-root PATH] [--wordfence required|off]
  [--skip-semgrep] [--skip-deps] [--skip-wordfence]`);
		process.exit(0);
	}

	runAssess(consumerRoot, {
		writeState: Boolean(flags['write-state']),
		json: Boolean(flags.json),
		strict: Boolean(flags.strict),
		skipSemgrep: Boolean(flags['skip-semgrep']),
		skipDeps: Boolean(flags['skip-deps']),
		flags,
	});
}

if (require.main === module) {
	main();
}

module.exports = {
	runAssess,
	computeCompleteness,
	formatAssessSection,
	resolveAssessConfig,
	findOnPath,
};
