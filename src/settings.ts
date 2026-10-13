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
	h1OverrideFont: boolean;
	h2OverrideFont: boolean;
	h3OverrideFont: boolean;
	h1Font: string;
	h2Font: string;
	h3Font: string;
	h1SizePt: number;
	h2SizePt: number;
	h3SizePt: number;
	headingSpaceBeforeEm: number;
	headingSpaceAfterEm: number;
	pageBreakBeforeH1: boolean;
	pageBreakOnHr: boolean;

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
	h1OverrideFont: false,
	h2OverrideFont: false,
	h3OverrideFont: false,
	h1Font: "Helvetica, Arial, sans-serif",
	h2Font: "Helvetica, Arial, sans-serif",
	h3Font: "Helvetica, Arial, sans-serif",
	h1SizePt: 22,
	h2SizePt: 16,
	h3SizePt: 13,
	headingSpaceBeforeEm: 1.2,
	headingSpaceAfterEm: 0.5,
	pageBreakBeforeH1: false,
	pageBreakOnHr: true,

	codeFont: "Menlo, Consolas, monospace",
	codeSizePt: 9,

	showHeader: true,
	headerText: "{{title}}",
	headerAlign: "left",

	showPageNumbers: true,
	pageNumberFormat: "Page {page} of {pages}",
	pageNumberAlign: "right",
};

type TextKey =
	| "bodyFont"
	| "headingFont"
	| "h1Font"
	| "h2Font"
	| "h3Font"
	| "codeFont"
	| "headerText"
	| "pageNumberFormat";

/** Fonts offered in the dropdowns. Each value is a CSS font-family stack. */
export const FONT_OPTIONS: Record<string, string> = {
	"Georgia, 'Times New Roman', serif": "Georgia (serif)",
	"'Times New Roman', Times, serif": "Times New Roman",
	"Palatino, 'Palatino Linotype', serif": "Palatino",
	"'Book Antiqua', Palatino, serif": "Book Antiqua",
	"Garamond, 'EB Garamond', serif": "Garamond",
	"'Charter', 'Bitstream Charter', serif": "Charter",
	"Helvetica, Arial, sans-serif": "Helvetica / Arial",
	"'Helvetica Neue', Helvetica, Arial, sans-serif": "Helvetica Neue",
	"Inter, 'Helvetica Neue', Arial, sans-serif": "Inter",
	"Avenir, 'Avenir Next', sans-serif": "Avenir",
	"'Gill Sans', 'Gill Sans MT', sans-serif": "Gill Sans",
	"Verdana, Geneva, sans-serif": "Verdana",
	"Menlo, Consolas, monospace": "Menlo / Consolas",
	"'Courier New', Courier, monospace": "Courier New",
	"'SF Mono', Monaco, monospace": "SF Mono",
};
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
type BoolKey = "h1OverrideFont" | "h2OverrideFont" | "h3OverrideFont";
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

		this.fontSetting(containerEl, "Font family", "bodyFont");
		this.numberSetting(containerEl, "Font size (pt)", "bodySizePt");
		this.numberSetting(containerEl, "Line height", "bodyLineHeight");
		this.numberSetting(containerEl, "Paragraph spacing (em)", "paragraphSpacingEm");

		containerEl.createEl("h2", { text: "Headings" });

		this.fontSetting(containerEl, "Heading font (all levels)", "headingFont");
		this.headingSetting(containerEl, "H1", "h1Font", "h1SizePt", "h1OverrideFont", true);
		this.headingSetting(containerEl, "H2", "h2Font", "h2SizePt", "h2OverrideFont");
		this.headingSetting(containerEl, "H3", "h3Font", "h3SizePt", "h3OverrideFont");
		this.numberSetting(containerEl, "Space before headings (em)", "headingSpaceBeforeEm");
		this.numberSetting(containerEl, "Space after headings (em)", "headingSpaceAfterEm");
		new Setting(containerEl).setName("Page breaks").setHeading();
		new Setting(containerEl).setName("Page break at horizontal rule (---)").addToggle((t) =>
			t.setValue(s.pageBreakOnHr).onChange(async (v) => {
				s.pageBreakOnHr = v;
				await save();
			}),
		);

		containerEl.createEl("h2", { text: "Code" });

		this.fontSetting(containerEl, "Code font family", "codeFont");
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

	/** Font dropdown. Includes the current value if it is not in the preset list. */
	private fontSetting(el: HTMLElement, name: string, key: TextKey) {
		new Setting(el).setName(name).addDropdown((d) => {
			const current = this.plugin.settings[key];
			const options: Record<string, string> = { ...FONT_OPTIONS };
			if (!(current in options)) options[current] = current;
			d.addOptions(options)
				.setValue(current)
				.onChange(async (v) => {
					this.plugin.settings[key] = v;
					await this.plugin.saveSettings();
				});
		});
	}

	/**
	 * One heading level: an override switch, the level's own font (used only when the switch is on),
	 * and size. H1 also gets the new-page toggle on its size row.
	 */
	private headingSetting(
		el: HTMLElement,
		level: string,
		fontKey: TextKey,
		sizeKey: NumberKey,
		overrideKey: BoolKey,
		withPageBreak = false,
	) {
		new Setting(el).setName(`${level} uses its own font`).addToggle((t) =>
			t.setValue(this.plugin.settings[overrideKey]).onChange(async (v) => {
				this.plugin.settings[overrideKey] = v;
				await this.plugin.saveSettings();
				this.display();
			}),
		);
		if (this.plugin.settings[overrideKey]) this.fontSetting(el, `${level} font`, fontKey);
		const row = new Setting(el).setName(`${level} size (pt)`).addText((t) =>
			t.setValue(String(this.plugin.settings[sizeKey])).onChange(async (v) => {
				const n = parseFloat(v);
				if (!Number.isNaN(n) && n > 0) {
					this.plugin.settings[sizeKey] = n;
					await this.plugin.saveSettings();
				}
			}),
		);
		if (withPageBreak) {
			row.addToggle((t) =>
				t
					.setTooltip(`Start each ${level} on a new page`)
					.setValue(this.plugin.settings.pageBreakBeforeH1)
					.onChange(async (v) => {
						this.plugin.settings.pageBreakBeforeH1 = v;
						await this.plugin.saveSettings();
					}),
			);
		}
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
