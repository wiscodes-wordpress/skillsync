/**
 * Resolve a skill folder name under skillsync's skills tree.
 *
 * Layout (Matt Pocock-style categories):
 *   skills/engineering/<name>/   — code work, WordPress pack, workflow
 *   skills/productivity/<name>/
 *   skills/personal/<name>/
 *   skills/misc/<name>/
 *
 * Legacy: skills/<name>/ at top level is still resolved if present.
 *
 * Consumers still link by skill name only (e.g. "tdd" → skills/engineering/tdd).
 */

const fs = require('node:fs');
const path = require('node:path');

/** @type {readonly string[]} */
const SKILL_CATEGORIES = [
	'engineering',
	'productivity',
	'personal',
	'misc',
];

/**
 * @param {string} skillsRoot Absolute path to `<vendor>/skills`
 * @param {string} name Skill folder name (e.g. "tdd")
 * @returns {string | null} Absolute path to the skill folder, or null if not found
 */
function resolveSkillDir(skillsRoot, name) {
	const flat = path.join(skillsRoot, name);
	if (fs.existsSync(path.join(flat, 'SKILL.md'))) {
		return flat;
	}

	for (const category of SKILL_CATEGORIES) {
		const nested = path.join(skillsRoot, category, name);
		if (fs.existsSync(path.join(nested, 'SKILL.md'))) {
			return nested;
		}
	}

	return null;
}

module.exports = { SKILL_CATEGORIES, resolveSkillDir };
