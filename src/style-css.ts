import { resolveFontCss, shippedWeight } from "./fonts";
import { resolveStyle, type ParagraphStyles, type StyleId, type StyleProps } from "./paragraph-styles";

/** Page-level options that are not part of any paragraph style. */
export interface StyleCssOptions {
	/** Baseline grid on or off, and its step in pt. */
	baselineGridEnabled: boolean;
	baselineGridPt: number;
}

/** Selector for the element each style is applied to. */
const SELECTORS: Record<StyleId, string> = {
	body: ".md2pdf-root",
	h1: ".md2pdf-root h1",
	h2: ".md2pdf-root h2",
	h3: ".md2pdf-root h3",
	h4: ".md2pdf-root h4",
	h5: ".md2pdf-root h5",
	h6: ".md2pdf-root h6",
	blockquote: ".md2pdf-root blockquote",
	listItem: ".md2pdf-root li",
	codeBlock: ".md2pdf-root pre, .md2pdf-root pre code",
	inlineCode: ".md2pdf-root code",
	link: ".md2pdf-root a",
	bold: ".md2pdf-root strong, .md2pdf-root b",
	italic: ".md2pdf-root em, .md2pdf-root i",
	table: ".md2pdf-root table",
	hr: ".md2pdf-root hr",
	callout: ".md2pdf-root .callout",
	image: ".md2pdf-root img, .md2pdf-root figure",
	footnote: ".md2pdf-root .footnotes, .md2pdf-root .footnotes li",
};

/**
 * Elements a page break can start. Inline code is left out because a break cannot start inside a line.
 * Body text breaks on paragraphs and list items, not on the wrapper, which would leave a blank first page.
 */
export const PAGE_BREAK_STYLES: StyleId[] = [
	"body", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "listItem", "codeBlock", "table",
];

/**
 * Elements a page break applies to. Only top-level blocks break, so a paragraph or list nested
 * inside a list item does not split the list. The page-start script in document.ts checks the same blocks.
 */
const BREAK_SELECTORS: Partial<Record<StyleId, string>> = {
	body: ".md2pdf-root > p, .md2pdf-root > ul, .md2pdf-root > ol",
	h1: ".md2pdf-root > h1", h2: ".md2pdf-root > h2", h3: ".md2pdf-root > h3",
	h4: ".md2pdf-root > h4", h5: ".md2pdf-root > h5", h6: ".md2pdf-root > h6",
	blockquote: ".md2pdf-root > blockquote",
	listItem: ".md2pdf-root > ul > li, .md2pdf-root > ol > li",
	codeBlock: ".md2pdf-root > pre",
	table: ".md2pdf-root > table",
};

/** Style ids whose page break is on, for the page-start script in document.ts. */
export function pageBreakTags(styles: ParagraphStyles): string[] {
	const tags: string[] = [];
	const map: Partial<Record<StyleId, string[]>> = {
		body: ["P", "UL", "OL"], h1: ["H1"], h2: ["H2"], h3: ["H3"], h4: ["H4"], h5: ["H5"], h6: ["H6"],
		blockquote: ["BLOCKQUOTE"], listItem: ["LI"], codeBlock: ["PRE"], table: ["TABLE"],
	};
	for (const id of PAGE_BREAK_STYLES) {
		const { props, from } = resolveStyle(styles, id);
		if (props.pageBreakBefore && from.pageBreakBefore === id) tags.push(...(map[id] ?? []));
	}
	return tags;
}

/**
 * Line height for a style. With the baseline grid on, the value snaps to whole grid units.
 * Otherwise it is written as given.
 */
export function lineHeightCss(
	value: number,
	unit: "em" | "pt",
	sizePt: number,
	grid: { enabled: boolean; pt: number },
): string {
	if (grid.enabled) {
		const targetPt = unit === "pt" ? value : value * sizePt;
		const units = Math.max(1, Math.round(targetPt / grid.pt));
		return `calc(var(--md2pdf-baseline) * ${units})`;
	}
	return unit === "pt" ? `${value}pt` : `${value}em`;
}

/** Spacing in em. On the grid it snaps to half units, which keeps headings near their request. */
function spacingCss(em: number): string {
	return `${em}em`;
}

/** Declarations for the properties that every style can set. */
function declarations(props: StyleProps, grid: { enabled: boolean; pt: number }, important: boolean): string {
	const bang = important ? " !important" : "";
	const features: string[] = [];
	if (!props.ligatures) features.push('"liga" 0', '"clig" 0', '"dlig" 0');
	if (props.oldstyleFigures) features.push('"onum" 1');
	const lines = [
		`font-family: ${resolveFontCss(props.font)}${bang};`,
		`font-size: ${props.sizePt}pt${bang};`,
		`font-weight: ${shippedWeight(props.font, props.weight, props.italic)}${bang};`,
		`font-synthesis: none${bang};`,
		`font-style: ${props.italic ? "italic" : "normal"}${bang};`,
		`line-height: ${lineHeightCss(props.lineHeight, props.lineHeightUnit, props.sizePt, grid)}${bang};`,
		`text-align: ${props.align}${bang};`,
		`text-wrap: ${props.textWrap};`,
		`hyphens: ${props.hyphenation ? "auto" : "manual"};`,
		`-webkit-hyphens: ${props.hyphenation ? "auto" : "manual"};`,
		`font-variant-caps: ${props.smallCaps && !props.allCaps ? "all-small-caps" : "normal"};`,
	];
	if (props.allCaps) lines.push("text-transform: uppercase;");
	if (features.length) lines.push(`font-feature-settings: ${features.join(", ")};`);
	return lines.map((l) => `\t${l}`).join("\n");
}

/**
 * Print CSS for every paragraph style, resolved through `basedOn`. Each rule carries the
 * full resolved set for its element, so the output does not depend on cascade order.
 */
export function styleCss(styles: ParagraphStyles, opts: StyleCssOptions): string {
	const grid = { enabled: opts.baselineGridEnabled, pt: opts.baselineGridPt };
	const gridVar = grid.enabled ? `--md2pdf-baseline: ${grid.pt}pt;` : "";
	const parts: string[] = [];

	const body = resolveStyle(styles, "body").props;
	parts.push(`.md2pdf-root {
	${gridVar}
	color: #111 !important;
	width: 100%;
	max-width: none;
	padding: 0;
	/* Stops the first heading's negative margin from collapsing out, which would shift the grid origin. */
	display: flow-root;
	margin: 0;
	background: white;
	orphans: 2;
	widows: 2;
${declarations(body, grid, true)}
}`);

	const blockIds: StyleId[] = ["blockquote", "listItem"];
	for (const id of blockIds) {
		const { props } = resolveStyle(styles, id);
		parts.push(`${SELECTORS[id]} {\n${declarations(props, grid, false)}\n}`);
	}

	const headingIds: StyleId[] = ["h1", "h2", "h3", "h4", "h5", "h6"];
	for (const id of headingIds) {
		const { props } = resolveStyle(styles, id);
		parts.push(`${SELECTORS[id]} {\n${declarations(props, grid, true)}
	color: #000 !important;
	break-after: avoid !important;
	page-break-after: avoid !important;
	margin-top: ${spacingCss(props.spaceBeforeEm)} !important;
	margin-bottom: ${spacingCss(props.spaceAfterEm)} !important;
}`);
	}
	parts.push(`.md2pdf-root h1:first-child { margin-top: 0 !important; }`);

	for (const id of PAGE_BREAK_STYLES) {
		const { props, from } = resolveStyle(styles, id);
		// Only a style that sets the break itself gets one, so headings do not inherit a break from body.
		if (props.pageBreakBefore && from.pageBreakBefore === id) {
			for (const sel of (BREAK_SELECTORS[id] ?? SELECTORS[id]).split(",")) {
				parts.push(`${sel.trim()}:not(:first-child) { break-before: page !important; page-break-before: always !important; }`);
			}
		}
	}

	for (const id of ["codeBlock", "inlineCode"] as const) {
		const { props } = resolveStyle(styles, id);
		parts.push(`${SELECTORS[id]} {\n${declarations(props, grid, true)}\n}`);
	}

	// Inline and table styles only emit CSS when they set something of their own,
	// so the default output does not change.
	for (const id of ["link", "bold", "italic", "table", "hr", "callout", "image", "footnote"] as const) {
		if (Object.keys(styles[id].props).length === 0) continue;
		const { props } = resolveStyle(styles, id);
		parts.push(`${SELECTORS[id]} {\n${declarations(props, grid, true)}\n}`);
	}

	// Paragraph and list spacing come from the body style, so they match the other rules.
	const bodySpace = spacingCss(body.spaceAfterEm);
	parts.push(`.md2pdf-root p,
.md2pdf-root ul,
.md2pdf-root ol,
.md2pdf-root blockquote,
.md2pdf-root table,
.md2pdf-root pre {
	margin: 0 0 ${bodySpace} 0 !important;
	text-indent: 0 !important;
}
.md2pdf-root * { text-indent: 0 !important; }`);

	return parts.join("\n");
}
