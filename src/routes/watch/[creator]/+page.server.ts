import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { assertGloopglopUploadSite, GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';
import {
	isUploadSchemaError,
	listApprovedWatchVideos,
	normalizeCreatorRouteId
} from '$lib/server/uploads';
import { resolveSiteById } from '$lib/server/sites';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	assertGloopglopUploadSite(locals.site);

	let creatorId: string;
	try {
		creatorId = normalizeCreatorRouteId(params.creator ?? '');
	} catch {
		throw error(404, 'Creator not found');
	}

	try {
		const videos = await listApprovedWatchVideos({
			platform,
			siteId: GLOOPGLOP_SITE_ID,
			creatorId
		});
		const creatorSite = await resolveSiteById(creatorId);

		return {
			creatorId,
			creatorName: creatorSite?.name ?? creatorId,
			videos
		};
	} catch (e) {
		if (isUploadSchemaError(e)) {
			throw error(
				503,
				'Watch needs D1 migration 0012. Run npm run db:migrate:local (dev) or npm run db:migrate:remote.'
			);
		}
		throw e;
	}
};
