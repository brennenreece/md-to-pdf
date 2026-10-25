import type { PageNumberStyle } from "./settings";

/** Style codes for `type:`, following the usual 1 / i / I / a / A convention. */
const TYPE_STYLES: Record<string, PageNumberStyle> = {
	"1": "arabic",
	i: "lower-roman",
	I: "upper-roman",
	a: "lower-alpha",
	A: "upper-alpha",
};

/** Plain text that stands in for a marker in the markdown. It survives rendering as a paragraph. */
export const SECTION_SENTINEL = "MD2PDFSECTIONBREAK";

const MARKER_RE = /^\s*<page-numbering\b([^>]*)>\s*$/i;
const SENTINEL_RE = new RegExp(`(?:<p[^>]*>\\s*)?${SECTION_SENTINEL}(?:\\s*</p>)?`, "g");

export interface PageNumberingMarker {
	/**
	 * `section` starts a numbering group, which can change the start, style, or both.
	 * `hide` and `show` only change whether numbers print.
	 */
	kind: "section" | "hide" | "show";
	/** Page number that the group starts at. Null means continue the previous count. */
	start: number | null;
	/** Number style for the group. Null means keep the previous style. */
	style: PageNumberStyle | null;
}

/** Numbering state carried from one printed section to the next. */
export interface NumberingState {
	/** Number shown on the next page that is printed. */
	next: number;
	style: PageNumberStyle;
	hidden: boolean;
}

/**
 * Reads the attributes of a `<page-numbering ...>` marker. Returns null when they are invalid.
 * `section:` labels a group and does not change numbering.
 */
export function parsePageNumberingAttrs(attrs: string): PageNumberingMarker | null {
	const text = attrs.trim();
	if (text === "") return null;
	if (/^none$/i.test(text)) return { kind: "hide", start: null, style: null };
	if (/^on$/i.test(text)) return { kind: "show", start: null, style: null };

	const marker: PageNumberingMarker = { kind: "section", start: null, style: null };
	const re = /(section|type|start)\s*:\s*(\S+)/gi;
	let found = false;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		found = true;
		const key = m[1].toLowerCase();
		const value = m[2];
		if (key === "start") {
			const n = Number(value);
			if (!Number.isInteger(n) || n < 1) return null;
			marker.start = n;
		} else if (key === "type") {
			const style = TYPE_STYLES[value] ?? TYPE_STYLES[value.toLowerCase()];
			if (!style) return null;
			marker.style = style;
		}
	}
	return found ? marker : null;
}

/**
 * Replaces each valid `<page-numbering>` line with the sentinel. Fenced code is left alone.
 * Returns the markers in the order they appear.
 */
export function markSectionBreaks(markdown: string): { markdown: string; markers: PageNumberingMarker[] } {
	const markers: PageNumberingMarker[] = [];
	let fence: string | null = null;
	const lines = markdown.split("\n").map((line) => {
		const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
		if (fenceMatch) {
			const marker = fenceMatch[1];
			if (fence === null) fence = marker;
			else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
			return line;
		}
		if (fence !== null) return line;
		const m = MARKER_RE.exec(line);
		if (!m) return line;
		const parsed = parsePageNumberingAttrs(m[1]);
		if (!parsed) return line;
		markers.push(parsed);
		return `\n${SECTION_SENTINEL}\n`;
	});
	return { markdown: lines.join("\n"), markers };
}

/**
 * Splits rendered HTML at the sentinel paragraphs. Returns one body for the text before the
 * first marker plus one per marker, or null if the sentinel count does not match.
 */
export function splitRenderedSections(html: string, markerCount: number): string[] | null {
	const parts = html.split(SENTINEL_RE);
	return parts.length === markerCount + 1 ? parts : null;
}

/**
 * Applies one marker to the running numbering state. The marker's start, style, and visibility
 * take effect for the section it opens. A marker without `start:` continues the count.
 */
export function applyMarker(state: NumberingState, marker: PageNumberingMarker | null): NumberingState {
	if (!marker) return state;
	return {
		next: marker.start ?? state.next,
		style: marker.style ?? state.style,
		hidden: marker.kind === "hide" ? true : marker.kind === "show" ? false : state.hidden,
	};
}
