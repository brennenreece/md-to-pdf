import { App, PluginSettingTab, Setting } from "obsidian";
import type MdToPdfPlugin from "./main";
import {
	findBundledFamily,
	fontKeysInUse,
	loadPreviewFont,
} from "./fonts";
import { PAGE_MM, contentCss } from "./document";
import { LENGTH_UNIT_LABELS, LengthUnit, convertLength } from "./length";
import { applyTheme, snapshotTheme } from "./themes";
import { renderStyleEditor, type StyleEditorState } from "./style-editor";
import { DEFAULT_PARAGRAPH_STYLES, type StyleId } from "./paragraph-styles";
import { addCheckbox, addInlineLabel } from "./ui";

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
/** Units for fields stored in pt (font sizes, grid). */
const ABSOLUTE_UNITS: LengthUnit[] = ["pt", "pc", "in", "cm", "mm"];

type MarginKey = "marginTopMm" | "marginRightMm" | "marginBottomMm" | "marginLeftMm";

/**
 * Sample page for the theme preview. Each element is labeled with the paragraph style it uses,
 * so the preview shows exactly which style controls what.
 */
const THEME_PREVIEW_HTML = `
<h1>Heading 1 (H1)</h1>
<p>Body text. Lorem ipsum dolor sit amet, <strong>bold text</strong>, <em>italic text</em>, and <code>inline code</code> sit in one paragraph. <a href="#">A link</a> continues the line.</p>
<h2>Heading 2 (H2)</h2>
<p>Body text under H2. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
<h3>Heading 3 (H3)</h3>
<p>Body text under H3. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
<h4>Heading 4 (H4)</h4>
<p>Body text under H4. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.</p>
<h5>Heading 5 (H5)</h5>
<p>Body text under H5. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.</p>
<h6>Heading 6 (H6)</h6>
<p>Body text under H6. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae.</p>
<p>List (ul / li):</p>
<ul>
<li>First list item</li>
<li>Second list item</li>
</ul>
<p>Numbered list (ol / li):</p>
<ol>
<li>First numbered item</li>
<li>Second numbered item</li>
</ol>
<p>Blockquote:</p>
<blockquote><p>Quote text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></blockquote>
<p>Code block (pre / code):</p>
<pre><code>const sample = "monospaced code";
console.log(sample);</code></pre>
<p>Table (table / th / td):</p>
<table>
<thead><tr><th>Column A</th><th>Column B</th><th>Column C</th></tr></thead>
<tbody>
<tr><td>Cell one</td><td>Cell two</td><td>Cell three</td></tr>
<tr><td>Cell four</td><td>Cell five</td><td>Cell six</td></tr>
</tbody>
</table>
<hr>
<p>Text after a horizontal rule.</p>
<p>Callout (callout):</p>
<div class="callout" data-callout="note"><div class="callout-title"><div class="callout-title-inner">Note</div></div><div class="callout-content"><p>Callout text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div></div>
<p>Image (img):</p>
<p><img src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='80'%3E%3Crect width='240' height='80' fill='%23cccccc'/%3E%3Ctext x='120' y='46' font-size='14' text-anchor='middle' font-family='sans-serif'%3EImage%3C/text%3E%3C/svg%3E" alt="Sample image"></p>
<p>Footnote reference<sup><a href="#fn1">1</a></sup> sits in the text.</p>
<div class="footnotes"><hr><ol><li id="fn1"><p>Footnote (footnote). Lorem ipsum dolor sit amet.</p></li></ol></div>
`;

export class MdToPdfSettingTab extends PluginSettingTab {
	plugin: MdToPdfPlugin;
	private tab: "settings" | "preview" = "settings";
	private styleState: StyleEditorState = { selected: "body" as StyleId, openGroups: {} };

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

	/**
	 * Sample page rendered with the same print CSS as export. The page is drawn at the chosen page size,
	 * orientation, and margins, scaled to fit the settings pane, so the layout matches the printed PDF.
	 */
	private renderThemePreview(el: HTMLElement) {
		const s = this.plugin.settings;
		const [w, h] = PAGE_MM[s.pageSize];
		const [pageW, pageH] = s.orientation === "landscape" ? [h, w] : [w, h];
		const pxPerMm = 96 / 25.4;
		const widthPx = pageW * pxPerMm;
		const heightPx = pageH * pxPerMm;
		const wrap = el.createDiv({ cls: "md2pdf-theme-preview" });
		const status = wrap.createDiv({ cls: "md2pdf-font-preview-status", text: "Loading fonts…" });
		wrap.createEl("style", { text: contentCss(s, this.plugin.styles) });
		const sheet = wrap.createDiv({ cls: "md2pdf-theme-sheet" });
		sheet.setAttr("style", `width: ${widthPx}px; height: ${heightPx}px; padding: ${s.marginTopMm * pxPerMm}px ${s.marginRightMm * pxPerMm}px ${s.marginBottomMm * pxPerMm}px ${s.marginLeftMm * pxPerMm}px;`);
		const page = sheet.createDiv({ cls: "md2pdf-root markdown-rendered" });
		page.innerHTML = THEME_PREVIEW_HTML;
		const fit = () => {
			const scale = Math.min(1, (wrap.clientWidth - 2) / widthPx);
			sheet.setCssStyles({ transform: `scale(${scale})`, transformOrigin: "top left" });
			wrap.setCssStyles({ height: `${heightPx * scale + 2}px` });
		};
		window.requestAnimationFrame(fit);

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
		const pageRow = new Setting(containerEl).setName("Page size and orientation");
		pageRow.addDropdown((d) => {
			d.addOptions({ A4: "A4", A5: "A5", Letter: "Letter", Legal: "Legal" })
				.setValue(s.pageSize)
				.onChange(async (v) => {
					s.pageSize = v as PageSize;
					await save();
				});
			addInlineLabel(d.selectEl, "Size");
		});
		pageRow.addDropdown((d) => {
			d.addOptions({ portrait: "Portrait", landscape: "Landscape" })
				.setValue(s.orientation)
				.onChange(async (v) => {
					s.orientation = v as Orientation;
					await save();
				});
			addInlineLabel(d.selectEl, "Orientation");
		});
		this.marginSetting(containerEl);
		const hrRow = new Setting(containerEl).setName("Page break at horizontal rule (---)");
		addCheckbox(hrRow, s.pageBreakOnHr, async (v) => {
			s.pageBreakOnHr = v;
			await save();
		});

		new Setting(containerEl).setName("Typography").setHeading();
		this.baselineGridSetting(containerEl);
		this.textSetting(containerEl, "Hyphenation language", "BCP 47 tag, for example en-US.", "hyphenLang");

		new Setting(containerEl).setName("Paragraph styles").setHeading();
		renderStyleEditor(containerEl, {
			styles: this.plugin.styles,
			save: () => this.plugin.saveSettings(),
			refresh: () => this.refresh(),
			adapter: this.app.vault.adapter,
			pluginDir: this.plugin.manifest.dir ?? "",
		}, this.styleState);

		new Setting(containerEl).setName("Header and footer").setHeading();
		const headerRow = new Setting(containerEl).setName("Show header").setDesc("Placeholders: {{title}}, {{date}}.");
		addCheckbox(headerRow, s.showHeader, async (v) => {
			s.showHeader = v;
			await save();
		});
		this.inlineText(headerRow, "headerText", "Text", 240);
		const pageNumRow = new Setting(containerEl).setName("Show page numbers").setDesc("Placeholders: {page}, {pages}.");
		addCheckbox(pageNumRow, s.showPageNumbers, async (v) => {
			s.showPageNumbers = v;
			await save();
		});
		this.inlineText(pageNumRow, "pageNumberFormat", "Format", 180);

		new Setting(containerEl).setName("PDF preview").setHeading();
		const liveRow = new Setting(containerEl).setName("Live update").setDesc("Re-render the preview pane when the note or settings change.");
		addCheckbox(liveRow, s.livePreview, async (v) => {
			s.livePreview = v;
			await save();
		});
		liveRow.addText((t) => {
			addInlineLabel(t.inputEl, "Delay (ms)");
			t.inputEl.style.width = "72px";
			t.setValue(String(s.livePreviewDelayMs)).onChange(async (v) => {
				const n = parseInt(v, 10);
				if (!Number.isNaN(n) && n >= 0) {
					s.livePreviewDelayMs = n;
					await save();
				}
			});
		});

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
				b.setButtonText("Reset").setWarning().onClick(async () => {
					this.plugin.styles = applyTheme(this.plugin.settings, snapshotTheme(DEFAULT_SETTINGS, DEFAULT_PARAGRAPH_STYLES));
					await this.plugin.saveSettings();
					this.refresh();
				}),
			);
	}

	/** Margin unit and all four margins on one row. Each field is labeled with its side. */
	private marginSetting(el: HTMLElement) {
		const s = this.plugin.settings;
		const unit = s.marginUnit;
		const factor = MM_PER_UNIT[unit];
		const decimals = unit === "mm" || unit === "cm" ? 1 : 2;
		const row = new Setting(el).setName("Margins");
		row.addDropdown((d) => {
			for (const u of Object.keys(MM_PER_UNIT) as MarginUnit[]) {
				d.addOption(u, MARGIN_UNIT_LABELS[u]);
			}
			d.setValue(unit).onChange(async (v) => {
				s.marginUnit = v as MarginUnit;
				await this.plugin.saveSettings();
				this.refresh();
			});
			addInlineLabel(d.selectEl, "Unit");
		});
		const sides: Array<[string, MarginKey]> = [
			["Top", "marginTopMm"],
			["Right", "marginRightMm"],
			["Bottom", "marginBottomMm"],
			["Left", "marginLeftMm"],
		];
		for (const [side, key] of sides) {
			const shown = +(s[key] / factor).toFixed(decimals);
			row.addText((t) => {
				addInlineLabel(t.inputEl, side);
				t.inputEl.style.width = "56px";
				t.setValue(String(shown)).onChange(async (v) => {
					const n = parseFloat(v);
					if (!Number.isNaN(n) && n >= 0) {
						s[key] = n * factor;
						await this.plugin.saveSettings();
					}
				});
			});
		}
	}

	/** Baseline grid on/off toggle and its value, on one row. */
	private baselineGridSetting(el: HTMLElement) {
		const s = this.plugin.settings;
		const row = new Setting(el)
			.setName("Baseline grid")
			.setDesc("Snap body and heading spacing to a vertical rhythm.");
		addCheckbox(row, s.baselineGridEnabled, async (v) => {
			s.baselineGridEnabled = v;
			await this.plugin.saveSettings();
		});
		this.lengthControls(row, "baselineGridPt", "baselineGridUnit", ABSOLUTE_UNITS, s.bodySizePt, "Unit");
	}

	/** Text field with an inline label, added to an existing setting row. */
	private inlineText(row: Setting, key: TextKey, label: string, widthPx: number) {
		row.addText((t) => {
			addInlineLabel(t.inputEl, label);
			t.inputEl.style.width = `${widthPx}px`;
			t.setValue(this.plugin.settings[key]).onChange(async (v) => {
				this.plugin.settings[key] = v;
				await this.plugin.saveSettings();
			});
		});
	}

	private textSetting(el: HTMLElement, name: string, desc: string, key: TextKey) {
		new Setting(el).setName(name).setDesc(desc).addText((t) =>
			t.setValue(this.plugin.settings[key]).onChange(async (v) => {
				this.plugin.settings[key] = v;
				await this.plugin.saveSettings();
			}),
		);
	}

	/**
	 * A length field with a unit dropdown. The value is stored in its canonical unit (pt or em)
	 * and shown in the selected unit. Converting an em value to an absolute unit needs the font
	 * size it multiplies, passed as `basePt`.
	 */
	/** Value field and unit dropdown added to an existing setting row. */
	private lengthControls(
		setting: Setting,
		key: NumberKey,
		unitKey: UnitKey,
		units: LengthUnit[],
		basePt: number,
		unitLabel?: string,
	) {
		const s = this.plugin.settings;
		const canonical: LengthUnit = units.includes("em") ? "em" : "pt";
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
				if (unitLabel) addInlineLabel(d.selectEl, unitLabel);
				for (const unit of units) d.addOption(unit, LENGTH_UNIT_LABELS[unit]);
				d.setValue(s[unitKey]).onChange(async (v) => {
					s[unitKey] = v as LengthUnit;
					await this.plugin.saveSettings();
					this.refresh();
				});
			});
	}
}
