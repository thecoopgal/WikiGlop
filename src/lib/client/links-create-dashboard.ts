import { getOrCreateBrowserClientId } from '$lib/client/gloop-browser-glop-limit';
import type { LinksPageSubmissionPayload } from '$lib/links-submission-payload';

export type LinksSubmissionApprovalStatus = 'pending' | 'approved' | 'rejected';

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
	payload: LinksPageSubmissionPayload | null;
};

export type LinksDashboardLoadResult =
	| { ok: true; submissions: LinksPageSubmissionSummary[] }
	| { ok: false; error: string };

export async function fetchMyLinksSubmissions(): Promise<LinksDashboardLoadResult> {
	let clientKey: string;
	try {
		clientKey = getOrCreateBrowserClientId();
	} catch {
		return { ok: false, error: 'This browser cannot save your submission history.' };
	}

	const res = await fetch(
		`/api/links-create/mine?clientKey=${encodeURIComponent(clientKey)}`,
		{ headers: { Accept: 'application/json' } }
	);

	let data: { submissions?: LinksPageSubmissionSummary[]; message?: string } = {};
	try {
		data = (await res.json()) as typeof data;
	} catch {
		/* empty */
	}

	if (!res.ok) {
		return {
			ok: false,
			error:
				typeof data.message === 'string'
					? data.message
					: res.statusText || 'Could not load your submissions.'
		};
	}

	return {
		ok: true,
		submissions: Array.isArray(data.submissions) ? data.submissions : []
	};
}
