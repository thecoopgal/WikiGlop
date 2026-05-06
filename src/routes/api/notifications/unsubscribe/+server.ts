import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { revokePushSubscription } from '$lib/server/push';
import { resolveSiteById } from '$lib/server/sites';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');

	const payload = body as Record<string, unknown>;
	const endpointRaw = payload.endpoint;
	const siteIdRaw = typeof payload.siteId === 'string' ? payload.siteId.trim() : '';
	const endpoint = typeof endpointRaw === 'string' ? endpointRaw.trim() : '';
	const pagePathRaw = payload.pagePath;
	const pagePath = typeof pagePathRaw === 'string' ? pagePathRaw.trim() : '';
	if (!endpoint) throw error(400, 'Missing endpoint');
	const site = siteIdRaw ? await resolveSiteById(siteIdRaw) : locals.site;
	if (!site) throw error(404, 'Site not found');

	await revokePushSubscription({
		platform,
		endpoint,
		siteId: site.siteId,
		pagePath: pagePath || undefined
	});
	return json({ ok: true });
};
