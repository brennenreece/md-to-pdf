import { Setting } from "obsidian";
import {
	STYLE_NAMES,
	STYLE_ORDER,
	resolveStyle,
	wouldCreateCycle,
	type ParagraphStyles,
	type StyleId,
	type StyleKey,
	type StyleProps,
	type TextAlign,
	type TextWrap,
} from "./paragraph-styles";
import { FONT_OPTIONS } from "./settings";

/** Fields grouped the way the InDesign character and paragraph panels group them. */
type Field = {
	key: StyleKey;
	label: string;
	kind: "font" | "number" | "pt" | "bool" | "select" | "weight";
	options?: Record<string, string>;
};

const GROUPS: Array<{ title: string; fields: Field[] }> = [
	{
		title: "Character",
		fields: [
			{ key: "font", label: "Font", kind: "font" },
			{ key: "weight", label: "Weight", kind: "weight" },
			{ key: "italic", label: "Italic", kind: "bool" },
			{ key: "sizePt", label: "Size (pt)", kind: "pt" },
			{ key: "smallCaps", label: "Small caps", kind: "bool" },
			{ key: "oldstyleFigures", label: "Oldstyle figures", kind: "bool" },
			{ key: "ligatures", label: "Ligatures", kind: "bool" },
		],
	},
	{
		title: "Paragraph",
		fields: [
			{
				key: "align",
				label: "Alignment",
				kind: "select",
				options: { left: "Left", center: "Center", right: "Right", justify: "Justify" } satisfies Record<TextAlign, string>,
			},
			{
				key: "textWrap",
				label: "Line wrapping",
				kind: "select",
				options: {
					wrap: "Standard",
					pretty: "Avoid orphans",
					balance: "Balance lines",
					nowrap: "No wrap",
				} satisfies Record<TextWrap, string>,
			},
			{ key: "hyphenation", label: "Hyphenation", kind: "bool" },
			{ key: "pageBreakBefore", label: "Page break before", kind: "bool" },
		],
	},
	{
		title: "Spacing",
		fields: [
			{ key: "lineHeight", label: "Line height", kind: "number" },
			{ key: "lineHeightUnit", label: "Line height unit", kind: "select", options: { em: "Multiple (em)", pt: "Points (pt)" } },
			{ key: "spaceBeforeEm", label: "Space before (em)", kind: "number" },
			{ key: "spaceAfterEm", label: "Space after (em)", kind: "number" },
		],
	},
];

export interface StyleEditorState {
	selected: StyleId;
}

export interface StyleEditorHost {
	styles: ParagraphStyles;
	save(): Promise<void>;
	refresh(): void;
}

/** Renders the paragraph style list and the editor for the selected style. */
export function renderStyleEditor(el: HTMLElement, host: StyleEditorHost, state: StyleEditorState): void {
	const { styles } = host;

	const list = el.createDiv({ cls: "md2pdf-style-list" });
	for (const id of STYLE_ORDER) {
		const row = list.createDiv({ cls: "md2pdf-style-row" + (id === state.selected ? " is-selected" : "") });
		const { props } = resolveStyle(styles, id);
		row.createSpan({ cls: "md2pdf-style-name", text: STYLE_NAMES[id] });
		row.createSpan({
			cls: "md2pdf-style-summary",
			text: `${shortFont(props.font)} ${props.sizePt} pt`,
		});
		row.addEventListener("click", () => {
			state.selected = id;
			host.refresh();
		});
	}

	const id = state.selected;
	const style = styles[id];
	const resolved = resolveStyle(styles, id);

	new Setting(el).setName(`Style: ${style.name}`).setHeading();

	new Setting(el)
		.setName("Based on")
		.setDesc(
			style.basedOn === null
				? "The body style is the root. Every other style inherits from a parent."
				: "Values not set here come from the parent.",
		)
		.addDropdown((d) => {
			if (style.basedOn === null) {
				d.addOption("", "None (root)");
				d.setValue("").setDisabled(true);
				return;
			}
			for (const other of STYLE_ORDER) {
				if (other === id) continue;
				if (wouldCreateCycle(styles, id, other)) continue;
				d.addOption(other, STYLE_NAMES[other]);
			}
			d.setValue(style.basedOn).onChange(async (v) => {
				style.basedOn = v as StyleId;
				await host.save();
				host.refresh();
			});
		});

	for (const group of GROUPS) {
		new Setting(el).setName(group.title).setHeading();
		for (const field of group.fields) {
			renderField(el, host, id, field, resolved);
		}
	}

	if (id !== "body" && Object.keys(style.props).length > 0) {
		new Setting(el)
			.setName("Reset all to based-on style")
			.setDesc("Removes every override in this style so it fully inherits.")
			.addButton((b) =>
				b.setButtonText("Reset").setWarning().onClick(async () => {
					style.props = {};
					await host.save();
					host.refresh();
				}),
			);
	}
}

function renderField(
	el: HTMLElement,
	host: StyleEditorHost,
	id: StyleId,
	field: Field,
	resolved: { props: StyleProps; from: Record<StyleKey, StyleId> },
) {
	const style = host.styles[id];
	const overridden = Object.prototype.hasOwnProperty.call(style.props, field.key);
	const source = resolved.from[field.key];
	const inheritedFrom = !overridden && source && source !== id ? STYLE_NAMES[source] : null;
	const current = resolved.props[field.key];

	const setting = new Setting(el).setName(field.label);
	if (overridden) setting.setDesc("Overridden in this style.");
	else if (inheritedFrom) setting.setDesc(`Inherited from ${inheritedFrom}.`);
	setting.settingEl.toggleClass("md2pdf-inherited", !overridden && !!inheritedFrom);

	const write = (value: StyleProps[StyleKey]) => {
		(style.props as Record<string, unknown>)[field.key] = value;
	};

	switch (field.kind) {
		case "font":
			setting.addDropdown((d) => {
				for (const [value, label] of Object.entries(FONT_OPTIONS)) d.addOption(value, label);
				const shown = current as string;
				if (!(shown in FONT_OPTIONS)) d.addOption(shown, shown);
				d.setValue(shown).onChange(async (v) => {
					write(v);
					await host.save();
					host.refresh();
				});
			});
			break;
		case "weight":
			setting.addDropdown((d) => {
				for (const w of [100, 200, 300, 400, 500, 600, 700, 800, 900]) d.addOption(String(w), String(w));
				d.setValue(String(current)).onChange(async (v) => {
					write(parseInt(v, 10));
					await host.save();
					host.refresh();
				});
			});
			break;
		case "bool":
			setting.addToggle((t) =>
				t.setValue(current as boolean).onChange(async (v) => {
					write(v);
					await host.save();
					host.refresh();
				}),
			);
			break;
		case "select":
			setting.addDropdown((d) => {
				d.addOptions(field.options ?? {});
				d.setValue(String(current)).onChange(async (v) => {
					write(v);
					await host.save();
					host.refresh();
				});
			});
			break;
		case "number":
		case "pt":
			setting.addText((t) =>
				t.setValue(String(current)).onChange(async (v) => {
					const n = parseFloat(v);
					if (Number.isNaN(n) || n < 0) return;
					write(n);
					await host.save();
				}),
			);
			break;
	}

	if (overridden) {
		setting.addExtraButton((b) =>
			b
				.setIcon("rotate-ccw")
				.setTooltip("Reset to inherited value")
				.onClick(async () => {
					delete (style.props as Record<string, unknown>)[field.key];
					await host.save();
					host.refresh();
				}),
		);
	}
}

function shortFont(font: string): string {
	return font.split(",")[0].replace(/['"]/g, "").trim();
}
