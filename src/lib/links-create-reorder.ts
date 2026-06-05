export const LINKS_CREATE_REORDER_LONG_PRESS_MS = 450;

export function fieldIdAtPoint(
	itemEls: Map<number, HTMLElement>,
	clientX: number,
	clientY: number
): number | null {
	for (const [id, el] of itemEls) {
		const rect = el.getBoundingClientRect();
		if (
			clientX >= rect.left &&
			clientX <= rect.right &&
			clientY >= rect.top &&
			clientY <= rect.bottom
		) {
			return id;
		}
	}
	return null;
}
