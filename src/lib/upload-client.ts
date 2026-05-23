export type UploadApiResult = {
	id: string;
	filename: string;
	contentType: string;
	sizeBytes: number;
};

export type UploadDestinationInfo = {
	id: string;
	label: string;
	connected: boolean;
	accountEmail: string | null;
	configured: boolean;
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

/** Stage a video file on GloopGlop (R2). Reuse from any page. */
export async function uploadVideoFile(file: File, clientKey?: string): Promise<UploadApiResult> {
	const form = new FormData();
	form.append('file', file);
	if (clientKey?.trim()) form.append('clientKey', clientKey.trim());

	const res = await fetch('/api/upload', { method: 'POST', body: form });
	const data = await parseJson<{ ok: true; upload: UploadApiResult }>(res);
	return data.upload;
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
