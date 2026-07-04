import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopAuthSite, requireUser } from '$lib/server/auth-gate';
import {
	getContentSiteById,
	getSiteMemberRole,
	isContentStoreSchemaError,
	loadContentPage,
	parsePageJson,
	roleCanEdit,
	updateContentPageJson
} from '$lib/server/content-store';
import type { PageYaml } from '$lib/server/content';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	assertGloopglopAuthSite(locals.site);
	const user = requireUser(locals.user);
	const siteId = params.siteId?.trim().toLowerCase() ?? '';
	const slug = params.slug?.trim().toLowerCase() || 'index';
	if (!siteId) throw error(400, 'Missing site id');

	try {
		const role = await getSiteMemberRole(platform, siteId, user.id);
		if (!roleCanEdit(role, user.role === 'admin')) throw error(403, 'Not allowed');

		const page = await loadContentPage(platform, siteId, slug === 'index' ? [] : [slug]);
		if (!page) throw error(404, 'Page not found');
		return json({ ok: true as const, siteId, slug, page, role });
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0016/0017.');
		}
		throw e;
	}
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	assertGloopglopAuthSite(locals.site);
	const user = requireUser(locals.user);
	const siteId = params.siteId?.trim().toLowerCase() ?? '';
	const slug = params.slug?.trim().toLowerCase() || 'index';
	if (!siteId) throw error(400, 'Missing site id');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');

	const pageRaw = (body as { page?: unknown }).page;
	if (!pageRaw || typeof pageRaw !== 'object') throw error(400, 'Missing page');

	const pageJson = JSON.stringify(pageRaw);
	const page = parsePageJson(pageJson);
	if (!page) throw error(400, 'Invalid page (need id and layout)');

	try {
		const site = await getContentSiteById(platform, siteId);
		if (!site) throw error(404, 'Site not found');

		const role = await getSiteMemberRole(platform, siteId, user.id);
		if (!roleCanEdit(role, user.role === 'admin')) throw error(403, 'Not allowed');

		const updated = await updateContentPageJson({
			platform,
			siteId,
			slug,
			page: page as PageYaml
		});
		if (!updated) throw error(404, 'Page not found');

		return json({ ok: true as const, siteId, slug, page, role });
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0016/0017.');
		}
		throw e;
	}
};
