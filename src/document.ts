import type { Alignment, MdToPdfSettings } from "./settings";
import { resolveFontCss } from "./fonts";

const PAGE_MM: Record<string, [number, number]> = {
	A4: [210, 297],
	A5: [148, 210],
	Letter: [215.9, 279.4],
	Legal: [215.9, 355.6],
};

export function pageSizeCss(s: MdToPdfSettings): string {
	const [w, h] = PAGE_MM[s.pageSize];
	return s.orientation === "landscape" ? `${h}mm ${w}mm` : `${w}mm ${h}mm`;
}

/**
 * CSS value for a line height. Grid mode pins it to a whole number of grid units so every
 * line box, and so every baseline inside it, lands on the grid. Otherwise the user's value
 * is used in its chosen unit (em multiplier or pt).
 */
export function lineHeightValue(
	value: number,
	unit: "em" | "pt",
	fontPt: number,
	s: MdToPdfSettings,
): string {
	if (s.baselineGridEnabled) {
		const targetPt = unit === "pt" ? value : value * fontPt;
		const units = Math.max(1, Math.round(targetPt / s.baselineGridPt));
		return `calc(var(--md2pdf-baseline) * ${units})`;
	}
	return unit === "pt" ? `${value}pt` : `${value}em`;
}

/**
 * Typography rules: line breaking, hyphenation, justification, OpenType features, and an
 * optional baseline grid. Kept separate so the grid rules can be read on their own.
 */
export function typographyCss(s: MdToPdfSettings): string {
	// Ligature and figure choices go through font-feature-settings so one rule owns them.
	const features: string[] = [];
	if (!s.ligatures) features.push('"liga" 0', '"clig" 0', '"dlig" 0');
	if (s.oldstyleFigures) features.push('"onum" 1');
	const featureRule = features.length ? `font-feature-settings: ${features.join(", ")} !important;` : "";
	const capsRule = s.smallCapsHeadings ? "font-variant-caps: all-small-caps !important;" : "";
	const hyphenRule = s.hyphenation
		? "hyphens: auto !important;\n\t-webkit-hyphens: auto !important;"
		: "";
	const alignRule = s.justify ? "text-align: justify !important;" : "";

	// Spacing snaps to whole or half baseline units. Half units keep headings close to their
	// requested em spacing while still landing on the grid.
	const halfUnits = (em: number) => Math.max(0, Math.round(em * 2)) / 2;
	const gridVar = s.baselineGridEnabled ? `--md2pdf-baseline: ${s.baselineGridPt}pt;` : "";
	const gridRules = s.baselineGridEnabled
		? `
.md2pdf-root p,
.md2pdf-root ul,
.md2pdf-root ol,
.md2pdf-root blockquote,
.md2pdf-root table,
.md2pdf-root pre {
	margin-bottom: calc(var(--md2pdf-baseline) * ${halfUnits(s.paragraphSpacingEm)}) !important;
}
.md2pdf-root h1,
.md2pdf-root h2,
.md2pdf-root h3,
.md2pdf-root h4,
.md2pdf-root h5,
.md2pdf-root h6 {
	margin-top: calc(var(--md2pdf-baseline) * ${halfUnits(s.headingSpaceBeforeEm)}) !important;
	margin-bottom: calc(var(--md2pdf-baseline) * ${halfUnits(s.headingSpaceAfterEm)}) !important;
}`
		: "";

	return `.md2pdf-root {
	${gridVar}
	${hyphenRule}
	${alignRule}
	${featureRule}
	orphans: 2;
	widows: 2;
}
.md2pdf-root p,
.md2pdf-root li,
.md2pdf-root blockquote {
	text-wrap: ${s.textWrapPretty ? "pretty" : "wrap"};
}
.md2pdf-root h1,
.md2pdf-root h2,
.md2pdf-root h3,
.md2pdf-root h4,
.md2pdf-root h5,
.md2pdf-root h6 {
	text-wrap: balance;
	${capsRule}
}${gridRules}
`;
}

/** Styles for the print content (the .md2pdf-root tree). Shared with the settings preview. */
export function contentCss(s: MdToPdfSettings): string {
	return `.md2pdf-root {
	font-family: ${resolveFontCss(s.bodyFont)} !important;
	font-weight: ${s.bodyWeight};
	font-style: ${s.bodyItalic ? "italic" : "normal"};
	font-size: ${s.bodySizePt}pt !important;
	line-height: ${lineHeightValue(s.bodyLineHeight, s.bodyLineHeightUnit, s.bodySizePt, s)} !important;
	color: #111 !important;
	width: 100%;
	max-width: none;
	padding: 0;
	margin: 0;
	background: white;
}
${typographyCss(s)}
.md2pdf-root p,
.md2pdf-root ul,
.md2pdf-root ol,
.md2pdf-root blockquote,
.md2pdf-root table,
.md2pdf-root pre {
	margin: 0 0 ${s.paragraphSpacingEm}em 0 !important;
	text-indent: 0 !important;
}
.md2pdf-root * { text-indent: 0 !important; }
.md2pdf-root h1,
.md2pdf-root h2,
.md2pdf-root h3,
.md2pdf-root h4,
.md2pdf-root h5,
.md2pdf-root h6 {
	color: #000 !important;
	margin-top: ${s.headingSpaceBeforeEm}em !important;
	margin-bottom: ${s.headingSpaceAfterEm}em !important;
	break-after: avoid !important;
	page-break-after: avoid !important;
}
.md2pdf-root h1 { line-height: ${lineHeightValue(s.headingLineHeight, s.headingLineHeightUnit, s.h1SizePt, s)} !important; font-family: ${s.h1OverrideFont ? resolveFontCss(s.h1Font) : resolveFontCss(s.headingFont)} !important; font-size: ${s.h1SizePt}pt !important; font-weight: ${s.h1Weight} !important; font-style: ${s.h1Italic ? "italic" : "normal"} !important; }
.md2pdf-root h2 { line-height: ${lineHeightValue(s.headingLineHeight, s.headingLineHeightUnit, s.h2SizePt, s)} !important; font-family: ${s.h2OverrideFont ? resolveFontCss(s.h2Font) : resolveFontCss(s.headingFont)} !important; font-size: ${s.h2SizePt}pt !important; font-weight: ${s.h2Weight} !important; font-style: ${s.h2Italic ? "italic" : "normal"} !important; }
.md2pdf-root h3 { line-height: ${lineHeightValue(s.headingLineHeight, s.headingLineHeightUnit, s.h3SizePt, s)} !important; font-family: ${s.h3OverrideFont ? resolveFontCss(s.h3Font) : resolveFontCss(s.headingFont)} !important; font-size: ${s.h3SizePt}pt !important; font-weight: ${s.h3Weight} !important; font-style: ${s.h3Italic ? "italic" : "normal"} !important; }
.md2pdf-root h1:first-child { margin-top: 0 !important; }
${
	s.pageBreakBeforeH1
		? ".md2pdf-root h1:not(:first-child) { break-before: page !important; page-break-before: always !important; }"
		: ""
}
.md2pdf-root pre,
.md2pdf-root code {
	font-family: ${resolveFontCss(s.codeFont)} !important;
	font-size: ${s.codeSizePt}pt !important;
}
.md2pdf-root pre,
.md2pdf-root table,
.md2pdf-root blockquote,
.md2pdf-root img,
.md2pdf-root svg,
.md2pdf-root figure,
.md2pdf-root .block-language-brnotation,
.md2pdf-root .br-notation-container {
	break-inside: avoid !important;
	page-break-inside: avoid !important;
}
.md2pdf-root img, .md2pdf-root svg { max-width: 100% !important; height: auto !important; }
.md2pdf-root svg { display: block !important; visibility: visible !important; opacity: 1 !important; }
.md2pdf-root .block-language-brnotation,
.md2pdf-root .br-notation-container,
.md2pdf-root .br-notation-body,
.md2pdf-root .br-diagram {
	display: block !important;
	visibility: visible !important;
	opacity: 1 !important;
	width: 100% !important;
	height: auto !important;
}
.md2pdf-root a { color: inherit !important; text-decoration: none !important; }
.md2pdf-root .frontmatter-container, .md2pdf-root .metadata-container { display: none !important; }
${
	s.pageBreakOnHr
		? ".md2pdf-root hr { break-before: page !important; page-break-before: always !important; border: 0 !important; margin: 0 !important; height: 0 !important; }"
		: ".md2pdf-root hr { display: none !important; }"
}
`;
}

/**
 * Preview-only grid. Chromium's print path drops CSS gradient backgrounds, so the
 * lines are explicit absolutely positioned rules, which print reliably.
 */
export function baselineOverlayCss(): string {
	return `
.md2pdf-grid {
	position: fixed;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 9999;
}
.md2pdf-grid i {
	position: absolute;
	left: 0;
	width: 100%;
	height: 0.5pt;
	background: rgba(0, 150, 255, 0.35);
}
`;
}

/** Preview-only magenta frame at the content-area edges (inside the page margins). */
export function marginOverlayCss(s: MdToPdfSettings): string {
	return `
.md2pdf-margins {
	position: fixed;
	top: ${s.marginTopMm}mm;
	right: ${s.marginRightMm}mm;
	bottom: ${s.marginBottomMm}mm;
	left: ${s.marginLeftMm}mm;
	pointer-events: none;
	z-index: 9998;
	outline: 0.75pt solid rgba(255, 0, 255, 0.8);
	outline-offset: 0;
}
`;
}

/** Grid line elements, each positioned by an inline top offset. */
function baselineGridMarkup(s: MdToPdfSettings): string {
	const step = s.baselineGridPt;
	const count = Math.min(600, Math.ceil(10000 / step));
	let lines = "";
	for (let i = 0; i < count; i++) {
		lines += `<i style="top:${(i * step).toFixed(2)}pt"></i>`;
	}
	return `<div class="md2pdf-grid" style="top:${s.marginTopMm}mm">${lines}</div>`;
}

/**
 * Print-time layout pass. Without the baseline grid it moves the first heading so its cap height
 * touches the top margin. With the grid on, it walks the top-level blocks in order and pads each
 * one down to the next grid line below its first baseline, so text baselines land on the grid.
 * Runs in the print window, after the fonts it will print have loaded.
 */
function topCapScript(gridPt: number): string {
	return `<script>
(function () {
	var gridPx = ${JSON.stringify(gridPt)} * 4 / 3;
	function measureFont(el) {
		var cs = getComputedStyle(el);
		var ctx = document.createElement('canvas').getContext('2d');
		ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
		return { m: ctx.measureText('H'), lh: parseFloat(cs.lineHeight) };
	}
	function alignCapLine() {
		var root = document.querySelector('.md2pdf-root');
		var h = root && root.firstElementChild;
		if (!h || !/^H[1-6]$/.test(h.tagName)) return;
		var f = measureFont(h);
		var cap = f.m.actualBoundingBoxAscent;
		var baselineInBox = (f.lh - (f.m.fontBoundingBoxAscent + f.m.fontBoundingBoxDescent)) / 2 + f.m.fontBoundingBoxAscent;
		h.style.setProperty('margin-top', (cap - baselineInBox).toFixed(2) + 'px', 'important');
	}
	// Zero-size inline probe: its bottom edge sits on the text baseline of the block's first line.
	function baselineOf(el, root) {
		var probe = document.createElement('span');
		probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;';
		var target = el;
		while (target.firstElementChild && !/^(P|H[1-6]|PRE|TABLE)$/.test(target.tagName)) {
			target = target.firstElementChild;
		}
		target.insertBefore(probe, target.firstChild);
		var y = probe.getBoundingClientRect().bottom - root.getBoundingClientRect().top;
		probe.remove();
		return y;
	}
	function lockToGrid() {
		var root = document.querySelector('.md2pdf-root');
		if (!root) return;
		var kids = Array.prototype.slice.call(root.children);
		for (var i = 0; i < kids.length; i++) {
			var el = kids[i];
			if (el.tagName === 'HR' || getComputedStyle(el).display === 'none') continue;
			var rel = baselineOf(el, root);
			// Next grid line at or below the current baseline. The first block never sits on the top edge.
			var target = Math.ceil(rel / gridPx - 1e-6) * gridPx;
			if (i === 0 && target <= 0) target = gridPx;
			var delta = target - rel;
			if (delta > 0.05) {
				var cur = parseFloat(getComputedStyle(el).paddingTop) || 0;
				el.style.setProperty('padding-top', (cur + delta).toFixed(2) + 'px', 'important');
			}
		}
	}
	document.fonts.ready.then(function () {
		alignCapLine();
		if (gridPx > 0) lockToGrid();
	});
})();
</script>`;
}

/** Builds the full print document: the app's CSS first, then print overrides. */
export function buildDocumentHtml(opts: {
	title: string;
	bodyHtml: string;
	appCss: string;
	fontFaceCss: string;
	settings: MdToPdfSettings;
	/** Preview-only: draws the baseline grid over the page. */
	showBaselineGrid?: boolean;
	/** Preview-only: draws a magenta frame at the margin edges. */
	showMargins?: boolean;
}): string {
	const s = opts.settings;
	const reset = `
html, body {
	margin: 0 !important;
	padding: 0 !important;
	background: white !important;
	color: black !important;
}
body * {
	visibility: visible !important;
	opacity: 1 !important;
}
@media print {
	body * {
		visibility: visible !important;
		opacity: 1 !important;
	}
}
`;
	const css = `
@page {
	size: ${pageSizeCss(s)};
	margin: ${s.marginTopMm}mm ${s.marginRightMm}mm ${s.marginBottomMm}mm ${s.marginLeftMm}mm;
}
html, body {
	background: #fff !important;
	color: #111 !important;
	height: auto !important;
	overflow: visible !important;
	margin: 0 !important;
	padding: 0 !important;
}
${contentCss(s)}`;

const hideUiElements = `
/* Ensure nothing is hidden in the print context. SVG hit-test rects (opacity="0") stay transparent. */
.md2pdf-root *:not(svg *) { visibility: visible !important; opacity: 1 !important; }
.markdown-rendered *:not(svg *) { visibility: visible !important; opacity: 1 !important; }
.md2pdf-root svg *, .markdown-rendered svg * { visibility: visible !important; }
`;

	return `<!DOCTYPE html>
<html lang="${escapeHtml(s.hyphenLang)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title)}</title>
<style>${reset}</style>
<style>${opts.appCss}</style>
<style>${opts.fontFaceCss}</style>
<style>${hideUiElements}</style>
<style>${css}</style>
${opts.showBaselineGrid ? `<style>${baselineOverlayCss()}</style>` : ""}
${opts.showMargins ? `<style>${marginOverlayCss(s)}</style>` : ""}
</head>
<body>
${opts.showBaselineGrid ? baselineGridMarkup(s) : ""}
${opts.showMargins ? '<div class="md2pdf-margins"></div>' : ""}
<div class="md2pdf-root markdown-rendered">${opts.bodyHtml}</div>
${topCapScript(s.baselineGridEnabled ? s.baselineGridPt : 0)}
</body>
</html>`;
}

/** Header and footer for Chromium's printToPDF. Tokens are substituted here. */
export function headerFooterTemplates(
	s: MdToPdfSettings,
	title: string,
): { headerTemplate: string; footerTemplate: string } {
	const dateStr = new Date().toISOString().slice(0, 10);
	const headerText = s.headerText
		.replace(/\{\{title\}\}/g, escapeHtml(title))
		.replace(/\{\{date\}\}/g, dateStr);

	const headerTemplate = s.showHeader ? wrapTemplate(headerText, s.headerAlign) : "<span></span>";

	const pageHtml = s.pageNumberFormat
		.replace("{page}", '<span class="pageNumber"></span>')
		.replace("{pages}", '<span class="totalPages"></span>');
	const footerTemplate = s.showPageNumbers ? wrapTemplate(pageHtml, s.pageNumberAlign) : "<span></span>";

	return { headerTemplate, footerTemplate };
}

function wrapTemplate(inner: string, align: Alignment): string {
	return `<div style="width:100%; font-size:8pt; color:#555; font-family:Helvetica,Arial,sans-serif; text-align:${align};">${inner}</div>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
