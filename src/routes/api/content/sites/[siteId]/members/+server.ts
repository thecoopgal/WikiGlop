import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopAuthSite, requireUser } from '$lib/server/auth-gate';
import { normalizeEmail } from '$lib/server/auth-crypto';
import { findUserByNormalizedEmail } from '$lib/server/auth-users';
import {
	getContentSiteById,
	getSiteMemberRole,
	isContentStoreSchemaError,
	isSiteMemberRole,
	listSiteMembers,
	roleCanManageMembers,
	upsertSiteMember,
	type SiteMemberRole
} from '$lib/server/content-store';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	assertGloopglopAuthSite(locals.site);
	const user = requireUser(locals.user);
	const siteId = params.siteId?.trim().toLowerCase() ?? '';
	if (!siteId) throw error(400, 'Missing site id');

	try {
		const site = await getContentSiteById(platform, siteId);
		if (!site) throw error(404, 'Site not found');

		const role = await getSiteMemberRole(platform, siteId, user.id);
		if (!roleCanManageMembers(role, user.role === 'admin') && role !== 'editor') {
			throw error(403, 'Not allowed');
		}

		const members = await listSiteMembers(platform, siteId);
		return json({ ok: true as const, siteId, members, yourRole: role });
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0016/0017.');
		}
		throw e;
	}
};

/** Add or update a member by email (user must already have a GloopGlop account). */
export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	assertGloopglopAuthSite(locals.site);
	const user = requireUser(locals.user);
	const siteId = params.siteId?.trim().toLowerCase() ?? '';
	if (!siteId) throw error(400, 'Missing site id');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const data = body as Record<string, unknown>;

	const emailNorm = typeof data.email === 'string' ? normalizeEmail(data.email) : null;
	const roleRaw = data.role;
	const role: SiteMemberRole = isSiteMemberRole(roleRaw) ? roleRaw : 'editor';

	if (!emailNorm) throw error(400, 'Valid email is required');

	try {
		const site = await getContentSiteById(platform, siteId);
		if (!site) throw error(404, 'Site not found');

		const actorRole = await getSiteMemberRole(platform, siteId, user.id);
		if (!roleCanManageMembers(actorRole, user.role === 'admin')) {
			throw error(403, 'Only owners can manage members');
		}

		const target = await findUserByNormalizedEmail(platform, emailNorm);
		if (!target) {
			throw error(404, 'No account for that email. They need to sign in once first.');
		}

		await upsertSiteMember({
			platform,
			siteId,
			userId: target.id,
			role
		});

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
