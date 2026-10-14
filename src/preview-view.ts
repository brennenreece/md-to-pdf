import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import type MdToPdfPlugin from "./main";
import { printHtmlToPdf } from "./pdf";

export const PREVIEW_VIEW_TYPE = "md-to-pdf-preview";

/**
 * Shows the PDF output for a note beside it. Renders are debounced, and a render
 * that finishes after a newer one has started is discarded.
 */
export class PdfPreviewView extends ItemView {
	private plugin: MdToPdfPlugin;
	private file: TFile | null = null;
	private frame: HTMLIFrameElement | null = null;
	private statusEl: HTMLElement | null = null;
	private blobUrl: string | null = null;
	private timer: number | null = null;
	private renderSeq = 0;

	constructor(leaf: WorkspaceLeaf, plugin: MdToPdfPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return PREVIEW_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "PDF preview";
	}

	getIcon(): string {
		return "file-output";
	}

	async onOpen() {
		const root = this.contentEl;
		root.empty();
		root.addClass("md2pdf-preview");

		const toolbar = root.createDiv({ cls: "md2pdf-preview-toolbar" });
		toolbar.createSpan({ cls: "md2pdf-preview-title", text: this.file?.basename ?? "PDF preview" });
		const refresh = toolbar.createEl("button", { text: "Refresh" });
		refresh.addEventListener("click", () => this.requestRender(true));

		this.statusEl = root.createDiv({ cls: "md2pdf-preview-status" });
		this.frame = root.createEl("iframe", { cls: "md2pdf-preview-frame" });
		this.frame.setAttribute("title", "PDF preview");
		this.setStatus(this.file ? `Rendering ${this.file.basename}…` : "Open a markdown note to preview it.");
		if (this.file) this.requestRender(true);
	}

	async onClose() {
		this.clearTimer();
		this.revokeBlob();
		this.renderSeq++; // drop any render still in flight
	}

	/** Points the preview at a note and renders it immediately. */
	setFile(file: TFile | null) {
		if (file?.path === this.file?.path) return;
		this.file = file;
		this.updateTitle();
		this.requestRender(true);
	}

	getFile(): TFile | null {
		return this.file;
	}

	/** Schedules a render. With `immediate`, skips the debounce delay. */
	requestRender(immediate = false) {
		this.clearTimer();
		if (!this.file) {
			this.setStatus("Open a markdown note to preview it.");
			return;
		}
		const delay = immediate ? 0 : Math.max(0, this.plugin.settings.livePreviewDelayMs);
		this.timer = window.setTimeout(() => {
			this.timer = null;
			void this.render();
		}, delay);
	}

	/** Called when the note or settings change. Honors the live preview toggle. */
	notifyChange() {
		if (!this.plugin.settings.livePreview) return;
		this.requestRender(false);
	}

	private async render() {
		const file = this.file;
		if (!file) return;
		const seq = ++this.renderSeq;
		this.setStatus(`Rendering ${file.basename}…`);
		try {
			const html = await this.plugin.buildNoteDocument(file);
			const pdf = await printHtmlToPdf(html, this.plugin.settings, file.basename);
			if (seq !== this.renderSeq) return; // a newer render has started
			this.showPdf(pdf);
			this.setStatus("");
		} catch (err) {
			if (seq !== this.renderSeq) return;
			console.error("[md-to-pdf preview]", err);
			// The last good PDF stays on screen, with the error shown above it.
			this.setStatus(`Preview failed: ${(err as Error).message}`, true);
		}
	}

	private showPdf(pdf: ArrayBuffer) {
		const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
		const previous = this.blobUrl;
		this.blobUrl = url;
		if (this.frame) this.frame.src = url;
		if (previous) URL.revokeObjectURL(previous);
	}

	private updateTitle() {
		const title = this.contentEl.querySelector(".md2pdf-preview-title");
		if (title) title.textContent = this.file?.basename ?? "PDF preview";
	}

	private setStatus(text: string, isError = false) {
		if (!this.statusEl) return;
		this.statusEl.setText(text);
		this.statusEl.toggleClass("is-error", isError);
		this.statusEl.toggleClass("is-visible", text.length > 0);
	}

	private clearTimer() {
		if (this.timer !== null) {
			window.clearTimeout(this.timer);
			this.timer = null;
		}
	}

	private revokeBlob() {
		if (this.blobUrl) {
			URL.revokeObjectURL(this.blobUrl);
			this.blobUrl = null;
		}
	}
}
