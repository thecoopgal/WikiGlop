import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopAuthSite, requireUser } from '$lib/server/auth-gate';
import {
	getContentSiteById,
	getSiteMemberRole,
	isContentStoreSchemaError,
	roleCanEdit,
	updateContentSiteThemeOverrides
} from '$lib/server/content-store';
import {
	GLOOPGLOP_CUSTOM_COLOR_FIELDS,
	type GloopglopCustomColorKey
} from '$lib/daisy-theme-colors';

const ALLOWED_KEYS = new Set<GloopglopCustomColorKey>(
	GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => key)
);

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
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

	const themeOverridesRaw = (body as { themeOverrides?: unknown }).themeOverrides;
	if (!themeOverridesRaw || typeof themeOverridesRaw !== 'object' || Array.isArray(themeOverridesRaw)) {
		throw error(400, 'Missing themeOverrides');
	}

	const overrides: Record<string, string> = {};
	for (const [key, value] of Object.entries(themeOverridesRaw as Record<string, unknown>)) {
		if (!ALLOWED_KEYS.has(key as GloopglopCustomColorKey)) continue;
		if (typeof value !== 'string' || !value.trim()) continue;
		overrides[key] = value.trim();
	}

	try {
		const site = await getContentSiteById(platform, siteId);
		if (!site) throw error(404, 'Site not found');

		const role = await getSiteMemberRole(platform, siteId, user.id);
		if (!roleCanEdit(role, user.role === 'admin')) throw error(403, 'Not allowed');

		const ok = await updateContentSiteThemeOverrides({
			platform,
			siteId,
			overrides
		});
		if (!ok) throw error(404, 'Site not found');

		return json({ ok: true as const, siteId, themeOverrides: overrides });
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0016/0017.');
		}
		throw e;
	}
};
