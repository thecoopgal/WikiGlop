/** Same normalization as `glop_answers.query_normalized` (shared client + server). */
export function normalizeGlopQuery(raw: string): string {
	return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}
