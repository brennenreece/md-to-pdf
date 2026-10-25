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
		const top = stack[stack.length - 1];
		if (top && top.rule.close.test(line)) {
			stack.pop();
			out.push("", top.rule.closeHtml, "");
			continue;
		}
		let handled = false;
		for (const rule of rules) {
			const html = rule.open(line);
			if (html !== null) {
				stack.push({ rule });
				out.push("", html, "");
				handled = true;
				break;
			}
		}
		if (!handled) out.push(line);
	}
	while (stack.length > 0) {
		const { rule } = stack.pop()!;
		out.push("", rule.closeHtml, "");
	}
	return out.join("\n");
}
