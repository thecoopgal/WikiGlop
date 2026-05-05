import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { upsertPushSubscription, type PushSubscriptionInput } from '$lib/server/push';

function isSafePath(value: string): boolean {
	return value.startsWith('/') && !value.includes('..') && value.length <= 256;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const site = locals.site;
	if (!site) throw error(404, 'Site not found');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const data = body as Record<string, unknown>;
	const pagePath = typeof data.pagePath === 'string' ? data.pagePath.trim() : '';
	const creatorName = typeof data.creatorName === 'string' ? data.creatorName.trim() : '';
	const subscription = data.subscription as PushSubscriptionInput | undefined;
	if (!pagePath || !isSafePath(pagePath)) throw error(400, 'Invalid pagePath');
	if (!subscription || typeof subscription !== 'object') throw error(400, 'Invalid subscription');

	await upsertPushSubscription({
		platform,
		siteId: site.siteId,
		pagePath,
		creatorName,
		subscription,
		userAgent: request.headers.get('user-agent') ?? undefined
	});

	return json({ ok: true });
};
