import type { PageServerLoad } from './$types';
import { getAllSites } from '$lib/server/sites';

function normalizeHandle(v: string): string {
	return v.trim().toLowerCase();
}

export const load: PageServerLoad = async () => {
	const sites = await getAllSites();
	const taken = new Set<string>();

	for (const site of sites) {
		taken.add(normalizeHandle(site.siteId));
		taken.add(normalizeHandle(site.id));

		const short = site.routing?.gloop_gg_short_slug;
		if (typeof short === 'string' && short.trim()) {
			taken.add(normalizeHandle(short));
		}
	}

	return {
		takenHandles: [...taken]
	};
};
