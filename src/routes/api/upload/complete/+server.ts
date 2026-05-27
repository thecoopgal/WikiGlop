import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';
import { finalizeStreamUpload, isUploadSchemaError } from '$lib/server/uploads';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	assertGloopglopUploadSite(locals.site);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const uploadId = typeof (body as { uploadId?: string }).uploadId === 'string'
		? (body as { uploadId: string }).uploadId.trim()
		: '';
	if (!uploadId) throw error(400, 'uploadId is required');

	try {
		const upload = await finalizeStreamUpload({
			platform,
			uploadId,
			siteId: 'gloopglop'
		});
		return json({
			ok: true as const,
			upload: {
				id: upload.id,
				filename: upload.filename,
				contentType: upload.contentType,
				sizeBytes: upload.sizeBytes,
				streamUid: upload.streamUid,
				playbackUrl: upload.playbackUrl
			}
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Could not finalize upload';
		if (isUploadSchemaError(e)) {
			throw error(503, 'Upload database is not migrated yet.');
		}
		if (message.includes('processing') || message.includes('not found')) {
			throw error(400, message);
		}
		console.error('upload complete POST failed:', e);
		throw error(500, message);
	}
};
