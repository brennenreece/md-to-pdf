export interface RegionRule {
	/** Matches a line that opens the region. Return the wrapper HTML, or null to skip the line. */
	open: (line: string) => string | null;
	/** Matches a line that closes the region. */
	close: RegExp;
	closeHtml: string;
}

/**
 * Replaces open/close marker lines with wrapper HTML, using a separate state for
 * each rule. Lines inside code fences are left alone, and a region that is still
 * open at the end of the note is closed there. Blank lines around the wrapper
 * keep the content parsed as markdown.
 */
export function wrapRegions(markdown: string, rules: RegionRule[]): string {
	const open: boolean[] = rules.map(() => false);
	let fence: string | null = null;
	const out: string[] = [];
	for (const line of markdown.split("\n")) {
		const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
		if (fenceMatch) {
			const marker = fenceMatch[1];
			if (fence === null) fence = marker;
			else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
			out.push(line);
			continue;
		}
		if (fence !== null) {
			out.push(line);
			continue;
		}
		let handled = false;
		for (let i = 0; i < rules.length && !handled; i++) {
			const rule = rules[i];
			if (!open[i]) {
				const html = rule.open(line);
				if (html !== null) {
					open[i] = true;
					out.push("", html, "");
					handled = true;
				}
			} else if (rule.close.test(line)) {
				open[i] = false;
				out.push("", rule.closeHtml, "");
				handled = true;
			}
		}
		if (!handled) out.push(line);
	}
	for (let i = 0; i < rules.length; i++) {
		if (open[i]) out.push("", rules[i].closeHtml, "");
	}
	return out.join("\n");
}
