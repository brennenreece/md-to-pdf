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

/** Styles for the print content (the .md2pdf-root tree). Shared with the settings preview. */
export function contentCss(s: MdToPdfSettings): string {
	return `.md2pdf-root {
	font-family: ${resolveFontCss(s.bodyFont)} !important;
	font-weight: ${s.bodyWeight};
	font-style: ${s.bodyItalic ? "italic" : "normal"};
	font-size: ${s.bodySizePt}pt !important;
	line-height: ${s.bodyLineHeight} !important;
	color: #111 !important;
	width: 100%;
	max-width: none;
	padding: 0;
	margin: 0;
	background: white;
}
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
.md2pdf-root h1 { font-family: ${s.h1OverrideFont ? resolveFontCss(s.h1Font) : resolveFontCss(s.headingFont)} !important; font-size: ${s.h1SizePt}pt !important; font-weight: ${s.h1Weight} !important; font-style: ${s.h1Italic ? "italic" : "normal"} !important; }
.md2pdf-root h2 { font-family: ${s.h2OverrideFont ? resolveFontCss(s.h2Font) : resolveFontCss(s.headingFont)} !important; font-size: ${s.h2SizePt}pt !important; font-weight: ${s.h2Weight} !important; font-style: ${s.h2Italic ? "italic" : "normal"} !important; }
.md2pdf-root h3 { font-family: ${s.h3OverrideFont ? resolveFontCss(s.h3Font) : resolveFontCss(s.headingFont)} !important; font-size: ${s.h3SizePt}pt !important; font-weight: ${s.h3Weight} !important; font-style: ${s.h3Italic ? "italic" : "normal"} !important; }
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

/** Builds the full print document: the app's CSS first, then print overrides. */
export function buildDocumentHtml(opts: {
	title: string;
	bodyHtml: string;
	appCss: string;
	fontFaceCss: string;
	settings: MdToPdfSettings;
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
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title)}</title>
<style>${reset}</style>
<style>${opts.appCss}</style>
<style>${opts.fontFaceCss}</style>
<style>${hideUiElements}</style>
<style>${css}</style>
</head>
<body>
<div class="md2pdf-root markdown-rendered">${opts.bodyHtml}</div>
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
