import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyCreatorNotifyKey } from '$lib/server/push';
import {
	isLinksSubmissionSchemaError,
	setLinksSubmissionApproval
} from '$lib/server/links-submissions';
import { assertGloopglopUploadSite, GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	assertGloopglopUploadSite(locals.site);

	const apiKey = request.headers.get('x-creator-notify-key') ?? '';
	if (!verifyCreatorNotifyKey(platform, apiKey)) {
		throw error(401, 'Unauthorized');
	}

	const submissionId = params.id?.trim();
	if (!submissionId) throw error(400, 'Missing submission id');

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
		const row = await setLinksSubmissionApproval({
			platform,
			submissionId,
			siteId: GLOOPGLOP_SITE_ID,
			status: statusRaw
		});
		if (!row) throw error(404, 'Submission not found');

		return json({
			ok: true as const,
			submission: {
				id: row.id,
				displayName: row.display_name,
				creatorId: row.creator_id,
				approvalStatus: row.approval_status,
				approvedAt: row.approved_at,
				createdAt: row.created_at
			}
		});
	} catch (e) {
		if (isLinksSubmissionSchemaError(e)) {
			throw error(503, 'Links submissions database needs migration 0013.');
		}
		throw e;
	}
};
