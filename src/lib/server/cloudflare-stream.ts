import { getWorkerBindings } from '$lib/server/platform-env';

const STREAM_TUS_THRESHOLD_BYTES = 200 * 1024 * 1024;
const MAX_DURATION_SECONDS = 3600;
const STREAM_API = 'https://api.cloudflare.com/client/v4';

export type StreamDirectUploadResult = {
	streamUid: string;
	method: 'post' | 'tus';
	uploadURL?: string;
	tusEndpoint?: string;
};

type StreamBinding = {
	createDirectUpload(params: {
		maxDurationSeconds: number;
		meta?: Record<string, string>;
		creator?: string;
	}): Promise<{ id: string; uploadURL: string }>;
	video(id: string): {
		details(): Promise<StreamVideoDetails>;
		downloads: {
			generate(type?: 'default' | 'audio'): Promise<StreamDownloadResponse>;
			get(): Promise<StreamDownloadResponse>;
		};
	};
};

export type StreamVideoDetails = {
	uid?: string;
	readyToStream?: boolean;
	playback?: { hls?: string };
	thumbnail?: string;
	status?: { state?: string };
};

type StreamDownloadEntry = {
	status?: 'ready' | 'inprogress' | 'error';
	url?: string;
	percentComplete?: number;
};

type StreamDownloadResponse = {
	default?: StreamDownloadEntry;
};

type StreamApiEnvelope<T> = {
	success?: boolean;
	result?: T;
	errors?: Array<{ message?: string }>;
};

function getStreamBinding(platform: App.Platform | undefined): StreamBinding {
	const bindings = getWorkerBindings(platform);
	const stream = bindings.STREAM as StreamBinding | undefined;
	if (!stream?.createDirectUpload) {
		throw new Error('STREAM binding is not configured');
	}
	return stream;
}

function getAccountId(platform: App.Platform | undefined): string {
	const bindings = getWorkerBindings(platform);
	const id = bindings.CLOUDFLARE_ACCOUNT_ID;
	if (typeof id === 'string' && id.trim()) return id.trim();
	if (typeof process !== 'undefined' && process.env?.CLOUDFLARE_ACCOUNT_ID?.trim()) {
		return process.env.CLOUDFLARE_ACCOUNT_ID.trim();
	}
	throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured');
}

function getApiToken(platform: App.Platform | undefined): string {
	const bindings = getWorkerBindings(platform);
	const token = bindings.CLOUDFLARE_API_TOKEN;
	if (typeof token === 'string' && token.trim()) return token.trim();
	if (typeof process !== 'undefined' && process.env?.CLOUDFLARE_API_TOKEN?.trim()) {
		return process.env.CLOUDFLARE_API_TOKEN.trim();
	}
	throw new Error('CLOUDFLARE_API_TOKEN is not configured (required for large uploads)');
}

export function hasStreamRestCredentials(platform: App.Platform | undefined): boolean {
	try {
		getAccountId(platform);
		getApiToken(platform);
		return true;
	} catch {
		return false;
	}
}

async function streamApiRequest<T>(
	platform: App.Platform | undefined,
	path: string,
	init?: RequestInit
): Promise<T> {
	const accountId = getAccountId(platform);
	const token = getApiToken(platform);
	const res = await fetch(`${STREAM_API}/accounts/${accountId}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			...init?.headers
		}
	});
	const data = (await res.json().catch(() => ({}))) as StreamApiEnvelope<T>;
	if (!res.ok || data.success === false) {
		const msg =
			data.errors?.[0]?.message ??
			(typeof data === 'object' && data !== null && 'message' in data
				? String((data as { message?: string }).message)
				: `Stream API error (${res.status})`);
		throw new Error(msg);
	}
	if (data.result === undefined) {
		throw new Error('Stream API returned no result');
	}
	return data.result;
}

/** tus Upload-Metadata: `key base64value` pairs comma-separated. */
export function buildTusUploadMetadata(opts: {
	filename: string;
	maxDurationSeconds?: number;
}): string {
	const maxDuration = String(opts.maxDurationSeconds ?? MAX_DURATION_SECONDS);
	const name = opts.filename.slice(0, 200) || 'upload.mp4';
	const enc = (s: string) => btoa(s);
	return [`maxdurationseconds ${enc(maxDuration)}`, `name ${enc(name)}`].join(',');
}

async function provisionDirectUploadViaRest(opts: {
	platform: App.Platform | undefined;
	uploadId: string;
	filename: string;
}): Promise<StreamDirectUploadResult> {
	const result = await streamApiRequest<{ uploadURL: string; uid: string }>(
		opts.platform,
		'/stream/direct_upload',
		{
			method: 'POST',
			body: JSON.stringify({
				maxDurationSeconds: MAX_DURATION_SECONDS,
				meta: { name: opts.filename, uploadId: opts.uploadId }
			})
		}
	);
	if (!result.uploadURL || !result.uid) {
		throw new Error('Stream did not return a direct upload URL');
	}
	return {
		streamUid: result.uid,
		method: 'post',
		uploadURL: result.uploadURL
	};
}

async function provisionTusUploadViaRest(opts: {
	platform: App.Platform | undefined;
	filename: string;
	sizeBytes: number;
}): Promise<StreamDirectUploadResult> {
	const accountId = getAccountId(opts.platform);
	const token = getApiToken(opts.platform);
	const res = await fetch(`${STREAM_API}/accounts/${accountId}/stream?direct_user=true`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Tus-Resumable': '1.0.0',
			'Upload-Length': String(opts.sizeBytes),
			'Upload-Metadata': buildTusUploadMetadata({ filename: opts.filename })
		}
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Stream tus setup failed: ${text.slice(0, 300)}`);
	}

	const tusEndpoint = res.headers.get('Location');
	const streamUid = res.headers.get('stream-media-id');
	if (!tusEndpoint || !streamUid) {
		throw new Error('Stream did not return a tus upload URL');
	}

	return { streamUid, method: 'tus', tusEndpoint };
}

/** One-time direct upload URL — browser uploads straight to Stream (not through our Worker). */
export async function provisionStreamDirectUpload(opts: {
	platform: App.Platform | undefined;
	uploadId: string;
	filename: string;
	sizeBytes: number;
}): Promise<StreamDirectUploadResult> {
	if (opts.sizeBytes > STREAM_TUS_THRESHOLD_BYTES) {
		return provisionTusUploadViaRest(opts);
	}

	// REST works in wrangler local dev; the Stream binding's createDirectUpload does not.
	if (hasStreamRestCredentials(opts.platform)) {
		return provisionDirectUploadViaRest(opts);
	}

	const stream = getStreamBinding(opts.platform);
	const direct = await stream.createDirectUpload({
		maxDurationSeconds: MAX_DURATION_SECONDS,
		meta: { name: opts.filename, uploadId: opts.uploadId }
	});
	return {
		streamUid: direct.id,
		method: 'post',
		uploadURL: direct.uploadURL
	};
}

async function waitForStreamReadyViaRest(opts: {
	platform: App.Platform | undefined;
	streamUid: string;
	maxAttempts?: number;
	delayMs?: number;
}): Promise<StreamVideoDetails> {
	const attempts = opts.maxAttempts ?? 60;
	const delayMs = opts.delayMs ?? 2000;

	for (let i = 0; i < attempts; i++) {
		const details = await streamApiRequest<StreamVideoDetails>(
			opts.platform,
			`/stream/${encodeURIComponent(opts.streamUid)}`
		);
		if (details.readyToStream) return details;
		const state = details.status?.state;
		if (state === 'error') {
			throw new Error('Video processing failed on Stream');
		}
		await new Promise((r) => setTimeout(r, delayMs));
	}
	throw new Error('Video is still processing on Stream — try again in a moment');
}

export async function waitForStreamReady(opts: {
	platform: App.Platform | undefined;
	streamUid: string;
	maxAttempts?: number;
	delayMs?: number;
}): Promise<StreamVideoDetails> {
	if (hasStreamRestCredentials(opts.platform)) {
		return waitForStreamReadyViaRest(opts);
	}

	const stream = getStreamBinding(opts.platform);
	const attempts = opts.maxAttempts ?? 60;
	const delayMs = opts.delayMs ?? 2000;

	for (let i = 0; i < attempts; i++) {
		const details = await stream.video(opts.streamUid).details();
		if (details.readyToStream) return details;
		const state = details.status?.state;
		if (state === 'error') {
			throw new Error('Video processing failed on Stream');
		}
		await new Promise((r) => setTimeout(r, delayMs));
	}
	throw new Error('Video is still processing on Stream — try again in a moment');
}

async function getStreamMp4DownloadUrlViaRest(opts: {
	platform: App.Platform | undefined;
	streamUid: string;
}): Promise<string> {
	let downloads = await streamApiRequest<StreamDownloadResponse>(
		opts.platform,
		`/stream/${encodeURIComponent(opts.streamUid)}/downloads`
	);
	let entry = downloads.default;
	if (!entry?.url || entry.status !== 'ready') {
		downloads = await streamApiRequest<StreamDownloadResponse>(
			opts.platform,
			`/stream/${encodeURIComponent(opts.streamUid)}/downloads`,
			{ method: 'POST', body: '{}' }
		);
		entry = downloads.default;
	}

	for (let i = 0; i < 45; i++) {
		if (entry?.status === 'ready' && entry.url) return entry.url;
		if (entry?.status === 'error') break;
		await new Promise((r) => setTimeout(r, 2000));
		downloads = await streamApiRequest<StreamDownloadResponse>(
			opts.platform,
			`/stream/${encodeURIComponent(opts.streamUid)}/downloads`
		);
		entry = downloads.default;
	}

	throw new Error('Stream MP4 download is not ready yet');
}

export async function getStreamMp4DownloadUrl(opts: {
	platform: App.Platform | undefined;
	streamUid: string;
}): Promise<string> {
	if (hasStreamRestCredentials(opts.platform)) {
		return getStreamMp4DownloadUrlViaRest(opts);
	}

	const stream = getStreamBinding(opts.platform);
	const handle = stream.video(opts.streamUid);

	let downloads = await handle.downloads.get();
	let entry = downloads.default;
	if (!entry?.url || entry.status !== 'ready') {
		downloads = await handle.downloads.generate('default');
		entry = downloads.default;
	}

	for (let i = 0; i < 45; i++) {
		if (entry?.status === 'ready' && entry.url) return entry.url;
		if (entry?.status === 'error') break;
		await new Promise((r) => setTimeout(r, 2000));
		downloads = await handle.downloads.get();
		entry = downloads.default;
	}

	throw new Error('Stream MP4 download is not ready yet');
}

export function isStreamConfigured(platform: App.Platform | undefined): boolean {
	if (hasStreamRestCredentials(platform)) return true;
	try {
		getStreamBinding(platform);
		return true;
	} catch {
		return false;
	}
}

export async function getStreamVideoDetails(
	platform: App.Platform | undefined,
	streamUid: string
): Promise<StreamVideoDetails> {
	if (hasStreamRestCredentials(platform)) {
		return streamApiRequest<StreamVideoDetails>(
			platform,
			`/stream/${encodeURIComponent(streamUid)}`
		);
	}
	return getStreamBinding(platform).video(streamUid).details();
}
