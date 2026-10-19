import { App, PluginSettingTab, Setting } from "obsidian";
import type MdToPdfPlugin from "./main";
import {
	findBundledFamily,
	fontKeysInUse,
	loadPreviewFont,
} from "./fonts";
import { contentCss } from "./document";
import { LENGTH_UNIT_LABELS, LengthUnit, convertLength } from "./length";
import { applyTheme, snapshotTheme } from "./themes";
import { renderStyleEditor } from "./style-editor";
import { DEFAULT_PARAGRAPH_STYLES, type StyleId } from "./paragraph-styles";

export type PageSize = "A4" | "A5" | "Letter" | "Legal";
export type Orientation = "portrait" | "landscape";
export type Alignment = "left" | "center" | "right";
export type MarginUnit = "mm" | "cm" | "in" | "pt" | "pc";
/** Line height is a multiplier of the font size (em) or an absolute size (pt). */
export type LineHeightUnit = "em" | "pt";

/** Millimetres per one unit. */
export const MM_PER_UNIT: Record<MarginUnit, number> = {
	mm: 1,
	cm: 10,
	in: 25.4,
	pt: 25.4 / 72,
	pc: (25.4 / 72) * 12,
};

export const MARGIN_UNIT_LABELS: Record<MarginUnit, string> = {
	mm: "Millimetres (mm)",
	cm: "Centimetres (cm)",
	in: "Inches (in)",
	pt: "Points (pt)",
	pc: "Picas (pc)",
};

export interface MdToPdfSettings {
	pageSize: PageSize;
	orientation: Orientation;
	marginTopMm: number;
	marginRightMm: number;
	marginBottomMm: number;
	marginLeftMm: number;
	/** Display unit for the margin fields. Margins are always stored in mm. */
	marginUnit: MarginUnit;

	bodyFont: string;
	bodyWeight: number;
	bodyItalic: boolean;
	bodySizePt: number;
	bodyLineHeight: number;
	bodyLineHeightUnit: LineHeightUnit;
	paragraphSpacingEm: number;
	/** Display unit for paragraph spacing. The value is stored in em. */
	paragraphSpacingUnit: LengthUnit;

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
	h1SpaceBeforeEm: number;
	h1SpaceAfterEm: number;
	h1SpaceBeforeUnit: LengthUnit;
	h1SpaceAfterUnit: LengthUnit;
	h2SpaceBeforeEm: number;
	h2SpaceAfterEm: number;
	h2SpaceBeforeUnit: LengthUnit;
	h2SpaceAfterUnit: LengthUnit;
	h3SpaceBeforeEm: number;
	h3SpaceAfterEm: number;
	h3SpaceBeforeUnit: LengthUnit;
	h3SpaceAfterUnit: LengthUnit;
	/** Space before and after H4 to H6. */
	headingSpaceBeforeEm: number;
	headingSpaceAfterEm: number;
	/** Display units for heading spacing. Values are stored in em. */
	headingSpaceBeforeUnit: LengthUnit;
	headingSpaceAfterUnit: LengthUnit;
	headingLineHeight: number;
	headingLineHeightUnit: LineHeightUnit;
	pageBreakBeforeH1: boolean;
	pageBreakOnHr: boolean;

	codeFont: string;
	codeSizePt: number;
	/** Display units for font sizes and the grid. Values are stored in pt. */
	bodySizeUnit: LengthUnit;
	h1SizeUnit: LengthUnit;
	h2SizeUnit: LengthUnit;
	h3SizeUnit: LengthUnit;
	codeSizeUnit: LengthUnit;
	baselineGridUnit: LengthUnit;

	showHeader: boolean;
	headerText: string;
	headerAlign: Alignment;

	showPageNumbers: boolean;
	pageNumberFormat: string;
	pageNumberAlign: Alignment;

	/** Snap body text and heading spacing to a vertical baseline grid. */
	baselineGridEnabled: boolean;
	/** Baseline grid unit in pt. Usually body size x line height. */
	baselineGridPt: number;
	/** Avoid single words alone on the last line of a paragraph (text-wrap: pretty). */
	textWrapPretty: boolean;
	/** Hyphenate words at line ends using the browser's dictionary. */
	hyphenation: boolean;
	/** Language for hyphenation and line-breaking (BCP 47 tag, e.g. en-US). */
	hyphenLang: string;
	justify: boolean;
	ligatures: boolean;
	smallCapsHeadings: boolean;
	oldstyleFigures: boolean;

	/** Re-render the preview pane when the note or settings change. Not part of themes. */
	livePreview: boolean;
	/** Delay after the last change before the preview re-renders. Not part of themes. */
	livePreviewDelayMs: number;
}

export const DEFAULT_SETTINGS: MdToPdfSettings = {
	pageSize: "A4",
	orientation: "portrait",
	marginTopMm: 25,
	marginRightMm: 20,
	marginBottomMm: 25,
	marginLeftMm: 20,
	marginUnit: "mm",

	bodyFont: "Georgia, 'Times New Roman', serif",
	bodyWeight: 400,
	bodyItalic: false,
	bodySizePt: 11,
	bodyLineHeight: 1.5,
	bodyLineHeightUnit: "em",
	paragraphSpacingEm: 0.8,
	paragraphSpacingUnit: "em",
	baselineGridEnabled: false,
	baselineGridPt: 16.5,
	textWrapPretty: true,
	hyphenation: false,
	hyphenLang: "en-US",
	justify: false,
	ligatures: true,
	smallCapsHeadings: false,
	oldstyleFigures: false,

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
	h1SpaceBeforeEm: 1.2,
	h1SpaceAfterEm: 0.5,
	h1SpaceBeforeUnit: "em",
	h1SpaceAfterUnit: "em",
	h2SpaceBeforeEm: 1.2,
	h2SpaceAfterEm: 0.5,
	h2SpaceBeforeUnit: "em",
	h2SpaceAfterUnit: "em",
	h3SpaceBeforeEm: 1.2,
	h3SpaceAfterEm: 0.5,
	h3SpaceBeforeUnit: "em",
	h3SpaceAfterUnit: "em",
	headingSpaceBeforeEm: 1.2,
	headingSpaceAfterEm: 0.5,
	headingSpaceBeforeUnit: "em",
	headingSpaceAfterUnit: "em",
	headingLineHeight: 1,
	headingLineHeightUnit: "em",
	pageBreakBeforeH1: false,
	pageBreakOnHr: true,

	codeFont: "Menlo, Consolas, monospace",
	codeSizePt: 9,
	bodySizeUnit: "pt",
	h1SizeUnit: "pt",
	h2SizeUnit: "pt",
	h3SizeUnit: "pt",
	codeSizeUnit: "pt",
	baselineGridUnit: "pt",

	showHeader: true,
	headerText: "{{title}}",
	headerAlign: "left",

	showPageNumbers: true,
	pageNumberFormat: "Page {page} of {pages}",
	pageNumberAlign: "right",
	livePreview: true,
	livePreviewDelayMs: 1000,
};

type TextKey =
	| "bodyFont"
	| "headingFont"
	| "h1Font"
	| "h2Font"
	| "h3Font"
	| "codeFont"
	| "headerText"
	| "hyphenLang"
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
type UnitKey =
	| "h1SpaceBeforeUnit"
	| "h1SpaceAfterUnit"
	| "h2SpaceBeforeUnit"
	| "h2SpaceAfterUnit"
	| "h3SpaceBeforeUnit"
	| "h3SpaceAfterUnit"
	| "paragraphSpacingUnit"
	| "headingSpaceBeforeUnit"
	| "headingSpaceAfterUnit"
	| "bodySizeUnit"
	| "h1SizeUnit"
	| "h2SizeUnit"
	| "h3SizeUnit"
	| "codeSizeUnit"
	| "baselineGridUnit";
type NumberKey =
	| "h1SpaceBeforeEm"
	| "h1SpaceAfterEm"
	| "h2SpaceBeforeEm"
	| "h2SpaceAfterEm"
	| "h3SpaceBeforeEm"
	| "h3SpaceAfterEm"
	| "bodySizePt"
	| "bodyLineHeight"
	| "paragraphSpacingEm"
	| "baselineGridPt"
	| "h1SizePt"
	| "h2SizePt"
	| "h3SizePt"
	| "headingSpaceBeforeEm"
	| "headingSpaceAfterEm"
	| "headingLineHeight"
	| "codeSizePt";
type BoolTypographyKey =
	| "baselineGridEnabled"
	| "textWrapPretty"
	| "justify"
	| "hyphenation"
	| "ligatures"
	| "smallCapsHeadings"
	| "oldstyleFigures";
/** Units for fields stored in pt (font sizes, grid). */
const ABSOLUTE_UNITS: LengthUnit[] = ["pt", "pc", "in", "cm", "mm"];


type MarginKey = "marginTopMm" | "marginRightMm" | "marginBottomMm" | "marginLeftMm";

type WeightKey = "h1Weight" | "h2Weight" | "h3Weight" | "bodyWeight";
type ItalicKey = "h1Italic" | "h2Italic" | "h3Italic" | "bodyItalic";

/** Sample page for the theme preview. Covers every heading level and the common text styles. */
const THEME_PREVIEW_HTML = `
<h1>Lorem Ipsum Dolor</h1>
<p>Lorem ipsum dolor sit amet, <strong>consectetur adipiscing</strong> elit, sed do <em>eiusmod tempor</em> incididunt ut labore et dolore magna aliqua. <a href="#">Ut enim ad minim</a> veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
<h2>Duis Aute Irure</h2>
<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
<h3>Sed Ut Perspiciatis</h3>
<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis.</p>
<h4>Nemo Enim Ipsam</h4>
<p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.</p>
<h5>Neque Porro Quisquam</h5>
<p>Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.</p>
<p>Extraordinarily unbelievable interdisciplinary professionalization continues to be notoriously difficult to typeset without considerable forethought and careful measurement across many repeated paragraphs of running text.</p>
<h6>Quis Autem Vel Eum</h6>
<p>Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae.</p>
<p><em>Italic text</em>, <strong>bold text</strong>, and <code>inline code</code> sit beside each other.</p>
<ul>
<li>Lorem ipsum dolor sit amet</li>
<li>Consectetur adipiscing elit</li>
<li>Sed do eiusmod tempor</li>
</ul>
<ol>
<li>Ut enim ad minim veniam</li>
<li>Quis nostrud exercitation</li>
</ol>
<blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque lacinia mauris at nulla.</p></blockquote>
<pre><code>const lorem = "ipsum dolor sit amet";
console.log(lorem);</code></pre>
<table>
<thead><tr><th>Lorem</th><th>Ipsum</th><th>Dolor</th></tr></thead>
<tbody>
<tr><td>Sit amet</td><td>Consectetur</td><td>Adipiscing</td></tr>
<tr><td>Sed do</td><td>Eiusmod</td><td>Tempor</td></tr>
</tbody>
</table>
<hr>
<p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
`;

export class MdToPdfSettingTab extends PluginSettingTab {
	plugin: MdToPdfPlugin;
	private tab: "settings" | "preview" = "settings";
	private styleState = { selected: "body" as StyleId };

	constructor(app: App, plugin: MdToPdfPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private renderTabs(el: HTMLElement) {
		const bar = el.createDiv({ cls: "md2pdf-tabs" });
		const tabs: Array<["settings" | "preview", string]> = [
			["settings", "Settings"],
			["preview", "Theme preview"],
		];
		for (const [id, label] of tabs) {
			const btn = bar.createEl("button", { text: label, cls: this.tab === id ? "mod-cta" : undefined });
			btn.addEventListener("click", () => {
				if (this.tab === id) return;
				this.tab = id;
				this.display();
			});
		}
	}

	/** Sample page rendered with the same print CSS as export, so it shows what the PDF will look like. */
	private renderThemePreview(el: HTMLElement) {
		const s = this.plugin.settings;
		const wrap = el.createDiv({ cls: "md2pdf-theme-preview" });
		const status = wrap.createDiv({ cls: "md2pdf-font-preview-status", text: "Loading fonts…" });
		wrap.createEl("style", { text: contentCss(s, this.plugin.styles) });
		const page = wrap.createDiv({ cls: "md2pdf-root markdown-rendered" });
		page.innerHTML = THEME_PREVIEW_HTML;

		const families = fontKeysInUse(this.plugin.styles)
			.map((key) => findBundledFamily(key))
			.filter((f): f is NonNullable<typeof f> => f !== undefined);
		Promise.all(families.map((f) => loadPreviewFont(this.app.vault.adapter, this.plugin.manifest.dir ?? "", f)))
			.then(() => status.remove())
			.catch((err) => {
				console.error("[md-to-pdf] theme preview fonts failed", err);
				status.setText("Some fonts could not be loaded for this preview.");
			});
	}

	/** Re-renders the page while keeping the scroll position, so changing a control doesn't jump to the top. */
	private refresh(): void {
		const scroller = this.containerEl.closest(".vertical-tab-content") as HTMLElement | null;
		const top = scroller?.scrollTop ?? 0;
		this.display();
		if (!scroller) return;
		scroller.scrollTop = top;
		// Font previews load asynchronously and grow the page; restore again once they settle.
		window.setTimeout(() => (scroller.scrollTop = top), 300);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.renderTabs(containerEl);
		if (this.tab === "preview") {
			this.renderThemePreview(containerEl);
			return;
		}
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
		new Setting(containerEl).setName("Margin unit").addDropdown((d) => {
			for (const unit of Object.keys(MM_PER_UNIT) as MarginUnit[]) {
				d.addOption(unit, MARGIN_UNIT_LABELS[unit]);
			}
			d.setValue(s.marginUnit).onChange(async (v) => {
				s.marginUnit = v as MarginUnit;
				await save();
				this.refresh();
			});
		});
		this.marginSetting(containerEl, "Top", "marginTopMm");
		this.marginSetting(containerEl, "Right", "marginRightMm");
		this.marginSetting(containerEl, "Bottom", "marginBottomMm");
		this.marginSetting(containerEl, "Left", "marginLeftMm");

		new Setting(containerEl).setName("Paragraph styles").setHeading();
		this.boolSetting(containerEl, "Baseline grid", "Snap body and heading spacing to a vertical rhythm.", "baselineGridEnabled");
		this.lengthSetting(containerEl, "Baseline grid unit", "baselineGridPt", "baselineGridUnit", ABSOLUTE_UNITS, this.plugin.settings.bodySizePt);
		this.textSetting(containerEl, "Hyphenation language", "hyphenLang");
		renderStyleEditor(containerEl, {
			styles: this.plugin.styles,
			save: () => this.plugin.saveSettings(),
			refresh: () => this.refresh(),
		}, this.styleState);

		new Setting(containerEl).setName("Page breaks").setHeading();
		new Setting(containerEl).setName("Page break at horizontal rule (---)").addToggle((t) =>
			t.setValue(s.pageBreakOnHr).onChange(async (v) => {
				s.pageBreakOnHr = v;
				await save();
			}),
		);

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

		new Setting(containerEl).setName("PDF preview").setHeading();
		new Setting(containerEl).setName("Live update").setDesc("Re-render the preview pane when the note or settings change.").addToggle((t) =>
			t.setValue(s.livePreview).onChange(async (v) => {
				s.livePreview = v;
				await save();
			}),
		);
		new Setting(containerEl).setName("Update delay (ms)").setDesc("Wait this long after the last change before re-rendering.").addText((t) =>
			t.setValue(String(s.livePreviewDelayMs)).onChange(async (v) => {
				const n = parseInt(v, 10);
				if (!Number.isNaN(n) && n >= 0) {
					s.livePreviewDelayMs = n;
					await save();
				}
			}),
		);

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
					const snapshot = snapshotTheme(this.plugin.settings, this.plugin.styles);
					const existing = themes.find((t) => t.name === nameValue);
					if (existing) existing.settings = snapshot;
					else themes.push({ name: nameValue, settings: snapshot });
					await this.plugin.saveSettings();
					this.refresh();
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
						this.plugin.styles = applyTheme(this.plugin.settings, theme.settings);
						await this.plugin.saveSettings();
						this.refresh();
					}),
				)
				.addButton((b) =>
					b.setButtonText("Delete").setWarning().onClick(async () => {
						const idx = themes.findIndex((t) => t.name === selected);
						if (idx < 0) return;
						themes.splice(idx, 1);
						await this.plugin.saveSettings();
						this.refresh();
					}),
				);
		}

		new Setting(el)
			.setName("Reset to defaults")
			.setDesc("Restores the built-in style. Saved themes are kept.")
			.addButton((b) =>
				b.setButtonText("Reset").onClick(async () => {
					this.plugin.styles = applyTheme(this.plugin.settings, snapshotTheme(DEFAULT_SETTINGS, DEFAULT_PARAGRAPH_STYLES));
					await this.plugin.saveSettings();
					this.refresh();
				}),
			);
	}

	private marginSetting(el: HTMLElement, side: string, key: MarginKey) {
		const unit = this.plugin.settings.marginUnit;
		const factor = MM_PER_UNIT[unit];
		const decimals = unit === "mm" || unit === "cm" ? 1 : 2;
		const shown = +(this.plugin.settings[key] / factor).toFixed(decimals);
		new Setting(el).setName(`${side} margin (${unit})`).addText((t) =>
			t.setValue(String(shown)).onChange(async (v) => {
				const n = parseFloat(v);
				if (!Number.isNaN(n) && n >= 0) {
					this.plugin.settings[key] = n * factor;
					await this.plugin.saveSettings();
				}
			}),
		);
	}

	/**
	 * Font picker for one text role. One dropdown lists system stacks and bundled families.
	 * The preview lists every face of the chosen family with its label. Each face has a radio button
	 * that sets the weight and italic for that role.
	 */
	/**
	 * Labeled preview lines for the chosen font, drawn at the role's size. Bundled families show each
	 * face. When a weight key is given, each upright face gets a radio button that selects that weight.
	 * System stacks show a single regular line.
	 */
	/**
	 * One heading level: an own-font switch, the level's font (when the switch is on), weight, italic,
	 * and size. H1 also gets the new-page toggle on its size row.
	 */
	/** Space before and after one heading level. */
	/**
	 * Weight dropdown for a text role. Bundled families choose their weight with radio buttons in the
	 * font preview instead, so this only handles system fonts.
	 */
	private textSetting(el: HTMLElement, name: string, key: TextKey) {
		new Setting(el).setName(name).addText((t) =>
			t.setValue(this.plugin.settings[key]).onChange(async (v) => {
				this.plugin.settings[key] = v;
				await this.plugin.saveSettings();
			}),
		);
	}

	private boolSetting(el: HTMLElement, name: string, desc: string, key: BoolTypographyKey) {
		new Setting(el).setName(name).setDesc(desc).addToggle((t) =>
			t.setValue(this.plugin.settings[key]).onChange(async (v) => {
				this.plugin.settings[key] = v;
				await this.plugin.saveSettings();
			}),
		);
	}

	/** Line height value with a dropdown for its unit (em multiplier or pt). */
	/**
	 * A length field with a unit dropdown. The value is stored in its canonical unit (pt or em)
	 * and shown in the selected unit. Converting an em value to an absolute unit needs the font
	 * size it multiplies, passed as `basePt`.
	 */
	private lengthSetting(
		el: HTMLElement,
		name: string,
		key: NumberKey,
		unitKey: UnitKey,
		units: LengthUnit[],
		basePt: number,
	): Setting {
		const s = this.plugin.settings;
		const canonical: LengthUnit = units.includes("em") ? "em" : "pt";
		const setting = new Setting(el).setName(name);
		const show = () => {
			const unit = s[unitKey];
			const v = convertLength(s[key], canonical, unit, basePt);
			return String(Math.round(v * 1000) / 1000);
		};
		setting
			.addText((t) =>
				t.setValue(show()).onChange(async (v) => {
					const n = parseFloat(v);
					if (!Number.isNaN(n) && n > 0) {
						s[key] = convertLength(n, s[unitKey], canonical, basePt);
						await this.plugin.saveSettings();
					}
				}),
			)
			.addDropdown((d) => {
				for (const unit of units) d.addOption(unit, LENGTH_UNIT_LABELS[unit]);
				d.setValue(s[unitKey]).onChange(async (v) => {
					s[unitKey] = v as LengthUnit;
					await this.plugin.saveSettings();
					this.refresh();
				});
			});
		return setting;
	}
}
