import type { RegionRule } from "./regions";

const COLUMNS_RE = /^\s*<columns:\s*(\d+)\s*>\s*$/i;
const END_COLUMNS_RE = /^\s*<\/columns\s*>\s*$/i;
const MAX_COLUMNS = 6;

/** Rule for `<columns: N>` … `</columns>`, which wraps the content in an N-column block. */
export const COLUMNS_RULE: RegionRule = {
	open: (line) => {
		const m = COLUMNS_RE.exec(line);
		if (!m) return null;
		const count = Number(m[1]);
		if (count < 1 || count > MAX_COLUMNS) return null;
		return `<div class="md2pdf-columns" style="column-count:${count}">`;
	},
	close: END_COLUMNS_RE,
	closeHtml: "</div>",
};
