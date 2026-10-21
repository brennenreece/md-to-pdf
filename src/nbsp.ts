import Typograf from "typograf";

/**
 * Typograf rules that only insert non-breaking spaces: after short words and
 * numbers, before the last word of a line, and after section and paragraph
 * marks. Dashes and other typographic rules are left off.
 */
const NBSP_RULES = [
	"common/nbsp/afterNumber",
	"common/nbsp/afterParagraphMark",
	"common/nbsp/afterSectionMark",
	"common/nbsp/afterShortWord",
	"common/nbsp/beforeShortLastNumber",
	"common/nbsp/beforeShortLastWord",
];

/** Curly double quotes and apostrophes. Typograf does not convert single-quote pairs. */
const QUOTE_RULES = [
	"common/punctuation/quote",
	"common/punctuation/apostrophe",
];

const SKIP_TAGS = new Set(["CODE", "PRE", "KBD", "SAMP", "SCRIPT", "STYLE", "MATH", "A", "svg"]);

function makeTypograf(options: TypografOptions): Typograf {
	const tp = new Typograf({ locale: ["en-US"] });
	tp.disableRule("*");
	if (options.nonBreakingSpaces) for (const rule of NBSP_RULES) tp.enableRule(rule);
	if (options.smartQuotes) for (const rule of QUOTE_RULES) tp.enableRule(rule);
	return tp;
}

export interface TypografOptions {
	nonBreakingSpaces?: boolean;
	smartQuotes?: boolean;
}

/**
 * Applies the enabled typograf rules (non-breaking spaces and/or smart quotes)
 * to the text of rendered markdown. Only text nodes are changed, so code,
 * links, and attributes are untouched.
 */
export function applyTypograf(root: HTMLElement, options: TypografOptions): void {
	const tp = makeTypograf(options);
	const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			for (let el = node.parentElement; el && el !== root; el = el.parentElement) {
				if (SKIP_TAGS.has(el.tagName) || el.closest(".math, .katex, .md2pdf-linespace")) {
					return NodeFilter.FILTER_REJECT;
				}
			}
			return NodeFilter.FILTER_ACCEPT;
		},
	});
	const nodes: Text[] = [];
	for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
	for (const node of nodes) {
		const value = node.nodeValue ?? "";
		if (!value.trim()) continue;
		node.nodeValue = tp.execute(value);
	}
}
