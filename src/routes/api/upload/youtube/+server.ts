import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';
import { getLinkedGoogleAccountForSession } from '$lib/server/google-oauth';
import {
	getUploadSession,
	isUploadSchemaError,
	upsertDestinationJob
} from '$lib/server/uploads';
import {
	GOOGLE_SESSION_COOKIE,
	verifyGoogleSessionCookie
} from '$lib/server/upload-session-cookie';
import { uploadVideoToYoutube } from '$lib/server/youtube-upload';

export const POST: RequestHandler = async ({ request, locals, platform, cookies }) => {
	assertGloopglopUploadSite(locals.site);

	const sessionId = await verifyGoogleSessionCookie(
		platform,
		cookies.get(GOOGLE_SESSION_COOKIE)
	);
	const linked = await getLinkedGoogleAccountForSession({ platform, sessionId });
	if (!linked) {
		throw error(401, 'Connect your Google account first');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const data = body as Record<string, unknown>;
	const uploadId = typeof data.uploadId === 'string' ? data.uploadId.trim() : '';
	if (!uploadId) throw error(400, 'uploadId is required');

	const title =
		typeof data.title === 'string' && data.title.trim()
			? data.title.trim()
			: undefined;
	const description = typeof data.description === 'string' ? data.description : '';
	const privacyRaw = data.privacyStatus;
	const privacyStatus =
		privacyRaw === 'public' || privacyRaw === 'unlisted' || privacyRaw === 'private'
			? privacyRaw
			: 'private';

	try {
		const session = await getUploadSession(platform, uploadId, 'gloopglop');
		if (!session) throw error(404, 'Upload not found');

		await upsertDestinationJob({
			platform,
			uploadId,
			destination: 'youtube',
			status: 'uploading',
			googleSub: linked.googleSub
		});

		const result = await uploadVideoToYoutube({
			platform,
			googleSub: linked.googleSub,
			session,
			metadata: {
				title:
					title ??
					(session.filename.replace(/\.[^.]+$/, '') || 'GloopGlop upload'),
				description,
				privacyStatus
			}
		});

		await upsertDestinationJob({
			platform,
			uploadId,
			destination: 'youtube',
			status: 'complete',
			externalId: result.videoId,
			externalUrl: result.videoUrl,
			googleSub: linked.googleSub
		});

		return json({
			ok: true as const,
			videoId: result.videoId,
			videoUrl: result.videoUrl
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'YouTube upload failed';
		if (isUploadSchemaError(e)) {
			throw error(503, 'Upload database is not migrated yet.');
		}
		try {
			await upsertDestinationJob({
				platform,
				uploadId,
				destination: 'youtube',
				status: 'error',
				errorMessage: message.slice(0, 500),
				googleSub: linked.googleSub
			});
		} catch {
			/* ignore */
		}
		if (
			message.includes('Google') ||
			message.includes('YouTube') ||
			message.includes('sign in')
		) {
			throw error(400, message);
		}
		console.error('youtube upload failed:', e);
		throw error(500, message);
	}
};
