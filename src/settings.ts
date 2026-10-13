import { App, PluginSettingTab, Setting } from "obsidian";
import type MdToPdfPlugin from "./main";

export type PageSize = "A4" | "A5" | "Letter" | "Legal";
export type Orientation = "portrait" | "landscape";
export type Alignment = "left" | "center" | "right";

export interface MdToPdfSettings {
	pageSize: PageSize;
	orientation: Orientation;
	marginTopMm: number;
	marginRightMm: number;
	marginBottomMm: number;
	marginLeftMm: number;

	bodyFont: string;
	bodySizePt: number;
	bodyLineHeight: number;
	paragraphSpacingEm: number;

	headingFont: string;
	h1SizePt: number;
	h2SizePt: number;
	h3SizePt: number;
	headingSpaceBeforeEm: number;
	headingSpaceAfterEm: number;
	pageBreakBeforeH1: boolean;

	codeFont: string;
	codeSizePt: number;

	showHeader: boolean;
	headerText: string;
	headerAlign: Alignment;

	showPageNumbers: boolean;
	pageNumberFormat: string;
	pageNumberAlign: Alignment;
}

export const DEFAULT_SETTINGS: MdToPdfSettings = {
	pageSize: "A4",
	orientation: "portrait",
	marginTopMm: 25,
	marginRightMm: 20,
	marginBottomMm: 25,
	marginLeftMm: 20,

	bodyFont: "Georgia, 'Times New Roman', serif",
	bodySizePt: 11,
	bodyLineHeight: 1.5,
	paragraphSpacingEm: 0.8,

	headingFont: "Helvetica, Arial, sans-serif",
	h1SizePt: 22,
	h2SizePt: 16,
	h3SizePt: 13,
	headingSpaceBeforeEm: 1.2,
	headingSpaceAfterEm: 0.5,
	pageBreakBeforeH1: false,

	codeFont: "Menlo, Consolas, monospace",
	codeSizePt: 9,

	showHeader: true,
	headerText: "{{title}}",
	headerAlign: "left",

	showPageNumbers: true,
	pageNumberFormat: "Page {page} of {pages}",
	pageNumberAlign: "right",
};

type TextKey = "bodyFont" | "headingFont" | "codeFont" | "headerText" | "pageNumberFormat";
type NumberKey =
	| "bodySizePt"
	| "bodyLineHeight"
	| "paragraphSpacingEm"
	| "h1SizePt"
	| "h2SizePt"
	| "h3SizePt"
	| "headingSpaceBeforeEm"
	| "headingSpaceAfterEm"
	| "codeSizePt";
type MarginKey = "marginTopMm" | "marginRightMm" | "marginBottomMm" | "marginLeftMm";

export class MdToPdfSettingTab extends PluginSettingTab {
	plugin: MdToPdfPlugin;

	constructor(app: App, plugin: MdToPdfPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const s = this.plugin.settings;
		const save = () => this.plugin.saveSettings();

		containerEl.createEl("h2", { text: "Page setup" });

		new Setting(containerEl).setName("Page size").addDropdown((d) =>
			d
				.addOptions({ A4: "A4", A5: "A5", Letter: "Letter", Legal: "Legal" })
				.setValue(s.pageSize)
				.onChange(async (v) => {
					s.pageSize = v as PageSize;
					await save();
				}),
		);

		new Setting(containerEl).setName("Orientation").addDropdown((d) =>
			d
				.addOptions({ portrait: "Portrait", landscape: "Landscape" })
				.setValue(s.orientation)
				.onChange(async (v) => {
					s.orientation = v as Orientation;
					await save();
				}),
		);

		this.marginSetting(containerEl, "Top", "marginTopMm");
		this.marginSetting(containerEl, "Right", "marginRightMm");
		this.marginSetting(containerEl, "Bottom", "marginBottomMm");
		this.marginSetting(containerEl, "Left", "marginLeftMm");

		containerEl.createEl("h2", { text: "Body text" });

		this.textSetting(containerEl, "Font family", "bodyFont");
		this.numberSetting(containerEl, "Font size (pt)", "bodySizePt");
		this.numberSetting(containerEl, "Line height", "bodyLineHeight");
		this.numberSetting(containerEl, "Paragraph spacing (em)", "paragraphSpacingEm");

		containerEl.createEl("h2", { text: "Headings" });

		this.textSetting(containerEl, "Heading font family", "headingFont");
		this.numberSetting(containerEl, "H1 size (pt)", "h1SizePt");
		this.numberSetting(containerEl, "H2 size (pt)", "h2SizePt");
		this.numberSetting(containerEl, "H3 size (pt)", "h3SizePt");
		this.numberSetting(containerEl, "Space before headings (em)", "headingSpaceBeforeEm");
		this.numberSetting(containerEl, "Space after headings (em)", "headingSpaceAfterEm");
		new Setting(containerEl).setName("Start each H1 on a new page").addToggle((t) =>
			t.setValue(s.pageBreakBeforeH1).onChange(async (v) => {
				s.pageBreakBeforeH1 = v;
				await save();
			}),
		);

		containerEl.createEl("h2", { text: "Code" });

		this.textSetting(containerEl, "Code font family", "codeFont");
		this.numberSetting(containerEl, "Code size (pt)", "codeSizePt");

		containerEl.createEl("h2", { text: "Header and footer" });

		new Setting(containerEl).setName("Show header").addToggle((t) =>
			t.setValue(s.showHeader).onChange(async (v) => {
				s.showHeader = v;
				await save();
			}),
		);
		this.textSetting(containerEl, "Header text ({{title}}, {{date}})", "headerText");
		new Setting(containerEl).setName("Show page numbers").addToggle((t) =>
			t.setValue(s.showPageNumbers).onChange(async (v) => {
				s.showPageNumbers = v;
				await save();
			}),
		);
		this.textSetting(containerEl, "Page number format ({page}, {pages})", "pageNumberFormat");
	}

	private marginSetting(el: HTMLElement, side: string, key: MarginKey) {
		new Setting(el).setName(`${side} margin (mm)`).addText((t) =>
			t.setValue(String(this.plugin.settings[key])).onChange(async (v) => {
				const n = parseFloat(v);
				if (!Number.isNaN(n) && n >= 0) {
					this.plugin.settings[key] = n;
					await this.plugin.saveSettings();
				}
			}),
		);
	}

	private textSetting(el: HTMLElement, name: string, key: TextKey) {
		new Setting(el).setName(name).addText((t) =>
			t.setValue(this.plugin.settings[key]).onChange(async (v) => {
				this.plugin.settings[key] = v;
				await this.plugin.saveSettings();
			}),
		);
	}

	private numberSetting(el: HTMLElement, name: string, key: NumberKey) {
		new Setting(el).setName(name).addText((t) =>
			t.setValue(String(this.plugin.settings[key])).onChange(async (v) => {
				const n = parseFloat(v);
				if (!Number.isNaN(n) && n > 0) {
					this.plugin.settings[key] = n;
					await this.plugin.saveSettings();
				}
			}),
		);
	}
}
