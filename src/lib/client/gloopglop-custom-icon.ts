import { browser } from '$app/environment';
import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';

const STORAGE_KEY = 'gloopglop:custom-icon:v1';
const FILENAME_STORAGE_KEY = 'gloopglop:custom-icon-filename:v1';
const MAX_BYTES = 512 * 1024;

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) listener();
}

function readStoredIconFileName(): string | null {
	if (!browser) return null;
	const stored = localStorage.getItem(FILENAME_STORAGE_KEY)?.trim();
	return stored || null;
}

function readStoredIcon(): string | null {
	if (!browser) return null;
	const stored = localStorage.getItem(STORAGE_KEY)?.trim();
	return stored || null;
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') resolve(reader.result);
			else reject(new Error('Could not read image.'));
		};
		reader.onerror = () => reject(new Error('Could not read image.'));
		reader.readAsDataURL(file);
	});
}

export function getCustomGloopIconFileName(): string | null {
	return readStoredIconFileName();
}

export function getCustomGloopIconUrl(): string | null {
	return readStoredIcon();
}

export function resolveGloopIconUrl(): string {
	return readStoredIcon() ?? GLOOPGLOP_DEFAULT_LOGO_URL;
}

export function subscribeCustomGloopIcon(listener: () => void): () => void {
	listener();
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export async function setCustomGloopIconFromFile(
	file: File
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (!browser) return { ok: false, error: 'Upload is only available in the browser.' };
	if (!file.type.startsWith('image/')) {
		return { ok: false, error: 'Choose an image file (PNG, JPG, WebP, etc.).' };
	}
	if (file.size > MAX_BYTES) {
		return { ok: false, error: 'Image must be 512 KB or smaller.' };
	}

	try {
		const dataUrl = await readFileAsDataUrl(file);
		localStorage.setItem(STORAGE_KEY, dataUrl);
		localStorage.setItem(FILENAME_STORAGE_KEY, file.name);
		notify();
		return { ok: true };
	} catch {
		return { ok: false, error: 'Could not read that image.' };
	}
}

export function resetCustomGloopIcon() {
	if (!browser) return;
	localStorage.removeItem(STORAGE_KEY);
	localStorage.removeItem(FILENAME_STORAGE_KEY);
	notify();
}

export function hasCustomGloopIcon(): boolean {
	return !!readStoredIcon();
}
