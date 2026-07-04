import { newId } from '$lib/server/auth-crypto';
import type { PageBlock, PageYaml } from '$lib/server/content';
import { getDbBinding } from '$lib/server/platform-env';
import {
	normalizeTheme,
	type ResolvedSite,
	type SiteConfig,
	type SiteNavigation,
	type SiteShortLink,
	type SiteShortLinkGroup
} from '$lib/server/sites';
import {
	buildLinksSubmissionSiteDocsFromPayload,
	type LinksSubmissionSiteDocs
} from '$lib/links-submission-site';
import type { LinksPageSubmissionPayload } from '$lib/links-submission-payload';
import type { LinksPageSubmissionRow } from '$lib/server/links-submissions';
import { parseLinksSubmissionPayload } from '$lib/server/links-submissions';

export type ContentSiteStatus = 'draft' | 'published' | 'archived';

export type ContentSiteRow = {
	id: string;
	name: string | null;
	owner_user_id: string | null;
	status: string;
	config_json: string;
	source: string | null;
	source_ref: string | null;
	created_at: string;
	updated_at: string;
};

export type ContentPageRow = {
	id: string;
	site_id: string;
	slug: string;
	path: string;
	page_json: string;
	status: string;
	created_at: string;
	updated_at: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

function normalizeHostname(hostname: string): string {
	return hostname.trim().toLowerCase().replace(/\.+$/, '');
}

function safeStringArray(v: unknown): string[] | undefined {
	if (!Array.isArray(v)) return undefined;
	const out = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
	return out.length ? out : undefined;
}

function parseSiteConfigJson(raw: string): SiteConfig | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (!isRecord(parsed)) return null;
	const id = typeof parsed.id === 'string' ? parsed.id.trim() : '';
	const hosts = safeStringArray(parsed.hosts);
	if (!id || !hosts) return null;

	const navigation = (() => {
		if (!isRecord(parsed.navigation)) return undefined;
		const headerRaw = parsed.navigation.header;
		if (!Array.isArray(headerRaw)) return undefined;
		const header = headerRaw
			.filter(
				(x): x is Record<string, unknown> =>
					isRecord(x) && typeof x.label === 'string' && typeof x.href === 'string'
			)
			.map((x) => ({
				label: String(x.label),
				href: String(x.href),
				open_mode: typeof x.open_mode === 'string' ? x.open_mode : undefined,
				modal: typeof x.modal === 'string' ? x.modal : undefined
			}));
		const nav: SiteNavigation = {};
		if (header.length) nav.header = header;
		return Object.keys(nav).length ? nav : undefined;
	})();

	return {
		id,
		name: typeof parsed.name === 'string' ? parsed.name : undefined,
		kind: typeof parsed.kind === 'string' ? parsed.kind : undefined,
		hosts,
		theme: normalizeTheme(parsed.theme),
		navigation,
		routing:
			isRecord(parsed.routing) ? (parsed.routing as SiteConfig['routing']) : undefined,
		short_links: Array.isArray(parsed.short_links)
			? (parsed.short_links as SiteShortLink[])
			: undefined,
		short_link_groups: Array.isArray(parsed.short_link_groups)
			? (parsed.short_link_groups as SiteShortLinkGroup[])
			: undefined,
		permissions: isRecord(parsed.permissions)
			? (parsed.permissions as Record<string, unknown>)
			: undefined
	};
}

export function resolvedSiteFromContentRow(row: ContentSiteRow): ResolvedSite | null {
	if (row.status !== 'published') return null;
	const config = parseSiteConfigJson(row.config_json);
	if (!config) return null;
	return {
		...config,
		siteId: row.id,
		contentStore: {
			source: row.source,
			sourceRef: row.source_ref
		}
	};
}

/** Site-level roles (not a single owner column on the site). */
export type SiteMemberRole = 'owner' | 'editor';

export type SiteMember = {
	userId: string;
	email: string;
	role: SiteMemberRole;
	createdAt: string;
};

export function isSiteMemberRole(value: unknown): value is SiteMemberRole {
	return value === 'owner' || value === 'editor';
}

export function roleCanEdit(role: SiteMemberRole | null | undefined, isPlatformAdmin: boolean): boolean {
	if (isPlatformAdmin) return true;
	return role === 'owner' || role === 'editor';
}

export function roleCanManageMembers(
	role: SiteMemberRole | null | undefined,
	isPlatformAdmin: boolean
): boolean {
	if (isPlatformAdmin) return true;
	return role === 'owner';
}

export function parsePageJson(raw: string): PageYaml | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (!isRecord(parsed)) return null;
	const layout = typeof parsed.layout === 'string' ? parsed.layout.trim() : '';
	const id = typeof parsed.id === 'string' ? parsed.id.trim() : '';
	if (!layout || !id) return null;

	const page: PageYaml = {
		id,
		title: typeof parsed.title === 'string' ? parsed.title : undefined,
		path: typeof parsed.path === 'string' ? parsed.path : undefined,
		layout,
		render_mode: typeof parsed.render_mode === 'string' ? parsed.render_mode : undefined,
		seo: isRecord(parsed.seo) ? (parsed.seo as PageYaml['seo']) : undefined,
		page_settings: isRecord(parsed.page_settings)
			? (parsed.page_settings as PageYaml['page_settings'])
			: undefined,
		permissions: isRecord(parsed.permissions)
			? (parsed.permissions as Record<string, unknown>)
			: undefined,
		notifications: parsed.notifications
	};

	if (Array.isArray(parsed.blocks)) {
		page.blocks = parsed.blocks.filter(
			(b): b is PageBlock => isRecord(b) && typeof b.type === 'string'
		);
	}

	return page;
}

function slugFromParts(slugParts: string[]): string {
	if (slugParts.length === 0) return 'index';
	return slugParts[0]?.trim().toLowerCase() || 'index';
}

export async function getContentSiteById(
	platform: App.Platform | undefined,
	siteId: string
): Promise<ResolvedSite | null> {
	const id = siteId.trim().toLowerCase();
	if (!id) return null;
	try {
		const db = getDbBinding(platform);
		const row = await db
			.prepare(
				`SELECT id, name, owner_user_id, status, config_json, source, source_ref, created_at, updated_at
         FROM content_sites WHERE id = ? LIMIT 1`
			)
			.bind(id)
			.first<ContentSiteRow>();
		return row ? resolvedSiteFromContentRow(row) : null;
	} catch (e) {
		if (isContentStoreSchemaError(e)) return null;
		throw e;
	}
}

export async function getContentSiteByHostname(
	platform: App.Platform | undefined,
	hostname: string
): Promise<ResolvedSite | null> {
	const host = normalizeHostname(hostname);
	if (!host) return null;
	try {
		const db = getDbBinding(platform);
		const row = await db
			.prepare(
				`SELECT s.id, s.name, s.owner_user_id, s.status, s.config_json, s.source, s.source_ref,
                s.created_at, s.updated_at
         FROM content_site_hosts h
         INNER JOIN content_sites s ON s.id = h.site_id
         WHERE h.hostname = ? AND s.status = 'published'
         LIMIT 1`
			)
			.bind(host)
			.first<ContentSiteRow>();
		return row ? resolvedSiteFromContentRow(row) : null;
	} catch (e) {
		if (isContentStoreSchemaError(e)) return null;
		throw e;
	}
}

export async function loadContentPage(
	platform: App.Platform | undefined,
	siteId: string,
	slugParts: string[]
): Promise<PageYaml | null> {
	const id = siteId.trim().toLowerCase();
	const slug = slugFromParts(slugParts);
	if (!id) return null;
	try {
		const db = getDbBinding(platform);
		const row = await db
			.prepare(
				`SELECT id, site_id, slug, path, page_json, status, created_at, updated_at
         FROM content_pages
         WHERE site_id = ? AND slug = ? AND status = 'published'
         LIMIT 1`
			)
			.bind(id, slug)
			.first<ContentPageRow>();
		if (!row) return null;
		return parsePageJson(row.page_json);
	} catch (e) {
		if (isContentStoreSchemaError(e)) return null;
		throw e;
	}
}

export async function listContentSitesForMember(
	platform: App.Platform | undefined,
	userId: string
): Promise<Array<{ id: string; name: string | null; status: string; role: SiteMemberRole; updatedAt: string }>> {
	const db = getDbBinding(platform);
	const { results } = await db
		.prepare(
			`SELECT s.id, s.name, s.status, s.updated_at, m.role
       FROM content_site_members m
       INNER JOIN content_sites s ON s.id = m.site_id
       WHERE m.user_id = ?
       ORDER BY s.updated_at DESC`
		)
		.bind(userId)
		.all<{ id: string; name: string | null; status: string; updated_at: string; role: string }>();
	return (results ?? []).map((r) => ({
		id: r.id,
		name: r.name,
		status: r.status,
		role: isSiteMemberRole(r.role) ? r.role : 'editor',
		updatedAt: r.updated_at
	}));
}

/** @deprecated Use listContentSitesForMember */
export async function listContentSitesForOwner(
	platform: App.Platform | undefined,
	ownerUserId: string
): Promise<Array<{ id: string; name: string | null; status: string; updatedAt: string }>> {
	const rows = await listContentSitesForMember(platform, ownerUserId);
	return rows.map(({ id, name, status, updatedAt }) => ({ id, name, status, updatedAt }));
}

export async function getSiteMemberRole(
	platform: App.Platform | undefined,
	siteId: string,
	userId: string
): Promise<SiteMemberRole | null> {
	const db = getDbBinding(platform);
	const row = await db
		.prepare(
			`SELECT role FROM content_site_members
       WHERE site_id = ? AND user_id = ?
       LIMIT 1`
		)
		.bind(siteId.trim().toLowerCase(), userId)
		.first<{ role: string }>();
	return row && isSiteMemberRole(row.role) ? row.role : null;
}

export async function countSiteMembers(
	platform: App.Platform | undefined,
	siteId: string
): Promise<number> {
	const db = getDbBinding(platform);
	const row = await db
		.prepare(`SELECT COUNT(*) AS cnt FROM content_site_members WHERE site_id = ?`)
		.bind(siteId.trim().toLowerCase())
		.first<{ cnt: number | bigint }>();
	return Number(row?.cnt ?? 0);
}

export async function upsertSiteMember(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	userId: string;
	role: SiteMemberRole;
}): Promise<void> {
	const db = getDbBinding(opts.platform);
	const siteId = opts.siteId.trim().toLowerCase();
	await db
		.prepare(
			`INSERT INTO content_site_members (site_id, user_id, role)
       VALUES (?, ?, ?)
       ON CONFLICT(site_id, user_id) DO UPDATE SET
         role = excluded.role,
         updated_at = datetime('now')`
		)
		.bind(siteId, opts.userId, opts.role)
		.run();
}

export async function removeSiteMember(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	userId: string;
}): Promise<boolean> {
	const db = getDbBinding(opts.platform);
	const siteId = opts.siteId.trim().toLowerCase();
	const owners = await db
		.prepare(
			`SELECT user_id FROM content_site_members WHERE site_id = ? AND role = 'owner'`
		)
		.bind(siteId)
		.all<{ user_id: string }>();
	const ownerIds = (owners.results ?? []).map((r) => r.user_id);
	if (ownerIds.length === 1 && ownerIds[0] === opts.userId) {
		throw new Error('Cannot remove the only owner');
	}

	await db
		.prepare(`DELETE FROM content_site_members WHERE site_id = ? AND user_id = ?`)
		.bind(siteId, opts.userId)
		.run();
	const still = await getSiteMemberRole(opts.platform, siteId, opts.userId);
	return still == null;
}

export async function listSiteMembers(
	platform: App.Platform | undefined,
	siteId: string
): Promise<SiteMember[]> {
	const db = getDbBinding(platform);
	const { results } = await db
		.prepare(
			`SELECT m.user_id, m.role, m.created_at, u.email
       FROM content_site_members m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.site_id = ?
       ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, m.created_at ASC`
		)
		.bind(siteId.trim().toLowerCase())
		.all<{ user_id: string; role: string; created_at: string; email: string | null }>();

	return (results ?? []).map((r) => ({
		userId: r.user_id,
		email: r.email ?? '',
		role: isSiteMemberRole(r.role) ? r.role : 'editor',
		createdAt: r.created_at
	}));
}

async function replaceSiteHosts(
	platform: App.Platform | undefined,
	siteId: string,
	hosts: string[]
): Promise<void> {
	const db = getDbBinding(platform);
	await db.prepare(`DELETE FROM content_site_hosts WHERE site_id = ?`).bind(siteId).run();
	for (const host of hosts) {
		const hostname = normalizeHostname(host);
		if (!hostname) continue;
		// eslint-disable-next-line no-await-in-loop
		await db
			.prepare(
				`INSERT INTO content_site_hosts (hostname, site_id) VALUES (?, ?)
         ON CONFLICT(hostname) DO UPDATE SET site_id = excluded.site_id`
			)
			.bind(hostname, siteId)
			.run();
	}
}

export async function upsertPublishedSiteAndPage(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	name: string;
	/** If set, added as site member (owner when site has no members yet, else editor unless already a member). */
	memberUserId?: string | null;
	memberRole?: SiteMemberRole;
	config: Record<string, unknown>;
	page: Record<string, unknown>;
	source?: string | null;
	sourceRef?: string | null;
}): Promise<void> {
	const db = getDbBinding(opts.platform);
	const siteId = opts.siteId.trim().toLowerCase();
	if (siteId.length < 2) throw new Error('Invalid site id');

	const hosts = safeStringArray(opts.config.hosts) ?? [];
	if (!hosts.length) throw new Error('Site config requires hosts');

	const configJson = JSON.stringify({ ...opts.config, id: siteId });
	const pageSlug =
		typeof opts.page.id === 'string' && opts.page.id.trim()
			? opts.page.id.trim().toLowerCase()
			: 'index';
	const pagePath =
		typeof opts.page.path === 'string' && opts.page.path.trim()
			? opts.page.path.trim()
			: pageSlug === 'index'
				? '/'
				: `/${pageSlug}`;
	const pageJson = JSON.stringify({ ...opts.page, id: pageSlug, path: pagePath });

	const existing = await db
		.prepare(`SELECT id FROM content_sites WHERE id = ?`)
		.bind(siteId)
		.first<{ id: string }>();

	if (existing) {
		await db
			.prepare(
				`UPDATE content_sites
         SET name = ?, status = 'published',
             config_json = ?, source = COALESCE(?, source), source_ref = COALESCE(?, source_ref),
             updated_at = datetime('now')
         WHERE id = ?`
			)
			.bind(opts.name, configJson, opts.source ?? null, opts.sourceRef ?? null, siteId)
			.run();
	} else {
		await db
			.prepare(
				`INSERT INTO content_sites
           (id, name, owner_user_id, status, config_json, source, source_ref)
         VALUES (?, ?, NULL, 'published', ?, ?, ?)`
			)
			.bind(siteId, opts.name, configJson, opts.source ?? null, opts.sourceRef ?? null)
			.run();
	}

	if (opts.memberUserId) {
		const existingRole = await getSiteMemberRole(opts.platform, siteId, opts.memberUserId);
		if (!existingRole) {
			const memberCount = await countSiteMembers(opts.platform, siteId);
			const role: SiteMemberRole =
				opts.memberRole ?? (memberCount === 0 ? 'owner' : 'editor');
			await upsertSiteMember({
				platform: opts.platform,
				siteId,
				userId: opts.memberUserId,
				role
			});
		}
	}

	await replaceSiteHosts(opts.platform, siteId, hosts);

	const pageRow = await db
		.prepare(`SELECT id FROM content_pages WHERE site_id = ? AND slug = ?`)
		.bind(siteId, pageSlug)
		.first<{ id: string }>();

	if (pageRow) {
		await db
			.prepare(
				`UPDATE content_pages
         SET path = ?, page_json = ?, status = 'published', updated_at = datetime('now')
         WHERE id = ?`
			)
			.bind(pagePath, pageJson, pageRow.id)
			.run();
	} else {
		await db
			.prepare(
				`INSERT INTO content_pages (id, site_id, slug, path, page_json, status)
         VALUES (?, ?, ?, ?, ?, 'published')`
			)
			.bind(newId('pg'), siteId, pageSlug, pagePath, pageJson)
			.run();
	}
}

/** Replace `theme.overrides` on a published site config (page chrome colors). */
export async function updateContentSiteThemeOverrides(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	overrides: Record<string, string>;
}): Promise<boolean> {
	const db = getDbBinding(opts.platform);
	const siteId = opts.siteId.trim().toLowerCase();
	const row = await db
		.prepare(`SELECT config_json FROM content_sites WHERE id = ?`)
		.bind(siteId)
		.first<{ config_json: string }>();
	if (!row) return false;

	let config: Record<string, unknown>;
	try {
		const parsed = JSON.parse(row.config_json);
		if (!isRecord(parsed)) return false;
		config = parsed;
	} catch {
		return false;
	}

	const theme = isRecord(config.theme) ? { ...config.theme } : {};
	const cleanOverrides: Record<string, string> = {};
	for (const [key, value] of Object.entries(opts.overrides)) {
		if (typeof value !== 'string' || !value.trim()) continue;
		cleanOverrides[key] = value.trim();
	}
	if (Object.keys(cleanOverrides).length > 0) {
		theme.overrides = cleanOverrides;
	} else {
		delete theme.overrides;
	}
	config.theme = theme;

	await db
		.prepare(
			`UPDATE content_sites
       SET config_json = ?, updated_at = datetime('now')
       WHERE id = ?`
		)
		.bind(JSON.stringify(config), siteId)
		.run();

	return true;
}

export async function updateContentPageJson(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	slug: string;
	page: PageYaml | Record<string, unknown>;
}): Promise<boolean> {
	const db = getDbBinding(opts.platform);
	const siteId = opts.siteId.trim().toLowerCase();
	const slug = opts.slug.trim().toLowerCase() || 'index';
	const path =
		typeof opts.page.path === 'string' && opts.page.path.trim()
			? opts.page.path.trim()
			: slug === 'index'
				? '/'
				: `/${slug}`;
	const pageJson = JSON.stringify({ ...opts.page, id: slug, path });

	await db
		.prepare(
			`UPDATE content_pages
       SET path = ?, page_json = ?, updated_at = datetime('now')
       WHERE site_id = ? AND slug = ?`
		)
		.bind(path, pageJson, siteId, slug)
		.run();

	const page = await loadContentPage(opts.platform, siteId, slug === 'index' ? [] : [slug]);
	return page != null;
}

/** Publish an approved links submission into content_sites / content_pages. */
export async function publishLinksSubmissionToContentStore(opts: {
	platform: App.Platform | undefined;
	row: LinksPageSubmissionRow;
	/** Optional user to add as a site member (owner if first member). */
	memberUserId?: string | null;
}): Promise<{ siteId: string } | null> {
	const payload = parseLinksSubmissionPayload(opts.row);
	if (!payload) return null;

	const docs: LinksSubmissionSiteDocs = buildLinksSubmissionSiteDocsFromPayload(
		payload,
		opts.row.creator_id
	);
	const siteId = docs.siteId.trim().toLowerCase();
	if (siteId.length < 2) return null;

	const name =
		typeof docs.site.name === 'string' && docs.site.name.trim()
			? docs.site.name.trim()
			: opts.row.display_name;

	await upsertPublishedSiteAndPage({
		platform: opts.platform,
		siteId,
		name,
		memberUserId: opts.memberUserId ?? null,
		config: docs.site,
		page: docs.page,
		source: 'links_submission',
		sourceRef: opts.row.id
	});

	return { siteId };
}

export type ContentPageDraft = {
	siteId: string;
	slug: string;
	page: PageYaml;
	themeOverrides: Record<string, string> | null;
	updatedAt: string;
};

function parseThemeOverridesJson(raw: string | null): Record<string, string> | null {
	if (!raw?.trim()) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!isRecord(parsed)) return null;
		const out: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value !== 'string' || !value.trim()) continue;
			out[key] = value.trim();
		}
		return Object.keys(out).length ? out : null;
	} catch {
		return null;
	}
}

export async function getContentPageDraft(
	platform: App.Platform | undefined,
	siteId: string,
	slug = 'index'
): Promise<ContentPageDraft | null> {
	const db = getDbBinding(platform);
	const id = siteId.trim().toLowerCase();
	const pageSlug = slug.trim().toLowerCase() || 'index';
	const row = await db
		.prepare(
			`SELECT site_id, slug, page_json, theme_overrides_json, updated_at
       FROM content_page_drafts
       WHERE site_id = ? AND slug = ?
       LIMIT 1`
		)
		.bind(id, pageSlug)
		.first<{
			site_id: string;
			slug: string;
			page_json: string;
			theme_overrides_json: string | null;
			updated_at: string;
		}>();
	if (!row) return null;
	const page = parsePageJson(row.page_json);
	if (!page) return null;
	return {
		siteId: row.site_id,
		slug: row.slug,
		page,
		themeOverrides: parseThemeOverridesJson(row.theme_overrides_json),
		updatedAt: row.updated_at
	};
}

/** Upsert the single draft for this page (replaces any existing draft). */
export async function saveContentPageDraft(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	slug?: string;
	page: PageYaml | Record<string, unknown>;
	themeOverrides?: Record<string, string> | null;
}): Promise<ContentPageDraft> {
	const db = getDbBinding(opts.platform);
	const siteId = opts.siteId.trim().toLowerCase();
	const slug = (opts.slug ?? 'index').trim().toLowerCase() || 'index';
	const pageJson = JSON.stringify(opts.page);
	const themeOverrides = opts.themeOverrides ?? null;
	const themeJson =
		themeOverrides && Object.keys(themeOverrides).length > 0
			? JSON.stringify(themeOverrides)
			: null;

	await db
		.prepare(
			`INSERT INTO content_page_drafts (site_id, slug, page_json, theme_overrides_json, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(site_id, slug) DO UPDATE SET
         page_json = excluded.page_json,
         theme_overrides_json = excluded.theme_overrides_json,
         updated_at = datetime('now')`
		)
		.bind(siteId, slug, pageJson, themeJson)
		.run();

	const draft = await getContentPageDraft(opts.platform, siteId, slug);
	if (!draft) throw new Error('Failed to save draft');
	return draft;
}

export async function discardContentPageDraft(
	platform: App.Platform | undefined,
	siteId: string,
	slug = 'index'
): Promise<boolean> {
	const db = getDbBinding(platform);
	const id = siteId.trim().toLowerCase();
	const pageSlug = slug.trim().toLowerCase() || 'index';
	await db
		.prepare(`DELETE FROM content_page_drafts WHERE site_id = ? AND slug = ?`)
		.bind(id, pageSlug)
		.run();
	const still = await getContentPageDraft(platform, id, pageSlug);
	return still == null;
}

export function isContentStoreSchemaError(e: unknown): boolean {
	const msg = e instanceof Error ? e.message : String(e);
	return (
		msg.includes('no such table: content_sites') ||
		msg.includes('no such table: content_pages') ||
		msg.includes('no such table: content_site_hosts') ||
		msg.includes('no such table: content_site_members') ||
		msg.includes('no such table: content_page_drafts')
	);
}
