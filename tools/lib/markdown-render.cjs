/**
 * Minimal GFM-ish Markdown → HTML for Journal notes (zero deps).
 * Handles frontmatter, headings, tables, lists, fences, hr, blockquotes, inline.
 */

/**
 * @param {string} s
 */
function esc(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * @param {string} text
 */
function inline(text) {
	let s = esc(text);
	// code first
	s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
	// links [text](url)
	s = s.replace(
		/\[([^\]]+)\]\(([^)\s]+)\)/g,
		(_, label, href) =>
			`<a href="${esc(href)}">${label}</a>`,
	);
	// bold / italic
	s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
	s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
	return s;
}

/**
 * Strip YAML frontmatter; return { meta, body }.
 * @param {string} md
 */
function splitFrontmatter(md) {
	const text = md.replace(/^\uFEFF/, '');
	if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
		return { meta: null, body: text };
	}
	const end = text.indexOf('\n---', 3);
	if (end === -1) return { meta: null, body: text };
	const raw = text.slice(4, end).trim();
	let body = text.slice(end + 4).replace(/^\r?\n/, '');
	return { meta: raw || null, body };
}

/**
 * @param {string} line
 */
function isTableSep(line) {
	return /^\s*\|?[\s:|-]+\|[\s:|-]*\|?\s*$/.test(line) && /\|/.test(line) && /--/.test(line);
}

/**
 * @param {string} line
 */
function splitRow(line) {
	let s = line.trim();
	if (s.startsWith('|')) s = s.slice(1);
	if (s.endsWith('|')) s = s.slice(0, -1);
	return s.split('|').map((c) => c.trim());
}

/**
 * @param {string} md
 * @returns {string}
 */
function mdToHtml(md) {
	const { meta, body } = splitFrontmatter(md);
	const lines = body.replace(/\r\n/g, '\n').split('\n');
	const out = [];
	if (meta) {
		out.push(
			`<details class="md-frontmatter"><summary>Note metadata</summary><pre>${esc(meta)}</pre></details>`,
		);
	}

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];

		if (/^\s*$/.test(line)) {
			i++;
			continue;
		}

		// fenced code
		const fence = line.match(/^```(\w*)\s*$/);
		if (fence) {
			const lang = fence[1];
			i++;
			const code = [];
			while (i < lines.length && !/^```\s*$/.test(lines[i])) {
				code.push(lines[i]);
				i++;
			}
			i++; // closing ```
			out.push(
				`<pre class="md-code"${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(code.join('\n'))}</code></pre>`,
			);
			continue;
		}

		// hr
		if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
			out.push('<hr />');
			i++;
			continue;
		}

		// headings
		const h = line.match(/^(#{1,6})\s+(.+)$/);
		if (h) {
			const level = h[1].length;
			out.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
			i++;
			continue;
		}

		// blockquote
		if (/^>\s?/.test(line)) {
			const q = [];
			while (i < lines.length && /^>\s?/.test(lines[i])) {
				q.push(lines[i].replace(/^>\s?/, ''));
				i++;
			}
			out.push(`<blockquote>${mdToHtml(q.join('\n'))}</blockquote>`);
			continue;
		}

		// table
		if (
			line.includes('|') &&
			i + 1 < lines.length &&
			isTableSep(lines[i + 1])
		) {
			const header = splitRow(line);
			i += 2;
			const rows = [];
			while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
				rows.push(splitRow(lines[i]));
				i++;
			}
			out.push('<div class="md-table-wrap"><table class="md-table">');
			out.push(
				'<thead><tr>' +
					header.map((c) => `<th>${inline(c)}</th>`).join('') +
					'</tr></thead>',
			);
			out.push('<tbody>');
			for (const row of rows) {
				out.push(
					'<tr>' +
						row.map((c) => `<td>${inline(c)}</td>`).join('') +
						'</tr>',
				);
			}
			out.push('</tbody></table></div>');
			continue;
		}

		// unordered list
		if (/^\s*[-*+]\s+/.test(line)) {
			out.push('<ul>');
			while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
				out.push(`<li>${inline(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>`);
				i++;
			}
			out.push('</ul>');
			continue;
		}

		// ordered list
		if (/^\s*\d+\.\s+/.test(line)) {
			out.push('<ol>');
			while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
				out.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
				i++;
			}
			out.push('</ol>');
			continue;
		}

		// paragraph (merge consecutive non-blank non-special)
		const para = [line];
		i++;
		while (
			i < lines.length &&
			!/^\s*$/.test(lines[i]) &&
			!/^#{1,6}\s/.test(lines[i]) &&
			!/^```/.test(lines[i]) &&
			!/^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[i]) &&
			!/^>\s?/.test(lines[i]) &&
			!/^\s*[-*+]\s+/.test(lines[i]) &&
			!/^\s*\d+\.\s+/.test(lines[i]) &&
			!(
				lines[i].includes('|') &&
				i + 1 < lines.length &&
				isTableSep(lines[i + 1])
			)
		) {
			para.push(lines[i]);
			i++;
		}
		out.push(`<p>${inline(para.join(' '))}</p>`);
	}

	return out.join('\n');
}

/**
 * @param {string} md
 */
function extractTitle(md) {
	const { body } = splitFrontmatter(md);
	const m = body.match(/^#\s+(.+)$/m);
	return m ? m[1].trim() : null;
}

module.exports = { mdToHtml, extractTitle, esc, splitFrontmatter };
