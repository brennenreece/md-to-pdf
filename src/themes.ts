import type { MdToPdfSettings } from "./settings";

/**
 * A theme is a named snapshot of the style settings. Page size and orientation, margins, and
 * header/footer text are file-independent styling, so they are included. The saved theme list
 * is stored separately from the settings.
 */
export type ThemeData = MdToPdfSettings;

export interface SavedTheme {
	name: string;
	settings: ThemeData;
}

export const THEME_KEYS: Array<keyof ThemeData> = [
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
	"pageNumberAlign",
];

/** Copies the style fields of settings into a new theme object. */
export function snapshotTheme(s: MdToPdfSettings): ThemeData {
	const out: Partial<Record<keyof ThemeData, unknown>> = {};
	for (const key of THEME_KEYS) out[key] = s[key];
	return out as ThemeData;
}

/** Applies a theme's values onto settings, leaving unknown keys untouched. */
export function applyTheme(s: MdToPdfSettings, theme: ThemeData): void {
	for (const key of THEME_KEYS) {
		if (key in theme) (s as unknown as Record<string, unknown>)[key] = theme[key];
	}
}
