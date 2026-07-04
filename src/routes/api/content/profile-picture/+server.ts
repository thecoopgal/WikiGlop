import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopAuthSite, requireUser } from '$lib/server/auth-gate';
import { uploadImageToCloudflareImages } from '$lib/server/cloudflare-images';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	assertGloopglopAuthSite(locals.site);
	const user = requireUser(locals.user);

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		throw error(400, 'Expected multipart form data');
	}

	const file = form.get('file');
	if (!(file instanceof File)) {
		throw error(400, 'Missing file');
	}
	if (!ALLOWED_TYPES.has(file.type) && !file.type.startsWith('image/')) {
		throw error(400, 'Please choose a JPEG, PNG, WebP, or GIF image.');
	}

	try {
		const bytes = await file.arrayBuffer();
		const uploaded = await uploadImageToCloudflareImages({
			platform,
			bytes,
			filename: file.name || 'profile.jpg',
			creatorId: user.id,
			metadata: {
				purpose: 'profile_picture',
				userId: user.id
			}
		});
		return json({ ok: true as const, url: uploaded.url, id: uploaded.id });
	} catch (e) {
		console.error('profile-picture upload failed:', e);
		const message = e instanceof Error ? e.message : 'Upload failed';
		throw error(503, message);
	}
};
