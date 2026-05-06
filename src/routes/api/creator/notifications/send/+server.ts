import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendPushToPage, verifyCreatorNotifyKey } from '$lib/server/push';

function isSafePath(value: string): boolean {
	return value.startsWith('/') && !value.includes('..') && value.length <= 256;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const site = locals.site;
	if (!site) throw error(404, 'Site not found');

	const apiKey = request.headers.get('x-creator-notify-key') ?? '';
	if (!verifyCreatorNotifyKey(platform, apiKey)) {
		throw error(401, 'Unauthorized');
	}

	let bodyIn: unknown;
	try {
		bodyIn = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!bodyIn || typeof bodyIn !== 'object') throw error(400, 'Invalid body');
	const body = bodyIn as Record<string, unknown>;

	const pagePath = typeof body.pagePath === 'string' ? body.pagePath.trim() : '';
	const title = typeof body.title === 'string' ? body.title.trim() : '';
	const message = typeof body.message === 'string' ? body.message.trim() : '';
	const url = typeof body.url === 'string' ? body.url.trim() : '';
	const creatorName = typeof body.creatorName === 'string' ? body.creatorName.trim() : '';
	const topicIds = (
		Array.isArray(body.topicIds)
			? body.topicIds
			: typeof body.topicId === 'string'
				? [body.topicId]
				: []
	)
		.filter((x): x is string => typeof x === 'string')
		.map((x) => x.trim().toLowerCase())
		.filter((x) => /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(x));

	if (!pagePath || !isSafePath(pagePath)) throw error(400, 'Invalid pagePath');
	if (!title) throw error(400, 'Title is required');
	if (!message) throw error(400, 'Message is required');

	const result = await sendPushToPage({
		platform,
		siteId: site.siteId,
		pagePath,
		payload: {
			title: title.slice(0, 120),
			body: message.slice(0, 280),
			url: url || pagePath,
			creatorName: creatorName || undefined,
			topicId: topicIds[0] || undefined
		},
		topicIds
	});

	return json({ ok: true, ...result });
};
