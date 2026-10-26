import { resolveFontCss, shippedWeight } from "./fonts";
import type { LengthUnit } from "./length";
import { DEFAULT_TABLE_STYLE, resolveStyle, type ParagraphStyles, type StyleId, type StyleProps, type TableStyle } from "./paragraph-styles";

/** Page-level options that are not part of any paragraph style. */
export interface StyleCssOptions {
	/** Baseline grid on or off, and its step in pt. */
	baselineGridEnabled: boolean;
	baselineGridPt: number;
}

/** Selector for the element each style is applied to. */
const SELECTORS: Record<StyleId, string> = {
	body: ".md2pdf-root",
	level1: ".md2pdf-root .md2pdf-toc-level-1",
	level2: ".md2pdf-root .md2pdf-toc-level-2",
	level3: ".md2pdf-root .md2pdf-toc-level-3",
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

/** A spacing value in its own unit, as CSS. */
function spacingCss(value: number, unit: LengthUnit): string {
	return `${value}${unit}`;
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
		`text-justify: ${props.align === "justify" && props.interCharacterJustify ? "inter-character" : "auto"};`,
		`font-variant-caps: ${props.smallCaps && !props.allCaps ? "all-small-caps" : "normal"};`,
	];
	if (props.allCaps) lines.push("text-transform: uppercase;");
	if (features.length) lines.push(`font-feature-settings: ${features.join(", ")};`);
	return lines.map((l) => `\t${l}`).join("\n");
}

/**
 * Fills and rules for tables. Only values that differ from the defaults are written, so an
 * unchanged table keeps the output it had before these options existed.
 */
function tableCss(t: TableStyle, font: StyleProps): string[] {
	const d = DEFAULT_TABLE_STYLE;
	const out: string[] = [];
	const rule = (pt: number, color: string) => `${pt}pt solid ${color}`;
	const cell: string[] = [];
	const header: string[] = [];
	const body: string[] = [];

	if (t.cellPaddingVEm !== d.cellPaddingVEm || t.cellPaddingHEm !== d.cellPaddingHEm) {
		cell.push(`padding: ${t.cellPaddingVEm}em ${t.cellPaddingHEm}em !important;`);
	}
	if (t.columnRulePt !== d.columnRulePt || t.columnRuleColor !== d.columnRuleColor) {
		cell.push(`border-left: ${t.columnRulePt > 0 ? rule(t.columnRulePt, t.columnRuleColor) : "none"} !important;`);
		cell.push(`border-right: ${t.columnRulePt > 0 ? rule(t.columnRulePt, t.columnRuleColor) : "none"} !important;`);
	}
	if (t.rowRulePt !== d.rowRulePt || t.rowRuleColor !== d.rowRuleColor) {
		body.push(`border-bottom: ${t.rowRulePt > 0 ? rule(t.rowRulePt, t.rowRuleColor) : "none"} !important;`);
	}
	if (t.headerFill) header.push(`background-color: ${t.headerFill} !important;`);
	if (t.headerText) header.push(`color: ${t.headerText} !important;`);
	if (t.headerBold !== d.headerBold) {
		const w = shippedWeight(font.font, t.headerBold ? 700 : 400, font.italic);
		header.push(`font-weight: ${w} !important;`);
	}
	if (t.headerRulePt !== d.headerRulePt || t.headerRuleColor !== d.headerRuleColor) {
		header.push(`border-bottom: ${t.headerRulePt > 0 ? rule(t.headerRulePt, t.headerRuleColor) : "none"} !important;`);
	}
	if (t.bodyFill) body.push(`background-color: ${t.bodyFill} !important;`);
	// Cell rules only join up when the borders collapse. Otherwise Obsidian's cell spacing leaves gaps.
	const anyRule = t.outerRulePt > 0 || t.columnRulePt > 0 || t.rowRulePt > 0 || t.headerRulePt > 0;
	if (anyRule || t.outerRulePt !== d.outerRulePt || t.outerRuleColor !== d.outerRuleColor) {
		out.push(`.md2pdf-root table {\n\tborder: ${t.outerRulePt > 0 ? rule(t.outerRulePt, t.outerRuleColor) : "none"} !important;\n\tborder-collapse: collapse !important;\n\tborder-spacing: 0 !important;\n}`);
	}
	if (t.fullWidth) {
		out.push(`.md2pdf-root table {\n\twidth: 100% !important;\n\ttable-layout: fixed !important;\n}`);
	}
	if (cell.length) out.push(`.md2pdf-root th, .md2pdf-root td {\n${cell.map((l) => "\t" + l).join("\n")}\n}`);
	if (header.length) out.push(`.md2pdf-root thead th, .md2pdf-root tr:first-child th {\n${header.map((l) => "\t" + l).join("\n")}\n}`);
	if (body.length) out.push(`.md2pdf-root tbody td {\n${body.map((l) => "\t" + l).join("\n")}\n}`);
	if (t.zebraFill) out.push(`.md2pdf-root tbody tr:nth-child(even) td {\n\tbackground-color: ${t.zebraFill} !important;\n}`);
	return out;
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
	margin-top: ${spacingCss(props.spaceBefore, props.spaceBeforeUnit)} !important;
	margin-bottom: ${spacingCss(props.spaceAfter, props.spaceAfterUnit)} !important;
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

	// Table of contents level styles only apply to the entries in the TOC block. Body headings are unaffected.
	for (const id of ["level1", "level2", "level3"] as const) {
		const { props } = resolveStyle(styles, id);
		parts.push(`${SELECTORS[id]} {\n${declarations(props, grid, true)}\n}`);
	}

	parts.push(...tableCss(styles.tableStyle ?? DEFAULT_TABLE_STYLE, body));

	// Space before and after a table comes from the Table paragraph style, which defaults to the body spacing.
	const tableProps = resolveStyle(styles, "table").props;
	parts.push(`.md2pdf-root table {
	margin: ${spacingCss(tableProps.spaceBefore, tableProps.spaceBeforeUnit)} 0 ${spacingCss(tableProps.spaceAfter, tableProps.spaceAfterUnit)} 0 !important;
}`);

	// Paragraph and list spacing come from the body style, so they match the other rules.
	const bodySpace = spacingCss(body.spaceAfter, body.spaceAfterUnit);
	parts.push(`.md2pdf-root p,
.md2pdf-root ul,
.md2pdf-root ol,
.md2pdf-root blockquote,
.md2pdf-root pre {
	margin: 0 0 ${bodySpace} 0 !important;
	text-indent: 0 !important;
}
.md2pdf-root * { text-indent: 0 !important; }`);

	return parts.join("\n");
}
