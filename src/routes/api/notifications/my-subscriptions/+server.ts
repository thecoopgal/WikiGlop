import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMyCreatorSubscriptions } from '$lib/server/push';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	const site = locals.site;
	if (!site) throw error(404, 'Site not found');
	const endpoint = url.searchParams.get('endpoint')?.trim() ?? '';
	if (!endpoint) throw error(400, 'Missing endpoint');

	const subscriptions = await getMyCreatorSubscriptions({
		platform,
		siteId: site.siteId,
		endpoint
	});
	return json({ ok: true, subscriptions });
};
