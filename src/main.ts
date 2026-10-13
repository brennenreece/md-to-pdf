import { Component, Notice, Platform, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, MdToPdfSettings, MdToPdfSettingTab } from "./settings";
import { renderNoteToHtml, collectAppCss, collectThemeCss } from "./render";
import { buildDocumentHtml } from "./document";
import { buildBundledFontFaces, fontKeysInUse } from "./fonts";
import type { SavedTheme } from "./themes";
import { printHtmlToPdf } from "./pdf";

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
	}

	async loadSettings() {
		const saved = (await this.loadData()) ?? {};
		const { themes, ...rest } = saved;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, rest);
		this.themes = Array.isArray(themes) ? themes : [];
	}

	async saveSettings() {
		await this.saveData({ ...this.settings, themes: this.themes });
	}

	private async exportActiveNote() {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== "md") {
			new Notice("Open a markdown note to export.");
			return;
		}
		await this.exportFile(file);
	}

	async exportFile(file: TFile) {
		if (!Platform.isDesktopApp) {
			new Notice("PDF export currently requires desktop Obsidian.");
			return;
		}

		const notice = new Notice(`Exporting ${file.basename}…`, 0);
		const owner = new Component();
		owner.load();
		try {
			const raw = await this.app.vault.read(file);
			const markdown = raw.replace(FRONTMATTER_RE, "");
			const bodyHtml = await renderNoteToHtml(this.app, markdown, file.path, owner);

			const fontFaceCss = await buildBundledFontFaces(
				this.app.vault.adapter,
				this.manifest.dir ?? "",
				fontKeysInUse(this.settings),
			);
			const html = buildDocumentHtml({
				title: file.basename,
				bodyHtml,
				appCss: collectAppCss() + "\n" + (await collectThemeCss(this.app)),
				fontFaceCss,
				settings: this.settings,
			});
			const pdf = await printHtmlToPdf(html, this.settings, file.basename);

			const outPath = file.path.replace(/\.md$/, ".pdf");
			await this.app.vault.adapter.writeBinary(outPath, pdf);
			notice.hide();
			new Notice(`Exported ${outPath}`);
		} catch (err) {
			notice.hide();
			console.error("[md-to-pdf]", err);
			new Notice(`PDF export failed: ${(err as Error).message}`);
		} finally {
			owner.unload();
		}
	}
}
