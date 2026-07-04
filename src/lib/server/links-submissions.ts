import { getDbBinding } from '$lib/server/platform-env';
import type { LinksPageSubmissionPayload } from '$lib/links-submission-payload';

export type { LinksPageSubmissionPayload } from '$lib/links-submission-payload';

export type LinksSubmissionApprovalStatus = 'pending' | 'approved' | 'rejected';

export type LinksPageSubmissionRow = {
	id: string;
	site_id: string;
	client_key: string | null;
	creator_id: string | null;
	display_name: string;
	approval_status: LinksSubmissionApprovalStatus | string;
	payload_json: string;
	approved_at: string | null;
	created_at: string;
	updated_at: string;
};

export type LinksPageSubmissionSummary = {
	id: string;
	displayName: string;
	creatorId: string | null;
	tagline: string;
	approvalStatus: LinksSubmissionApprovalStatus;
	createdAt: string;
	approvedAt: string | null;
	primaryName: string;
	linkCount: number;
};

export type LinksPageSubmissionClientSummary = LinksPageSubmissionSummary & {
	payload: LinksPageSubmissionPayload | null;
};

const SUBMISSION_COLUMNS = `id, site_id, client_key, creator_id, display_name, approval_status, payload_json, approved_at, created_at, updated_at`;

export function newLinksSubmissionId(): string {
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return `lp_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function normalizeLinksClientKey(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const key = raw.trim();
	if (!/^gg_[0-9a-f]{32}$/.test(key)) return null;
	return key;
}

export function creatorIdFromPrimaryName(name: string): string | null {
	const slug = name
		.trim()
		.replace(/^@+/, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
	if (slug.length < 2) return null;
	return slug.slice(0, 120);
}

export function parseLinksSubmissionPayload(
	row: Pick<LinksPageSubmissionRow, 'payload_json'>
): LinksPageSubmissionPayload | null {
	try {
		const parsed = JSON.parse(row.payload_json) as LinksPageSubmissionPayload;
		if (!parsed || typeof parsed !== 'object') return null;
		return parsed;
	} catch {
		return null;
	}
}

function parsePayload(row: LinksPageSubmissionRow): LinksPageSubmissionPayload | null {
	return parseLinksSubmissionPayload(row);
}

export async function getApprovedLinksSubmissionByCreatorId(
	platform: App.Platform | undefined,
	siteId: string,
	creatorId: string
): Promise<LinksPageSubmissionRow | null> {
	const key = creatorId.trim().toLowerCase();
	if (key.length < 2) return null;

	const db = getDbBinding(platform);
	try {
		return await db
			.prepare(
				`SELECT ${SUBMISSION_COLUMNS}
         FROM links_page_submissions
         WHERE site_id = ? AND creator_id = ? AND approval_status = 'approved'
         ORDER BY approved_at DESC, created_at DESC
         LIMIT 1`
			)
			.bind(siteId, key)
			.first<LinksPageSubmissionRow>();
	} catch (e) {
		if (isLinksSubmissionSchemaError(e)) return null;
		throw e;
	}
}

function rowToSummary(row: LinksPageSubmissionRow): LinksPageSubmissionSummary {
	const payload = parsePayload(row);
	return {
		id: row.id,
		displayName: row.display_name,
		creatorId: row.creator_id,
		tagline: payload?.tagline?.trim() ?? '',
		approvalStatus: row.approval_status as LinksSubmissionApprovalStatus,
		createdAt: row.created_at,
		approvedAt: row.approved_at,
		primaryName: payload?.names?.[0]?.trim() ?? row.display_name,
		linkCount: payload?.links?.length ?? 0
	};
}

function rowToClientSummary(row: LinksPageSubmissionRow): LinksPageSubmissionClientSummary {
	const payload = parsePayload(row);
	return { ...rowToSummary(row), payload };
}

export async function createLinksPageSubmission(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	clientKey?: string | null;
	displayName: string;
	creatorId?: string | null;
	payload: LinksPageSubmissionPayload;
}): Promise<{ id: string }> {
	const db = getDbBinding(opts.platform);
	const id = newLinksSubmissionId();
	const payloadJson = JSON.stringify(opts.payload);

	await db
		.prepare(
			`INSERT INTO links_page_submissions (
				id, site_id, client_key, creator_id, display_name, approval_status, payload_json
			) VALUES (?, ?, ?, ?, ?, 'pending', ?)`
		)
		.bind(
			id,
			opts.siteId,
			opts.clientKey ?? null,
			opts.creatorId ?? null,
			opts.displayName,
			payloadJson
		)
		.run();

	return { id };
}

export async function listLinksSubmissionsForClient(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	clientKey: string;
	limit?: number;
}): Promise<LinksPageSubmissionClientSummary[]> {
	const db = getDbBinding(opts.platform);
	const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
	const { results } = await db
		.prepare(
			`SELECT ${SUBMISSION_COLUMNS}
       FROM links_page_submissions
       WHERE site_id = ? AND client_key = ?
       ORDER BY created_at DESC
       LIMIT ?`
		)
		.bind(opts.siteId, opts.clientKey, limit)
		.all<LinksPageSubmissionRow>();

	return (results ?? []).map(rowToClientSummary);
}

export async function listPendingLinksSubmissions(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	limit?: number;
}): Promise<LinksPageSubmissionSummary[]> {
	const db = getDbBinding(opts.platform);
	const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
	const { results } = await db
		.prepare(
			`SELECT ${SUBMISSION_COLUMNS}
       FROM links_page_submissions
       WHERE site_id = ? AND approval_status = 'pending'
       ORDER BY created_at DESC
       LIMIT ?`
		)
		.bind(opts.siteId, limit)
		.all<LinksPageSubmissionRow>();

	return (results ?? []).map(rowToSummary);
}

export async function getLinksPageSubmission(
	platform: App.Platform | undefined,
	submissionId: string,
	siteId: string
): Promise<LinksPageSubmissionRow | null> {
	const db = getDbBinding(platform);
	return db
		.prepare(`SELECT ${SUBMISSION_COLUMNS} FROM links_page_submissions WHERE id = ? AND site_id = ?`)
		.bind(submissionId, siteId)
		.first<LinksPageSubmissionRow>();
}

export async function setLinksSubmissionApproval(opts: {
	platform: App.Platform | undefined;
	submissionId: string;
	siteId: string;
	status: Extract<LinksSubmissionApprovalStatus, 'approved' | 'rejected'>;
	/** Optional user added as a site member when publishing (owner if first). */
	memberUserId?: string | null;
}): Promise<LinksPageSubmissionRow | null> {
	const existing = await getLinksPageSubmission(opts.platform, opts.submissionId, opts.siteId);
	if (!existing) return null;

	const db = getDbBinding(opts.platform);
	if (opts.status === 'approved') {
		await db
			.prepare(
				`UPDATE links_page_submissions
         SET approval_status = 'approved', approved_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
			)
			.bind(opts.submissionId)
			.run();

		const approved = await getLinksPageSubmission(opts.platform, opts.submissionId, opts.siteId);
		if (approved) {
			const { publishLinksSubmissionToContentStore, isContentStoreSchemaError } = await import(
				'$lib/server/content-store'
			);
			try {
				await publishLinksSubmissionToContentStore({
					platform: opts.platform,
					row: approved,
					memberUserId: opts.memberUserId ?? null
				});
			} catch (e) {
				if (!isContentStoreSchemaError(e)) throw e;
				console.warn('[content-store] publish skipped (migration 0016/0017 not applied)');
			}
		}
	} else {
		await db
			.prepare(
				`UPDATE links_page_submissions
         SET approval_status = 'rejected', approved_at = NULL, updated_at = datetime('now')
         WHERE id = ?`
			)
			.bind(opts.submissionId)
			.run();
	}

	return getLinksPageSubmission(opts.platform, opts.submissionId, opts.siteId);
}

export function isLinksSubmissionSchemaError(e: unknown): boolean {
	const msg = e instanceof Error ? e.message : String(e);
	return (
		msg.includes('no such table: links_page_submissions') ||
		msg.includes('no such column: approval_status')
	);
}
