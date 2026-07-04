const MAX_IMAGE_DIMENSION = 512;
const JPEG_QUALITY = 0.85;

export const LINKS_CREATOR_PROFILE_PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function isAcceptedProfilePictureFile(file: File): boolean {
	return file.type.startsWith('image/');
}

/** Resize and compress to a square JPEG blob for upload / preview. */
export async function prepareProfilePictureBlob(file: File): Promise<Blob> {
	if (!isAcceptedProfilePictureFile(file)) {
		throw new Error('Please choose a JPEG, PNG, WebP, or GIF image.');
	}

	const objectUrl = URL.createObjectURL(file);
	try {
		const image = await loadImage(objectUrl);
		const size = Math.min(MAX_IMAGE_DIMENSION, Math.max(image.width, image.height));
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;

		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Could not process that image.');

		const scale = size / Math.max(image.width, image.height);
		const drawWidth = image.width * scale;
		const drawHeight = image.height * scale;
		const offsetX = (size - drawWidth) / 2;
		const offsetY = (size - drawHeight) / 2;
		ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(result) => {
					if (result) resolve(result);
					else reject(new Error('Could not process that image.'));
				},
				'image/jpeg',
				JPEG_QUALITY
			);
		});
		return blob;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

/** Resize and compress for session storage + preview. */
export async function prepareProfilePictureDataUrl(file: File): Promise<string> {
	const blob = await prepareProfilePictureBlob(file);
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === 'string' && result.startsWith('data:image/')) resolve(result);
			else reject(new Error('Could not process that image.'));
		};
		reader.onerror = () => reject(new Error('Could not process that image.'));
		reader.readAsDataURL(blob);
	});
}

/** Upload a profile picture to Cloudflare Images; returns the delivery URL. */
export async function uploadProfilePicture(file: File): Promise<string> {
	const blob = await prepareProfilePictureBlob(file);
	const body = new FormData();
	body.set('file', blob, 'profile.jpg');

	const res = await fetch('/api/content/profile-picture', {
		method: 'POST',
		body
	});
	const payload = (await res.json().catch(() => null)) as {
		url?: string;
		message?: string;
	} | null;
	if (!res.ok) {
		throw new Error(payload?.message?.trim() || 'Could not upload that image.');
	}
	const url = payload?.url?.trim();
	if (!url || !/^https?:\/\//i.test(url)) {
		throw new Error('Upload did not return an image URL.');
	}
	return url;
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Could not load that image.'));
		img.src = src;
	});
}
