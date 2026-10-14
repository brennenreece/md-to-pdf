import { Component, Notice, Platform, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, MdToPdfSettings, MdToPdfSettingTab } from "./settings";
import { renderNoteToHtml, collectAppCss, collectThemeCss } from "./render";
import { buildDocumentHtml } from "./document";
import { buildBundledFontFaces, fontKeysInUse } from "./fonts";
import type { SavedTheme } from "./themes";
import { printHtmlToPdf } from "./pdf";
import { PdfPreviewView, PREVIEW_VIEW_TYPE } from "./preview-view";

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export default class MdToPdfPlugin extends Plugin {
	settings: MdToPdfSettings = DEFAULT_SETTINGS;
	themes: SavedTheme[] = [];

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
		const { themes, ...rest } = saved;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, rest);
		this.themes = Array.isArray(themes) ? themes : [];
	}

	async saveSettings() {
		await this.saveData({ ...this.settings, themes: this.themes });
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

	/** Builds the full print HTML for a note. Shared by export and the live preview. */
	async buildNoteDocument(file: TFile, settings: MdToPdfSettings = this.settings): Promise<string> {
		const raw = await this.app.vault.read(file);
		const markdown = raw.replace(FRONTMATTER_RE, "");
		const owner = new Component();
		owner.load();
		try {
			const bodyHtml = await renderNoteToHtml(this.app, markdown, file.path, owner);
			const fontFaceCss = await buildBundledFontFaces(
				this.app.vault.adapter,
				this.manifest.dir ?? "",
				fontKeysInUse(settings),
			);
			return buildDocumentHtml({
				title: file.basename,
				bodyHtml,
				appCss: collectAppCss() + "\n" + (await collectThemeCss(this.app)),
				fontFaceCss,
				settings,
			});
		} finally {
			owner.unload();
		}
	}

	async exportFile(file: TFile) {
		if (!Platform.isDesktopApp) {
			new Notice("PDF export currently requires desktop Obsidian.");
			return;
		}

		const notice = new Notice(`Exporting ${file.basename}…`, 0);
		try {
			const html = await this.buildNoteDocument(file);
			const pdf = await printHtmlToPdf(html, this.settings, file.basename);

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
