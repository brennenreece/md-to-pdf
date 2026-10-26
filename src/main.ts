import { Component, Notice, Platform, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, MdToPdfSettings, MdToPdfSettingTab } from "./settings";
import { renderNoteToHtml, collectAppCss, collectThemeCss, HeadingInfo } from "./render";
import { buildDocumentHtml } from "./document";
import { buildBundledFontFaces, fontKeysInUse } from "./fonts";
import type { SavedTheme } from "./themes";
import { DEFAULT_PARAGRAPH_STYLES, ParagraphStyles, stylesFromFlatSettings, withMissingStyles } from "./paragraph-styles";
import { applyPageLabels, findMarkerPages, mergePdfs, PageLabelRange, pdfPageCount, printHtmlToPdf } from "./pdf";
import { markTocPlacements, printedNumber, tocHtml, tocLevelRange, TOC_SENTINEL, TocEntry } from "./toc";
import { applyMarker, hasVisibleContent, markSectionBreaks, splitRenderedSections, NumberingState, PageNumberingMarker } from "./page-numbering";
import { PdfPreviewView, PREVIEW_VIEW_TYPE } from "./preview-view";

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export default class MdToPdfPlugin extends Plugin {
	settings: MdToPdfSettings = DEFAULT_SETTINGS;
	themes: SavedTheme[] = [];
	/** Paragraph styles. Built from the flat settings the first time they are loaded. */
	styles: ParagraphStyles = DEFAULT_PARAGRAPH_STYLES;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MdToPdfSettingTab(this.app, this));

		this.addCommand({
			id: "export-active-note",
			name: "Export active note to PDF",
			callback: () => this.exportActiveNote(),
		});

		this.addRibbonIcon("file-output", "Export note to PDF", () => this.exportActiveNote());

		this.registerView(PREVIEW_VIEW_TYPE, (leaf) => new PdfPreviewView(leaf, this));
		this.addCommand({
			id: "open-pdf-preview",
			name: "Open PDF preview",
			callback: () => this.openPreview(),
		});
		this.addCommand({
			id: "refresh-pdf-preview",
			name: "Refresh PDF preview",
			callback: () => this.previewView()?.requestRender(true),
		});
		this.addRibbonIcon("eye", "Open PDF preview", () => this.openPreview());

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => this.syncPreviewToActiveNote()),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				const view = this.previewView();
				if (view && file instanceof TFile && view.getFile()?.path === file.path) view.notifyChange();
			}),
		);
		this.app.workspace.onLayoutReady(() => this.syncPreviewToActiveNote());
	}

	private previewView(): PdfPreviewView | null {
		const leaf = this.app.workspace.getLeavesOfType(PREVIEW_VIEW_TYPE)[0];
		return leaf ? (leaf.view as PdfPreviewView) : null;
	}

	async openPreview() {
		let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(PREVIEW_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = this.app.workspace.getLeaf("split", "vertical");
			await leaf.setViewState({ type: PREVIEW_VIEW_TYPE, active: true });
		}
		this.app.workspace.revealLeaf(leaf);
		this.syncPreviewToActiveNote();
	}

	/** Points the preview pane at the active markdown note, if the active view is a note. */
	private syncPreviewToActiveNote() {
		const view = this.previewView();
		if (!view) return;
		const file = this.app.workspace.getActiveFile();
		if (file && file.extension === "md") view.setFile(file);
	}

	/** Pushes the current settings into an open preview pane. */
	refreshPreviewAfterSettingsChange() {
		this.previewView()?.notifyChange();
	}

	async loadSettings() {
		const saved = (await this.loadData()) ?? {};
		const { themes, styles, ...rest } = saved;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, rest);
		this.themes = Array.isArray(themes) ? themes : [];
		// Older versions only saved flat keys. Build the styles from them once.
		this.styles = styles ? withMissingStyles(styles) : stylesFromFlatSettings(this.settings);
	}

	async saveSettings() {
		await this.saveData({ ...this.settings, themes: this.themes, styles: this.styles });
		this.refreshPreviewAfterSettingsChange();
	}

	private async exportActiveNote() {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== "md") {
			new Notice("Open a markdown note to export.");
			return;
		}
		await this.exportFile(file);
	}

	/**
	 * Renders a note once and splits it into page-numbering sections. Each section keeps its body
	 * and the numbering rules from its marker. Notes without markers produce one section.
	 */
	async renderNoteSections(
		file: TFile,
		settings: MdToPdfSettings,
		pages: Map<string, number> | null = null,
	): Promise<{ bodies: string[]; markers: PageNumberingMarker[]; fontFaceCss: string; appCss: string; entries: TocEntry[]; tocCount: number }> {
		const raw = await this.app.vault.read(file);
		const source = raw.replace(FRONTMATTER_RE, "");
		// A note with a TOC and no page-numbering markers of its own gets the book convention:
		// front matter in lowercase roman up to the TOC, then the body restarting at 1.
		const hasOwnMarkers = /^\s*<page-numbering\b/im.test(source);
		const tocOnly = !hasOwnMarkers && /^\s*<toc>\s*$/im.test(source);
		const prepared = tocOnly
			? source.replace(/^(\s*)<toc>(\s*)$/im, `$1<page-numbering type: i start: 1>$2\n<toc>$2\n<page-numbering type: 1 start: 1>$2`)
			: source;
		const numbered = markSectionBreaks(prepared);
		const toc = markTocPlacements(numbered.markdown);
		const markers = numbered.markers;
		const owner = new Component();
		owner.load();
		try {
			let headings: HeadingInfo[] = [];
			const renderedHtml = await renderNoteToHtml(this.app, toc.markdown, file.path, owner, {
				nonBreakingSpaces: settings.nonBreakingSpaces,
				smartQuotes: settings.smartQuotes,
				collectHeadings: (entries) => (headings = entries),
				// Markers are only needed for pass 1, to find each heading's page.
				markHeadings: toc.count > 0 && pages === null,
			});
			const [lo, hi] = tocLevelRange(settings.tocLevels);
			const entries: TocEntry[] = headings
				.filter((h) => h.level >= lo && h.level <= hi)
				.map((h) => ({ level: h.level, text: h.text, id: h.id, page: pages?.get(h.id) ?? null }));
			const tocBlock = toc.count > 0 ? tocHtml(entries, settings.tocShowNumbers) : "";
			const withToc = renderedHtml.replace(new RegExp(`<p[^>]*>\\s*${TOC_SENTINEL}\\s*</p>|${TOC_SENTINEL}`, "g"), tocBlock);
			const bodies = markers.length ? splitRenderedSections(withToc, markers.length) : [withToc];
			if (!bodies) throw new Error("Page numbering markers could not be matched in the rendered note.");
			const fontFaceCss = await buildBundledFontFaces(
				this.app.vault.adapter,
				this.manifest.dir ?? "",
				fontKeysInUse(this.styles),
			);
			const appCss = collectAppCss() + "\n" + (await collectThemeCss(this.app));
			return { bodies, markers, fontFaceCss, appCss, entries, tocCount: toc.count };
		} finally {
			owner.unload();
		}
	}

	/** Builds the full print HTML for a note. Shared by export and the live preview. */
	async buildNoteDocument(
		file: TFile,
		settings: MdToPdfSettings = this.settings,
		opts: { showBaselineGrid?: boolean; showMargins?: boolean } = {},
	): Promise<string> {
		const { bodies, fontFaceCss, appCss } = await this.renderNoteSections(file, settings);
		return buildDocumentHtml({
			title: file.basename,
			bodyHtml: bodies.join(""),
			appCss,
			fontFaceCss,
			settings,
			styles: this.styles,
			showBaselineGrid: opts.showBaselineGrid,
			showMargins: opts.showMargins,
		});
	}

	/**
	 * Prints a note to one PDF. Each numbering section is printed as its own document, starting at
	 * the number that follows the previous section's last page. Only `{pages}` is per section.
	 */
	async printNote(
		file: TFile,
		settings: MdToPdfSettings = this.settings,
		opts: { showBaselineGrid?: boolean; showMargins?: boolean } = {},
	): Promise<ArrayBuffer> {
		const first = await this.printSections(file, settings, opts, null);
		if (first.tocCount === 0) return first.pdf;
		// Pass 1 gave each heading a marker. Read the marker pages back, then print again with real numbers.
		const ids = first.entries.map((e) => e.id);
		const mergedPages = await findMarkerPages(first.pdf, ids);
		// Convert merged page indices to printed numbers, using each section's start and style.
		const pages = new Map<string, number>();
		for (const [id, index] of mergedPages) pages.set(id, printedNumber(first.labels, index));
		return (await this.printSections(file, settings, opts, pages)).pdf;
	}

	/** Prints the note's numbering sections and merges them. Returns the PDF and the TOC info. */
	async printSections(
		file: TFile,
		settings: MdToPdfSettings,
		opts: { showBaselineGrid?: boolean; showMargins?: boolean },
		pages: Map<string, number> | null,
	): Promise<{ pdf: ArrayBuffer; entries: TocEntry[]; tocCount: number; labels: PageLabelRange[] }> {
		const { bodies, markers, fontFaceCss, appCss, entries, tocCount } = await this.renderNoteSections(file, settings, pages);
		if (markers.length === 0) {
			const html = buildDocumentHtml({
				title: file.basename,
				bodyHtml: bodies[0],
				appCss,
				fontFaceCss,
				settings,
				styles: this.styles,
				showBaselineGrid: opts.showBaselineGrid,
				showMargins: opts.showMargins,
			});
			return { pdf: await printHtmlToPdf(html, settings, file.basename), entries, tocCount, labels: [] };
		}
		const parts: ArrayBuffer[] = [];
		const labels: PageLabelRange[] = [];
		let mergedIndex = 0;
		let state: NumberingState = { next: 1, style: settings.pageNumberStyle, hidden: false };
		for (let i = 0; i < bodies.length; i++) {
			// Body i+1 follows marker i. The first body uses the document defaults.
			state = applyMarker(state, i === 0 ? null : markers[i - 1]);
			// A section with no content, such as text before a marker on the first line, prints nothing.
			// Its marker still applies to the sections after it.
			if (!hasVisibleContent(bodies[i])) continue;
			labels.push({ startIndex: mergedIndex, start: state.next, style: state.style });
			const html = buildDocumentHtml({
				title: file.basename,
				bodyHtml: bodies[i],
				appCss,
				fontFaceCss,
				settings,
				styles: this.styles,
				showBaselineGrid: opts.showBaselineGrid,
				showMargins: opts.showMargins,
				numbering: { firstPage: state.next, style: state.style, hidden: state.hidden },
			});
			const part = await printHtmlToPdf(html, settings, file.basename);
			parts.push(part);
			const count = await pdfPageCount(part);
			mergedIndex += count;
			state = { ...state, next: state.next + count };
		}
		return { pdf: await applyPageLabels(await mergePdfs(parts), labels), entries, tocCount, labels };
	}

	async exportFile(file: TFile) {
		if (!Platform.isDesktopApp) {
			new Notice("PDF export currently requires desktop Obsidian.");
			return;
		}

		const notice = new Notice(`Exporting ${file.basename}…`, 0);
		try {
			const pdf = await this.printNote(file);

			const outPath = file.path.replace(/\.md$/, ".pdf");
			await this.app.vault.adapter.writeBinary(outPath, pdf);
			notice.hide();
			new Notice(`Exported ${outPath}`);
		} catch (err) {
			notice.hide();
			console.error("[md-to-pdf]", err);
			new Notice(`PDF export failed: ${(err as Error).message}`);
		}
	}
}
