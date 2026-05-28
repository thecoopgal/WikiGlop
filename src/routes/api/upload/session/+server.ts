import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isStreamConfigured, normalizeStreamCreator } from '$lib/server/cloudflare-stream';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';
import { createStreamUploadSession, isUploadSchemaError } from '$lib/server/uploads';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const site = assertGloopglopUploadSite(locals.site);

	if (!isStreamConfigured(platform)) {
		throw error(
			503,
			'Cloudflare Stream is not configured. Add STREAM in wrangler.jsonc and set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN in .dev.vars (required for local dev).'
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const data = body as Record<string, unknown>;

	const filename = typeof data.filename === 'string' ? data.filename.trim() : '';
	const sizeBytes = typeof data.sizeBytes === 'number' ? data.sizeBytes : Number(data.sizeBytes);
	const contentType = typeof data.contentType === 'string' ? data.contentType : 'video/mp4';
	const clientKeyRaw = data.clientKey;
	const clientKey =
		typeof clientKeyRaw === 'string' && clientKeyRaw.trim() ? clientKeyRaw.trim() : undefined;
	let creator: string | undefined;
	try {
		creator = normalizeStreamCreator(data.creator);
	} catch (e) {
		throw error(400, e instanceof Error ? e.message : 'Invalid creator');
	}

	if (!filename) throw error(400, 'filename is required');
	if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) throw error(400, 'sizeBytes is required');

	try {
		const session = await createStreamUploadSession({
			platform,
			siteId: site.siteId,
			filename,
			sizeBytes,
			contentType,
			clientKey,
			creator
		});
		return json({ ok: true as const, session });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Could not start upload';
		if (isUploadSchemaError(e)) {
			throw error(
				503,
				'Upload needs D1 migrations 0010–0012. Run npm run db:migrate:local (dev) or npm run db:migrate:remote.'
			);
		}
		if (
			message.includes('STREAM') ||
			message.includes('CLOUDFLARE') ||
			message.includes('video') ||
			message.includes('MB')
		) {
			throw error(400, message);
		}
		console.error('upload session POST failed:', e);
		throw error(500, message);
	}
};
