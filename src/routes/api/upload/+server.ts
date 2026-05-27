import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';

/** Legacy multipart upload — use POST /api/upload/session + direct Stream upload instead. */
export const POST: RequestHandler = async ({ locals }) => {
	assertGloopglopUploadSite(locals.site);
	throw error(
		410,
		'Use POST /api/upload/session to start a Stream upload, then upload directly to Cloudflare Stream.'
	);
};
