import { App, Component, MarkdownRenderer } from "obsidian";
import { applyTypograf } from "./nbsp";
import { COLUMNS_RULE } from "./columns";
import { ALIGN_RULE } from "./align";
import { wrapRegions } from "./regions";

const SETTLE_QUIET_MS = 400;

const LINESPACE_UNITS = ["em", "in", "pt", "pc", "cm", "mm"];
const LINESPACE_RE = /^\s*<linespace\s+(\d+(?:\.\d+)?)\s*(em|in|pt|pc|cm|mm)\s*>\s*$/i;

/**
 * Turns a line that holds only `<linespace N unit>` into an empty block of that
 * height. Fenced code is left alone so examples of the syntax still show up.
 */
export function expandLinespaces(markdown: string): string {
	let fence: string | null = null;
	return markdown
		.split("\n")
		.map((line) => {
			const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
			if (fenceMatch) {
				const marker = fenceMatch[1];
				if (fence === null) fence = marker;
				else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
				return line;
			}
			if (fence !== null) return line;
			const m = LINESPACE_RE.exec(line);
			if (!m || !LINESPACE_UNITS.includes(m[2].toLowerCase())) return line;
			return `<div class="md2pdf-linespace" style="height:${m[1]}${m[2].toLowerCase()}"></div>`;
		})
		.join("\n");
}
const SETTLE_MAX_MS = 8000;

/**
 * Renders markdown with Obsidian's own renderer so custom code block
 * processors (BRNotation, Mermaid, etc.) run exactly as they do in preview.
 */
export async function renderNoteToHtml(
	app: App,
	markdown: string,
	sourcePath: string,
	owner: Component,
	options: { nonBreakingSpaces?: boolean; smartQuotes?: boolean } = {},
): Promise<string> {
	const host = document.body.createDiv({ cls: "md2pdf-render-host markdown-rendered" });
	host.setCssStyles({
		position: "fixed",
		left: "-10000px",
		top: "0",
		width: "720px",
	});

	const child = new Component();
	owner.addChild(child);
	child.load();

	try {
		await MarkdownRenderer.render(app, wrapRegions(expandLinespaces(markdown), [COLUMNS_RULE, ALIGN_RULE]), host, sourcePath, child);
		await waitForSettled(host);
		await captureCanvases(host);
		await inlineImages(host);
		unwrapInternalLinks(host);
		if (options.nonBreakingSpaces || options.smartQuotes) applyTypograf(host, options);
		const result = host.innerHTML;
		return result;
	} catch (err) {
		console.error("[md-to-pdf render] Error:", err);
		throw err;
	} finally {
		child.unload();
		owner.removeChild(child);
		host.remove();
	}
}

/** Resolves once DOM mutations under el stop for a short quiet period. */
function waitForSettled(el: HTMLElement): Promise<void> {
	return new Promise((resolve) => {
		const start = Date.now();
		let timer: number | undefined;

		const done = () => {
			observer.disconnect();
			window.clearTimeout(timer);
			resolve();
		};
		const arm = () => {
			window.clearTimeout(timer);
			if (Date.now() - start > SETTLE_MAX_MS) return done();
			timer = window.setTimeout(done, SETTLE_QUIET_MS);
		};

		const observer = new MutationObserver(arm);
		observer.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
		arm();
	});
}

/** Converts canvas elements to PNG data URLs so they survive the transfer to the print window. */
async function captureCanvases(el: HTMLElement): Promise<void> {
	const canvases = Array.from(el.querySelectorAll("canvas"));
	for (const canvas of canvases) {
		const dataUrl = canvas.toDataURL("image/png");
		const img = document.createElement("img");
		img.setAttribute("src", dataUrl);
		img.style.maxWidth = "100%";
		img.style.height = "auto";
		canvas.replaceWith(img);
	}
}

/** Embeds app:// images as data URLs so the offscreen print window can load them. */
async function inlineImages(el: HTMLElement): Promise<void> {
	const imgs = Array.from(el.querySelectorAll("img"));
	await Promise.all(
		imgs.map(async (img) => {
			const src = img.getAttribute("src");
			if (!src || src.startsWith("data:")) return;
			try {
				const res = await fetch(src);
				const blob = await res.blob();
				img.setAttribute("src", await blobToDataUrl(blob));
			} catch {
				// Keep the original src; the image may be missing from the print.
			}
		}),
	);
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

/** Wiki links become plain text, since vault routes don't exist in a PDF. */
function unwrapInternalLinks(el: HTMLElement): void {
	el.querySelectorAll("a.internal-link").forEach((a) => {
		const span = document.createElement("span");
		span.className = "internal-link-print";
		span.textContent = a.textContent ?? "";
		a.replaceWith(span);
	});
}

/** Collects only the app's styles needed for custom renderers like BRNotation. */
export function collectAppCss(): string {
	const parts: string[] = [];
	const relevantSelectors = [
		".block-language-brnotation",
		".br-notation",
		".br-diagram",
		".br-fretboard",
		".br-piano",
		".mermaid",
		".block-language-mermaid",
		".katex",
		"svg",
		"canvas",
		".dataview",
		".obsidian-charts",
	];

	for (const sheet of Array.from(document.styleSheets)) {
		try {
			for (const rule of Array.from(sheet.cssRules)) {
				const r = rule as CSSStyleRule;
				// Include rules that match our relevant selectors
				// BRNotation class names share a "br-" prefix (e.g. br-chordgrid-*), so match them all.
				const selector = r.selectorText ?? "";
				if (selector && (selector.includes(".br-") || relevantSelectors.some((sel) => selector.includes(sel)))) {
					parts.push(rule.cssText);
				}
				// Also include @font-face rules
				if (rule.constructor.name === "CSSFontFaceRule") {
					parts.push(rule.cssText);
				}
			}
		} catch {
			// Cross-origin sheets can't be read; skip them.
		}
	}
	return parts.join("\n");
}

/**
 * Captures the live theme state the BRNotation SVGs depend on: the CSS custom
 * properties set on body (theme colors, --br-chord-font, ...) and the music
 * fonts BRNotation bundles. Those fonts are registered at runtime with FontFace,
 * which doesn't expose their bytes, so they are read from the plugin's main.js.
 */
export async function collectThemeCss(app: App): Promise<string> {
	const parts: string[] = [];

	const rootVars: string[] = [];
	const seen = new Set<string>();
	for (const target of [document.documentElement, document.body]) {
		const styles = getComputedStyle(target);
		for (let i = 0; i < styles.length; i++) {
			const name = styles.item(i);
			if (!name.startsWith("--") || seen.has(name)) continue;
			seen.add(name);
			const value = styles.getPropertyValue(name).trim();
			if (value) rootVars.push(`${name}: ${value};`);
		}
	}
	parts.push(`:root, body {\n${rootVars.join("\n")}\n}`);

	parts.push(await collectBrNotationFontsCss(app));
	return parts.join("\n");
}

/** Reads BRNotation's embedded woff2 music fonts and emits @font-face rules for them. */
async function collectBrNotationFontsCss(app: App): Promise<string> {
	const pluginMainPath = `${app.vault.configDir}/plugins/br-notation/main.js`;
	try {
		if (!(await app.vault.adapter.exists(pluginMainPath))) return "";
		const source = await app.vault.adapter.read(pluginMainPath);
		const rules: string[] = [];
		const re = /"([A-Za-z0-9]+)":\s*"(data:font\/woff2;base64,[A-Za-z0-9+/=]+)"/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(source)) !== null) {
			const [, family, dataUrl] = m;
			rules.push(
				`@font-face { font-family: "${family}"; src: url(${dataUrl}) format("woff2"); font-display: block; }`,
			);
		}
		return rules.join("\n");
	} catch (err) {
		console.warn("[md-to-pdf] Could not read BRNotation fonts", err);
		return "";
	}
}
