import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopAuthSite, requireUser } from '$lib/server/auth-gate';
import {
	isContentStoreSchemaError,
	listContentSitesForMember
} from '$lib/server/content-store';

export const GET: RequestHandler = async ({ locals, platform }) => {
	assertGloopglopAuthSite(locals.site);
	const user = requireUser(locals.user);

	try {
		const sites = await listContentSitesForMember(platform, user.id);
		return json({ ok: true as const, sites });
	} catch (e) {
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0016/0017.');
		}
		throw e;
	}
};
