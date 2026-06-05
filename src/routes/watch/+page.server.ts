import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { assertGloopglopUploadSite, GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';
import { isUploadSchemaError, listAllApprovedWatchVideos } from '$lib/server/uploads';
import { resolveSiteById } from '$lib/server/sites';

export const load: PageServerLoad = async ({ platform, locals }) => {
	assertGloopglopUploadSite(locals.site);

	try {
		const rows = await listAllApprovedWatchVideos({
			platform,
			siteId: GLOOPGLOP_SITE_ID
		});

		const creatorNames = new Map<string, string>();
		const videos = await Promise.all(
			rows.map(async (video) => {
				let creatorName = creatorNames.get(video.creatorId);
				if (!creatorName) {
					const creatorSite = await resolveSiteById(video.creatorId);
					creatorName = creatorSite?.name ?? video.creatorId;
					creatorNames.set(video.creatorId, creatorName);
				}
				return { ...video, creatorName };
			})
		);

		return { videos };
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
