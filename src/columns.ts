import { wrapRegions } from "./regions";

const COLUMNS_RE = /^\s*<columns:\s*(\d+)\s*>\s*$/i;
const END_COLUMNS_RE = /^\s*<endcolumns\s*>\s*$/i;
const MAX_COLUMNS = 6;

/** Wraps the lines between `<columns: N>` and `<endcolumns>` in an N-column block. */
export function expandColumns(markdown: string): string {
	return wrapRegions(markdown, [
		{
			open: (line) => {
				const m = COLUMNS_RE.exec(line);
				if (!m) return null;
				const count = Number(m[1]);
				if (count < 1 || count > MAX_COLUMNS) return null;
				return `<div class="md2pdf-columns" style="column-count:${count}">`;
			},
			close: END_COLUMNS_RE,
			closeHtml: "</div>",
		},
	]);
}
