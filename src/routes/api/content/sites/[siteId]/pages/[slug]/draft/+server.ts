import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopAuthSite, requireUser } from '$lib/server/auth-gate';
import {
	discardContentPageDraft,
	getContentSiteById,
	getSiteMemberRole,
	isContentStoreSchemaError,
	parsePageJson,
	roleCanEdit,
	saveContentPageDraft
} from '$lib/server/content-store';
import {
	GLOOPGLOP_CUSTOM_COLOR_FIELDS,
	type GloopglopCustomColorKey
} from '$lib/daisy-theme-colors';

const ALLOWED_KEYS = new Set<GloopglopCustomColorKey>(
	GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => key)
);

function parseThemeOverrides(raw: unknown): Record<string, string> | null {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
	const overrides: Record<string, string> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		if (!ALLOWED_KEYS.has(key as GloopglopCustomColorKey)) continue;
		if (typeof value !== 'string' || !value.trim()) continue;
		overrides[key] = value.trim();
	}
	return Object.keys(overrides).length ? overrides : null;
}

async function assertCanEdit(
	platform: App.Platform | undefined,
	siteId: string,
	user: { id: string; role: string }
) {
	const site = await getContentSiteById(platform, siteId);
	if (!site) throw error(404, 'Site not found');
	const role = await getSiteMemberRole(platform, siteId, user.id);
	if (!roleCanEdit(role, user.role === 'admin')) throw error(403, 'Not allowed');
}

/** Save (or replace) the single draft for this page. */
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
	const page = parsePageJson(JSON.stringify(pageRaw));
	if (!page) throw error(400, 'Invalid page (need id and layout)');

	const themeOverrides = parseThemeOverrides((body as { themeOverrides?: unknown }).themeOverrides);

	try {
		await assertCanEdit(platform, siteId, user);
		const draft = await saveContentPageDraft({
			platform,
			siteId,
			slug,
			page,
			themeOverrides
		});
		return json({
			ok: true as const,
			siteId,
			slug,
			hasDraft: true,
			updatedAt: draft.updatedAt
		});
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0018.');
		}
		throw e;
	}
};

/** Discard the draft and keep the published page. */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	assertGloopglopAuthSite(locals.site);
	const user = requireUser(locals.user);
	const siteId = params.siteId?.trim().toLowerCase() ?? '';
	const slug = params.slug?.trim().toLowerCase() || 'index';
	if (!siteId) throw error(400, 'Missing site id');

	try {
		await assertCanEdit(platform, siteId, user);
		await discardContentPageDraft(platform, siteId, slug);
		return json({ ok: true as const, siteId, slug, hasDraft: false });
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0018.');
		}
		throw e;
	}
};
