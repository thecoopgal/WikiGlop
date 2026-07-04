import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { importLinksCreatePageFromUrl } from '$lib/server/links-create-import';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.site) throw error(404, 'Site not found');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const payload = body as Record<string, unknown>;
	const url = typeof payload.url === 'string' ? payload.url : '';
	if (!url.trim()) {
		return json({ ok: false, error: 'Enter the link to your existing page.' }, { status: 400 });
	}

	const result = await importLinksCreatePageFromUrl(url, platform);
	if (!result.ok) {
		return json({ ok: false, error: result.error }, { status: 404 });
	}

	return json({ ok: true, page: result.page });
};
