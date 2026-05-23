import { getDbBinding, getUploadsBucket } from '$lib/server/platform-env';

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

function newUploadId(): string {
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return `up_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function assertAllowedVideoUpload(file: File): void {
	if (!file.size) throw new Error('Choose a video file to upload.');
	if (file.size > MAX_UPLOAD_BYTES) {
		throw new Error(`Video must be under ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`);
	}
	const type = file.type?.toLowerCase() ?? '';
	if (type && !ALLOWED_VIDEO_TYPES.has(type) && !type.startsWith('video/')) {
		throw new Error('Upload a video file (MP4, WebM, MOV, etc.).');
	}
}

export async function storeUpload(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	file: File;
	clientKey?: string;
}): Promise<{ id: string; filename: string; contentType: string; sizeBytes: number }> {
	assertAllowedVideoUpload(opts.file);
	const bucket = getUploadsBucket(opts.platform);
	const db = getDbBinding(opts.platform);
	const id = newUploadId();
	const ext = opts.file.name.includes('.') ? opts.file.name.split('.').pop() : 'mp4';
	const r2Key = `${opts.siteId}/${id}.${ext?.replace(/[^a-z0-9]/gi, '') || 'mp4'}`;
	const contentType = opts.file.type || 'video/mp4';

	await bucket.put(r2Key, opts.file.stream(), {
		httpMetadata: { contentType }
	});

	await db
		.prepare(
			`INSERT INTO upload_sessions (id, site_id, r2_key, filename, content_type, size_bytes, client_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			opts.siteId,
			r2Key,
			opts.file.name,
			contentType,
			opts.file.size,
			opts.clientKey ?? null
		)
		.run();

	return {
		id,
		filename: opts.file.name,
		contentType,
		sizeBytes: opts.file.size
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
			`SELECT id, site_id, r2_key, filename, content_type, size_bytes, client_key, created_at
       FROM upload_sessions WHERE id = ? AND site_id = ?`
		)
		.bind(uploadId, siteId)
		.first<UploadSessionRow>();
}

export async function getR2ObjectForUpload(
	platform: App.Platform | undefined,
	session: UploadSessionRow
) {
	const bucket = getUploadsBucket(platform);
	const object = await bucket.get(session.r2_key);
	if (!object?.body) throw new Error('Uploaded file is missing from storage');
	return object;
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
		msg.includes('no such table: google_oauth_accounts') ||
		msg.includes('no such table: upload_destination_jobs')
	);
}
