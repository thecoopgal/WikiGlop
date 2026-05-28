import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyCreatorNotifyKey } from '$lib/server/push';
import { assertGloopglopUploadSite, GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';
import { isUploadSchemaError, setUploadApproval } from '$lib/server/uploads';

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	assertGloopglopUploadSite(locals.site);

	const apiKey = request.headers.get('x-creator-notify-key') ?? '';
	if (!verifyCreatorNotifyKey(platform, apiKey)) {
		throw error(401, 'Unauthorized');
	}

	const uploadId = params.id?.trim();
	if (!uploadId) throw error(400, 'Missing upload id');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const statusRaw = (body as { status?: string }).status;
	if (statusRaw !== 'approved' && statusRaw !== 'rejected') {
		throw error(400, 'status must be "approved" or "rejected"');
	}

	try {
		const session = await setUploadApproval({
			platform,
			uploadId,
			siteId: GLOOPGLOP_SITE_ID,
			status: statusRaw
		});
		if (!session) throw error(404, 'Upload not found');

		return json({
			ok: true as const,
			upload: {
				id: session.id,
				creatorId: session.creator_id,
				approvalStatus: session.approval_status,
				approvedAt: session.approved_at,
				streamUid: session.stream_uid
			}
		});
	} catch (e) {
		if (isUploadSchemaError(e)) {
			throw error(503, 'Upload database needs migration 0012.');
		}
		throw e;
	}
};
