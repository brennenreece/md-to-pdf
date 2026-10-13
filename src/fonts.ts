/**
 * Bundled font families. Font files live in assets/fonts/ and are read from the plugin folder at
 * export time. Only the families a note actually uses are embedded in the PDF.
 *
 * Each family gets a unique CSS name (`md2pdf-<id>`) so the browser always picks the bundled file,
 * regardless of what the system has installed.
 */

export type FontCollection = "tg" | "league" | "system";

export interface BundledFace {
	file: string;
	weight: number;
	italic: boolean;
}

export interface BundledFamily {
	id: string;
	name: string;
	collection: Exclude<FontCollection, "system">;
	faces: BundledFace[];
}

/** The collection a family belongs to, shown as the group header in the font dropdown. */
export const COLLECTION_LABELS: Record<FontCollection, string> = {
	system: "System fonts",
	tg: "TeX Gyre",
	league: "League of Moveable Type",
};

function tgFamily(id: string, name: string): BundledFamily {
	const faces: BundledFace[] = [
		{ file: `texgyre${id}-regular.otf`, weight: 400, italic: false },
		{ file: `texgyre${id}-italic.otf`, weight: 400, italic: true },
		{ file: `texgyre${id}-bold.otf`, weight: 700, italic: false },
		{ file: `texgyre${id}-bolditalic.otf`, weight: 700, italic: true },
	];
	return { id: `tg-${id}`, name, collection: "tg", faces };
}

function leagueFamily(id: string, name: string, files: Array<[string, number, boolean?]>): BundledFamily {
	return {
		id: `league-${id}`,
		name,
		collection: "league",
		faces: files.map(([file, weight, italic]) => ({ file, weight, italic: italic ?? false })),
	};
}

export const BUNDLED_FAMILIES: BundledFamily[] = [
	tgFamily("adventor", "TeX Gyre Adventor"),
	tgFamily("bonum", "TeX Gyre Bonum"),
	tgFamily("cursor", "TeX Gyre Cursor"),
	tgFamily("heros", "TeX Gyre Heros"),
	tgFamily("heroscn", "TeX Gyre Heros Condensed"),
	tgFamily("pagella", "TeX Gyre Pagella"),
	tgFamily("schola", "TeX Gyre Schola"),
	tgFamily("termes", "TeX Gyre Termes"),

	leagueFamily("chunk", "ChunkFive", [["ChunkFive-Regular.otf", 400]]),
	leagueFamily("chunk-print", "ChunkFive Print", [["Chunk Five Print.otf", 400]]),
	leagueFamily("fanwood", "Fanwood", [
		["Fanwood.otf", 400],
		["Fanwood Italic.otf", 400, true],
	]),
	leagueFamily("fanwood-text", "Fanwood Text", [
		["Fanwood Text.otf", 400],
		["Fanwood Text Italic.otf", 400, true],
	]),
	leagueFamily("goudy-bookletter", "Goudy Bookletter 1911", [["GoudyBookletter1911.otf", 400]]),
	leagueFamily("junction", "Junction", [
		["Junction-light.otf", 300],
		["Junction-regular.otf", 500],
		["Junction-bold.otf", 700],
	]),
	leagueFamily("league-script", "League Script Number One", [["LeagueScriptNumberOne.otf", 400]]),
	leagueFamily("spartan", "League Spartan", [
		["LeagueSpartan-Thin.otf", 100],
		["LeagueSpartan-ExtraLight.otf", 200],
		["LeagueSpartan-Light.otf", 300],
		["LeagueSpartan-Regular.otf", 400],
		["LeagueSpartan-Medium.otf", 500],
		["LeagueSpartan-SemiBold.otf", 600],
		["LeagueSpartan-Bold.otf", 700],
		["LeagueSpartan-ExtraBold.otf", 800],
		["LeagueSpartan-Black.otf", 900],
	]),
	leagueFamily("linden-hill", "Linden Hill", [
		["Linden Hill.otf", 400],
		["Linden Hill Italic.otf", 400, true],
	]),
	leagueFamily("sorts-mill-goudy", "Sorts Mill Goudy", [
		["OFLGoudyStM.otf", 500],
		["OFLGoudyStM-Italic.otf", 500, true],
	]),
	leagueFamily("orbitron", "Orbitron", [
		["Orbitron Light.otf", 300],
		["Orbitron Medium.otf", 500],
		["Orbitron Bold.otf", 700],
		["Orbitron Black.otf", 900],
	]),
	leagueFamily("ostrich", "Ostrich Sans", [
		["OstrichSans-Light.otf", 300],
		["OstrichSans-Medium.otf", 400],
		["OstrichSans-Bold.otf", 700],
		["OstrichSans-Heavy.otf", 900],
		["OstrichSans-Black.otf", 900],
	]),
	leagueFamily("ostrich-dashed", "Ostrich Sans Dashed", [["OstrichSansDashed-Medium.otf", 500]]),
	leagueFamily("ostrich-inline", "Ostrich Sans Inline", [
		["OstrichSansInline-Regular.otf", 400],
		["OstrichSansInline-Italic.otf", 400, true],
	]),
	leagueFamily("ostrich-rounded", "Ostrich Sans Rounded", [["OstrichSansRounded-Medium.otf", 500]]),
	leagueFamily("prociono", "Prociono", [["Prociono.otf", 400]]),
	leagueFamily("sniglet", "Sniglet", [["Sniglet Regular.otf", 400]]),
	leagueFamily("knewave", "Knewave", [["knewave.otf", 400]]),
	leagueFamily("knewave-outline", "Knewave Outline", [["knewave-outline.otf", 400]]),
	leagueFamily("blackout", "Blackout", [["Blackout Two AM.ttf", 400]]),
	leagueFamily("blackout-midnight", "Blackout Midnight", [["Blackout Midnight.ttf", 400]]),
	leagueFamily("blackout-sunrise", "Blackout Sunrise", [["Blackout Sunrise.ttf", 400]]),
	leagueFamily("blackout-2am", "Blackout 2 AM", [["Blackout 2 AM.ttf", 400]]),
];

/** Option id used in settings and in saved themes: `family:<id>` for bundled families. */
export function bundledFontKey(family: BundledFamily): string {
	return `md2pdf:${family.id}`;
}

export function findBundledFamily(key: string): BundledFamily | undefined {
	if (!key.startsWith("md2pdf:")) return undefined;
	const id = key.slice("md2pdf:".length);
	return BUNDLED_FAMILIES.find((f) => f.id === id);
}

/** CSS font-family value used in the printed document for a bundled family. */
export function bundledCssName(family: BundledFamily): string {
	return `"md2pdf-${family.id}"`;
}

/** Plugin-relative folder holding the bundled font files. */
export const FONT_DIR = "assets/fonts";

/**
 * Returns @font-face rules (base64 data URLs) for each bundled family in `keys` (settings values
 * like "md2pdf:tg-bonum"). Unknown or unreadable keys are skipped. Missing files are logged, not thrown.
 */
export async function buildBundledFontFaces(
	adapter: { readBinary(path: string): Promise<ArrayBuffer> },
	pluginDir: string,
	keys: string[],
): Promise<string> {
	const rules: string[] = [];
	const seen = new Set<string>();
	for (const key of keys) {
		const family = findBundledFamily(key);
		if (!family || seen.has(family.id)) continue;
		seen.add(family.id);
		for (const face of family.faces) {
			try {
				const bytes = await adapter.readBinary(`${pluginDir}/${FONT_DIR}/${family.collection}/${face.file}`);
				const b64 = arrayBufferToBase64(bytes);
				const format = face.file.endsWith(".ttf") ? "truetype" : "opentype";
				rules.push(
					`@font-face { font-family: ${bundledCssName(family)}; font-style: ${face.italic ? "italic" : "normal"}; ` +
						`font-weight: ${face.weight}; src: url(data:font/${format};base64,${b64}) format("${format}"); }`,
				);
			} catch (err) {
				console.error(`[md-to-pdf] missing bundled font ${face.file}`, err);
			}
		}
	}
	return rules.join("\n");
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let binary = "";
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}

/** CSS font-family value for a settings font value (bundled key or a system CSS stack). */
export function resolveFontCss(value: string): string {
	const family = findBundledFamily(value);
	return family ? `${bundledCssName(family)}, serif` : value;
}

/** Keys for every font a document uses, so only those families are embedded. */
export function fontKeysInUse(s: {
	bodyFont: string;
	headingFont: string;
	h1Font: string;
	h2Font: string;
	h3Font: string;
	h1OverrideFont: boolean;
	h2OverrideFont: boolean;
	h3OverrideFont: boolean;
	codeFont: string;
}): string[] {
	const keys = [s.bodyFont, s.headingFont, s.codeFont];
	if (s.h1OverrideFont) keys.push(s.h1Font);
	if (s.h2OverrideFont) keys.push(s.h2Font);
	if (s.h3OverrideFont) keys.push(s.h3Font);
	return keys;
}

/** Human-readable label for a face, used under the font preview: "Regular", "Bold Italic", "Light". */
export function faceLabel(face: BundledFace): string {
	const names: Record<number, string> = {
		100: "Thin",
		200: "ExtraLight",
		300: "Light",
		400: "Regular",
		500: "Medium",
		600: "SemiBold",
		700: "Bold",
		800: "ExtraBold",
		900: "Black",
	};
	const weight = names[face.weight] ?? `Weight ${face.weight}`;
	if (face.weight === 400 && face.italic) return "Italic";
	if (face.italic) return `${weight} Italic`;
	return weight;
}

const previewStyleIds = new Set<string>();

/**
 * Makes every face of a bundled family available to the settings preview. The same @font-face
 * rules used by export are injected into a style element, so the preview loads fonts the same
 * way the printed output does. Runs once per family; a failed read is retried on the next call.
 */
export async function loadPreviewFont(
	adapter: { readBinary(path: string): Promise<ArrayBuffer> },
	pluginDir: string,
	family: BundledFamily,
): Promise<void> {
	if (previewStyleIds.has(family.id)) return;
	const rules = await buildBundledFontFaces(adapter, pluginDir, [bundledFontKey(family)]);
	if (!rules) throw new Error(`No font files could be read for ${family.name}`);
	const style = document.createElement("style");
	style.id = `md2pdf-preview-${family.id}`;
	style.textContent = rules;
	document.head.appendChild(style);
	previewStyleIds.add(family.id);
	await Promise.all(
		family.faces.map((face) =>
			document.fonts.load(`${face.italic ? "italic " : ""}${face.weight} 16px ${bundledCssName(family)}`),
		),
	);
}
