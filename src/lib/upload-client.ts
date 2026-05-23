export type UploadApiResult = {
	id: string;
	filename: string;
	contentType: string;
	sizeBytes: number;
};

export type UploadDestinationId = 'gloopglop' | 'youtube' | 'tiktok';

export type UploadDestinationInfo = {
	id: UploadDestinationId;
	label: string;
	connected: boolean;
	accountEmail: string | null;
	configured: boolean;
	available: boolean;
	comingSoon?: boolean;
};

export type UploadStatusResult = {
	upload: UploadApiResult & { createdAt?: string };
	destinations: Array<{
		destination: string;
		status: string;
		externalUrl: string | null;
		errorMessage: string | null;
	}>;
	google: {
		connected: boolean;
		email: string | null;
		configured: boolean;
	};
};

export type YoutubePublishResult = {
	ok: true;
	videoId: string;
	videoUrl: string;
};

async function parseJson<T>(res: Response): Promise<T> {
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const err =
			typeof (data as { message?: string }).message === 'string'
				? (data as { message: string }).message
				: typeof (data as { error?: string }).error === 'string'
					? (data as { error: string }).error
					: `Request failed (${res.status})`;
		throw new Error(err);
	}
	return data as T;
}

export type UploadProgressHandler = (percent: number) => void;

/** Stage a video file on GloopGlop (R2). Reuse from any page. */
export async function uploadVideoFile(
	file: File,
	opts?: { clientKey?: string; onProgress?: UploadProgressHandler }
): Promise<UploadApiResult> {
	const form = new FormData();
	form.append('file', file);
	if (opts?.clientKey?.trim()) form.append('clientKey', opts.clientKey.trim());

	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/api/upload');

		xhr.upload.addEventListener('progress', (e) => {
			if (!e.lengthComputable || !opts?.onProgress) return;
			const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
			opts.onProgress(percent);
		});

		xhr.addEventListener('load', () => {
			let data: unknown;
			try {
				data = JSON.parse(xhr.responseText);
			} catch {
				reject(new Error(`Request failed (${xhr.status})`));
				return;
			}
			if (xhr.status < 200 || xhr.status >= 300) {
				const err =
					typeof (data as { message?: string }).message === 'string'
						? (data as { message: string }).message
						: typeof (data as { error?: string }).error === 'string'
							? (data as { error: string }).error
							: `Request failed (${xhr.status})`;
				reject(new Error(err));
				return;
			}
			const payload = data as { ok: true; upload: UploadApiResult };
			opts?.onProgress?.(100);
			resolve(payload.upload);
		});

		xhr.addEventListener('error', () => reject(new Error('Upload failed')));
		xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

		opts?.onProgress?.(0);
		xhr.send(form);
	});
}

export async function fetchUploadStatus(uploadId: string): Promise<UploadStatusResult> {
	const res = await fetch(`/api/upload/${encodeURIComponent(uploadId)}`);
	return parseJson<UploadStatusResult>(res);
}

export async function fetchUploadDestinations(): Promise<{
	destinations: UploadDestinationInfo[];
	google: UploadStatusResult['google'];
}> {
	const res = await fetch('/api/upload/destinations');
	return parseJson(res);
}

export async function publishUploadToYoutube(opts: {
	uploadId: string;
	title?: string;
	description?: string;
	privacyStatus?: 'private' | 'unlisted' | 'public';
}): Promise<YoutubePublishResult> {
	const res = await fetch('/api/upload/youtube', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(opts)
	});
	return parseJson<YoutubePublishResult>(res);
}

/** Start Google SSO for YouTube upload. */
export function startGoogleUploadAuth(returnTo = '/upload'): void {
	const params = new URLSearchParams({ returnTo });
	window.location.href = `/api/auth/google?${params.toString()}`;
}
