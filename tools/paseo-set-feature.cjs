#!/usr/bin/env node
/**
 * Set a Paseo agent feature (e.g. Cursor Auto Accept).
 *
 * Only useful when the Paseo daemon + Desktop app are installed. Soft-fails
 * with exit 0 + `{ ok: false, skipped: true }` when Paseo is missing (so
 * callers can be conditional). Hard-fails (exit 1) when Paseo is present but
 * the set fails.
 *
 * Usage:
 *   node tools/paseo-set-feature.cjs <agentId> [featureId] [true|false]
 *   node tools/paseo-set-feature.cjs --for-cwd [path] [featureId] [true|false]
 *   node tools/paseo-set-feature.cjs --json --for-cwd . auto_accept true
 *
 * `--for-cwd` enables the feature on running Cursor agents whose cwd matches
 * (used by `/ss-implement` when the session is already a Paseo agent).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

/**
 * @returns {string | null}
 */
function resolvePaseoCli() {
	const which = spawnSync('which', ['paseo'], { encoding: 'utf8' });
	if (which.status === 0 && which.stdout.trim()) {
		return which.stdout.trim();
	}
	const fallbacks = [
		path.join(os.homedir(), '.local/bin/paseo'),
		'/opt/homebrew/bin/paseo',
		'/usr/local/bin/paseo',
	];
	for (const p of fallbacks) {
		if (fs.existsSync(p)) {
			return p;
		}
	}
	return null;
}

/**
 * Follow symlinks to the bundled CLI script inside Paseo.app Resources/bin.
 * @param {string} cliPath
 * @returns {string | null}
 */
function resolveResourcesDir(cliPath) {
	let cur = cliPath;
	for (let i = 0; i < 20; i++) {
		try {
			const st = fs.lstatSync(cur);
			if (!st.isSymbolicLink()) {
				break;
			}
			const target = fs.readlinkSync(cur);
			cur = path.isAbsolute(target)
				? target
				: path.resolve(path.dirname(cur), target);
		} catch {
			return null;
		}
	}
	const binDir = path.dirname(cur);
	if (path.basename(binDir) !== 'bin') {
		return null;
	}
	const resources = path.dirname(binDir);
	if (!fs.existsSync(path.join(resources, 'app.asar'))) {
		return null;
	}
	return resources;
}

/**
 * @param {string} resourcesDir
 * @returns {{ helper: string; runner: string } | null}
 */
function resolveHelperAndRunner(resourcesDir) {
	const helper = path.join(
		resourcesDir,
		'..',
		'Frameworks',
		'Paseo Helper.app',
		'Contents',
		'MacOS',
		'Paseo Helper',
	);
	const runner = path.join(
		resourcesDir,
		'app.asar.unpacked',
		'dist',
		'daemon',
		'node-entrypoint-runner.js',
	);
	if (!fs.existsSync(helper) || !fs.existsSync(runner)) {
		return null;
	}
	return { helper, runner };
}

/**
 * Expand ~/… and normalize for comparison with Paseo agent cwd strings.
 * @param {string} raw
 * @returns {string}
 */
function normalizeCwd(raw) {
	let s = String(raw || '').trim();
	if (!s) {
		return '';
	}
	if (s.startsWith('~/')) {
		s = path.join(os.homedir(), s.slice(2));
	} else if (s === '~') {
		s = os.homedir();
	}
	try {
		return path.resolve(s);
	} catch {
		return s;
	}
}

/**
 * @param {string} agentCwd
 * @param {string} targetAbs
 * @returns {boolean}
 */
function cwdMatches(agentCwd, targetAbs) {
	const a = normalizeCwd(agentCwd);
	const b = normalizeCwd(targetAbs);
	if (!a || !b) {
		return false;
	}
	return a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
}

/**
 * @param {string} provider
 * @returns {boolean}
 */
function isCursorProvider(provider) {
	const p = String(provider || '');
	return p === 'cursor' || p.startsWith('cursor/');
}

/**
 * @param {string} cli
 * @param {string} targetCwd
 * @returns {string[]}
 */
function listMatchingRunningCursorAgents(cli, targetCwd) {
	const listed = spawnSync(cli, ['ls', '--json'], {
		encoding: 'utf8',
		env: process.env,
		timeout: 8000,
		killSignal: 'SIGKILL',
	});
	if (listed.status !== 0 || !listed.stdout.trim()) {
		return [];
	}
	let rows;
	try {
		const parsed = JSON.parse(listed.stdout);
		rows = Array.isArray(parsed) ? parsed : parsed.agents || [];
	} catch {
		return [];
	}
	const targetAbs = normalizeCwd(targetCwd);
	/** @type {string[]} */
	const ids = [];
	for (const row of rows) {
		const id = row.id ?? row.agentId;
		const status = String(row.status ?? row.lastStatus ?? '').toLowerCase();
		const provider = row.provider ?? '';
		const cwd = row.cwd ?? '';
		if (!id) {
			continue;
		}
		if (status !== 'running') {
			continue;
		}
		if (!isCursorProvider(provider)) {
			continue;
		}
		if (!cwdMatches(cwd, targetAbs)) {
			continue;
		}
		ids.push(String(id));
	}
	return ids;
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	/** @type {{ json: boolean; help: boolean; forCwd: string | null }} */
	const flags = { json: false, help: false, forCwd: null };
	const positional = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--json') {
			flags.json = true;
			continue;
		}
		if (a === '--help' || a === '-h') {
			flags.help = true;
			continue;
		}
		if (a === '--for-cwd') {
			const next = argv[i + 1];
			if (next && !next.startsWith('--')) {
				flags.forCwd = next;
				i += 1;
			} else {
				flags.forCwd = '.';
			}
			continue;
		}
		if (a.startsWith('--for-cwd=')) {
			flags.forCwd = a.slice('--for-cwd='.length) || '.';
			continue;
		}
		positional.push(a);
	}
	return { flags, positional };
}

/**
 * @param {{ helper: string; runner: string }} bundle
 * @param {string} asarRoot
 * @param {string} agentId
 * @param {string} featureId
 * @param {boolean} value
 * @returns {{ ok: boolean; agentId: string; featureId: string; value: boolean; reason?: string }}
 */
function setFeatureOnce(bundle, asarRoot, agentId, featureId, value) {
	const script = `
import path from "node:path";
const asarRoot = ${JSON.stringify(asarRoot)};
const clientUrl = "file://" + path.join(asarRoot, "node_modules/@getpaseo/cli/dist/utils/client.js");
const { connectToDaemon } = await import(clientUrl);
const agentId = process.argv[2];
const featureId = process.argv[3] || "auto_accept";
const value = process.argv[4] !== "false" && process.argv[4] !== "0";
const client = await connectToDaemon({ connectTimeoutMs: 8000 });
try {
  if (typeof client.setAgentFeature !== "function") {
    throw new Error("setAgentFeature unavailable on this Paseo version");
  }
  await client.setAgentFeature(agentId, featureId, value);
  process.stdout.write(JSON.stringify({ ok: true, agentId, featureId, value }) + "\\n");
} finally {
  if (typeof client.close === "function") await client.close();
}
`.trim();

	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paseo-set-feature-'));
	const scriptPath = path.join(tmpDir, 'set-feature.mjs');
	fs.writeFileSync(scriptPath, script, 'utf8');

	const result = spawnSync(
		bundle.helper,
		[
			'--disable-warning=DEP0040',
			bundle.runner,
			'node-script',
			scriptPath,
			agentId,
			featureId,
			value ? 'true' : 'false',
		],
		{
			encoding: 'utf8',
			timeout: 12000,
			killSignal: 'SIGKILL',
			env: {
				...process.env,
				ELECTRON_RUN_AS_NODE: '1',
				PASEO_NODE_ENV: 'production',
			},
		},
	);

	try {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	} catch {
		// ignore
	}

	const stdout = (result.stdout || '').trim();
	const stderr = (result.stderr || '').trim();
	if (result.error && result.error.code === 'ETIMEDOUT') {
		return {
			ok: false,
			skipped: true,
			agentId,
			featureId,
			value,
			reason: 'timed out talking to Paseo daemon',
		};
	}
	if (result.status === 0 && stdout) {
		try {
			const parsed = JSON.parse(stdout.split('\n').filter(Boolean).pop());
			if (parsed.ok) {
				return parsed;
			}
		} catch {
			// fall through
		}
	}
	const reason = stderr || stdout || `helper exit ${result.status}`;
	const soft =
		/Agent not found/i.test(reason) ||
		/timed out/i.test(reason) ||
		/ECONNREFUSED/i.test(reason) ||
		/Cannot connect/i.test(reason);
	return {
		ok: false,
		skipped: soft,
		agentId,
		featureId,
		value,
		reason,
	};
}

function main() {
	const { flags, positional } = parseArgs(process.argv.slice(2));
	if (flags.help) {
		console.log(`Usage:
  node paseo-set-feature.cjs [--json] <agentId> [featureId=auto_accept] [true|false]
  node paseo-set-feature.cjs [--json] --for-cwd [path] [featureId=auto_accept] [true|false]

--for-cwd matches running Cursor agents under that directory (Paseo only).`);
		process.exit(0);
	}

	const featureId =
		(flags.forCwd !== null ? positional[0] : positional[1]) || 'auto_accept';
	const valueRaw =
		(flags.forCwd !== null ? positional[1] : positional[2]) ?? 'true';
	const value = !(valueRaw === 'false' || valueRaw === '0');
	/** --for-cwd is best-effort for /ss-implement — never fail the session. */
	const softMode = flags.forCwd !== null;

	const emit = (obj, code) => {
		const exitCode = softMode ? 0 : code;
		if (flags.json) {
			console.log(JSON.stringify({ ...obj, soft: softMode || undefined }));
		} else if (obj.ok) {
			if (obj.agentIds) {
				console.log(
					`paseo-set-feature: ${obj.agentIds.join(', ')} ${obj.featureId}=${obj.value}`,
				);
			} else {
				console.log(
					`paseo-set-feature: ${obj.agentId} ${obj.featureId}=${obj.value}`,
				);
			}
		} else if (obj.skipped || softMode) {
			console.log(
				`paseo-set-feature: skipped (${obj.reason || 'unavailable'})`,
			);
		} else {
			console.log(JSON.stringify(obj));
		}
		process.exit(exitCode);
	};

	const cli = resolvePaseoCli();
	if (!cli) {
		emit(
			{
				ok: false,
				skipped: true,
				reason: 'paseo CLI not found — Auto Accept only applies when using Paseo',
			},
			0,
		);
		return;
	}

	const resources = resolveResourcesDir(cli);
	if (!resources) {
		emit(
			{
				ok: false,
				skipped: true,
				reason: 'could not resolve Paseo.app Resources from paseo CLI',
			},
			0,
		);
		return;
	}

	const bundle = resolveHelperAndRunner(resources);
	if (!bundle) {
		emit(
			{
				ok: false,
				skipped: true,
				reason: 'Paseo Helper / node-entrypoint-runner not found',
			},
			0,
		);
		return;
	}

	const asarRoot = path.join(resources, 'app.asar');

	/** @type {string[]} */
	let agentIds = [];
	if (flags.forCwd !== null) {
		const target = path.resolve(flags.forCwd || '.');
		agentIds = listMatchingRunningCursorAgents(cli, target);
		if (agentIds.length === 0) {
			emit(
				{
					ok: false,
					skipped: true,
					reason: `no running Cursor Paseo agents for cwd ${target}`,
					cwd: target,
				},
				0,
			);
			return;
		}
	} else {
		const agentId = positional[0];
		if (!agentId || agentId.startsWith('--')) {
			emit(
				{
					ok: false,
					skipped: true,
					reason: 'missing agentId (or use --for-cwd)',
				},
				2,
			);
			return;
		}
		agentIds = [agentId];
	}

	/** @type {object[]} */
	const results = [];
	let anyOk = false;
	let anyHardFail = false;
	for (const id of agentIds) {
		const r = setFeatureOnce(bundle, asarRoot, id, featureId, value);
		results.push(r);
		if (r.ok) {
			anyOk = true;
		} else {
			anyHardFail = true;
		}
	}

	if (agentIds.length === 1) {
		const r = results[0];
		const code = r.ok || r.skipped || softMode ? 0 : 1;
		emit(r, code);
		return;
	}

	emit(
		{
			ok: anyOk,
			skipped: !anyOk && softMode,
			featureId,
			value,
			agentIds: results.filter((r) => r.ok).map((r) => r.agentId),
			results,
			reason: anyOk
				? undefined
				: results.map((r) => r.reason).filter(Boolean).join('; '),
		},
		anyOk || softMode ? 0 : anyHardFail ? 1 : 0,
	);
}

main();
