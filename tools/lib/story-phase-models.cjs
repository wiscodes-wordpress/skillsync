/**
 * Resolve Cursor/Paseo model ids per Story phase from consumer `skillsync.config.json`.
 *
 *   "storyPhaseModels": {
 *     "provider": "cursor",
 *     "plan": "cursor-grok-4.6-high-fast",
 *     "cycle": "composer-2.5",
 *     "review": "cursor-grok-4.6-high-fast",
 *     "fix": "composer-2.5",
 *     "default": "composer-2.5"
 *   }
 *
 * Phases: plan, cycle (and cycle1, cycle2, …), review, fix, default.
 */

/**
 * @param {Record<string, unknown> | null | undefined} config
 * @param {string} [phase]
 * @returns {string | null}
 */
function resolveStoryPhaseModel(config, phase) {
	const spm = config?.storyPhaseModels;
	if (!spm || typeof spm !== 'object') {
		return null;
	}
	const key = String(phase ?? '')
		.trim()
		.replace(/^cycle\d+$/i, 'cycle');
	const record = spm;
	const picked =
		(key && typeof record[key] === 'string' ? record[key] : null) ??
		(typeof record.default === 'string' ? record.default : null);
	return typeof picked === 'string' && picked.trim() ? picked.trim() : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} config
 * @returns {string | null}
 */
function resolveStoryPhaseProvider(config) {
	const spm = config?.storyPhaseModels;
	if (!spm || typeof spm !== 'object') {
		return null;
	}
	const provider = spm.provider;
	return typeof provider === 'string' && provider.trim() ? provider.trim() : null;
}

module.exports = { resolveStoryPhaseModel, resolveStoryPhaseProvider };
