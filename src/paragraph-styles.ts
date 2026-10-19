/**
 * Paragraph styles: one named style per Markdown element that the export styles. Each style
 * holds only the properties it overrides. Anything it leaves out is inherited through
 * `basedOn`, the same way InDesign paragraph styles work. Notes stay plain Markdown, so the
 * set of styles is fixed.
 */

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
	| "inlineCode";

export type LineHeightUnit = "em" | "pt";
export type TextAlign = "left" | "center" | "right" | "justify";
export type TextWrap = "wrap" | "nowrap" | "pretty" | "balance";

/** Every property a style can hold. Spacing is stored in em, sizes in pt. */
export interface StyleProps {
	font: string;
	weight: number;
	italic: boolean;
	sizePt: number;
	lineHeight: number;
	lineHeightUnit: LineHeightUnit;
	spaceBeforeEm: number;
	spaceAfterEm: number;
	align: TextAlign;
	textWrap: TextWrap;
	hyphenation: boolean;
	ligatures: boolean;
	smallCaps: boolean;
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

export type ParagraphStyles = Record<StyleId, ParagraphStyle>;

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
};

/** The base font of the page. Other styles inherit it unless they set their own. */
const BODY_PROPS: StyleProps = {
	font: "Georgia, 'Times New Roman', serif",
	weight: 400,
	italic: false,
	sizePt: 11,
	lineHeight: 1.5,
	lineHeightUnit: "em",
	spaceBeforeEm: 0,
	spaceAfterEm: 0.8,
	align: "left",
	textWrap: "pretty",
	hyphenation: false,
	ligatures: true,
	smallCaps: false,
	oldstyleFigures: false,
	pageBreakBefore: false,
};

const HEADING_FONT = "Helvetica, Arial, sans-serif";

function heading(id: StyleId, name: string, props: Partial<StyleProps>): ParagraphStyle {
	return {
		id,
		name,
		basedOn: "body",
		props: { font: HEADING_FONT, textWrap: "balance", spaceBeforeEm: 1.2, spaceAfterEm: 0.5, ...props },
	};
}

/** H4 to H6 keep the body font and only change weight, size, spacing, and wrapping. */
function minorHeading(id: StyleId, name: string, sizeRatio: number): ParagraphStyle {
	const sizePt = Math.round(BODY_PROPS.sizePt * sizeRatio * 100) / 100;
	return {
		id,
		name,
		basedOn: "body",
		props: { textWrap: "balance", spaceBeforeEm: 1.2, spaceAfterEm: 0.5, weight: 700, sizePt },
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
};

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
		spaceBeforeEm: 0,
		spaceAfterEm: s.paragraphSpacingEm,
		align: s.justify ? "justify" : "left",
		textWrap: s.textWrapPretty ? "pretty" : "wrap",
		hyphenation: s.hyphenation,
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
		spaceBeforeEm: s[`${id}SpaceBeforeEm`],
		spaceAfterEm: s[`${id}SpaceAfterEm`],
		smallCaps: s.smallCapsHeadings,
	});
	set("h1", { ...headingLevel("h1", s.h1SizePt, s.h1Weight, s.h1Italic), pageBreakBefore: s.pageBreakBeforeH1 });
	set("h2", headingLevel("h2", s.h2SizePt, s.h2Weight, s.h2Italic));
	set("h3", headingLevel("h3", s.h3SizePt, s.h3Weight, s.h3Italic));

	const minorRatios = { h4: 1, h5: 0.83, h6: 0.67 } as const;
	for (const id of ["h4", "h5", "h6"] as const) {
		set(id, {
			sizePt: Math.round(s.bodySizePt * minorRatios[id] * 100) / 100,
			spaceBeforeEm: s.headingSpaceBeforeEm,
			spaceAfterEm: s.headingSpaceAfterEm,
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
	textWrapPretty: boolean;
	hyphenation: boolean;
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
	h1SpaceAfterEm: number;
	h2SpaceBeforeEm: number;
	h2SpaceAfterEm: number;
	h3SpaceBeforeEm: number;
	h3SpaceAfterEm: number;
	headingSpaceBeforeEm: number;
	headingSpaceAfterEm: number;
	headingLineHeight: number;
	headingLineHeightUnit: LineHeightUnit;
	pageBreakBeforeH1: boolean;
	codeFont: string;
	codeSizePt: number;
}
