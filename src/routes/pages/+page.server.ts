import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { assertGloopglopAuthSite } from '$lib/server/auth-gate';
import {
	isContentStoreSchemaError,
	listContentSitesForMember
} from '$lib/server/content-store';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	assertGloopglopAuthSite(locals.site);

	if (!locals.user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}

	try {
		const sites = await listContentSitesForMember(platform, locals.user.id);
		return {
			site: locals.site,
			user: locals.user,
			sites
		};
	} catch (e) {
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0016/0017.');
		}
		throw e;
	}
};
