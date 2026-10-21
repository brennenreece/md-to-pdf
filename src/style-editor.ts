import { Setting, setIcon } from "obsidian";
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
import { renderFontMenu, type FontMenuHost } from "./font-menu";
import { faceLabel, findBundledFamily } from "./fonts";
import { addCheckbox, addInlineLabel } from "./ui";
import { LENGTH_UNIT_LABELS, convertLength, type LengthUnit } from "./length";

/** Fields grouped the way the InDesign character and paragraph panels group them. */
type Field = {
	key: StyleKey;
	label: string;
	kind: "font" | "number" | "pt" | "bool" | "check" | "select" | "face" | "length";
	options?: Record<string, string>;
	/** For length fields: the style key that holds the unit. */
	unitKey?: StyleKey;
	/** Return true to leave this field out for the given style. */
	hide?: (id: StyleId) => boolean;
};

const GROUPS: Array<{ title: string; fields: Field[] }> = [
	{
		title: "Character",
		fields: [
			{ key: "sizePt", label: "Size (pt)", kind: "pt" },
			{ key: "font", label: "Font", kind: "font" },
			{ key: "weight", label: "Style", kind: "face" },
			{ key: "smallCaps", label: "Small caps", kind: "check" },
			{ key: "allCaps", label: "All caps", kind: "check" },
			{ key: "ligatures", label: "Ligatures", kind: "check" },
			{ key: "oldstyleFigures", label: "Oldstyle figures", kind: "check" },
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
			{ key: "interCharacterJustify", label: "Justify between characters", kind: "bool", hide: (id) => ["inlineCode", "link", "bold", "italic", "hr", "footnote"].includes(id) },
			{ key: "pageBreakBefore", label: "Page break before", kind: "bool", hide: (id) => ["inlineCode", "link", "bold", "italic", "hr", "footnote"].includes(id) },
		],
	},
	{
		title: "Spacing",
		fields: [
			{ key: "lineHeight", label: "Line height", kind: "number" },
			{ key: "lineHeightUnit", label: "Line height unit", kind: "select", options: { em: "Multiple (em)", pt: "Points (pt)" } },
			{ key: "spaceBefore", label: "Space before", kind: "length", unitKey: "spaceBeforeUnit" },
			{ key: "spaceAfter", label: "Space after", kind: "length", unitKey: "spaceAfterUnit" },
		],
	},
];

export interface StyleEditorState {
	selected: StyleId;
	/** Group titles the user has expanded. Kept across re-renders so a change does not fold them. */
	openGroups: Record<string, boolean>;
}

export interface StyleEditorHost extends FontMenuHost {
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
		const details = el.createEl("details", { cls: "md2pdf-style-group" });
		details.open = state.openGroups[group.title] ?? false;
		details.addEventListener("toggle", () => {
			state.openGroups[group.title] = details.open;
		});
		details.createEl("summary", { text: group.title });
		const body = details.createDiv({ cls: "md2pdf-style-group-body" });
		let pendingRow: HTMLElement | null = null;
		let checkRow: HTMLElement | null = null;
		for (const field of group.fields) {
			if (field.hide?.(id)) continue;
			if (field.kind === "check") {
				checkRow ??= body.createDiv({ cls: "md2pdf-check-row" });
				renderCheck(checkRow, host, id, field, resolved);
			} else if (field.key === "font" || field.key === "weight") {
				// Font and Style share one row, so the face dropdown sits beside the font name.
				pendingRow ??= body.createDiv({ cls: "md2pdf-field-row" });
				renderField(pendingRow, host, id, field, resolved);
			} else {
				renderField(body, host, id, field, resolved);
			}
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

/** A labeled checkbox for a small-caps, ligature, or figure flag, with the same override state as other fields. */
function renderCheck(
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
	const wrap = el.createDiv({ cls: "md2pdf-check" });
	if (!overridden && inheritedFrom) wrap.addClass("md2pdf-inherited");
	const label = wrap.createEl("label");
	const box = label.createEl("input", { attr: { type: "checkbox" } });
	box.checked = resolved.props[field.key] as boolean;
	label.createSpan({ text: field.label });
	if (overridden) wrap.setAttr("title", "Overridden in this style.");
	else if (inheritedFrom) wrap.setAttr("title", `Inherited from ${inheritedFrom}.`);
	box.addEventListener("change", async () => {
		(style.props as Record<string, unknown>)[field.key] = box.checked;
		await host.save();
		host.refresh();
	});
	if (overridden) {
		const reset = wrap.createEl("button", { cls: "clickable-icon md2pdf-check-reset", attr: { "aria-label": "Reset to inherited value" } });
		setIcon(reset, "rotate-ccw");
		reset.addEventListener("click", async () => {
			delete (style.props as Record<string, unknown>)[field.key];
			await host.save();
			host.refresh();
		});
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
			setting.controlEl.addClass("md2pdf-font-control");
			renderFontMenu(setting.controlEl, host, current as string, async (v) => {
				write(v);
				await host.save();
				host.refresh();
			});
			break;
		case "face": {
			const family = findBundledFamily(resolved.props.font);
			setting.addDropdown((d) => {
				if (family) {
					// Each option is one face the family ships, so the choice always matches a real file.
					family.faces.forEach((face, i) => d.addOption(String(i), faceLabel(face)));
					const currentIndex = family.faces.findIndex(
						(f) => f.weight === resolved.props.weight && f.italic === resolved.props.italic,
					);
					d.setValue(String(currentIndex >= 0 ? currentIndex : 0));
				} else {
					// System fonts are not bundled, so offer only the two weights every installed family has.
					for (const w of [400, 700]) {
						for (const italic of [false, true]) {
							const label = `${faceLabel({ file: "", weight: w, italic })}`;
							d.addOption(`${w}-${italic}`, label);
						}
					}
					d.setValue(`${resolved.props.weight >= 550 ? 700 : 400}-${resolved.props.italic}`);
				}
				d.onChange(async (v) => {
					if (family) {
						const face = family.faces[parseInt(v, 10)];
						write(face.weight);
						(style.props as Record<string, unknown>).italic = face.italic;
					} else {
						const [w, i] = v.split("-");
						write(parseInt(w, 10));
						(style.props as Record<string, unknown>).italic = i === "true";
					}
					await host.save();
					host.refresh();
				});
			});
			break;
		}
		case "bool":
			addCheckbox(setting, current as boolean, async (v) => {
				write(v);
				await host.save();
				host.refresh();
			});
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
		case "length": {
			// The value is stored with its own unit. Changing the unit converts the shown value,
			// so the spacing stays the same.
			const unitKey = field.unitKey!;
			const unit = (resolved.props[unitKey] as LengthUnit) ?? "em";
			const fontPt = resolved.props.sizePt;
			const shown = Math.round((current as number) * 1000) / 1000;
			setting.addText((t) =>
				t.setValue(String(shown)).onChange(async (v) => {
					const n = parseFloat(v);
					if (Number.isNaN(n) || n < 0) return;
					write(n);
					await host.save();
				}),
			);
			setting.addDropdown((d) => {
				addInlineLabel(d.selectEl, "Unit");
				for (const u of ["em", "pt", "pc", "in", "cm", "mm"] as LengthUnit[]) d.addOption(u, LENGTH_UNIT_LABELS[u]);
				d.setValue(unit).onChange(async (u) => {
					const next = u as LengthUnit;
					const converted = convertLength(current as number, unit, next, fontPt);
					write(Math.round(converted * 1000) / 1000);
					(style.props as Record<string, unknown>)[unitKey] = next;
					await host.save();
					host.refresh();
				});
			});
			break;
		}
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
