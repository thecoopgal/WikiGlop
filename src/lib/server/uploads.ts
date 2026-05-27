import { getDbBinding } from '$lib/server/platform-env';
import {
	getStreamMp4DownloadUrl,
	provisionStreamDirectUpload,
	waitForStreamReady
} from '$lib/server/cloudflare-stream';

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = new Set([
	'video/mp4',
	'video/webm',
	'video/quicktime',
	'video/x-msvideo',
	'video/x-matroska',
	'video/ogg'
]);

export type UploadSessionRow = {
	id: string;
	site_id: string;
	r2_key: string;
	stream_uid: string | null;
	stream_playback_url: string | null;
	filename: string;
	content_type: string;
	size_bytes: number;
	client_key: string | null;
	created_at: string;
};

export type UploadDestination = 'youtube';

export type DestinationJobRow = {
	upload_id: string;
	destination: UploadDestination;
	status: 'pending' | 'uploading' | 'complete' | 'error';
	external_id: string | null;
	external_url: string | null;
	error_message: string | null;
	google_sub: string | null;
	updated_at: string;
};

export function newUploadId(): string {
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return `up_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function assertAllowedVideoUpload(file: { size: number; type?: string }): void {
	if (!file.size) throw new Error('Choose a video file to upload.');
	if (file.size > MAX_UPLOAD_BYTES) {
		throw new Error(`Video must be under ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`);
	}
	const type = file.type?.toLowerCase() ?? '';
	if (type && !ALLOWED_VIDEO_TYPES.has(type) && !type.startsWith('video/')) {
		throw new Error('Upload a video file (MP4, WebM, MOV, etc.).');
	}
}

/** Create D1 row + Stream direct-upload credentials (client uploads to Stream, not our Worker). */
export async function createStreamUploadSession(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	filename: string;
	sizeBytes: number;
	contentType: string;
	clientKey?: string;
}): Promise<{
	id: string;
	streamUid: string;
	method: 'post' | 'tus';
	uploadURL?: string;
	tusEndpoint?: string;
}> {
	assertAllowedVideoUpload({ size: opts.sizeBytes, type: opts.contentType });
	const db = getDbBinding(opts.platform);
	const id = newUploadId();

	const provision = await provisionStreamDirectUpload({
		platform: opts.platform,
		uploadId: id,
		filename: opts.filename,
		sizeBytes: opts.sizeBytes
	});

	await db
		.prepare(
			`INSERT INTO upload_sessions (id, site_id, r2_key, stream_uid, stream_playback_url, filename, content_type, size_bytes, client_key)
       VALUES (?, ?, '', ?, NULL, ?, ?, ?, ?)`
		)
		.bind(
			id,
			opts.siteId,
			provision.streamUid,
			opts.filename,
			opts.contentType || 'video/mp4',
			opts.sizeBytes,
			opts.clientKey ?? null
		)
		.run();

	return { id, ...provision };
}

export async function finalizeStreamUpload(opts: {
	platform: App.Platform | undefined;
	uploadId: string;
	siteId: string;
}): Promise<{
	id: string;
	filename: string;
	contentType: string;
	sizeBytes: number;
	streamUid: string;
	playbackUrl: string | null;
}> {
	const session = await getUploadSession(opts.platform, opts.uploadId, opts.siteId);
	if (!session) throw new Error('Upload not found');
	if (!session.stream_uid) throw new Error('Upload is missing Stream video id');

	const details = await waitForStreamReady({
		platform: opts.platform,
		streamUid: session.stream_uid
	});
	const playbackUrl = details.playback?.hls ?? null;

	const db = getDbBinding(opts.platform);
	await db
		.prepare(`UPDATE upload_sessions SET stream_playback_url = ? WHERE id = ?`)
		.bind(playbackUrl, opts.uploadId)
		.run();

	return {
		id: session.id,
		filename: session.filename,
		contentType: session.content_type,
		sizeBytes: session.size_bytes,
		streamUid: session.stream_uid,
		playbackUrl
	};
}

export async function getUploadSession(
	platform: App.Platform | undefined,
	uploadId: string,
	siteId: string
): Promise<UploadSessionRow | null> {
	const db = getDbBinding(platform);
	return db
		.prepare(
			`SELECT id, site_id, r2_key, stream_uid, stream_playback_url, filename, content_type, size_bytes, client_key, created_at
       FROM upload_sessions WHERE id = ? AND site_id = ?`
		)
		.bind(uploadId, siteId)
		.first<UploadSessionRow>();
}

/** ReadableStream of MP4 bytes from Stream (for YouTube publish). */
export async function getStreamVideoBodyForExport(
	platform: App.Platform | undefined,
	session: UploadSessionRow
): Promise<{ body: ReadableStream; contentType: string; sizeBytes: number }> {
	if (!session.stream_uid) {
		throw new Error('Video is not on Stream');
	}
	await waitForStreamReady({ platform, streamUid: session.stream_uid });
	const mp4Url = await getStreamMp4DownloadUrl({ platform, streamUid: session.stream_uid });
	const res = await fetch(mp4Url);
	if (!res.ok || !res.body) {
		throw new Error('Could not download video from Stream for export');
	}
	const len = res.headers.get('Content-Length');
	return {
		body: res.body,
		contentType: 'video/mp4',
		sizeBytes: len ? parseInt(len, 10) : session.size_bytes
	};
}

export async function listDestinationJobs(
	platform: App.Platform | undefined,
	uploadId: string
): Promise<DestinationJobRow[]> {
	const db = getDbBinding(platform);
	const { results } = await db
		.prepare(
			`SELECT upload_id, destination, status, external_id, external_url, error_message, google_sub, updated_at
       FROM upload_destination_jobs WHERE upload_id = ?`
		)
		.bind(uploadId)
		.all<DestinationJobRow>();
	return results ?? [];
}

export async function upsertDestinationJob(opts: {
	platform: App.Platform | undefined;
	uploadId: string;
	destination: UploadDestination;
	status: DestinationJobRow['status'];
	externalId?: string | null;
	externalUrl?: string | null;
	errorMessage?: string | null;
	googleSub?: string | null;
}): Promise<void> {
	const db = getDbBinding(opts.platform);
	await db
		.prepare(
			`INSERT INTO upload_destination_jobs (upload_id, destination, status, external_id, external_url, error_message, google_sub, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(upload_id, destination) DO UPDATE SET
         status = excluded.status,
         external_id = excluded.external_id,
         external_url = excluded.external_url,
         error_message = excluded.error_message,
         google_sub = excluded.google_sub,
         updated_at = datetime('now')`
		)
		.bind(
			opts.uploadId,
			opts.destination,
			opts.status,
			opts.externalId ?? null,
			opts.externalUrl ?? null,
			opts.errorMessage ?? null,
			opts.googleSub ?? null
		)
		.run();
}

export function isUploadSchemaError(e: unknown): boolean {
	const msg = e instanceof Error ? e.message : String(e);
	return (
		msg.includes('no such table: upload_sessions') ||
		msg.includes('no such column: stream_uid') ||
		msg.includes('no such table: google_oauth_accounts') ||
		msg.includes('no such table: upload_destination_jobs')
	);
}
