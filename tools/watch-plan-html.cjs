#!/usr/bin/env node
/**
 * Watch living-plan Markdown and re-render derived HTML (debounced).
 *
 * Usage:
 *   node path/to/skillsync/tools/watch-plan-html.cjs [/path/to/consumer-repo] \
 *     [--debounce 300] [--no-validate] [--once]
 *
 * Watches plan Markdown under .harness (architecture-plan, ux-plan, security-posture,
 * code-handoff, wayfinder map.md). Does not touch app-map (use render-app-map.cjs).
 *
 * Optional beside yarn dev — not required for Story work:
 *   "ss:watch-plans": "node ./.cursor/vendor/skillsync/tools/watch-plan-html.cjs ."
 *
 * Agents still call render-plan-html.cjs after edits; this is a safety net for IDE edits.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
	parseArgs,
	resolveConsumerRoot,
	harnessDir,
} = require('./lib/ss-tools.cjs');
const { PLAN_MD_FILES } = require('./lib/plan-md.cjs');

/** @type {Record<string, string>} */
const BASENAME_TO_KIND = Object.fromEntries(
	Object.entries(PLAN_MD_FILES).map(([kind, file]) => [file, kind]),
);

/**
 * Map an absolute or relative MD path under the consumer to { kind, slug? }.
 *
 * @param {string} consumerRoot
 * @param {string} mdPath
 * @returns {{ kind: string; slug?: string; rel: string } | null}
 */
function classifyPlanMdPath(consumerRoot, mdPath) {
	const abs = path.resolve(mdPath);
	const root = path.resolve(consumerRoot);
	const rel = path.relative(root, abs).replace(/\\/g, '/');
	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		return null;
	}
	if (!rel.includes('.harness/')) {
		return null;
	}

	const base = path.basename(abs);
	const kind = BASENAME_TO_KIND[base];
	if (!kind) {
		return null;
	}

	if (kind === 'wayfinder') {
		const m = rel.match(/(?:^|\/)\.harness\/wayfinder\/([^/]+)\/map\.md$/);
		if (!m) {
			return null;
		}
		return { kind, slug: m[1], rel };
	}

	if (kind === 'handoff') {
		// Scratch handoff lives at harness root only.
		if (rel !== `.harness/${base}`) {
			return null;
		}
		return { kind, rel };
	}

	const init = rel.match(/\.harness\/initiatives\/([^/]+)\/[^/]+$/);
	if (init) {
		return { kind, slug: init[1], rel };
	}

	if (rel === `.harness/${base}`) {
		return { kind, rel };
	}

	return null;
}

/**
 * @param {string} dir
 * @param {(file: string) => void} onFile
 */
function walkMdFiles(dir, onFile) {
	if (!fs.existsSync(dir)) {
		return;
	}
	/** @type {string[]} */
	const stack = [dir];
	while (stack.length) {
		const cur = stack.pop();
		if (!cur) continue;
		let entries;
		try {
			entries = fs.readdirSync(cur, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const ent of entries) {
			if (ent.name.startsWith('.')) continue;
			const full = path.join(cur, ent.name);
			if (ent.isDirectory()) {
				stack.push(full);
			} else if (ent.isFile() && BASENAME_TO_KIND[ent.name]) {
				onFile(full);
			}
		}
	}
}

/**
 * @param {string} consumerRoot
 * @param {{ kind: string; slug?: string; rel: string }} target
 * @param {boolean} validate
 */
function renderOne(consumerRoot, target, validate) {
	const args = [path.join(__dirname, 'render-plan-html.cjs'), consumerRoot, '--kind', target.kind];
	if (target.slug) {
		args.push('--slug', target.slug);
	}
	if (target.kind === 'wayfinder' && target.slug) {
		// file path is unambiguous for wayfinder
		args.push('--file', target.rel);
	} else {
		args.push('--file', target.rel);
	}
	if (validate) {
		args.push('--validate');
	}
	const started = Date.now();
	const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
	const ms = Date.now() - started;
	if (result.status !== 0) {
		const err = (result.stderr || result.stdout || '').trim();
		console.error(`[watch-plan-html] FAIL ${target.rel} (${ms}ms)${err ? `\n${err}` : ''}`);
		return false;
	}
	const out = (result.stdout || '').trim().split('\n').filter(Boolean).pop() || '';
	console.log(`[watch-plan-html] rendered ${out || target.rel} (${ms}ms)`);
	return true;
}

/**
 * @param {string} consumerRoot
 * @param {number} debounceMs
 * @param {boolean} validate
 */
function startWatch(consumerRoot, debounceMs, validate) {
	const harness = harnessDir(consumerRoot);
	if (!fs.existsSync(harness)) {
		fs.mkdirSync(harness, { recursive: true });
		console.log(`[watch-plan-html] created ${path.relative(consumerRoot, harness)}`);
	}

	/** @type {Map<string, ReturnType<typeof setTimeout>>} */
	const pending = new Map();
	/** @type {Set<string>} */
	const rendering = new Set();

	/**
	 * @param {string} absMd
	 */
	const schedule = (absMd) => {
		const target = classifyPlanMdPath(consumerRoot, absMd);
		if (!target) return;
		const key = target.rel;
		const prev = pending.get(key);
		if (prev) clearTimeout(prev);
		pending.set(
			key,
			setTimeout(() => {
				pending.delete(key);
				if (rendering.has(key)) {
					schedule(absMd);
					return;
				}
				rendering.add(key);
				try {
					if (!fs.existsSync(absMd)) {
						console.log(`[watch-plan-html] skip (deleted) ${key}`);
						return;
					}
					renderOne(consumerRoot, target, validate);
				} finally {
					rendering.delete(key);
				}
			}, debounceMs),
		);
	};

	// Initial pass: ensure existing MD has HTML (idempotent).
	walkMdFiles(harness, (file) => schedule(file));

	const onFsEvent = (/** @type {string | null} */ filename) => {
		if (!filename) {
			// Some platforms omit filename — rescan known files.
			walkMdFiles(harness, (file) => schedule(file));
			return;
		}
		const abs = path.isAbsolute(filename) ? filename : path.join(harness, filename);
		if (!BASENAME_TO_KIND[path.basename(abs)]) return;
		if (!abs.endsWith('.md')) return;
		schedule(abs);
	};

	try {
		fs.watch(harness, { recursive: true }, (_event, filename) => {
			onFsEvent(filename);
		});
		console.log(
			`[watch-plan-html] watching ${path.relative(consumerRoot, harness)} (debounce ${debounceMs}ms${validate ? ', validate' : ''})`,
		);
	} catch (err) {
		const e = /** @type {NodeJS.ErrnoException} */ (err);
		console.error(
			`[watch-plan-html] recursive watch failed (${e.message}); falling back to 2s poll`,
		);
		/** @type {Map<string, number>} */
		const mtimes = new Map();
		const poll = () => {
			walkMdFiles(harness, (file) => {
				try {
					const st = fs.statSync(file);
					const prev = mtimes.get(file);
					if (prev === undefined) {
						mtimes.set(file, st.mtimeMs);
						return;
					}
					if (st.mtimeMs !== prev) {
						mtimes.set(file, st.mtimeMs);
						schedule(file);
					}
				} catch {
					mtimes.delete(file);
				}
			});
		};
		setInterval(poll, 2000);
		console.log(
			`[watch-plan-html] polling ${path.relative(consumerRoot, harness)} every 2s (debounce ${debounceMs}ms)`,
		);
	}
}

function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const consumerRoot = resolveConsumerRoot(positional[0]);
	const debounceMs = Math.max(
		50,
		Number.parseInt(String(flags.debounce ?? '300'), 10) || 300,
	);
	const validate = !flags['no-validate'];
	const once = Boolean(flags.once);

	if (once) {
		const harness = harnessDir(consumerRoot);
		/** @type {string[]} */
		const files = [];
		walkMdFiles(harness, (f) => files.push(f));
		let ok = true;
		for (const file of files) {
			const target = classifyPlanMdPath(consumerRoot, file);
			if (!target) continue;
			if (!renderOne(consumerRoot, target, validate)) ok = false;
		}
		if (files.length === 0) {
			console.log('[watch-plan-html] --once: no plan Markdown under .harness');
		}
		process.exit(ok ? 0 : 1);
	}

	startWatch(consumerRoot, debounceMs, validate);
	// Keep process alive
}

module.exports = {
	classifyPlanMdPath,
	BASENAME_TO_KIND,
	walkMdFiles,
};

if (require.main === module) {
	main();
}
