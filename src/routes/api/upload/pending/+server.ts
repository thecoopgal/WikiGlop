import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyCreatorNotifyKey } from '$lib/server/push';
import { assertGloopglopUploadSite, GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';
import { isUploadSchemaError, listPendingUploads } from '$lib/server/uploads';

/** List uploads awaiting approval (moderation). */
export const GET: RequestHandler = async ({ request, locals, platform }) => {
	assertGloopglopUploadSite(locals.site);

	const apiKey = request.headers.get('x-creator-notify-key') ?? '';
	if (!verifyCreatorNotifyKey(platform, apiKey)) {
		throw error(401, 'Unauthorized');
	}

	try {
		const uploads = await listPendingUploads({ platform, siteId: GLOOPGLOP_SITE_ID });
		return json({
			uploads: uploads.map((u) => ({
				id: u.id,
				filename: u.filename,
				creatorId: u.creator_id,
				streamUid: u.stream_uid,
				thumbnailUrl: u.thumbnail_url,
				createdAt: u.created_at,
				approvalStatus: u.approval_status
			}))
		});
	} catch (e) {
		if (isUploadSchemaError(e)) {
			throw error(503, 'Upload database needs migration 0012.');
		}
		throw e;
	}
};
