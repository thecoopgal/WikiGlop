import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { upsertPushSubscription, type PushSubscriptionInput } from '$lib/server/push';
import { resolveSiteById } from '$lib/server/sites';

function isSafePath(value: string): boolean {
	return value.startsWith('/') && !value.includes('..') && value.length <= 256;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const data = body as Record<string, unknown>;
	const siteIdRaw = typeof data.siteId === 'string' ? data.siteId.trim() : '';
	const pagePath = typeof data.pagePath === 'string' ? data.pagePath.trim() : '';
	const creatorName = typeof data.creatorName === 'string' ? data.creatorName.trim() : '';
	const topicIdsRaw = Array.isArray(data.topicIds) ? data.topicIds : [];
	const topicIds = topicIdsRaw
		.filter((x): x is string => typeof x === 'string')
		.map((x) => x.trim().toLowerCase())
		.filter((x) => /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(x));
	const subscription = data.subscription as PushSubscriptionInput | undefined;
	if (!pagePath || !isSafePath(pagePath)) throw error(400, 'Invalid pagePath');
	if (!subscription || typeof subscription !== 'object') throw error(400, 'Invalid subscription');
	const site = siteIdRaw ? await resolveSiteById(siteIdRaw) : locals.site;
	if (!site) throw error(404, 'Site not found');

	await upsertPushSubscription({
		platform,
		siteId: site.siteId,
		pagePath,
		creatorName,
		topicIds,
		subscription,
		userAgent: request.headers.get('user-agent') ?? undefined
	});

	return json({ ok: true });
};
