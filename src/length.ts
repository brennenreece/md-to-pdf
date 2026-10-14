/** Absolute and relative length units offered in settings dropdowns. */
export type LengthUnit = "em" | "pt" | "pc" | "in" | "cm" | "mm";

/** Points per one unit (absolute units only). */
const PT_PER_UNIT: Record<Exclude<LengthUnit, "em">, number> = {
	pt: 1,
	pc: 12,
	in: 72,
	cm: 72 / 2.54,
	mm: 72 / 25.4,
};

export const LENGTH_UNIT_LABELS: Record<LengthUnit, string> = {
	em: "Em (em)",
	pt: "Points (pt)",
	pc: "Picas (pc)",
	in: "Inches (in)",
	cm: "Centimetres (cm)",
	mm: "Millimetres (mm)",
};

/**
 * Converts a value between units. Em is relative to `basePt` (the font size it multiplies),
 * so a value in em converts to an absolute length through that size.
 */
export function convertLength(value: number, from: LengthUnit, to: LengthUnit, basePt: number): number {
	if (from === to) return value;
	const pt = from === "em" ? value * basePt : value * PT_PER_UNIT[from];
	return to === "em" ? pt / basePt : pt / PT_PER_UNIT[to];
}
