import {
	buildLinksSubmissionSiteDocsFromPayload,
	creatorSiteIdFromName
} from '$lib/links-submission-site';
import type { LinksPageSubmissionPayload } from '$lib/links-submission-payload';
import type { PageBlock, PageYaml } from '$lib/server/content';
import {
	getApprovedLinksSubmissionByCreatorId,
	isLinksSubmissionSchemaError,
	parseLinksSubmissionPayload,
	type LinksPageSubmissionRow
} from '$lib/server/links-submissions';
import { GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';
import { normalizeTheme, type ResolvedSite } from '$lib/server/sites';

function resolvedSiteFromRow(
	row: LinksPageSubmissionRow,
	payload: LinksPageSubmissionPayload
): ResolvedSite | null {
	const siteId = row.creator_id?.trim() || creatorSiteIdFromName(payload.names[0] ?? '');
	if (siteId.length < 2) return null;

	const { site } = buildLinksSubmissionSiteDocsFromPayload(payload, siteId);
	const hosts = Array.isArray(site.hosts)
		? site.hosts.filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
		: [];
	if (!hosts.length) return null;

	return {
		siteId,
		id: typeof site.id === 'string' ? site.id : siteId,
		name: typeof site.name === 'string' ? site.name : undefined,
		kind: typeof site.kind === 'string' ? site.kind : undefined,
		hosts,
		theme: normalizeTheme(site.theme),
		routing:
			site.routing && typeof site.routing === 'object'
				? (site.routing as ResolvedSite['routing'])
				: undefined,
		permissions:
			site.permissions && typeof site.permissions === 'object'
				? (site.permissions as Record<string, unknown>)
				: undefined,
		linksSubmission: { id: row.id, payload }
	};
}

export async function resolveApprovedLinksSubmissionSite(
	platform: App.Platform | undefined,
	creatorId: string
): Promise<ResolvedSite | null> {
	let row: LinksPageSubmissionRow | null;
	try {
		row = await getApprovedLinksSubmissionByCreatorId(platform, GLOOPGLOP_SITE_ID, creatorId);
	} catch (e) {
		if (isLinksSubmissionSchemaError(e)) return null;
		throw e;
	}
	if (!row) return null;

	const payload = parseLinksSubmissionPayload(row);
	if (!payload) return null;

	return resolvedSiteFromRow(row, payload);
}

export function buildLinksSubmissionPageYaml(
	payload: LinksPageSubmissionPayload,
	siteId: string
): PageYaml {
	const { page } = buildLinksSubmissionSiteDocsFromPayload(payload, siteId);
	const blocks = Array.isArray(page.blocks)
		? page.blocks.filter(
				(b): b is PageBlock =>
					typeof b === 'object' && b !== null && typeof (b as PageBlock).type === 'string'
			)
		: [];

	return {
		id: typeof page.id === 'string' ? page.id : 'index',
		title: typeof page.title === 'string' ? page.title : undefined,
		path: typeof page.path === 'string' ? page.path : '/',
		layout: typeof page.layout === 'string' ? page.layout : 'creator_links',
		seo:
			page.seo && typeof page.seo === 'object' ? (page.seo as PageYaml['seo']) : undefined,
		page_settings:
			page.page_settings && typeof page.page_settings === 'object'
				? (page.page_settings as PageYaml['page_settings'])
				: undefined,
		notifications: page.notifications,
		blocks
	};
}
