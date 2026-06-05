import type { GlopSearchQueryPayload } from '$lib/server/glop-search-page';

export type { GlopSearchQueryPayload };

export async function fetchGlopSearchQuery(query: string): Promise<GlopSearchQueryPayload> {
	const q = query.trim();
	const res = await fetch(`/api/glop-search?q=${encodeURIComponent(q)}`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const msg =
			typeof (data as { message?: string }).message === 'string'
				? (data as { message: string }).message
				: `Search failed (${res.status})`;
		throw new Error(msg);
	}
	return data as GlopSearchQueryPayload;
}
