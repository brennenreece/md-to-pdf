import type { MdToPdfSettings } from "./settings";
import { stylesFromFlatSettings, withMissingStyles, type ParagraphStyles } from "./paragraph-styles";

/**
 * A theme is a named snapshot of the style settings. Page size and orientation, margins, and
 * header/footer text are file-independent styling, so they are included. The saved theme list
 * is stored separately from the settings.
 */
export interface ThemeData extends MdToPdfSettings {
	/** Paragraph styles. Themes saved before styles existed have none and are converted on apply. */
	styles?: ParagraphStyles;
}

export interface SavedTheme {
	name: string;
	settings: ThemeData;
}

export const THEME_KEYS: Array<keyof MdToPdfSettings> = [
	"pageSize",
	"orientation",
	"marginTopMm",
	"marginRightMm",
	"marginBottomMm",
	"marginLeftMm",
	"marginUnit",
	"bodyFont",
	"bodySizePt",
	"bodyLineHeight",
	"bodyLineHeightUnit",
	"headingLineHeight",
	"headingLineHeightUnit",
	"paragraphSpacingEm",
	"paragraphSpacingUnit",
	"baselineGridEnabled",
	"baselineGridPt",
	"textWrapPretty",
	"hyphenation",
	"interCharacterJustify",
	"nonBreakingSpaces",
	"smartQuotes",
	"hyphenLang",
	"justify",
	"ligatures",
	"smallCapsHeadings",
	"oldstyleFigures",
	"headingFont",
	"h1OverrideFont",
	"h2OverrideFont",
	"h3OverrideFont",
	"h1Font",
	"h2Font",
	"h3Font",
	"h1SizePt",
	"h2SizePt",
	"h3SizePt",
	"h1Weight",
	"h2Weight",
	"h3Weight",
	"h1Italic",
	"h2Italic",
	"h3Italic",
	"bodyWeight",
	"bodyItalic",
	"h1SpaceBeforeEm",
	"h1SpaceBeforeUnit",
	"h1SpaceAfterEm",
	"h1SpaceAfterUnit",
	"h2SpaceBeforeEm",
	"h2SpaceBeforeUnit",
	"h2SpaceAfterEm",
	"h2SpaceAfterUnit",
	"h3SpaceBeforeEm",
	"h3SpaceBeforeUnit",
	"h3SpaceAfterEm",
	"h3SpaceAfterUnit",
	"headingSpaceBeforeEm",
	"headingSpaceBeforeUnit",
	"headingSpaceAfterEm",
	"headingSpaceAfterUnit",
	"pageBreakBeforeH1",
	"pageBreakOnHr",
	"codeFont",
	"codeSizePt",
	"bodySizeUnit",
	"h1SizeUnit",
	"h2SizeUnit",
	"h3SizeUnit",
	"codeSizeUnit",
	"baselineGridUnit",
	"showHeader",
	"headerText",
	"headerAlign",
	"showPageNumbers",
	"pageNumberFormat",
	"pageNumberStyle",
	"pageNumberAlign",
	"pageNumberFont",
	"pageNumberWeight",
	"pageNumberSizePt",
];

/** Copies the style fields and paragraph styles into a new theme object. */
export function snapshotTheme(s: MdToPdfSettings, styles: ParagraphStyles): ThemeData {
	const out: Partial<Record<keyof MdToPdfSettings, unknown>> = {};
	for (const key of THEME_KEYS) (out as Record<string, unknown>)[key] = s[key as keyof MdToPdfSettings];
	return { ...(out as MdToPdfSettings), styles: structuredClone(styles) };
}

/**
 * Applies a theme onto settings and returns the paragraph styles it carries. Themes saved
 * before styles existed have none, so their flat values are converted.
 */
export function applyTheme(s: MdToPdfSettings, theme: ThemeData): ParagraphStyles {
	for (const key of THEME_KEYS) {
		if (key in theme) (s as unknown as Record<string, unknown>)[key] = theme[key];
	}
	return theme.styles ? withMissingStyles(theme.styles) : stylesFromFlatSettings(s);
}
