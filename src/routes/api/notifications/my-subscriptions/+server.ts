import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMyCreatorSubscriptions } from '$lib/server/push';

export const GET: RequestHandler = async ({ url, platform }) => {
	const endpoint = url.searchParams.get('endpoint')?.trim() ?? '';
	if (!endpoint) throw error(400, 'Missing endpoint');

	const subscriptions = await getMyCreatorSubscriptions({
		platform,
		endpoint
	});
	return json({ ok: true, subscriptions });
};
