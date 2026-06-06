import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	isLinksSubmissionSchemaError,
	listLinksSubmissionsForClient,
	normalizeLinksClientKey
} from '$lib/server/links-submissions';
import { assertGloopglopUploadSite, GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';

/** List links page submissions for this browser (client key). */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	assertGloopglopUploadSite(locals.site);

	const clientKey = normalizeLinksClientKey(url.searchParams.get('clientKey'));
	if (!clientKey) {
		throw error(400, 'Missing or invalid clientKey');
	}

	try {
		const submissions = await listLinksSubmissionsForClient({
			platform,
			siteId: GLOOPGLOP_SITE_ID,
			clientKey
		});
		return json({ submissions });
	} catch (e) {
		if (isLinksSubmissionSchemaError(e)) {
			throw error(503, 'Links submissions database needs migration 0013.');
		}
		throw e;
	}
};
