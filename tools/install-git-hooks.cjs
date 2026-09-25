#!/usr/bin/env node
/**
 * Install a shared post-checkout hook so new git worktrees self-heal /ss-* symlinks.
 *
 * Hooks live in the common git dir (`git rev-parse --git-common-dir`) so every
 * worktree of the repo shares them — including Paseo branch-off workspaces.
 *
 * Usage:
 *   node path/to/skillsync/tools/install-git-hooks.cjs [/path/to/consumer-repo]
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { resolveConsumerRoot } = require('./lib/ss-tools.cjs');

const HOOK_NAME = 'post-checkout';
const HOOK_BODY = `#!/bin/sh
# skillsync — refresh /ss-* slash commands after checkout or worktree add
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$ROOT" || exit 0

if [ -f ".cursor/vendor/skillsync/tools/ensure-skillsync.cjs" ]; then
  node ".cursor/vendor/skillsync/tools/ensure-skillsync.cjs" . --quiet >/dev/null 2>&1 || true
elif [ -f "scripts/ensure-skillsync.cjs" ]; then
  node "scripts/ensure-skillsync.cjs" --quiet >/dev/null 2>&1 || true
fi

exit 0
`;

/**
 * @param {string} consumerRoot
 * @returns {string | null}
 */
function gitCommonDir(consumerRoot) {
	try {
		const out = execFileSync('git', ['rev-parse', '--git-common-dir'], {
			cwd: consumerRoot,
			encoding: 'utf8',
		}).trim();
		if (!out) {
			return null;
		}
		return path.isAbsolute(out) ? out : path.join(consumerRoot, out);
	} catch {
		return null;
	}
}

function main() {
	const consumerRoot = resolveConsumerRoot(process.argv[2]);
	const commonDir = gitCommonDir(consumerRoot);

	if (!commonDir) {
		console.error('install-git-hooks: not a git checkout — skipped.');
		process.exit(1);
	}

	const hooksDir = path.join(commonDir, 'hooks');
	const hookPath = path.join(hooksDir, HOOK_NAME);

	fs.mkdirSync(hooksDir, { recursive: true });

	if (fs.existsSync(hookPath)) {
		const existing = fs.readFileSync(hookPath, 'utf8');
		if (existing.includes('ensure-skillsync.cjs')) {
			console.log(`install-git-hooks: ${HOOK_NAME} already installs skillsync — OK`);
			return;
		}

		const backup = `${hookPath}.bak-skillsync`;
		fs.copyFileSync(hookPath, backup);
		console.log(`install-git-hooks: backed up existing hook → ${backup}`);
	}

	fs.writeFileSync(hookPath, HOOK_BODY, { mode: 0o755 });
	console.log(`install-git-hooks: installed ${hookPath}`);
	console.log('New worktrees (including Paseo) will run ensure-skillsync on checkout.');
}

main();
