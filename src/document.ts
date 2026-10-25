import type { Alignment, MdToPdfSettings, PageNumberStyle } from "./settings";
import { resolveFontCss, shippedWeight } from "./fonts";
import type { ParagraphStyles } from "./paragraph-styles";
import { pageBreakTags, styleCss } from "./style-css";

export const PAGE_MM: Record<string, [number, number]> = {
	A4: [210, 297],
	A5: [148, 210],
	Letter: [215.9, 279.4],
	Legal: [215.9, 355.6],
};

/** Height of the text area on one printed page, in CSS px (96 per inch). */
function printableHeightPx(s: MdToPdfSettings): number {
	const [w, h] = PAGE_MM[s.pageSize];
	const pageMm = s.orientation === "landscape" ? w : h;
	return ((pageMm - s.marginTopMm - s.marginBottomMm) * 96) / 25.4;
}

/** Width of the text column on a printed page, in CSS px (96 per inch). */
function printableWidthPx(s: MdToPdfSettings): number {
	const [w, h] = PAGE_MM[s.pageSize];
	const pageMm = s.orientation === "landscape" ? h : w;
	return ((pageMm - s.marginLeftMm - s.marginRightMm) * 96) / 25.4;
}

export function pageSizeCss(s: MdToPdfSettings): string {
	const [w, h] = PAGE_MM[s.pageSize];
	return s.orientation === "landscape" ? `${h}mm ${w}mm` : `${w}mm ${h}mm`;
}

/**
 * Number of grid units a line height snaps to when the baseline grid is on. Shared with the
 * settings UI so the hint shown to the user matches what the print output uses.
 */
export function snappedLineHeightUnits(
	value: number,
	unit: "em" | "pt",
	fontPt: number,
	gridPt: number,
): number {
	const targetPt = unit === "pt" ? value : value * fontPt;
	return Math.max(1, Math.round(targetPt / gridPt));
}

/**
/** Styles for the print content (the .md2pdf-root tree). Shared with the settings preview. */
export function contentCss(s: MdToPdfSettings, styles: ParagraphStyles): string {
	return `${styleCss(styles, {
		baselineGridEnabled: s.baselineGridEnabled,
		baselineGridPt: s.baselineGridPt,
	})}
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
.md2pdf-root .md2pdf-linespace { display: block !important; margin: 0 !important; padding: 0 !important; border: 0 !important; }
.md2pdf-root .md2pdf-columns { column-gap: 2em; column-fill: balance; }
.md2pdf-root .md2pdf-columns > :first-child { margin-top: 0 !important; }
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
 * Print-time layout pass. Each page's first block, and each block that starts a page after a
 * forced break, is positioned so its cap height touches the top margin. With the grid on, that
 * block's baseline is moved to the first grid line at or below the cap line, so it never rises
 * above the margin. Blocks that follow on the same page are padded down to the next grid line
 * measured from the page start, so their baselines land on the grid too.
 * Runs in the print window, after the fonts it will print have loaded.
 */
function topCapScript(
	gridPt: number,
	breakTags: string[],
	breakOnHr: boolean,
	pageHeightPx: number,
	pageWidthPx: number,
): string {
	return `<script>
(function () {
	var gridPx = ${JSON.stringify(gridPt)} * 4 / 3;
	var breakTags = ${JSON.stringify(breakTags)};
	var breakOnHr = ${JSON.stringify(breakOnHr)};
	var pageHeightPx = ${JSON.stringify(pageHeightPx)};
	var pageWidthPx = ${JSON.stringify(pageWidthPx)};
	function measureFont(el) {
		var cs = getComputedStyle(el);
		var ctx = document.createElement('canvas').getContext('2d');
		ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
		return ctx.measureText('H').actualBoundingBoxAscent;
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
	// Returns the first text position in the block whose line bottom passes the page bottom, or null.
	function firstOverflowPoint(el, root, pageTop) {
		var rootTop = root.getBoundingClientRect().top;
		var limit = pageTop + pageHeightPx;
		var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		var node;
		while ((node = walker.nextNode())) {
			var text = node.nodeValue;
			for (var j = 1; j < text.length; j++) {
				if (/\s/.test(text.charAt(j)) || /\s/.test(text.charAt(j - 1))) continue;
				var r = document.createRange();
				r.setStart(node, j);
				r.setEnd(node, j + 1);
				var rects = r.getClientRects();
				if (rects.length && rects[0].bottom - rootTop > limit) return { node: node, offset: j };
			}
		}
		return null;
	}
	// Splits a paragraph that runs past the page bottom. The remainder is inserted after it and returned.
	function splitOverflow(el, root, pageTop) {
		if (el.tagName !== 'P' || !(pageHeightPx > 0)) return null;
		var found = firstOverflowPoint(el, root, pageTop);
		if (!found) return null;
		var tail = document.createRange();
		tail.setStart(found.node, found.offset);
		tail.setEnd(el, el.childNodes.length);
		var frag = tail.extractContents();
		var rest = el.cloneNode(false);
		rest.removeAttribute('id');
		rest.appendChild(frag);
		el.parentNode.insertBefore(rest, el.nextSibling);
		return rest;
	}
	function layoutPages() {
		var root = document.querySelector('.md2pdf-root');
		if (!root) return;
		// Lay out in the print column so line breaks match the printed page.
		var savedWidth = root.style.width;
		if (pageWidthPx > 0) root.style.setProperty('width', pageWidthPx + 'px', 'important');
		var kids = Array.prototype.slice.call(root.children);
		var pageTop = 0;
		var prevVisible = null;
		var forcedStart = null;
		for (var i = 0; i < kids.length; i++) {
			var el = kids[i];
			if (el.tagName === 'HR' || getComputedStyle(el).display === 'none') {
				if (el.tagName === 'HR' && getComputedStyle(el).display !== 'none') prevVisible = el;
				continue;
			}
			var isStart = i === 0
				|| el === forcedStart
				|| breakTags.indexOf(el.tagName) !== -1
				|| (breakOnHr && prevVisible !== null && prevVisible.tagName === 'HR');
			prevVisible = null;
			if (!isStart && pageHeightPx > 0) {
				// A block whose first line falls past the bottom of the page moves to the next page,
				// as if it had a forced break. Its first line must not start below the page's text area.
				var firstLineY = baselineOf(el, root) - pageTop;
				var lineBottom = firstLineY + (parseFloat(getComputedStyle(el).lineHeight) || 0);
				if (lineBottom > pageHeightPx) isStart = true;
			}
			if (isStart) {
				// Measure from the block's own top edge, with no margin or padding, to find the baseline offset.
				el.style.setProperty('margin-top', '0px', 'important');
				el.style.setProperty('padding-top', '0px', 'important');
				var topBefore = el.getBoundingClientRect().top - root.getBoundingClientRect().top;
				var rel = baselineOf(el, root) - topBefore;
				var cap = measureFont(el);
				var target = gridPx > 0 ? Math.ceil(cap / gridPx - 1e-6) * gridPx : cap;
				var delta = target - rel;
				el.style.setProperty('margin-top', delta.toFixed(2) + 'px', 'important');
				pageTop = el.getBoundingClientRect().top - root.getBoundingClientRect().top - delta;
			}
			// A paragraph that runs past the bottom continues on the next page as if it had a forced break.
			var rest = splitOverflow(el, root, pageTop);
			if (rest) {
				kids.splice(i + 1, 0, rest);
				forcedStart = rest;
			}
			if (isStart) continue;
			if (gridPx > 0) {
				var rel2 = baselineOf(el, root) - pageTop;
				var target2 = Math.ceil(rel2 / gridPx - 1e-6) * gridPx;
				var delta2 = target2 - rel2;
				if (delta2 > 0.05) {
					var cur = parseFloat(getComputedStyle(el).paddingTop) || 0;
					el.style.setProperty('padding-top', (cur + delta2).toFixed(2) + 'px', 'important');
				}
			}
		}
		root.style.width = savedWidth;
	}
	document.fonts.ready.then(layoutPages);
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
	styles: ParagraphStyles;
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
${pageNumberCss(s)}
html, body {
	background: #fff !important;
	color: #111 !important;
	height: auto !important;
	overflow: visible !important;
	margin: 0 !important;
	padding: 0 !important;
}
${contentCss(s, opts.styles)}`;

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
<style id="md2pdf-fonts">${opts.fontFaceCss}</style>
<style>${hideUiElements}</style>
<style>${css}</style>
${opts.showBaselineGrid ? `<style>${baselineOverlayCss()}</style>` : ""}
${opts.showMargins ? `<style>${marginOverlayCss(s)}</style>` : ""}
</head>
<body>
${opts.showBaselineGrid ? baselineGridMarkup(s) : ""}
${opts.showMargins ? '<div class="md2pdf-margins"></div>' : ""}
<div class="md2pdf-root markdown-rendered">${opts.bodyHtml}</div>
${topCapScript(s.baselineGridEnabled ? s.baselineGridPt : 0, pageBreakTags(opts.styles), s.pageBreakOnHr, printableHeightPx(s), printableWidthPx(s))}
</body>
</html>`;
}

/** Header and footer for Chromium's printToPDF. Tokens are substituted here. */
export function headerFooterTemplates(
	s: MdToPdfSettings,
	title: string,
	fontFaceCss = "",
): { headerTemplate: string; footerTemplate: string } {
	const dateStr = new Date().toISOString().slice(0, 10);
	const headerText = s.headerText
		.replace(/\{\{title\}\}/g, escapeHtml(title))
		.replace(/\{\{date\}\}/g, dateStr);

	const headerTemplate = s.showHeader ? wrapTemplate(headerText, s.headerAlign) : "<span></span>";

	// Page numbers are drawn by the @page margin box (see pageNumberCss), so the footer template stays empty.
	const footerTemplate = "<span></span>";

	return { headerTemplate, footerTemplate };
}

/**
 * Page numbers in the bottom margin box. The format placeholders become CSS counters, so any
 * counter style (arabic, roman, letters) works. Position follows pageNumberAlign.
 */
export function pageNumberCss(s: MdToPdfSettings): string {
	if (!s.showPageNumbers) return "";
	const family = s.pageNumberFont || (s.h3OverrideFont ? s.h3Font : s.headingFont);
	const style: PageNumberStyle = s.pageNumberStyle;
	const parts = s.pageNumberFormat
		.split(/(\{page\}|\{pages\})/)
		.filter((part) => part !== "")
		.map((part) => {
			if (part === "{page}") return `counter(page, ${style})`;
			if (part === "{pages}") return `counter(pages, ${style})`;
			return `"${part.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
		});
	const content = parts.length ? parts.join(" ") : `""`;
	const box = s.pageNumberAlign === "left" ? "@bottom-left" : s.pageNumberAlign === "center" ? "@bottom-center" : "@bottom-right";
	return `@page { ${box} { content: ${content}; font-family: ${resolveFontCss(family)} !important; font-size: ${s.pageNumberSizePt}pt; font-weight: ${shippedWeight(family, s.pageNumberWeight, false)}; font-synthesis: none; font-style: normal; color: #000; vertical-align: middle; } }`;
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

