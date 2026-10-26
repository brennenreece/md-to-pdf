import type { MdToPdfSettings } from "./settings";
import { headerFooterTemplates } from "./document";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber } from "pdf-lib";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Obsidian's desktop app exposes Electron's BrowserWindow through @electron/remote.
// Falls back to the legacy `remote` module for older builds.
function getBrowserWindow(): any {
	try {
		const remote = require("@electron/remote");
		if (remote?.BrowserWindow) return remote.BrowserWindow;
	} catch {
		// Module not available; try the legacy path.
	}
	const electron = require("electron");
	if (electron?.remote?.BrowserWindow) return electron.remote.BrowserWindow;
	throw new Error("Electron BrowserWindow is not accessible from this plugin.");
}

/**
 * Prints an HTML document to PDF in a hidden window.
 * Page size and margins come from @page CSS; header and footer use printToPDF templates.
 */
export async function printHtmlToPdf(
	html: string,
	settings: MdToPdfSettings,
	title: string,
): Promise<ArrayBuffer> {
	const fs = require("fs") as typeof import("fs");
	const os = require("os") as typeof import("os");
	const path = require("path") as typeof import("path");

	const BrowserWindow = getBrowserWindow();
	const tmpFile = path.join(os.tmpdir(), `md2pdf-${Date.now()}.html`);
	fs.writeFileSync(tmpFile, html, "utf8");

	const win = new BrowserWindow({
		show: false,
		width: 900,
		height: 1200,
		webPreferences: { nodeIntegration: false, sandbox: false },
	});

	try {
		await win.loadFile(tmpFile);
		
		// Allow page to render (wait for layout engine)
		await new Promise((resolve) => setTimeout(resolve, 500));
		
		// Footer runs in its own document, so it needs the bundled @font-face rules from the body.
		const fontFaceCss = html.match(/<style id="md2pdf-fonts">([\s\S]*?)<\/style>/)?.[1] ?? "";
		const { headerTemplate, footerTemplate } = headerFooterTemplates(settings, title, fontFaceCss);
		const buffer: Uint8Array = await win.webContents.printToPDF({
			printBackground: true,
			preferCSSPageSize: true,
			displayHeaderFooter: settings.showHeader || settings.showPageNumbers,
			headerTemplate,
			footerTemplate,
		});
		return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
	} catch (err) {
		console.error("[md-to-pdf pdf] Error:", err);
		throw err;
	} finally {
		win.destroy();
		fs.unlink(tmpFile, () => undefined);
	}
}

/** Number of pages in a PDF, read from its page tree. */
export async function pdfPageCount(pdf: ArrayBuffer): Promise<number> {
	const doc = await PDFDocument.load(pdf, { ignoreEncryption: true });
	return doc.getPageCount();
}

/** Joins PDFs in order into one PDF. */
export async function mergePdfs(parts: ArrayBuffer[]): Promise<ArrayBuffer> {
	if (parts.length === 1) return parts[0];
	const out = await PDFDocument.create();
	for (const part of parts) {
		const src = await PDFDocument.load(part, { ignoreEncryption: true });
		const pages = await out.copyPages(src, src.getPageIndices());
		for (const page of pages) out.addPage(page);
	}
	const bytes = await out.save();
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** A run of pages in the merged PDF that share one page label. */
export interface PageLabelRange {
	/** Index of the first page of the range in the merged PDF. */
	startIndex: number;
	/** Number shown on that first page. */
	start: number;
	/** Counter style: arabic, lower-roman, upper-roman, lower-alpha, or upper-alpha. */
	style: "arabic" | "lower-roman" | "upper-roman" | "lower-alpha" | "upper-alpha";
}

/** Sets the PDF's page labels, so viewers number each range from its own start and style. */
export async function applyPageLabels(pdf: ArrayBuffer, ranges: PageLabelRange[]): Promise<ArrayBuffer> {
	const doc = await PDFDocument.load(pdf, { ignoreEncryption: true });
	const styleCode: Record<PageLabelRange["style"], string> = {
		arabic: "D",
		"lower-roman": "r",
		"upper-roman": "R",
		"lower-alpha": "a",
		"upper-alpha": "A",
	};
	const nums = PDFArray.withContext(doc.context);
	for (const range of ranges) {
		const dict = PDFDict.withContext(doc.context);
		dict.set(PDFName.of("S"), PDFName.of(styleCode[range.style]));
		dict.set(PDFName.of("St"), PDFNumber.of(range.start));
		nums.push(PDFNumber.of(range.startIndex));
		nums.push(dict);
	}
	const labels = PDFDict.withContext(doc.context);
	labels.set(PDFName.of("Nums"), nums);
	doc.catalog.set(PDFName.of("PageLabels"), doc.context.register(labels));
	const bytes = await doc.save();
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** File URL of pdf.worker.mjs, which the build copies next to main.js in the plugin folder. */
function pdfWorkerUrl(): string {
	const path = require("path") as typeof import("path");
	const url = require("url") as typeof import("url");
	return url.pathToFileURL(path.join(__dirname, "pdf.worker.mjs")).href;
}

/**
 * Finds the page each marker text appears on. Markers are invisible text placed at each heading,
 * so the result is the heading's printed page. Returns a map from marker to 1-based page number.
 * pdf.js is loaded on demand, so it only costs time for notes that use a table of contents.
 */
export async function findMarkerPages(pdf: ArrayBuffer, markers: string[]): Promise<Map<string, number>> {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl();
	const found = new Map<string, number>();
	const wanted = new Set(markers);
	const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), disableFontFace: true, isEvalSupported: false } as any).promise;
	for (let i = 1; i <= doc.numPages; i++) {
		const content = await (await doc.getPage(i)).getTextContent();
		const text = content.items.map((item: any) => item.str).join("|");
		for (const m of text.match(/md2pdf-h-\d+/g) ?? []) {
			if (wanted.has(m) && !found.has(m)) found.set(m, i);
		}
	}
	return found;
}
