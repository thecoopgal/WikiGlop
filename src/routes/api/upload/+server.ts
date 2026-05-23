import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';
import { isUploadSchemaError, storeUpload } from '$lib/server/uploads';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const site = assertGloopglopUploadSite(locals.site);

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		throw error(400, 'Invalid form data');
	}

	const file = form.get('file');
	if (!(file instanceof File)) {
		throw error(400, 'Missing video file');
	}

	const clientKeyRaw = form.get('clientKey');
	const clientKey =
		typeof clientKeyRaw === 'string' && clientKeyRaw.trim() ? clientKeyRaw.trim() : undefined;

	try {
		const upload = await storeUpload({
			platform,
			siteId: site.siteId,
			file,
			clientKey
		});
		return json({ ok: true as const, upload });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Upload failed';
		if (isUploadSchemaError(e)) {
			throw error(
				503,
				'Upload needs D1 migration 0010. Run npm run db:migrate:local (dev) or wrangler d1 migrations apply gloopglop --remote.'
			);
		}
		if (
			message.includes('UPLOADS') ||
			message.includes('video') ||
			message.includes('MB') ||
			message.includes('Choose')
		) {
			throw error(400, message);
		}
		console.error('upload POST failed:', e);
		throw error(500, 'Upload failed');
	}
};
