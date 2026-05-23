import { error } from '@sveltejs/kit';
import type { ResolvedSite } from '$lib/server/sites';

export const GLOOPGLOP_SITE_ID = 'gloopglop';

/** Upload APIs and OAuth are platform-only (gloopglop.com). */
export function assertGloopglopUploadSite(site: ResolvedSite | null | undefined): ResolvedSite {
	if (!site || site.siteId !== GLOOPGLOP_SITE_ID) {
		throw error(404, 'Not found');
	}
	return site;
}
