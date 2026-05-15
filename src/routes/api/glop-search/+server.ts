import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { insertGlopAnswer, isGlopSubmissionSchemaError } from '$lib/server/glop-search';

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
	const clientKeyRaw = data.clientKey;
	const clientKey =
		typeof clientKeyRaw === 'string' && clientKeyRaw.trim() ? clientKeyRaw.trim() : '';
	if (!clientKey) {
		throw error(400, 'Browser client id is required to post a glop.');
	}
	try {
		const { id } = await insertGlopAnswer({
			platform,
			siteId: locals.site.siteId,
			queryRaw,
			answerUrl: urlRaw,
			clientBrowserKey: clientKey
		});
		return json({ ok: true as const, id });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Could not save your gloop.';
		const lower = message.toLowerCase();
		if (isGlopSubmissionSchemaError(e)) {
			throw error(
				503,
				'Glop submissions need D1 migrations 0006 and 0007. Run npm run db:migrate:local (dev) or wrangler d1 migrations apply gloopglop --remote.'
			);
		}
		if (
			message.includes('between') ||
			message.includes('valid link') ||
			message.includes('valid http') ||
			message.includes('Community gloops only accept') ||
			message.includes('Please enter a valid') ||
			message.includes('Local and loopback') ||
			message.includes('Browser client id') ||
			message.includes('Invalid browser client id') ||
			lower.includes('already added') ||
			message.includes('DB binding')
		) {
			throw error(400, message);
		}
		console.error('glop-search POST failed:', e);
		throw error(500, 'Could not save your gloop.');
	}
};
