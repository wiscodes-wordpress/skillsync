/**
 * Review handoff human evidence — parse card + state waiver for /ss-review-handoff gate.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	harnessDir,
	readState,
	parseMarkdownSections,
	readOptionalConfig,
} = require('./ss-tools.cjs');

const CARD_BASENAME = 'review-handoff-evidence.md';
const STATE_SECTION = 'Review handoff evidence';

/**
 * @param {string} consumerRoot
 * @returns {boolean}
 */
function isReviewHandoffRequired(consumerRoot) {
	const config = readOptionalConfig(consumerRoot);
	return config?.reviewHandoffHumanEvidence === 'required';
}

/**
 * @param {string} consumerRoot
 * @returns {string}
 */
function cardPath(consumerRoot) {
	return path.join(harnessDir(consumerRoot), CARD_BASENAME);
}

/**
 * @param {string} markdown
 * @returns {boolean}
 */
function hasAcceptedVerdict(markdown) {
	const acceptRe =
		/^-\s*\[[xX]\]\s*Accept\s*[—–-]\s*continue to\s*`?\/ss-security-audit`?/im;
	return acceptRe.test(markdown);
}

/**
 * @param {string} state
 * @returns {boolean}
 */
function hasWaivedInState(state) {
	if (!state) return false;
	const sections = parseMarkdownSections(state, 2);
	const block = sections.get(STATE_SECTION);
	if (!block) return false;
	return /\*\*Human:\*\*\s*waived/i.test(block);
}

/**
 * @param {string} consumerRoot
 * @returns {{ ok: boolean; reason: string }}
 */
function evaluateReviewHandoff(consumerRoot) {
	if (!isReviewHandoffRequired(consumerRoot)) {
		return { ok: true, reason: 'not required for this consumer' };
	}

	const state = readState(consumerRoot);
	if (hasWaivedInState(state ?? '')) {
		return { ok: true, reason: 'waived in state' };
	}

	const cardFile = cardPath(consumerRoot);
	if (!fs.existsSync(cardFile)) {
		return {
			ok: false,
			reason: `missing ${path.join('.harness', CARD_BASENAME)} (run /ss-review-handoff after critic PASS)`,
		};
	}

	const card = fs.readFileSync(cardFile, 'utf8');
	if (!hasAcceptedVerdict(card)) {
		return {
			ok: false,
			reason:
				'human has not ticked Accept in review-handoff-evidence.md (open card + code-handoff.html)',
		};
	}

	const handoffHtml = path.join(harnessDir(consumerRoot), 'code-handoff.html');
	if (!fs.existsSync(handoffHtml)) {
		return {
			ok: false,
			reason: 'missing .harness/code-handoff.html (complete /ss-review-handoff walkthrough)',
		};
	}

	return { ok: true, reason: 'accept recorded' };
}

/**
 * @param {string} consumerRoot
 * @param {{ exitOnFail?: boolean }} [opts]
 * @returns {boolean}
 */
function assertReviewHandoffOrExit(consumerRoot, opts = {}) {
	const { ok, reason } = evaluateReviewHandoff(consumerRoot);
	if (ok) {
		return true;
	}
	const msg = `review-handoff-evidence: ${reason}`;
	if (opts.exitOnFail !== false) {
		console.error(msg);
		process.exit(1);
	}
	return false;
}

module.exports = {
	CARD_BASENAME,
	STATE_SECTION,
	isReviewHandoffRequired,
	cardPath,
	hasAcceptedVerdict,
	hasWaivedInState,
	evaluateReviewHandoff,
	assertReviewHandoffOrExit,
};
