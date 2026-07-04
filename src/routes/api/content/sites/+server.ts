import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopAuthSite, requireUser } from '$lib/server/auth-gate';
import {
	countSiteMembers,
	getContentSiteById,
	getSiteMemberRole,
	isContentStoreSchemaError,
	publishLinksSubmissionToContentStore,
	roleCanEdit,
	upsertPublishedSiteAndPage
} from '$lib/server/content-store';
import {
	buildLinksSubmissionSiteDocsFromPayload,
	creatorSiteIdFromName
} from '$lib/links-submission-site';
import type { LinksPageSubmissionPayload } from '$lib/links-submission-payload';
import { newLinksSubmissionId } from '$lib/server/links-submissions';

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

function parseLinksPayload(raw: unknown): LinksPageSubmissionPayload | null {
	if (!isRecord(raw)) return null;
	const names = Array.isArray(raw.names)
		? raw.names.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
		: [];
	if (!names.length) return null;
	const links = Array.isArray(raw.links)
		? raw.links
				.filter((l): l is Record<string, unknown> => isRecord(l))
				.map((l) => ({
					label: typeof l.label === 'string' ? l.label : '',
					href: typeof l.href === 'string' ? l.href : '',
					iconMode: typeof l.iconMode === 'string' ? l.iconMode : undefined
				}))
				.filter((l) => l.label && l.href)
		: [];

	return {
		theme: typeof raw.theme === 'string' ? raw.theme : null,
		names,
		tagline: typeof raw.tagline === 'string' ? raw.tagline : '',
		description: typeof raw.description === 'string' ? raw.description : '',
		links,
		hasProfilePicture: raw.hasProfilePicture === true,
		profilePictureUrl:
			typeof raw.profilePictureUrl === 'string' ? raw.profilePictureUrl : null,
		pageColors:
			isRecord(raw.pageColors)
				? Object.fromEntries(
						Object.entries(raw.pageColors).filter(
							(e): e is [string, string] => typeof e[1] === 'string'
						)
					)
				: {},
		shareIconVariant:
			raw.shareIconVariant === 'dark' || raw.shareIconVariant === 'light'
				? raw.shareIconVariant
				: undefined,
		siteThemeMode: raw.siteThemeMode === 'dark' ? 'dark' : 'light'
	};
}

async function assertCanPublishToSite(
	platform: App.Platform | undefined,
	siteId: string,
	user: { id: string; role: string }
): Promise<void> {
	const existing = await getContentSiteById(platform, siteId);
	if (!existing) return;

	const memberCount = await countSiteMembers(platform, siteId);
	if (memberCount === 0) return;

	const role = await getSiteMemberRole(platform, siteId, user.id);
	if (!roleCanEdit(role, user.role === 'admin')) {
		throw error(403, 'Site already has members; you need an editor or owner role');
	}
}

/** Authenticated self-serve publish: creates/updates a D1 site; membership is separate. */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	assertGloopglopAuthSite(locals.site);
	const user = requireUser(locals.user);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const data = body as Record<string, unknown>;

	try {
		if (isRecord(data.site) && isRecord(data.page)) {
			const siteIdRaw =
				typeof data.siteId === 'string'
					? data.siteId
					: typeof data.site.id === 'string'
						? data.site.id
						: '';
			const siteId = siteIdRaw.trim().toLowerCase();
			if (siteId.length < 2) throw error(400, 'Invalid site id');

			await assertCanPublishToSite(platform, siteId, user);

			const name =
				typeof data.site.name === 'string' && data.site.name.trim()
					? data.site.name.trim()
					: siteId;

			await upsertPublishedSiteAndPage({
				platform,
				siteId,
				name,
				memberUserId: user.id,
				config: data.site,
				page: data.page,
				source: 'self_serve',
				sourceRef: user.id
			});

			return json({ ok: true as const, siteId });
		}

		const payload = parseLinksPayload(data.payload ?? data);
		if (!payload) throw error(400, 'Provide site+page or a links payload with names');

		const creatorId =
			typeof data.creatorId === 'string' && data.creatorId.trim()
				? data.creatorId.trim().toLowerCase()
				: creatorSiteIdFromName(payload.names[0] ?? '');

		const docs = buildLinksSubmissionSiteDocsFromPayload(payload, creatorId);
		const siteId = docs.siteId.trim().toLowerCase();
		await assertCanPublishToSite(platform, siteId, user);

		await publishLinksSubmissionToContentStore({
			platform,
			memberUserId: user.id,
			row: {
				id: newLinksSubmissionId(),
				site_id: 'gloopglop',
				client_key: null,
				creator_id: creatorId,
				display_name: payload.names[0] ?? siteId,
				approval_status: 'approved',
				payload_json: JSON.stringify(payload),
				approved_at: new Date().toISOString(),
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}
		});

		return json({ ok: true as const, siteId });
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0016/0017.');
		}
		console.error('content publish failed:', e);
		throw error(503, 'Could not publish site.');
	}
};
