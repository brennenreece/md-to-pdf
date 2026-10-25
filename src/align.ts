import { wrapRegions } from "./regions";

const ALIGN_RE = /^\s*<align:\s*(left|right|center|justified)\s*>\s*$/i;
const END_ALIGN_RE = /^\s*<endalign\s*>\s*$/i;

const TEXT_ALIGN: Record<string, string> = {
	left: "left",
	right: "right",
	center: "center",
	justified: "justify",
};

/** Wraps the lines between `<align: VALUE>` and `<endalign>` in a block with that text alignment. */
export function expandAlign(markdown: string): string {
	return wrapRegions(markdown, [
		{
			open: (line) => {
				const m = ALIGN_RE.exec(line);
				if (!m) return null;
				return `<div class="md2pdf-align" style="text-align:${TEXT_ALIGN[m[1].toLowerCase()]}">`;
			},
			close: END_ALIGN_RE,
			closeHtml: "</div>",
		},
	]);
}
