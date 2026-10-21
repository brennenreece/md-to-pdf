/**
 * Paragraph styles: one named style per Markdown element that the export styles. Each style
 * holds only the properties it overrides. Anything it leaves out is inherited through
 * `basedOn`, the same way InDesign paragraph styles work. Notes stay plain Markdown, so the
 * set of styles is fixed.
 */

import type { LengthUnit } from "./length";

export type StyleId =
	| "body"
	| "h1"
	| "h2"
	| "h3"
	| "h4"
	| "h5"
	| "h6"
	| "blockquote"
	| "listItem"
	| "codeBlock"
	| "inlineCode"
	| "link"
	| "bold"
	| "italic"
	| "table"
	| "hr"
	| "callout"
	| "image"
	| "footnote";

export type LineHeightUnit = "em" | "pt";
export type TextAlign = "left" | "center" | "right" | "justify";
export type TextWrap = "wrap" | "nowrap" | "pretty" | "balance";

/** Every property a style can hold. Sizes are stored in pt. Spacing is stored in its own unit. */
export interface StyleProps {
	font: string;
	weight: number;
	italic: boolean;
	sizePt: number;
	lineHeight: number;
	lineHeightUnit: LineHeightUnit;
	/** Space above the element, in `spaceBeforeUnit`. */
	spaceBefore: number;
	spaceBeforeUnit: LengthUnit;
	/** Space below the element, in `spaceAfterUnit`. */
	spaceAfter: number;
	spaceAfterUnit: LengthUnit;
	align: TextAlign;
	textWrap: TextWrap;
	hyphenation: boolean;
	/** Spread justified lines between characters as well as words (text-justify: inter-character). */
	interCharacterJustify: boolean;
	ligatures: boolean;
	smallCaps: boolean;
	allCaps: boolean;
	oldstyleFigures: boolean;
	/** Start the element on a new page. Only meaningful for H1 today. */
	pageBreakBefore: boolean;
}

export type StyleKey = keyof StyleProps;

export interface ParagraphStyle {
	id: StyleId;
	name: string;
	/** Parent style. Body has no parent and must hold every property. */
	basedOn: StyleId | null;
	/** Properties this style sets itself. Missing keys come from the parent. */
	props: Partial<StyleProps>;
}

export type ParagraphStyles = Record<StyleId, ParagraphStyle> & {
	/** Table fills and rules. Optional so saved data from earlier versions still loads. */
	tableStyle?: TableStyle;
};

/**
 * Table appearance, kept beside the table paragraph style. A rule width of 0 means no rule.
 * Colors are CSS hex strings. An empty fill means no background.
 */
export interface TableStyle {
	headerFill: string;
	headerText: string;
	headerBold: boolean;
	headerRulePt: number;
	headerRuleColor: string;
	bodyFill: string;
	zebraFill: string;
	rowRulePt: number;
	rowRuleColor: string;
	columnRulePt: number;
	columnRuleColor: string;
	outerRulePt: number;
	outerRuleColor: string;
	cellPaddingVEm: number;
	cellPaddingHEm: number;
	/** Stretch the table to the full text width with equal column widths. */
	fullWidth: boolean;
}

export const DEFAULT_TABLE_STYLE: TableStyle = {
	headerFill: "",
	headerText: "",
	headerBold: false,
	headerRulePt: 0,
	headerRuleColor: "#111111",
	bodyFill: "",
	zebraFill: "",
	rowRulePt: 0,
	rowRuleColor: "#cccccc",
	columnRulePt: 0,
	columnRuleColor: "#cccccc",
	outerRulePt: 0,
	outerRuleColor: "#111111",
	cellPaddingVEm: 0,
	cellPaddingHEm: 0,
	fullWidth: false,
};

/** Display order and labels for the styles panel. */
export const STYLE_ORDER: StyleId[] = [
	"body",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"blockquote",
	"listItem",
	"codeBlock",
	"inlineCode",
	"link",
	"bold",
	"italic",
	"table",
	"hr",
	"callout",
	"image",
	"footnote",
];

export const STYLE_NAMES: Record<StyleId, string> = {
	body: "Body",
	h1: "H1",
	h2: "H2",
	h3: "H3",
	h4: "H4",
	h5: "H5",
	h6: "H6",
	blockquote: "Blockquote",
	listItem: "List item",
	codeBlock: "Code block",
	inlineCode: "Inline code",
	link: "Link",
	bold: "Bold",
	italic: "Italic",
	table: "Table",
	hr: "Horizontal rule",
	callout: "Callout",
	image: "Image",
	footnote: "Footnote",
};

/** The base font of the page. Other styles inherit it unless they set their own. */
const BODY_PROPS: StyleProps = {
	font: "Georgia, 'Times New Roman', serif",
	weight: 400,
	italic: false,
	sizePt: 11,
	lineHeight: 1.5,
	lineHeightUnit: "em",
	spaceBefore: 0, spaceBeforeUnit: "em",
	spaceAfter: 0.8, spaceAfterUnit: "em",
	align: "left",
	textWrap: "pretty",
	hyphenation: false,
	interCharacterJustify: false,
	ligatures: true,
	smallCaps: false,
	allCaps: false,
	oldstyleFigures: false,
	pageBreakBefore: false,
};

const HEADING_FONT = "Helvetica, Arial, sans-serif";

function heading(id: StyleId, name: string, props: Partial<StyleProps>): ParagraphStyle {
	return {
		id,
		name,
		basedOn: "body",
		props: { font: HEADING_FONT, textWrap: "balance", spaceBefore: 1.2, spaceBeforeUnit: "em", spaceAfter: 0.5, spaceAfterUnit: "em", ...props },
	};
}

/** H4 to H6 keep the body font and only change weight, size, spacing, and wrapping. */
function minorHeading(id: StyleId, name: string, sizeRatio: number): ParagraphStyle {
	const sizePt = Math.round(BODY_PROPS.sizePt * sizeRatio * 100) / 100;
	return {
		id,
		name,
		basedOn: "body",
		props: { textWrap: "balance", spaceBefore: 1.2, spaceBeforeUnit: "em", spaceAfter: 0.5, spaceAfterUnit: "em", weight: 700, sizePt },
	};
}

/** Built-in styles. Each one is editable. None can be deleted. */
export const DEFAULT_PARAGRAPH_STYLES: ParagraphStyles = {
	body: { id: "body", name: STYLE_NAMES.body, basedOn: null, props: { ...BODY_PROPS } },
	h1: heading("h1", STYLE_NAMES.h1, { sizePt: 22, lineHeight: 1, lineHeightUnit: "em", pageBreakBefore: false }),
	h2: heading("h2", STYLE_NAMES.h2, { sizePt: 16, lineHeight: 1, lineHeightUnit: "em" }),
	h3: heading("h3", STYLE_NAMES.h3, { sizePt: 13, lineHeight: 1, lineHeightUnit: "em" }),
	h4: minorHeading("h4", STYLE_NAMES.h4, 1),
	h5: minorHeading("h5", STYLE_NAMES.h5, 0.83),
	h6: minorHeading("h6", STYLE_NAMES.h6, 0.67),
	blockquote: { id: "blockquote", name: STYLE_NAMES.blockquote, basedOn: "body", props: {} },
	listItem: { id: "listItem", name: STYLE_NAMES.listItem, basedOn: "body", props: {} },
	codeBlock: {
		id: "codeBlock",
		name: STYLE_NAMES.codeBlock,
		basedOn: "body",
		props: { font: "Menlo, Consolas, monospace", sizePt: 9, textWrap: "nowrap" },
	},
	inlineCode: {
		id: "inlineCode",
		name: STYLE_NAMES.inlineCode,
		basedOn: "body",
		props: { font: "Menlo, Consolas, monospace", sizePt: 9 },
	},
	link: { id: "link", name: STYLE_NAMES.link, basedOn: "body", props: {} },
	bold: { id: "bold", name: STYLE_NAMES.bold, basedOn: "body", props: {} },
	italic: { id: "italic", name: STYLE_NAMES.italic, basedOn: "body", props: {} },
	table: { id: "table", name: STYLE_NAMES.table, basedOn: "body", props: {} },
	hr: { id: "hr", name: STYLE_NAMES.hr, basedOn: "body", props: {} },
	callout: { id: "callout", name: STYLE_NAMES.callout, basedOn: "body", props: {} },
	image: { id: "image", name: STYLE_NAMES.image, basedOn: "body", props: {} },
	footnote: { id: "footnote", name: STYLE_NAMES.footnote, basedOn: "body", props: {} },
	tableStyle: { ...DEFAULT_TABLE_STYLE },
};

/**
 * Fills in any style that saved data does not have yet, such as styles added in a later
 * version. Saved entries are kept as they are.
 */
export function withMissingStyles(saved: Partial<ParagraphStyles> | undefined): ParagraphStyles {
	const out = structuredClone(DEFAULT_PARAGRAPH_STYLES);
	for (const id of STYLE_ORDER) {
		if (saved?.[id]) out[id] = { ...out[id], ...saved[id], props: migrateSpacing({ ...saved[id]!.props }) };
	}
	out.tableStyle = { ...DEFAULT_TABLE_STYLE, ...(saved?.tableStyle ?? {}) };
	return out;
}

/**
 * Saved styles before units existed stored spacing as `spaceBeforeEm` and `spaceAfterEm`.
 * Those values are em, so they move to the unit-aware keys with the em unit.
 */
function migrateSpacing(props: Record<string, unknown>): Partial<StyleProps> {
	const out = { ...props } as Record<string, unknown>;
	if ("spaceBeforeEm" in out) {
		out.spaceBefore ??= out.spaceBeforeEm;
		out.spaceBeforeUnit ??= "em";
		delete out.spaceBeforeEm;
	}
	if ("spaceAfterEm" in out) {
		out.spaceAfter ??= out.spaceAfterEm;
		out.spaceAfterUnit ??= "em";
		delete out.spaceAfterEm;
	}
	return out as Partial<StyleProps>;
}

export class StyleCycleError extends Error {}

/**
 * Walks the `basedOn` chain from `id` and returns the value of every property. `from` records
 * which style supplied each value, so the UI can show inherited values differently.
 * Throws StyleCycleError if the chain loops.
 */
export function resolveStyle(
	styles: ParagraphStyles,
	id: StyleId,
): { props: StyleProps; from: Record<StyleKey, StyleId> } {
	const chain: StyleId[] = [];
	let current: StyleId | null = id;
	while (current !== null) {
		if (chain.includes(current)) {
			throw new StyleCycleError(`Cycle in styles: ${[...chain, current].join(" -> ")}`);
		}
		chain.push(current);
		current = styles[current].basedOn;
	}

	// Apply from the root down, so each child overrides its parent.
	const props = {} as StyleProps;
	const from = {} as Record<StyleKey, StyleId>;
	for (const styleId of [...chain].reverse()) {
		const own = styles[styleId].props;
		for (const key of Object.keys(own) as StyleKey[]) {
			const value = own[key];
			if (value === undefined) continue;
			(props as Record<StyleKey, unknown>)[key] = value;
			from[key] = styleId;
		}
	}
	return { props, from };
}

/** True if setting `styleId` to inherit from `newBase` would create a loop. */
export function wouldCreateCycle(styles: ParagraphStyles, styleId: StyleId, newBase: StyleId | null): boolean {
	let current: StyleId | null = newBase;
	while (current !== null) {
		if (current === styleId) return true;
		current = styles[current].basedOn;
	}
	return false;
}

/** Keys a style sets itself, for showing overrides against inherited values. */
export function overriddenKeys(styles: ParagraphStyles, id: StyleId): StyleKey[] {
	return Object.keys(styles[id].props) as StyleKey[];
}

/**
 * Builds the styles from the flat settings saved by earlier versions. Each flat key maps to
 * one property of one style. Values are copied as they are stored, so the output looks the
 * same as before. Body and the heading levels get the same values the old CSS used.
 */
export function stylesFromFlatSettings(s: LegacyFlatSettings): ParagraphStyles {
	const styles = structuredClone(DEFAULT_PARAGRAPH_STYLES);
	const set = (id: StyleId, props: Partial<StyleProps>) => {
		styles[id].props = { ...styles[id].props, ...props };
	};

	set("body", {
		font: s.bodyFont,
		weight: s.bodyWeight,
		italic: s.bodyItalic,
		sizePt: s.bodySizePt,
		lineHeight: s.bodyLineHeight,
		lineHeightUnit: s.bodyLineHeightUnit,
		spaceBefore: 0, spaceBeforeUnit: "em",
		spaceAfter: s.paragraphSpacingEm,
		spaceAfterUnit: s.paragraphSpacingUnit,
		align: s.justify ? "justify" : "left",
		textWrap: s.textWrapPretty ? "pretty" : "wrap",
		hyphenation: s.hyphenation,
		interCharacterJustify: s.interCharacterJustify,
		ligatures: s.ligatures,
		oldstyleFigures: s.oldstyleFigures,
	});

	const headingFont = (override: boolean, font: string) => (override ? font : s.headingFont);
	const headingLevel = (id: "h1" | "h2" | "h3", size: number, weight: number, italic: boolean) => ({
		font: headingFont(s[`${id}OverrideFont`], s[`${id}Font`]),
		sizePt: size,
		weight,
		italic,
		lineHeight: s.headingLineHeight,
		lineHeightUnit: s.headingLineHeightUnit,
		spaceBefore: s[`${id}SpaceBeforeEm`],
		spaceBeforeUnit: s[`${id}SpaceBeforeUnit`],
		spaceAfter: s[`${id}SpaceAfterEm`],
		spaceAfterUnit: s[`${id}SpaceAfterUnit`],
		smallCaps: s.smallCapsHeadings,
	});
	set("h1", { ...headingLevel("h1", s.h1SizePt, s.h1Weight, s.h1Italic), pageBreakBefore: s.pageBreakBeforeH1 });
	set("h2", headingLevel("h2", s.h2SizePt, s.h2Weight, s.h2Italic));
	set("h3", headingLevel("h3", s.h3SizePt, s.h3Weight, s.h3Italic));

	const minorRatios = { h4: 1, h5: 0.83, h6: 0.67 } as const;
	for (const id of ["h4", "h5", "h6"] as const) {
		set(id, {
			sizePt: Math.round(s.bodySizePt * minorRatios[id] * 100) / 100,
			spaceBefore: s.headingSpaceBeforeEm,
			spaceBeforeUnit: s.headingSpaceBeforeUnit,
			spaceAfter: s.headingSpaceAfterEm,
			spaceAfterUnit: s.headingSpaceAfterUnit,
			smallCaps: s.smallCapsHeadings,
		});
	}

	set("codeBlock", { font: s.codeFont, sizePt: s.codeSizePt });
	set("inlineCode", { font: s.codeFont, sizePt: s.codeSizePt });
	return styles;
}

/** The subset of the old flat settings the migration reads. */
export interface LegacyFlatSettings {
	bodyFont: string;
	bodyWeight: number;
	bodyItalic: boolean;
	bodySizePt: number;
	bodyLineHeight: number;
	bodyLineHeightUnit: LineHeightUnit;
	paragraphSpacingEm: number;
	paragraphSpacingUnit?: LengthUnit;
	textWrapPretty: boolean;
	hyphenation: boolean;
	interCharacterJustify: boolean;
	justify: boolean;
	ligatures: boolean;
	oldstyleFigures: boolean;
	smallCapsHeadings: boolean;
	headingFont: string;
	h1OverrideFont: boolean;
	h2OverrideFont: boolean;
	h3OverrideFont: boolean;
	h1Font: string;
	h2Font: string;
	h3Font: string;
	h1SizePt: number;
	h2SizePt: number;
	h3SizePt: number;
	h1Weight: number;
	h2Weight: number;
	h3Weight: number;
	h1Italic: boolean;
	h2Italic: boolean;
	h3Italic: boolean;
	h1SpaceBeforeEm: number;
	h1SpaceBeforeUnit: LengthUnit;
	h1SpaceAfterEm: number;
	h1SpaceAfterUnit: LengthUnit;
	h2SpaceBeforeEm: number;
	h2SpaceBeforeUnit: LengthUnit;
	h2SpaceAfterEm: number;
	h2SpaceAfterUnit: LengthUnit;
	h3SpaceBeforeEm: number;
	h3SpaceBeforeUnit: LengthUnit;
	h3SpaceAfterEm: number;
	h3SpaceAfterUnit: LengthUnit;
	headingSpaceBeforeEm: number;
	headingSpaceBeforeUnit: LengthUnit;
	headingSpaceAfterEm: number;
	headingSpaceAfterUnit: LengthUnit;
	headingLineHeight: number;
	headingLineHeightUnit: LineHeightUnit;
	pageBreakBeforeH1: boolean;
	codeFont: string;
	codeSizePt: number;
}
