const MAX_IMAGE_DIMENSION = 512;
const JPEG_QUALITY = 0.85;

export const LINKS_CREATOR_PROFILE_PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function isAcceptedProfilePictureFile(file: File): boolean {
	return file.type.startsWith('image/');
}

/** Resize and compress for session storage + preview. */
export async function prepareProfilePictureDataUrl(file: File): Promise<string> {
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

		const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
		if (!dataUrl.startsWith('data:image/')) {
			throw new Error('Could not process that image.');
		}
		return dataUrl;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Could not load that image.'));
		img.src = src;
	});
}
