import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { revokePushSubscription } from '$lib/server/push';

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

	const payload = body as Record<string, unknown>;
	const endpointRaw = payload.endpoint;
	const endpoint = typeof endpointRaw === 'string' ? endpointRaw.trim() : '';
	const pagePathRaw = payload.pagePath;
	const pagePath = typeof pagePathRaw === 'string' ? pagePathRaw.trim() : '';
	if (!endpoint) throw error(400, 'Missing endpoint');

	await revokePushSubscription({
		platform,
		endpoint,
		siteId: site.siteId,
		pagePath: pagePath || undefined
	});
	return json({ ok: true });
};
