import type { Setting } from "obsidian";

/** Puts a short label in front of a control that sits on a Setting row. */
export function addInlineLabel(control: HTMLElement, text: string): void {
	control.parentElement?.insertBefore(createSpan({ text, cls: "md2pdf-inline-label" }), control);
}

/** Adds a checkbox to the control area of a Setting row. Used for every on/off option. */
export function addCheckbox(setting: Setting, value: boolean, onChange: (v: boolean) => unknown): HTMLInputElement {
	const box = setting.controlEl.createEl("input", { attr: { type: "checkbox" } });
	box.checked = value;
	box.addEventListener("change", () => {
		void onChange(box.checked);
	});
	return box;
}
