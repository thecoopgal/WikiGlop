import * as tus from 'tus-js-client';

export type UploadApiResult = {
	id: string;
	filename: string;
	contentType: string;
	sizeBytes: number;
	streamUid?: string;
	playbackUrl?: string | null;
};

export type UploadSessionStart = {
	id: string;
	streamUid: string;
	method: 'post' | 'tus';
	uploadURL?: string;
	tusEndpoint?: string;
};

export type UploadDestinationId = 'gloopglop' | 'tiktok';

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
};

export type UploadProgressHandler = (percent: number) => void;

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

/** Step 1: reserve Stream upload + get one-time upload URL (browser uploads directly to Stream). */
export async function createStreamUploadSession(
	file: File,
	opts?: { clientKey?: string; creator?: string }
): Promise<UploadSessionStart> {
	const res = await fetch('/api/upload/session', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			filename: file.name,
			sizeBytes: file.size,
			contentType: file.type || 'video/mp4',
			clientKey: opts?.clientKey?.trim() || undefined,
			creator: opts?.creator?.trim() || undefined
		})
	});
	const data = await parseJson<{ ok: true; session: UploadSessionStart }>(res);
	return data.session;
}

function uploadViaStreamPost(
	file: File,
	uploadURL: string,
	onProgress?: UploadProgressHandler
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const form = new FormData();
		form.append('file', file);

		xhr.upload.addEventListener('progress', (e) => {
			if (!e.lengthComputable || !onProgress) return;
			onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
		});

		xhr.addEventListener('load', () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				onProgress?.(100);
				resolve();
				return;
			}
			reject(new Error(`Stream upload failed (${xhr.status})`));
		});
		xhr.addEventListener('error', () => reject(new Error('Stream upload failed')));
		xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

		onProgress?.(0);
		xhr.open('POST', uploadURL);
		xhr.send(form);
	});
}

function uploadViaStreamTus(
	file: File,
	tusEndpoint: string,
	onProgress?: UploadProgressHandler
): Promise<void> {
	return new Promise((resolve, reject) => {
		onProgress?.(0);
		const upload = new tus.Upload(file, {
			uploadUrl: tusEndpoint,
			chunkSize: 50 * 1024 * 1024,
			retryDelays: [0, 3000, 5000, 10000, 20000],
			metadata: {
				filename: file.name,
				filetype: file.type || 'video/mp4'
			},
			onProgress(bytesUploaded, bytesTotal) {
				if (bytesTotal > 0 && onProgress) {
					onProgress(Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)));
				}
			},
			onSuccess() {
				onProgress?.(100);
				resolve();
			},
			onError(err) {
				reject(err instanceof Error ? err : new Error('Stream upload failed'));
			}
		});
		upload.start();
	});
}

/** Step 2: upload bytes directly to Cloudflare Stream (not through GloopGlop Worker). */
export async function uploadFileToStream(
	file: File,
	session: UploadSessionStart,
	onProgress?: UploadProgressHandler
): Promise<void> {
	if (session.method === 'tus' && session.tusEndpoint) {
		await uploadViaStreamTus(file, session.tusEndpoint, onProgress);
		return;
	}
	if (session.uploadURL) {
		await uploadViaStreamPost(file, session.uploadURL, onProgress);
		return;
	}
	throw new Error('Invalid Stream upload session');
}

/** Step 3: wait for Stream encoding; returns GloopGlop upload record. */
export async function completeStreamUpload(uploadId: string): Promise<UploadApiResult> {
	const res = await fetch('/api/upload/complete', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ uploadId })
	});
	const data = await parseJson<{ ok: true; upload: UploadApiResult }>(res);
	return data.upload;
}

/**
 * Full upload: Stream direct upload + finalize.
 * Reuse from any page.
 */
export async function uploadVideoFile(
	file: File,
	opts?: { clientKey?: string; creator?: string; onProgress?: UploadProgressHandler }
): Promise<UploadApiResult> {
	const session = await createStreamUploadSession(file, {
		clientKey: opts?.clientKey,
		creator: opts?.creator
	});
	await uploadFileToStream(file, session, opts?.onProgress);
	return completeStreamUpload(session.id);
}

export async function fetchUploadStatus(uploadId: string): Promise<UploadStatusResult> {
	const res = await fetch(`/api/upload/${encodeURIComponent(uploadId)}`);
	return parseJson<UploadStatusResult>(res);
}

export async function fetchUploadDestinations(): Promise<{
	destinations: UploadDestinationInfo[];
}> {
	const res = await fetch('/api/upload/destinations');
	return parseJson(res);
}
