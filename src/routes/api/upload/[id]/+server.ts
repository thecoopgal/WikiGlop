import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';
import { getUploadSession, isUploadSchemaError } from '$lib/server/uploads';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	assertGloopglopUploadSite(locals.site);
	const uploadId = params.id?.trim();
	if (!uploadId) throw error(400, 'Missing upload id');

	try {
		const session = await getUploadSession(platform, uploadId, 'gloopglop');
		if (!session) throw error(404, 'Upload not found');

		return json({
			upload: {
				id: session.id,
				filename: session.filename,
				contentType: session.content_type,
				sizeBytes: session.size_bytes,
				streamUid: session.stream_uid ?? undefined,
				playbackUrl: session.stream_playback_url,
				createdAt: session.created_at
			}
		} satisfies import('$lib/upload-client').UploadStatusResult);
	} catch (e) {
		if (isUploadSchemaError(e)) {
			throw error(503, 'Upload database is not migrated yet.');
		}
		throw e;
	}
};
