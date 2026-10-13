import type { MdToPdfSettings } from "./settings";
import { headerFooterTemplates } from "./document";

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
		
		const { headerTemplate, footerTemplate } = headerFooterTemplates(settings, title);
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
