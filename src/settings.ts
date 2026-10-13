import { App, PluginSettingTab, Setting } from "obsidian";
import type MdToPdfPlugin from "./main";
import {
	BUNDLED_FAMILIES,
	COLLECTION_LABELS,
	bundledFontKey,
	faceLabel,
	findBundledFamily,
	loadPreviewFont,
	resolveFontCss,
} from "./fonts";
import { applyTheme, snapshotTheme } from "./themes";

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
	bodyWeight: number;
	bodyItalic: boolean;
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
	h1Weight: number;
	h2Weight: number;
	h3Weight: number;
	h1Italic: boolean;
	h2Italic: boolean;
	h3Italic: boolean;
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
	bodyWeight: 400,
	bodyItalic: false,
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
	h1Weight: 400,
	h2Weight: 400,
	h3Weight: 400,
	h1Italic: false,
	h2Italic: false,
	h3Italic: false,
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

type WeightKey = "h1Weight" | "h2Weight" | "h3Weight" | "bodyWeight";
type ItalicKey = "h1Italic" | "h2Italic" | "h3Italic" | "bodyItalic";

/** Weights offered for system fonts, which have no weight list of their own. */
const SYSTEM_WEIGHTS: Array<[number, string]> = [
	[300, "Light"],
	[400, "Regular"],
	[500, "Medium"],
	[600, "Semibold"],
	[700, "Bold"],
	[800, "Extra bold"],
];

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

		new Setting(containerEl).setName("Page").setHeading();
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

		new Setting(containerEl).setName("Body text").setHeading();
		this.fontSetting(containerEl, "Body font", "bodyFont");
		this.weightSetting(containerEl, "Body weight", "bodyFont", null, "bodyWeight");
		new Setting(containerEl).setName("Body italic").addToggle((t) =>
			t.setValue(s.bodyItalic).onChange(async (v) => {
				s.bodyItalic = v;
				await save();
			}),
		);
		this.numberSetting(containerEl, "Font size (pt)", "bodySizePt");
		this.numberSetting(containerEl, "Line height", "bodyLineHeight");
		this.numberSetting(containerEl, "Paragraph spacing (em)", "paragraphSpacingEm");

		new Setting(containerEl).setName("Headings").setHeading();
		this.fontSetting(containerEl, "Heading font (all levels)", "headingFont");
		this.numberSetting(containerEl, "Space before headings (em)", "headingSpaceBeforeEm");
		this.numberSetting(containerEl, "Space after headings (em)", "headingSpaceAfterEm");
		this.headingLevel(containerEl, "H1", "h1Font", "h1SizePt", "h1OverrideFont", "h1Weight", "h1Italic", true);
		this.headingLevel(containerEl, "H2", "h2Font", "h2SizePt", "h2OverrideFont", "h2Weight", "h2Italic");
		this.headingLevel(containerEl, "H3", "h3Font", "h3SizePt", "h3OverrideFont", "h3Weight", "h3Italic");

		new Setting(containerEl).setName("Page breaks").setHeading();
		new Setting(containerEl).setName("Page break at horizontal rule (---)").addToggle((t) =>
			t.setValue(s.pageBreakOnHr).onChange(async (v) => {
				s.pageBreakOnHr = v;
				await save();
			}),
		);

		new Setting(containerEl).setName("Code").setHeading();
		this.fontSetting(containerEl, "Code font", "codeFont");
		this.numberSetting(containerEl, "Code size (pt)", "codeSizePt");

		new Setting(containerEl).setName("Header and footer").setHeading();
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

		new Setting(containerEl).setName("Themes").setHeading();
		this.themeSettings(containerEl);
	}

	/** Save, load, and delete named themes, and reset all styling to defaults. */
	private themeSettings(el: HTMLElement) {
		const themes = this.plugin.themes;
		let nameValue = "";

		new Setting(el)
			.setName("Save current style as theme")
			.setDesc("Stores the current page, font, heading, code, and header/footer settings.")
			.addText((t) => t.setPlaceholder("Theme name").onChange((v) => (nameValue = v.trim())))
			.addButton((b) =>
				b.setButtonText("Save").setCta().onClick(async () => {
					if (!nameValue) return;
					const snapshot = snapshotTheme(this.plugin.settings);
					const existing = themes.find((t) => t.name === nameValue);
					if (existing) existing.settings = snapshot;
					else themes.push({ name: nameValue, settings: snapshot });
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		if (themes.length === 0) {
			new Setting(el).setName("No saved themes").setDesc("Saved themes appear here.");
		} else {
			let selected = themes[0].name;
			new Setting(el)
				.setName("Saved themes")
				.addDropdown((d) => {
					for (const t of themes) d.addOption(t.name, t.name);
					d.setValue(selected).onChange((v) => (selected = v));
				})
				.addButton((b) =>
					b.setButtonText("Load").onClick(async () => {
						const theme = themes.find((t) => t.name === selected);
						if (!theme) return;
						applyTheme(this.plugin.settings, theme.settings);
						await this.plugin.saveSettings();
						this.display();
					}),
				)
				.addButton((b) =>
					b.setButtonText("Delete").setWarning().onClick(async () => {
						const idx = themes.findIndex((t) => t.name === selected);
						if (idx < 0) return;
						themes.splice(idx, 1);
						await this.plugin.saveSettings();
						this.display();
					}),
				);
		}

		new Setting(el)
			.setName("Reset to defaults")
			.setDesc("Restores the built-in style. Saved themes are kept.")
			.addButton((b) =>
				b.setButtonText("Reset").onClick(async () => {
					applyTheme(this.plugin.settings, snapshotTheme(DEFAULT_SETTINGS));
					await this.plugin.saveSettings();
					this.display();
				}),
			);
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

	/**
	 * Font picker for one text role. One dropdown lists system stacks and bundled families.
	 * The preview lists every face of the chosen family with its label. Weight and italic are
	 * Weight and italic have their own rows.
	 */
	private fontSetting(el: HTMLElement, name: string, key: TextKey) {
		new Setting(el).setName(name).addDropdown((d) => {
			const current = this.plugin.settings[key];
			const select = d.selectEl;
			select.empty();

			const system = document.createElement("optgroup");
			system.label = COLLECTION_LABELS.system;
			for (const [value, label] of Object.entries(FONT_OPTIONS)) {
				system.appendChild(new Option(label, value));
			}
			select.appendChild(system);

			for (const collection of ["tg", "league"] as const) {
				const group = document.createElement("optgroup");
				group.label = COLLECTION_LABELS[collection];
				for (const family of BUNDLED_FAMILIES.filter((f) => f.collection === collection)) {
					group.appendChild(new Option(family.name, bundledFontKey(family)));
				}
				select.appendChild(group);
			}

			const known = Array.from(select.options).some((o) => o.value === current);
			if (!known) select.insertBefore(new Option(current, current), select.firstChild);

			d.setValue(current).onChange(async (v) => {
				this.plugin.settings[key] = v;
				await this.plugin.saveSettings();
				this.display();
			});
		});

		this.fontPreview(el, this.plugin.settings[key]);
	}

	/**
	 * Labeled preview lines for the chosen font. Bundled families show each face (Regular, Italic,
	 * Bold, Bold Italic, and any other weights). System stacks show a single regular line.
	 */
	private fontPreview(el: HTMLElement, value: string) {
		const box = el.createDiv({ cls: "md2pdf-font-preview" });
		const family = findBundledFamily(value);

		if (!family) {
			this.previewLine(box, "Regular", resolveFontCss(value), "normal", 400);
			return;
		}

		const status = box.createDiv({ cls: "md2pdf-font-preview-status", text: "Loading faces…" });
		loadPreviewFont(this.app.vault.adapter, this.plugin.manifest.dir ?? "", family)
			.then(() => {
				status.remove();
				for (const face of family.faces) {
					this.previewLine(box, faceLabel(face), resolveFontCss(value), face.italic ? "italic" : "normal", face.weight);
				}
			})
			.catch((err) => {
				console.error("[md-to-pdf] font preview failed", err);
				status.setText("Preview unavailable. The font file could not be read.");
			});
	}

	private previewLine(box: HTMLElement, label: string, family: string, style: string, weight: number) {
		const row = box.createDiv({ cls: "md2pdf-font-preview-row" });
		row.createSpan({ cls: "md2pdf-font-preview-label", text: label });
		const sample = row.createSpan({ cls: "md2pdf-font-preview-sample", text: "The quick brown fox jumps over the lazy dog." });
		sample.style.fontFamily = family;
		sample.style.fontStyle = style;
		sample.style.fontWeight = String(weight);
	}

	/**
	 * One heading level: an own-font switch, the level's font (when the switch is on), weight, italic,
	 * and size. H1 also gets the new-page toggle on its size row.
	 */
	private headingLevel(
		el: HTMLElement,
		level: string,
		fontKey: TextKey,
		sizeKey: NumberKey,
		overrideKey: BoolKey,
		weightKey: WeightKey,
		italicKey: ItalicKey,
		withPageBreak = false,
	) {
		new Setting(el).setName(`${level}`).setDesc("Uses its own font instead of the heading font.").addToggle((t) =>
			t.setValue(this.plugin.settings[overrideKey]).onChange(async (v) => {
				this.plugin.settings[overrideKey] = v;
				await this.plugin.saveSettings();
				this.display();
			}),
		);
		if (this.plugin.settings[overrideKey]) {
			this.fontSetting(el, `${level} font`, fontKey);
		}
		this.weightSetting(el, `${level} weight`, fontKey, overrideKey, weightKey);
		new Setting(el).setName(`${level} italic`).addToggle((t) =>
			t.setValue(this.plugin.settings[italicKey]).onChange(async (v) => {
				this.plugin.settings[italicKey] = v;
				await this.plugin.saveSettings();
			}),
		);
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

	/**
	 * Weight dropdown for a text role. Bundled families list only the weights they include. System
	 * fonts list the common weights. Lists the weight the font's own family provides.
	 */
	private weightSetting(el: HTMLElement, name: string, fontKey: TextKey, overrideKey: BoolKey | null, weightKey: WeightKey) {
		const fontValue = overrideKey && !this.plugin.settings[overrideKey] ? this.plugin.settings.headingFont : this.plugin.settings[fontKey];
		const family = findBundledFamily(fontValue);
		const options: Array<[number, string]> = family
			? Array.from(new Map(family.faces.map((f) => [f.weight, faceLabel({ ...f, italic: false })])).entries()).sort(
					(a, b) => a[0] - b[0],
				)
			: SYSTEM_WEIGHTS;

		const current = this.plugin.settings[weightKey];
		if (!options.some(([w]) => w === current)) options.push([current, `Weight ${current}`]);

		new Setting(el).setName(name).addDropdown((d) => {
			for (const [w, label] of options) d.addOption(String(w), label);
			d.setValue(String(current)).onChange(async (v) => {
				this.plugin.settings[weightKey] = parseInt(v, 10);
				await this.plugin.saveSettings();
			});
		});
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
