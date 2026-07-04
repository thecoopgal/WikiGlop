import { getWorkerBindings } from '$lib/server/platform-env';

const MAX_BYTES = 8 * 1024 * 1024;

export type UploadedImage = {
	id: string;
	url: string;
};

function pickPublicVariant(variants: string[] | undefined, imageId: string, accountHash: string): string {
	if (variants?.length) {
		const publicVariant = variants.find((v) => /\/public(?:\?|$)/.test(v));
		if (publicVariant) return publicVariant;
		return variants[0];
	}
	return `https://imagedelivery.net/${accountHash}/${imageId}/public`;
}

function accountHash(platform: App.Platform | undefined): string {
	const bindings = getWorkerBindings(platform);
	const hash =
		typeof bindings.CLOUDFLARE_IMAGES_ACCOUNT_HASH === 'string'
			? bindings.CLOUDFLARE_IMAGES_ACCOUNT_HASH.trim()
			: '';
	return hash || 'zdMtZgMUbYs7-R4-dRSl-Q';
}

/** Upload profile (or other) image bytes to Cloudflare Images; returns delivery URL. */
export async function uploadImageToCloudflareImages(opts: {
	platform: App.Platform | undefined;
	bytes: ArrayBuffer;
	filename: string;
	creatorId?: string;
	metadata?: Record<string, unknown>;
}): Promise<UploadedImage> {
	if (opts.bytes.byteLength === 0) {
		throw new Error('Empty image');
	}
	if (opts.bytes.byteLength > MAX_BYTES) {
		throw new Error('Image is too large (max 8MB).');
	}

	const bindings = getWorkerBindings(opts.platform);
	const hash = accountHash(opts.platform);
	const filename = opts.filename.trim() || 'profile.jpg';

	if (bindings.IMAGES?.hosted?.upload) {
		const meta = await bindings.IMAGES.hosted.upload(opts.bytes, {
			filename,
			requireSignedURLs: false,
			creator: opts.creatorId,
			metadata: opts.metadata
		});
		return {
			id: meta.id,
			url: pickPublicVariant(meta.variants, meta.id, hash)
		};
	}

	// REST fallback when IMAGES binding is unavailable (e.g. plain vite).
	const accountId =
		typeof bindings.CLOUDFLARE_ACCOUNT_ID === 'string'
			? bindings.CLOUDFLARE_ACCOUNT_ID.trim()
			: '';
	const token =
		typeof bindings.CLOUDFLARE_API_TOKEN === 'string'
			? bindings.CLOUDFLARE_API_TOKEN.trim()
			: '';
	if (!accountId || !token) {
		throw new Error('Cloudflare Images is not configured (IMAGES binding or API token).');
	}

	const form = new FormData();
	form.set('file', new Blob([new Uint8Array(opts.bytes)]), filename);
	if (opts.creatorId) form.set('creator', opts.creatorId);
	if (opts.metadata) form.set('metadata', JSON.stringify(opts.metadata));

	const res = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
			body: form
		}
	);
	const payload = (await res.json().catch(() => null)) as {
		success?: boolean;
		errors?: Array<{ message?: string }>;
		result?: { id?: string; variants?: string[] };
	} | null;

	if (!res.ok || !payload?.success || !payload.result?.id) {
		const msg =
			payload?.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
			`Images upload failed (${res.status})`;
		throw new Error(msg);
	}

	const id = payload.result.id;
	return {
		id,
		url: pickPublicVariant(payload.result.variants, id, hash)
	};
}
