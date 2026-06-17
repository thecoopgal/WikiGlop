export const LINKS_CREATE_REORDER_LONG_PRESS_MS = 450;

export type ReorderDropTarget = {
	/** When set, call onReorder(dragId, reorderId). */
	reorderId: number | null;
	/** Draw the drop line above this item. */
	lineBeforeId: number | null;
	/** Draw the drop line below this item. */
	lineAfterId: number | null;
};

type ReorderHit = {
	id: number;
	rect: DOMRect;
	index: number;
};

function hitsAtX(
	itemEls: Map<number, HTMLElement>,
	orderedIds: number[],
	dragId: number,
	clientX: number
): ReorderHit[] {
	return orderedIds
		.filter((id) => id !== dragId)
		.map((id) => {
			const el = itemEls.get(id);
			if (!el) return null;
			const rect = el.getBoundingClientRect();
			if (clientX < rect.left || clientX > rect.right) return null;
			return { id, rect, index: orderedIds.indexOf(id) };
		})
		.filter((hit): hit is ReorderHit => hit != null)
		.sort((a, b) => a.rect.top - b.rect.top);
}

function nextId(orderedIds: number[], index: number): number | null {
	return orderedIds[index + 1] ?? null;
}

export function resolveReorderDrop(
	itemEls: Map<number, HTMLElement>,
	orderedIds: number[],
	clientX: number,
	clientY: number,
	dragId: number
): ReorderDropTarget | null {
	const dragIndex = orderedIds.indexOf(dragId);
	if (dragIndex === -1) return null;

	const hits = hitsAtX(itemEls, orderedIds, dragId, clientX);
	if (hits.length === 0) return null;

	for (const hit of hits) {
		const { id, rect, index: hoverIndex } = hit;
		if (clientY < rect.top || clientY > rect.bottom) continue;

		const midY = rect.top + rect.height / 2;
		const followingId = nextId(orderedIds, hoverIndex);

		if (dragIndex < hoverIndex) {
			if (clientY < midY) {
				return { reorderId: null, lineBeforeId: id, lineAfterId: null };
			}
			return {
				reorderId: id,
				lineBeforeId: followingId,
				lineAfterId: followingId == null ? id : null
			};
		}

		if (dragIndex > hoverIndex) {
			if (clientY <= midY) {
				return { reorderId: id, lineBeforeId: id, lineAfterId: null };
			}
			return {
				reorderId: followingId ?? id,
				lineBeforeId: followingId,
				lineAfterId: followingId == null ? id : null
			};
		}
	}

	for (let i = 0; i < hits.length; i += 1) {
		const hit = hits[i];
		const next = hits[i + 1];
		const gapTop = hit.rect.bottom;
		const gapBottom = next?.rect.top ?? Number.POSITIVE_INFINITY;
		if (clientY < gapTop || clientY > gapBottom) continue;

		if (dragIndex < hit.index) {
			return { reorderId: hit.id, lineBeforeId: next?.id ?? null, lineAfterId: next ? null : hit.id };
		}
		if (dragIndex > hit.index) {
			const followingId = next?.id ?? null;
			return {
				reorderId: followingId ?? hit.id,
				lineBeforeId: followingId,
				lineAfterId: followingId ? null : hit.id
			};
		}
	}

	if (clientY < hits[0].rect.top) {
		return { reorderId: hits[0].id, lineBeforeId: hits[0].id, lineAfterId: null };
	}

	const last = hits[hits.length - 1];
	if (clientY > last.rect.bottom) {
		const followingId = nextId(orderedIds, last.index);
		return {
			reorderId: followingId ?? last.id,
			lineBeforeId: followingId,
			lineAfterId: followingId ? null : last.id
		};
	}

	return null;
}

/** @deprecated Use resolveReorderDrop for drag reordering. */
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
