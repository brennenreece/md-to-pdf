import type { RegionRule } from "./regions";

const ALIGN_RE = /^\s*<align:\s*(left|right|center|justified)\s*>\s*$/i;
const END_ALIGN_RE = /^\s*<\/align\s*>\s*$/i;

const TEXT_ALIGN: Record<string, string> = {
	left: "left",
	right: "right",
	center: "center",
	justified: "justify",
};

/** Rule for `<align: VALUE>` … `</align>`, which sets the text alignment of the content. */
export const ALIGN_RULE: RegionRule = {
	open: (line) => {
		const m = ALIGN_RE.exec(line);
		if (!m) return null;
		return `<div class="md2pdf-align" style="text-align:${TEXT_ALIGN[m[1].toLowerCase()]}">`;
	},
	close: END_ALIGN_RE,
	closeHtml: "</div>",
};
