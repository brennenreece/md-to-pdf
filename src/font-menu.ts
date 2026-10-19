import { COLLECTION_LABELS, BUNDLED_FAMILIES, bundledFontKey, findBundledFamily, bundledCssName, loadPreviewFont, type BundledFamily } from "./fonts";
import { FONT_OPTIONS } from "./settings";

export interface FontMenuHost {
	adapter: { readBinary(path: string): Promise<ArrayBuffer> };
	pluginDir: string;
}

const SAMPLE = "Whereas recognition of the inherent dignity";

/**
 * Button that opens a popover listing system and bundled fonts. Each row is drawn in its own font
 * so the menu previews the style. Bundled families load their files on first open.
 */
export function renderFontMenu(
	parent: HTMLElement,
	host: FontMenuHost,
	current: string,
	onPick: (value: string) => void,
): HTMLElement {
	const wrap = parent.createDiv({ cls: "md2pdf-font-menu" });
	const button = wrap.createEl("button", { cls: "md2pdf-font-menu-button" });
	const setButtonLabel = (value: string) => {
		const family = findBundledFamily(value);
		button.setText(family ? family.name : FONT_OPTIONS[value] ?? value);
		button.style.fontFamily = family ? `${bundledCssName(family)}, serif` : value;
	};
	setButtonLabel(current);
	// Start loading every bundled family as soon as the menu exists, so opening it is instant.
	for (const family of BUNDLED_FAMILIES) void ensureLoaded(host, family);

	let popover: HTMLElement | null = null;
	const close = () => {
		popover?.remove();
		popover = null;
		document.removeEventListener("mousedown", onOutside, true);
		document.removeEventListener("keydown", onKey, true);
	};
	const onOutside = (e: MouseEvent) => {
		// Any click outside the popover closes it, including clicks on the button itself, which
		// toggle it through the click handler.
		if (!popover) return;
		const target = e.target as Node;
		if (popover.contains(target)) return;
		if (button.contains(target)) return;
		close();
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") close();
	};

	const choose = (value: string) => {
		setButtonLabel(value);
		close();
		onPick(value);
	};

	const open = () => {
		if (popover) return close();
		// Attach inside the open settings modal so the popover stacks above it. Obsidian's modal
		// creates its own stacking context, so a popover on document.body would sit underneath.
		const container = button.closest<HTMLElement>(".modal") ?? document.body;
		popover = container.createDiv({ cls: "md2pdf-font-popover" });
		const rect = button.getBoundingClientRect();
		const origin = container === document.body ? { x: 0, y: 0 } : container.getBoundingClientRect();
		popover.style.position = container === document.body ? "fixed" : "absolute";
		popover.style.top = `${rect.bottom - origin.y + 4}px`;
		const width = Math.max(rect.width, 320);
		popover.style.width = `${width}px`;
		const containerRight = container === document.body ? window.innerWidth : container.getBoundingClientRect().right;
		const left = Math.min(rect.left - origin.x, containerRight - origin.x - width - 8);
		popover.style.left = `${Math.max(8, left)}px`;

		const systemGroup = popover.createDiv({ cls: "md2pdf-font-group" });
		systemGroup.createDiv({ cls: "md2pdf-font-group-title", text: COLLECTION_LABELS.system });
		for (const [value, label] of Object.entries(FONT_OPTIONS)) {
			addRow(systemGroup, label, value, value, value === current, choose);
		}

		for (const collection of ["tg", "league"] as const) {
			const families = BUNDLED_FAMILIES.filter((f) => f.collection === collection);
			if (families.length === 0) continue;
			const group = popover.createDiv({ cls: "md2pdf-font-group" });
			group.createDiv({ cls: "md2pdf-font-group-title", text: COLLECTION_LABELS[collection] });
			for (const family of families) {
				const key = bundledFontKey(family);
				addRow(group, family.name, `${bundledCssName(family)}, serif`, key, key === current, choose);
			}
		}

		document.addEventListener("mousedown", onOutside, true);
		document.addEventListener("keydown", onKey, true);
	};

	button.addEventListener("click", (e) => {
		e.preventDefault();
		open();
	});
	return wrap;
}

function addRow(
	group: HTMLElement,
	label: string,
	cssFamily: string,
	value: string,
	selected: boolean,
	choose: (value: string) => void,
): HTMLElement {
	const row = group.createDiv({ cls: "md2pdf-font-row" + (selected ? " is-selected" : "") });
	row.createDiv({ cls: "md2pdf-font-row-name", text: label, attr: { style: `font-family: ${cssFamily}` } });
	row.createDiv({ cls: "md2pdf-font-row-sample", text: SAMPLE, attr: { style: `font-family: ${cssFamily}` } });
	row.addEventListener("click", () => choose(value));
	return row;
}

async function ensureLoaded(host: FontMenuHost, family: BundledFamily) {
	try {
		await loadPreviewFont(host.adapter, host.pluginDir, family);
	} catch (err) {
		console.error(`[md-to-pdf] could not load preview for ${family.name}`, err);
	}
}
