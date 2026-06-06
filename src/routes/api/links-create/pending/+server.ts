import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyCreatorNotifyKey } from '$lib/server/push';
import {
	isLinksSubmissionSchemaError,
	listPendingLinksSubmissions
} from '$lib/server/links-submissions';
import { assertGloopglopUploadSite, GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';

/** List links page submissions awaiting approval (moderation). */
export const GET: RequestHandler = async ({ request, locals, platform }) => {
	assertGloopglopUploadSite(locals.site);

	const apiKey = request.headers.get('x-creator-notify-key') ?? '';
	if (!verifyCreatorNotifyKey(platform, apiKey)) {
		throw error(401, 'Unauthorized');
	}

	try {
		const submissions = await listPendingLinksSubmissions({
			platform,
			siteId: GLOOPGLOP_SITE_ID
		});
		return json({ submissions });
	} catch (e) {
		if (isLinksSubmissionSchemaError(e)) {
			throw error(503, 'Links submissions database needs migration 0013.');
		}
		throw e;
	}
};
