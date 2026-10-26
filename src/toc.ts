/** Marker that places the table of contents. It must be alone on its line. */
const TOC_RE = /^\s*<toc>\s*$/i;

/** Placeholder that stands in for the TOC in the markdown, so it survives rendering as a paragraph. */
export const TOC_SENTINEL = "MD2PDFTOCPLACEHOLDER";

export interface TocEntry {
	/** Heading level, 1 to 6. */
	level: number;
	/** Plain text of the heading. */
	text: string;
	/** Anchor id set on the heading in the rendered HTML. */
	id: string;
	/** Page the heading starts on, from the first print. Null until known. */
	page: number | null;
}

/**
 * Replaces each `<toc>` line with the placeholder. Fenced code is left alone.
 * Returns the number of placements found.
 */
export function markTocPlacements(markdown: string): { markdown: string; count: number } {
	let count = 0;
	let fence: string | null = null;
	const lines = markdown.split("\n").map((line) => {
		const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
		if (fenceMatch) {
			const marker = fenceMatch[1];
			if (fence === null) fence = marker;
			else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
			return line;
		}
		if (fence !== null || !TOC_RE.test(line)) return line;
		count++;
		return `\n${TOC_SENTINEL}\n`;
	});
	return { markdown: lines.join("\n"), count };
}

/** Level range for TOC entries. Headings outside it are left out. */
export function tocLevelRange(levels: string): [number, number] {
	const m = /^\s*(\d)\s*-\s*(\d)\s*$/.exec(levels);
	if (!m) return [1, 2];
	const lo = Number(m[1]);
	const hi = Number(m[2]);
	if (lo < 1 || hi > 6 || lo > hi) return [1, 2];
	return [lo, hi];
}

/** Escapes text for HTML. */
function escapeHtml(str: string): string {
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Builds the TOC block. Each entry links to its heading, with a dot leader and the page number
 * when `showNumbers` is on. Entries with no page yet show an empty number.
 */
export function tocHtml(entries: TocEntry[], showNumbers: boolean): string {
	const items = entries
		.map((e) => {
			const link = `<a class="md2pdf-toc-link" href="#${escapeHtml(e.id)}">${escapeHtml(e.text)}</a>`;
			const num = showNumbers ? `<span class="md2pdf-toc-page">${e.page ?? ""}</span>` : "";
			return `<div class="md2pdf-toc-entry md2pdf-toc-level-${e.level}">${link}${num}</div>`;
		})
		.join("");
	return `<div class="md2pdf-toc">${items}</div>`;
}

/**
 * Printed page number for a 1-based page index in the merged PDF. The section that holds the page
 * sets the number, counting from that section's start.
 */
export function printedNumber(labels: { startIndex: number; start: number }[], pageIndex: number): number {
	let label = labels[0];
	for (const l of labels) if (l.startIndex <= pageIndex - 1) label = l;
	return label ? label.start + (pageIndex - 1 - label.startIndex) : pageIndex;
}
