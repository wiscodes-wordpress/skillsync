/**
 * Shared DenMercs vault root for journal / dashboard tools.
 * Override with $JOURNAL_VAULT_PATH or --vault on each CLI.
 */

const path = require('node:path');
const os = require('node:os');

const RELATIVE_VAULT =
	'Library/CloudStorage/GoogleDrive-contact@wiscodes.com/My Drive/DenMercs';

const DEFAULT_VAULT =
	process.env.JOURNAL_VAULT_PATH || path.join(os.homedir(), RELATIVE_VAULT);

module.exports = { DEFAULT_VAULT, RELATIVE_VAULT };
