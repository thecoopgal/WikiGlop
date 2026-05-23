import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';
import {
	getLinkedGoogleAccountForSession,
	isGoogleOAuthConfigured
} from '$lib/server/google-oauth';
import { getUploadSession, isUploadSchemaError, listDestinationJobs } from '$lib/server/uploads';
import {
	GOOGLE_SESSION_COOKIE,
	verifyGoogleSessionCookie
} from '$lib/server/upload-session-cookie';

export const GET: RequestHandler = async ({ params, locals, platform, cookies }) => {
	assertGloopglopUploadSite(locals.site);
	const uploadId = params.id?.trim();
	if (!uploadId) throw error(400, 'Missing upload id');

	const sessionId = await verifyGoogleSessionCookie(
		platform,
		cookies.get(GOOGLE_SESSION_COOKIE)
	);
	const linked = await getLinkedGoogleAccountForSession({ platform, sessionId });

	try {
		const session = await getUploadSession(platform, uploadId, 'gloopglop');
		if (!session) throw error(404, 'Upload not found');

		const jobs = await listDestinationJobs(platform, uploadId);

		return json({
			upload: {
				id: session.id,
				filename: session.filename,
				contentType: session.content_type,
				sizeBytes: session.size_bytes,
				createdAt: session.created_at
			},
			destinations: jobs.map((j) => ({
				destination: j.destination,
				status: j.status,
				externalUrl: j.external_url,
				errorMessage: j.error_message
			})),
			google: {
				connected: !!linked,
				email: linked?.email ?? null,
				configured: isGoogleOAuthConfigured(platform)
			}
		} satisfies import('$lib/upload-client').UploadStatusResult);
	} catch (e) {
		if (isUploadSchemaError(e)) {
			throw error(503, 'Upload database is not migrated yet.');
		}
		throw e;
	}
};
