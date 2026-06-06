import { parse as parseYaml } from 'yaml';
import type { ResolvedSite } from './sites';
import { getAllSites, resolveSiteById } from './sites';

export type PageSeo = {
	title?: string;
	description?: string;
	image?: string;
	[key: string]: unknown;
};

export type PageSettings = {
	max_width?: string;
	/** Document layout: `cards` groups sections into stacked cards (800px max). */
	document_style?: 'default' | 'cards' | string;
	/** Short-link grid columns on wide screens (1–3). Default: 3. */
	grid_columns?: 1 | 2 | 3 | number;
	table_of_contents?: boolean;
	show_last_updated?: boolean;
	show_edit_history?: boolean;
	show_footer?: boolean;
	show_header?: boolean;
	search_query?: string;
	modal_size?: 'sm' | 'md' | 'lg' | 'xl' | string;
	[key: string]: unknown;
};

export type PageFormField = {
	type: string;
	name: string;
	label?: string;
	required?: boolean;
	placeholder?: string;
	rows?: number;
	options?: Array<{ label: string; value: string }>;
	value?: unknown;
	[key: string]: unknown;
};

export type PageForm = {
	id: string;
	title?: string;
	intro?: string;
	submit_label?: string;
	cancel_label?: string;
	success_message?: string;
	destination?: string;
	notify_roles?: string[];
	fields?: PageFormField[];
	[key: string]: unknown;
};

export type PageBlock = {
	type: string;
	id?: string;
	[key: string]: unknown;
};

export type RegionLockConfig = {
	countries?: string[];
	subdivisions?: string[];
	allow_unknown_geo?: boolean;
};

export type PageYaml = {
	id: string;
	title?: string;
	path?: string;
	layout: string;
	render_mode?: 'modal' | string;
	send_email?: string;
	seo?: PageSeo;
	blocks?: PageBlock[];
	form?: PageForm;
	region_lock?: RegionLockConfig;
	// page_settings and other metadata come directly from YAML.
	page_settings?: PageSettings;
	permissions?: Record<string, unknown>;
	[key: string]: unknown;
};

export type LoadedPage = {
	site: ResolvedSite;
	page: PageYaml;
};

export type CreatorPageSummary = {
	id: string;
	title: string;
	path: string;
	notificationTopics: Array<{ id: string; label: string; default?: boolean }>;
};

export type GlobalCreatorPageSummary = CreatorPageSummary & {
	siteId: string;
	siteName: string;
};

function parseNotificationTopicsFromParsedPage(parsed: Record<string, unknown>): Array<{ id: string; label: string; default?: boolean }> {
	const notificationsRaw = parsed.notifications;
	if (!notificationsRaw || typeof notificationsRaw !== 'object') return [];
	const notificationsObj = notificationsRaw as Record<string, unknown>;
	const topicsRaw = notificationsObj.topics;
	if (!Array.isArray(topicsRaw)) return [];
	return topicsRaw
		.filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
		.map((t) => ({
			id: typeof t.id === 'string' ? t.id.trim().toLowerCase() : '',
			label: typeof t.label === 'string' && t.label.trim() ? t.label.trim() : '',
			default: t.default === true
		}))
		.filter((t) => !!t.id && !!t.label);
}

type LinkLikeItem = {
	label?: string;
	href?: string;
	type?: string;
	source?: string;
	[key: string]: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

const PAGE_YAML_FILES = import.meta.glob('/content/sites/*/pages/*.yaml', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

const MODAL_YAML_FILES = import.meta.glob('/content/sites/*/modals/*.yaml', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

function getPageYamlPath(siteId: string, slugParts: string[]): string | null {
	if (slugParts.length === 0) return `/content/sites/${siteId}/pages/index.yaml`;
	if (slugParts.length === 1) return `/content/sites/${siteId}/pages/${slugParts[0]}.yaml`;
	return null;
}

function toPathFromFileName(fileName: string): string {
	const slug = fileName.replace(/\.yaml$/i, '');
	return slug === 'index' ? '/' : `/${slug}`;
}

function toNormalizedPath(pathValue: unknown, fileName: string): string {
	if (typeof pathValue === 'string' && pathValue.trim()) {
		return pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
	}
	return toPathFromFileName(fileName);
}

type CreatorProfileSummary = {
	name?: string;
	tagline?: string;
	avatar?: string;
	bio?: string;
};

function loadCreatorProfileSummaryFromSite(siteId: string): CreatorProfileSummary | null {
	const filePath = `/content/sites/${siteId}/pages/index.yaml`;
	const raw = PAGE_YAML_FILES[filePath];
	if (!raw?.trim()) return null;

	let parsed: unknown;
	try {
		parsed = parseYaml(raw);
	} catch {
		return null;
	}
	if (!isRecord(parsed) || !Array.isArray(parsed.blocks)) return null;

	const profileBlock = parsed.blocks.find(
		(b): b is Record<string, unknown> => isRecord(b) && b.type === 'creator_profile'
	);
	if (!profileBlock) return null;

	const name = typeof profileBlock.name === 'string' ? profileBlock.name.trim() : undefined;
	const tagline = typeof profileBlock.tagline === 'string' ? profileBlock.tagline.trim() : undefined;
	const avatar = typeof profileBlock.avatar === 'string' ? profileBlock.avatar.trim() : undefined;
	const bio = typeof profileBlock.bio === 'string' ? profileBlock.bio.trim() : undefined;
	const seo = isRecord(parsed.seo) ? parsed.seo : null;
	const seoImage = seo && typeof seo.image === 'string' ? seo.image.trim() : '';
	const pageTitle = typeof parsed.title === 'string' ? parsed.title.trim() : undefined;

	return {
		name: name || pageTitle,
		tagline: tagline || undefined,
		avatar: avatar || seoImage || undefined,
		bio: bio || undefined
	};
}

function isCreatorLinksShortcut(item: LinkLikeItem): boolean {
	const href = typeof item.href === 'string' ? item.href.trim().toLowerCase() : '';
	const type = typeof item.type === 'string' ? item.type.trim().toLowerCase() : '';
	const source = typeof item.source === 'string' ? item.source.trim().toLowerCase() : '';
	return href === '@creator_links' || type === 'creator_links' || source === 'creator_links';
}

function isPlatformHomeHref(item: LinkLikeItem): boolean {
	const href = typeof item.href === 'string' ? item.href.trim().toLowerCase() : '';
	return href === '@platform_home';
}

function isLocalLikeHost(hostname: string): boolean {
	return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1';
}

function domainSuffix(hostname: string): string | null {
	const parts = hostname.split('.').filter(Boolean);
	if (parts.length < 2) return null;
	// Keep full apex domains like gloopglop.com. For subdomains, strip only the first label.
	return parts.length === 2 ? hostname : parts.slice(1).join('.');
}

function pickHostForRequest(targetSite: ResolvedSite, requestHostname: string): string | null {
	const hosts = (targetSite.hosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean);
	if (!hosts.length) return null;

	if (isLocalLikeHost(requestHostname)) {
		return (
			hosts.find((h) => h.endsWith('.localhost')) ??
			hosts.find((h) => h === 'localhost' || h === '127.0.0.1') ??
			hosts[0]
		);
	}

	// Short gloop.gg hosts resolve to full *.gloopglop.com in generated links.
	if (
		requestHostname === 'gloop.gg' ||
		requestHostname === 'www.gloop.gg' ||
		/\.gloop\.gg$/i.test(requestHostname)
	) {
		const canonical = hosts.find(
			(h) => h === 'gloopglop.com' || (h.endsWith('.gloopglop.com') && !h.startsWith('www.'))
		);
		if (canonical) return canonical;
	}

	const suffix = domainSuffix(requestHostname);
	if (suffix) {
		const bySuffix = hosts.find((h) => h === suffix || h.endsWith(`.${suffix}`));
		if (bySuffix) return bySuffix;
	}

	return hosts[0];
}

function buildAbsoluteUrl(host: string, requestUrl: URL): string {
	const needsPort = requestUrl.port && isLocalLikeHost(host);
	const portPart = needsPort ? `:${requestUrl.port}` : '';
	return `${requestUrl.protocol}//${host}${portPart}`;
}

/** Protocol + host (+ port for local dev), using the same host rules as generated links (e.g. gloop.gg → *.gloopglop.com). */
export function canonicalOriginForSite(site: ResolvedSite, requestUrl: URL): string | null {
	const host = pickHostForRequest(site, requestUrl.hostname.toLowerCase());
	if (!host) return null;
	return buildAbsoluteUrl(host, requestUrl);
}

/**
 * HTTPS origin on a public Gloop host for GloopGlop search synthesis.
 * In local dev, `canonicalOriginForSite` often yields `*.localhost`, which is omitted from search results;
 * this prefers production hosts from `site.yaml` so creator pages still surface when nothing is in the DB yet.
 */
export function publicGloopglopCreatorOriginForSearch(site: ResolvedSite): string | null {
	const hosts = (site.hosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean);
	const pick = (pred: (h: string) => boolean) => hosts.find(pred);

	const gglop =
		pick((h) => h.endsWith('.gloopglop.com') && !h.startsWith('www.')) ??
		pick((h) => h.endsWith('.gloopglop.com'));
	if (gglop) return `https://${gglop}`;

	const gloopSub =
		pick((h) => h.endsWith('.gloop.gg') && !h.startsWith('www.') && h !== 'gloop.gg') ??
		pick((h) => h.endsWith('.gloop.gg') && h !== 'gloop.gg' && h !== 'www.gloop.gg');
	if (gloopSub) return `https://${gloopSub}`;

	const slug =
		typeof site.routing?.gloop_gg_short_slug === 'string'
			? site.routing.gloop_gg_short_slug.trim().toLowerCase()
			: '';
	if (slug) return `https://gloop.gg/${encodeURIComponent(slug)}/`;

	return null;
}

function parsePageYaml(raw: string, filePathForError: string): PageYaml {
	const parsed = parseYaml(raw);
	if (!isRecord(parsed)) throw new Error(`Invalid YAML structure in ${filePathForError}`);

	const layout = parsed.layout;
	const id = parsed.id;
	if (typeof layout !== 'string' || !layout.trim()) {
		throw new Error(`Missing required field "layout" in ${filePathForError}`);
	}
	if (typeof id !== 'string' || !id.trim()) {
		throw new Error(`Missing required field "id" in ${filePathForError}`);
	}

	const page: PageYaml = {
		id,
		title: typeof parsed.title === 'string' ? parsed.title : undefined,
		path: typeof parsed.path === 'string' ? parsed.path : undefined,
		layout: layout.trim(),
		render_mode: typeof parsed.render_mode === 'string' ? parsed.render_mode : undefined,
		send_email:
			typeof parsed.send_email === 'string' && parsed.send_email.trim()
				? parsed.send_email.trim()
				: undefined,
		seo: isRecord(parsed.seo) ? (parsed.seo as PageSeo) : undefined,
		page_settings: isRecord(parsed.page_settings) ? (parsed.page_settings as PageSettings) : undefined,
		permissions: isRecord(parsed.permissions) ? (parsed.permissions as Record<string, unknown>) : undefined,
	};

	if (Array.isArray(parsed.blocks)) {
		page.blocks = parsed.blocks
			.filter((b) => isRecord(b) && typeof (b as any).type === 'string')
			.map((b) => b as PageBlock);
	}

	if (isRecord(parsed.form)) {
		const f = parsed.form;
		if (typeof f.id === 'string' && f.id.trim().length) {
			page.form = {
				...f,
				id: f.id
			} as PageForm;
		}
	}

	// Fields for form pages live at top-level in YAML.
	if (Array.isArray(parsed.fields)) {
		page.form = {
			...(page.form ?? ({} as PageForm)),
			fields: parsed.fields.filter((x) => isRecord(x) && typeof x.type === 'string' && typeof x.name === 'string')
		} as PageForm;
	}

	return page;
}

function applySiteShortLinksToPage(page: PageYaml, site: ResolvedSite): PageYaml {
	const siteShortLinks = site.short_links;
	const siteShortLinkGroups = site.short_link_groups;
	if ((!siteShortLinks?.length && !siteShortLinkGroups?.length) || !page.blocks?.length) {
		return page;
	}

	return {
		...page,
		blocks: page.blocks.map((block) => {
			if (block.type !== 'creator_profile') return block;
			return {
				...block,
				...(siteShortLinks?.length ? { short_links: siteShortLinks } : {}),
				...(siteShortLinkGroups?.length ? { short_link_groups: siteShortLinkGroups } : {})
			};
		})
	};
}

export async function loadModalYaml(
	site: ResolvedSite,
	modalId: string
): Promise<PageYaml | null> {
	const safeId = modalId.trim();
	if (!safeId) return null;

	const filePath = `/content/sites/${site.siteId}/modals/${safeId}.yaml`;
	const raw = MODAL_YAML_FILES[filePath];
	if (!raw || !raw.trim()) return null;

	try {
		return parsePageYaml(raw, filePath);
	} catch (e) {
		throw new Error(e instanceof Error ? e.message : `Invalid modal YAML in ${filePath}`);
	}
}

export async function loadAllModals(site: ResolvedSite): Promise<Record<string, PageYaml>> {
	const out: Record<string, PageYaml> = {};
	const prefix = `/content/sites/${site.siteId}/modals/`;
	for (const [filePath] of Object.entries(MODAL_YAML_FILES)) {
		if (!filePath.startsWith(prefix) || !filePath.endsWith('.yaml')) continue;
		const modalId = filePath.slice(prefix.length).replace(/\.yaml$/i, '');
		// eslint-disable-next-line no-await-in-loop
		const modal = await loadModalYaml(site, modalId);
		if (!modal) continue;
		out[modalId] = modal;
	}
	return out;
}

export async function loadPageYaml(
	site: ResolvedSite,
	slugParts: string[]
): Promise<PageYaml | null> {
	if (site.linksSubmission) {
		const pageSlug = slugParts.length === 0 ? 'index' : slugParts[0];
		if (pageSlug !== 'index') return null;

		const { buildLinksSubmissionPageYaml } = await import('$lib/server/links-submission-sites');
		const page = buildLinksSubmissionPageYaml(site.linksSubmission.payload, site.siteId);
		return applySiteShortLinksToPage(page, site);
	}

	const filePath = getPageYamlPath(site.siteId, slugParts);
	if (!filePath) return null;

	const raw = PAGE_YAML_FILES[filePath];
	if (!raw || !raw.trim()) return null;

	try {
		return applySiteShortLinksToPage(parsePageYaml(raw, filePath), site);
	} catch (e) {
		// For invalid YAML, fail gracefully per-request; loader can surface a useful error.
		throw new Error(e instanceof Error ? e.message : `Invalid page YAML in ${filePath}`);
	}
}

export async function expandCreatorLinksShortcuts(
	site: ResolvedSite,
	page: PageYaml,
	requestUrl: URL
): Promise<PageYaml> {
	if (!Array.isArray(page.blocks) || page.blocks.length === 0) return page;

	const creatorItems: Array<{ label: string; href: string }> = [];
	const prefix = `/content/sites/${site.siteId}/pages/`;
	for (const [filePath, raw] of Object.entries(PAGE_YAML_FILES)) {
		if (!filePath.startsWith(prefix) || !filePath.endsWith('.yaml')) continue;
		if (!raw || !raw.trim()) continue;

		let parsed: unknown;
		try {
			parsed = parseYaml(raw);
		} catch {
			continue;
		}
		if (!isRecord(parsed)) continue;
		if (typeof parsed.layout !== 'string' || parsed.layout.trim() !== 'creator_links') continue;

		const label =
			typeof parsed.title === 'string' && parsed.title.trim()
				? parsed.title.trim()
				: typeof parsed.id === 'string' && parsed.id.trim()
					? parsed.id.trim()
					: filePath.slice(prefix.length).replace(/\.yaml$/i, '');
		const href = toNormalizedPath(parsed.path, filePath.slice(prefix.length));
		creatorItems.push({ label, href });
	}

	const uniqueCreatorItems = creatorItems.filter(
		(item, i, arr) => arr.findIndex((x) => x.href === item.href) === i
	);
	const allSites = await getAllSites();

	const nextBlocks = page.blocks.map((block) => {
		if (block.type !== 'links' || !Array.isArray(block.items)) return block;
		const items = block.items as LinkLikeItem[];
		let hasExpansion = false;
		const expandedItems: Array<Record<string, unknown>> = [];

		for (const item of items) {
			if (isPlatformHomeHref(item)) {
				const platformSite = allSites.find(
					(s) => s.siteId.toLowerCase() === 'gloopglop' || s.id.toLowerCase() === 'gloopglop'
				);
				if (platformSite) {
					const host = pickHostForRequest(platformSite, requestUrl.hostname.toLowerCase());
					if (host) {
						hasExpansion = true;
						expandedItems.push({
							...item,
							href: `${buildAbsoluteUrl(host, requestUrl)}/`
						});
						continue;
					}
				}
				hasExpansion = true;
				expandedItems.push({ ...item, href: '/' });
				continue;
			}

			const sourceRaw = typeof item.source === 'string' ? item.source.trim() : '';
			if (sourceRaw.startsWith('@') && sourceRaw.length > 1) {
				const requestedSiteId = sourceRaw.slice(1).trim().toLowerCase();
				const targetSite = allSites.find(
					(s) => s.siteId.toLowerCase() === requestedSiteId || s.id.toLowerCase() === requestedSiteId
				);
				if (targetSite) {
					const host = pickHostForRequest(targetSite, requestUrl.hostname.toLowerCase());
					if (host) {
						const profile = loadCreatorProfileSummaryFromSite(targetSite.siteId);
						hasExpansion = true;
						expandedItems.push({
							...item,
							label:
								typeof item.label === 'string' && item.label.trim()
									? item.label
									: profile?.name ?? targetSite.name ?? targetSite.id,
							tagline: profile?.tagline,
							avatar: profile?.avatar,
							bio: profile?.bio,
							href: buildAbsoluteUrl(host, requestUrl)
						});
						continue;
					}
				}
				// Graceful fallback for missing/invalid site references.
				hasExpansion = true;
				expandedItems.push({
					...item,
					label:
						typeof item.label === 'string' && item.label.trim()
							? item.label
							: sourceRaw.slice(1),
					href: '',
					status: 'not_found',
					message: 'Page not found'
				});
				continue;
			}

			if (isCreatorLinksShortcut(item)) {
				hasExpansion = true;
				for (const creatorItem of uniqueCreatorItems) expandedItems.push(creatorItem);
			} else {
				expandedItems.push(item as Record<string, unknown>);
			}
		}

		return hasExpansion ? { ...block, items: expandedItems } : block;
	});

	return { ...page, blocks: nextBlocks };
}

export async function listCreatorPages(site: ResolvedSite): Promise<CreatorPageSummary[]> {
	const creators: CreatorPageSummary[] = [];
	const prefix = `/content/sites/${site.siteId}/pages/`;
	for (const [filePath, raw] of Object.entries(PAGE_YAML_FILES)) {
		if (!filePath.startsWith(prefix) || !filePath.endsWith('.yaml')) continue;
		if (!raw || !raw.trim()) continue;

		let parsed: unknown;
		try {
			parsed = parseYaml(raw);
		} catch {
			continue;
		}
		if (!isRecord(parsed)) continue;
		if (typeof parsed.layout !== 'string' || parsed.layout.trim() !== 'creator_links') continue;

		const fileName = filePath.slice(prefix.length);
		const title =
			typeof parsed.title === 'string' && parsed.title.trim()
				? parsed.title.trim()
				: typeof parsed.id === 'string' && parsed.id.trim()
					? parsed.id.trim()
					: fileName.replace(/\.yaml$/i, '');
		const id = typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id.trim() : fileName.replace(/\.yaml$/i, '');
		const path = toNormalizedPath(parsed.path, fileName);
		const notificationTopics = parseNotificationTopicsFromParsedPage(parsed);
		creators.push({ id, title, path, notificationTopics });
	}

	return creators.sort((a, b) => a.title.localeCompare(b.title));
}

export async function listCreatorPagesAcrossSites(): Promise<GlobalCreatorPageSummary[]> {
	const sites = await getAllSites();
	const all: GlobalCreatorPageSummary[] = [];
	for (const site of sites) {
		// eslint-disable-next-line no-await-in-loop
		const pages = await listCreatorPages(site);
		for (const page of pages) {
			all.push({
				...page,
				siteId: site.siteId,
				siteName: site.name ?? site.id ?? site.siteId
			});
		}
	}
	return all.sort((a, b) => a.siteName.localeCompare(b.siteName) || a.title.localeCompare(b.title));
}

/** `pages/not-found.yaml` — prefers the active site, then platform `gloopglop`. */
export async function loadNotFoundPageForError(
	site: ResolvedSite | null | undefined,
	url: URL
): Promise<{ site: ResolvedSite; page: PageYaml } | null> {
	const platform = await resolveSiteById('gloopglop');

	if (!site) {
		if (!platform) return null;
		const page = await loadPageYaml(platform, ['not-found']);
		if (!page) return null;
		return { site: platform, page: await expandCreatorLinksShortcuts(platform, page, url) };
	}

	const own = await loadPageYaml(site, ['not-found']);
	if (own) {
		return { site, page: await expandCreatorLinksShortcuts(site, own, url) };
	}

	if (platform && platform.siteId !== site.siteId) {
		const page = await loadPageYaml(platform, ['not-found']);
		if (page) {
			return { site: platform, page: await expandCreatorLinksShortcuts(platform, page, url) };
		}
	}

	return null;
}

