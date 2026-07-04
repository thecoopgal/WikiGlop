import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopAuthSite, requireUser } from '$lib/server/auth-gate';
import {
	getContentSiteById,
	getSiteMemberRole,
	isContentStoreSchemaError,
	listSiteMembers,
	removeSiteMember,
	roleCanManageMembers
} from '$lib/server/content-store';

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	assertGloopglopAuthSite(locals.site);
	const user = requireUser(locals.user);
	const siteId = params.siteId?.trim().toLowerCase() ?? '';
	const userId = params.userId?.trim() ?? '';
	if (!siteId || !userId) throw error(400, 'Missing site or user id');

	try {
		const site = await getContentSiteById(platform, siteId);
		if (!site) throw error(404, 'Site not found');

		const actorRole = await getSiteMemberRole(platform, siteId, user.id);
		if (!roleCanManageMembers(actorRole, user.role === 'admin')) {
			throw error(403, 'Only owners can manage members');
		}

		try {
			await removeSiteMember({ platform, siteId, userId });
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.includes('only owner')) throw error(400, msg);
			throw e;
		}

		const members = await listSiteMembers(platform, siteId);
		return json({ ok: true as const, siteId, members });
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0016/0017.');
		}
		throw e;
	}
};
