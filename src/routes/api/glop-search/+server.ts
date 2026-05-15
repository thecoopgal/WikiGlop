import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { insertGlopAnswer } from '$lib/server/glop-search';

const GLOOPGLOP_SITE_ID = 'gloopglop';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (locals.site?.siteId !== GLOOPGLOP_SITE_ID) {
		throw error(404, 'Not found');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const data = body as Record<string, unknown>;
	const queryRaw = typeof data.query === 'string' ? data.query : '';
	const urlRaw = typeof data.url === 'string' ? data.url : '';

	try {
		const { id } = await insertGlopAnswer({
			platform,
			siteId: locals.site.siteId,
			queryRaw,
			answerUrl: urlRaw
		});
		return json({ ok: true as const, id });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Could not save your gloop.';
		if (
			message.includes('between') ||
			message.includes('valid link') ||
			message.includes('valid http') ||
			message.includes('Local and loopback') ||
			message.includes('DB binding')
		) {
			throw error(400, message);
		}
		throw error(500, 'Could not save your gloop.');
	}
};
