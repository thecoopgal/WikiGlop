import { getDbBinding } from '$lib/server/platform-env';
import {
	getStreamMp4DownloadUrl,
	normalizeStreamCreator,
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

export type UploadApprovalStatus = 'pending' | 'approved' | 'rejected';

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
	creator_id: string | null;
	approval_status: UploadApprovalStatus | string | null;
	approved_at: string | null;
	thumbnail_url: string | null;
	created_at: string;
};

export type WatchVideoRow = {
	id: string;
	filename: string;
	streamUid: string;
	playbackUrl: string | null;
	thumbnailUrl: string | null;
	createdAt: string;
	approvedAt: string | null;
};

const UPLOAD_SESSION_COLUMNS = `id, site_id, r2_key, stream_uid, stream_playback_url, filename, content_type, size_bytes, client_key, creator_id, approval_status, approved_at, thumbnail_url, created_at`;

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
	creator?: string;
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

	const creator = normalizeStreamCreator(opts.creator)?.toLowerCase();

	const provision = await provisionStreamDirectUpload({
		platform: opts.platform,
		uploadId: id,
		filename: opts.filename,
		sizeBytes: opts.sizeBytes,
		creator
	});

	await db
		.prepare(
			`INSERT INTO upload_sessions (id, site_id, r2_key, stream_uid, stream_playback_url, filename, content_type, size_bytes, client_key, creator_id, approval_status)
       VALUES (?, ?, '', ?, NULL, ?, ?, ?, ?, ?, 'pending')`
		)
		.bind(
			id,
			opts.siteId,
			provision.streamUid,
			opts.filename,
			opts.contentType || 'video/mp4',
			opts.sizeBytes,
			opts.clientKey ?? null,
			creator ?? null
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
	const thumbnailUrl = details.thumbnail ?? null;

	const db = getDbBinding(opts.platform);
	await db
		.prepare(
			`UPDATE upload_sessions SET stream_playback_url = ?, thumbnail_url = ? WHERE id = ?`
		)
		.bind(playbackUrl, thumbnailUrl, opts.uploadId)
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
			`SELECT ${UPLOAD_SESSION_COLUMNS} FROM upload_sessions WHERE id = ? AND site_id = ?`
		)
		.bind(uploadId, siteId)
		.first<UploadSessionRow>();
}

function rowToWatchVideo(row: UploadSessionRow): WatchVideoRow | null {
	if (!row.stream_uid) return null;
	return {
		id: row.id,
		filename: row.filename,
		streamUid: row.stream_uid,
		playbackUrl: row.stream_playback_url,
		thumbnailUrl: row.thumbnail_url,
		createdAt: row.created_at,
		approvedAt: row.approved_at
	};
}

/** Approved videos for a creator watch page (D1 is source of truth for approval). */
export async function listApprovedWatchVideos(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	creatorId: string;
	limit?: number;
}): Promise<WatchVideoRow[]> {
	const db = getDbBinding(opts.platform);
	const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
	const { results } = await db
		.prepare(
			`SELECT ${UPLOAD_SESSION_COLUMNS}
       FROM upload_sessions
       WHERE site_id = ? AND creator_id = ? AND approval_status = 'approved' AND stream_uid IS NOT NULL
       ORDER BY COALESCE(approved_at, created_at) DESC
       LIMIT ?`
		)
		.bind(opts.siteId, opts.creatorId, limit)
		.all<UploadSessionRow>();

	return (results ?? [])
		.map((row) => rowToWatchVideo(row))
		.filter((v): v is WatchVideoRow => v !== null);
}

export async function getApprovedWatchVideo(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	creatorId: string;
	uploadId: string;
}): Promise<WatchVideoRow | null> {
	const session = await getUploadSession(opts.platform, opts.uploadId, opts.siteId);
	if (!session) return null;
	if (session.creator_id !== opts.creatorId) return null;
	if (session.approval_status !== 'approved') return null;
	return rowToWatchVideo(session);
}

export async function setUploadApproval(opts: {
	platform: App.Platform | undefined;
	uploadId: string;
	siteId: string;
	status: Extract<UploadApprovalStatus, 'approved' | 'rejected'>;
}): Promise<UploadSessionRow | null> {
	const session = await getUploadSession(opts.platform, opts.uploadId, opts.siteId);
	if (!session) return null;

	const db = getDbBinding(opts.platform);
	if (opts.status === 'approved') {
		await db
			.prepare(
				`UPDATE upload_sessions SET approval_status = 'approved', approved_at = datetime('now') WHERE id = ?`
			)
			.bind(opts.uploadId)
			.run();
	} else {
		await db
			.prepare(
				`UPDATE upload_sessions SET approval_status = 'rejected', approved_at = NULL WHERE id = ?`
			)
			.bind(opts.uploadId)
			.run();
	}

	return getUploadSession(opts.platform, opts.uploadId, opts.siteId);
}

export async function listPendingUploads(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	limit?: number;
}): Promise<UploadSessionRow[]> {
	const db = getDbBinding(opts.platform);
	const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
	const { results } = await db
		.prepare(
			`SELECT ${UPLOAD_SESSION_COLUMNS}
       FROM upload_sessions
       WHERE site_id = ? AND approval_status = 'pending' AND stream_uid IS NOT NULL
       ORDER BY created_at DESC
       LIMIT ?`
		)
		.bind(opts.siteId, limit)
		.all<UploadSessionRow>();
	return results ?? [];
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
		msg.includes('no such column: creator_id') ||
		msg.includes('no such column: approval_status') ||
		msg.includes('no such table: google_oauth_accounts') ||
		msg.includes('no such table: upload_destination_jobs')
	);
}

export function normalizeCreatorRouteId(raw: string): string {
	const id = raw.trim().toLowerCase();
	if (!id || !/^[a-z0-9][a-z0-9._-]{0,119}$/.test(id)) {
		throw new Error('Invalid creator id');
	}
	return id;
}
