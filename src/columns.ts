const COLUMNS_RE = /^\s*<columns:\s*(\d+)\s*>\s*$/i;
const END_COLUMNS_RE = /^\s*<endcolumns\s*>\s*$/i;
const MAX_COLUMNS = 6;

/**
 * Wraps the lines between `{columns:N}` and `{endcolumns}` in a multi-column
 * block. Blank lines around the wrapper keep the content parsed as markdown.
 * Lines inside code fences are left alone, and an unclosed region is closed
 * at the end of the note.
 */
export function expandColumns(markdown: string): string {
	let fence: string | null = null;
	let open = false;
	const out: string[] = [];
	for (const line of markdown.split("\n")) {
		const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
		if (fenceMatch) {
			const marker = fenceMatch[1];
			if (fence === null) fence = marker;
			else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
			out.push(line);
			continue;
		}
		if (fence !== null) {
			out.push(line);
			continue;
		}
		const start = COLUMNS_RE.exec(line);
		if (start && !open) {
			const count = Number(start[1]);
			if (count >= 1 && count <= MAX_COLUMNS) {
				open = true;
				out.push("", `<div class="md2pdf-columns" style="column-count:${count}">`, "");
				continue;
			}
		}
		if (END_COLUMNS_RE.test(line) && open) {
			open = false;
			out.push("", "</div>", "");
			continue;
		}
		out.push(line);
	}
	if (open) out.push("", "</div>", "");
	return out.join("\n");
}
