import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { assertGloopglopUploadSite, GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';
import {
	getApprovedWatchVideo,
	isUploadSchemaError,
	normalizeCreatorRouteId
} from '$lib/server/uploads';
import { findMockWatchVideo, isWatchMockRequest, mockWatchVideoPageData } from '$lib/server/watch-mock';
import { resolveSiteById } from '$lib/server/sites';

export const load: PageServerLoad = async ({ params, platform, locals, url }) => {
	assertGloopglopUploadSite(locals.site);

	let creatorId: string;
	try {
		creatorId = normalizeCreatorRouteId(params.creator ?? '');
	} catch {
		throw error(404, 'Creator not found');
	}

	const uploadId = params.id?.trim();
	if (!uploadId) throw error(404, 'Video not found');

	const mockVideo = findMockWatchVideo(creatorId, uploadId);
	if (mockVideo || isWatchMockRequest(url)) {
		if (!mockVideo) throw error(404, 'Video not found');
		return mockWatchVideoPageData(mockVideo);
	}

	try {
		const video = await getApprovedWatchVideo({
			platform,
			siteId: GLOOPGLOP_SITE_ID,
			creatorId,
			uploadId
		});
		if (!video) throw error(404, 'Video not found');

		const creatorSite = await resolveSiteById(creatorId);

		return {
			creatorId,
			creatorName: creatorSite?.name ?? creatorId,
			video
		};
	} catch (e) {
		if (isUploadSchemaError(e)) {
			throw error(503, 'Watch needs D1 migration 0012.');
		}
		throw e;
	}
};
