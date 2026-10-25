export interface RegionRule {
	/** Returns the wrapper HTML if the line opens this kind of region, otherwise null. */
	open: (line: string) => string | null;
	/** Matches a line that closes this kind of region. */
	close: RegExp;
	closeHtml: string;
}

/**
 * Replaces open/close marker lines with wrapper HTML. Regions of any kind can
 * nest, using one stack. A close marker only applies when it matches the
 * innermost open region, so it stays unchanged if it would cross another open
 * region. Lines inside code fences are left alone, and regions still open at the
 * end of the note are closed there. Blank lines around each wrapper keep the
 * content parsed as markdown.
 */
const MARKER_RE = /<\/?(?:columns|align)\b[^>]*>/gi;

/**
 * Returns each region marker on the line, or null if the line holds anything
 * other than region markers and whitespace.
 */
function splitMarkers(line: string): string[] | null {
	const markers = line.match(MARKER_RE);
	if (!markers) return null;
	const rest = line.replace(MARKER_RE, "");
	return rest.trim() === "" ? markers : null;
}

export function wrapRegions(markdown: string, rules: RegionRule[]): string {
	const stack: { rule: RegionRule }[] = [];
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
		// A line may hold several markers, such as `<columns: 2><align: left>`.
		// Each marker is handled in order. A line with other text stays as written.
		const markers = splitMarkers(line);
		if (markers === null) {
			out.push(line);
			continue;
		}
		for (const marker of markers) {
			const top = stack[stack.length - 1];
			if (top && top.rule.close.test(marker)) {
				stack.pop();
				out.push("", top.rule.closeHtml, "");
				continue;
			}
			let html: string | null = null;
			let matchedRule: RegionRule | null = null;
			for (const rule of rules) {
				html = rule.open(marker);
				if (html !== null) {
					matchedRule = rule;
					break;
				}
			}
			if (matchedRule && html !== null) {
				stack.push({ rule: matchedRule });
				out.push("", html, "");
			} else {
				out.push(marker);
			}
		}
	}
	while (stack.length > 0) {
		const { rule } = stack.pop()!;
		out.push("", rule.closeHtml, "");
	}
	return out.join("\n");
}
